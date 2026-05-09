// server.js — Servidor WebSocket con Firebase Firestore
const http      = require('http');
const WebSocket = require('ws');
require('dotenv').config();
const { db } = require('./firebase');

const PORT = process.env.PORT || 3000;

// Servidor HTTP base 
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Servidor de chat activo');
});

// Servidor WebSocket en /ws 
const wss = new WebSocket.Server({ server, path: '/ws' });

// Registro en memoria: socket 
const clientes = new Map();
let contadorId = 1;

//  Nueva conexión
wss.on('connection', (socket) => {
  const nombre = `Usuario_${contadorId++}`;
  clientes.set(socket, { nombre });

  console.log(`✅ ${nombre} conectado — activos: ${clientes.size}`);

  // Notificar a todos que alguien llegó
  broadcast({ tipo: 'sistema', texto: `${nombre} se unió al chat` }, socket);

  // Bienvenida al nuevo usuario
  socket.send(JSON.stringify({ tipo: 'bienvenida', texto: `Eres ${nombre}` }));

  // Enviar historial de mensajes
  enviarHistorial(socket);

  // Mensaje recibido 
  socket.on('message', async (data) => {
    try {
      const msg     = JSON.parse(data);
      const cliente = clientes.get(socket);

      // Cambio de nombre
      if (msg.tipo === 'cambioNombre') {
        cliente.nombre = msg.nombre;
        return;
      }

      const mensaje = {
        tipo:  'mensaje',
        autor: cliente.nombre,
        texto: msg.texto,
        hora:  new Date().toISOString(),
      };

      // Guardar en Firestore y reenviar a todos
      await guardarMensaje(mensaje);
      broadcast(mensaje);

    } catch (err) {
      console.error('Error procesando mensaje:', err.message);
    }
  });

  // Desconexión 
  socket.on('close', () => {
    const { nombre } = clientes.get(socket) ?? {};
    clientes.delete(socket);
    console.log(`❌ ${nombre} desconectado — activos: ${clientes.size}`);
    broadcast({ tipo: 'sistema', texto: `${nombre} salió del chat` });
  });

  // Errores sin crashear el servidor
  socket.on('error', (err) => {
    const { nombre } = clientes.get(socket) ?? {};
    console.error(`⚠️  Error en socket de ${nombre}:`, err.message);
  });
});

// Helpers 

function broadcast(mensaje, excepto = null) {
  const datos = JSON.stringify(mensaje);
  clientes.forEach((_, socket) => {
    if (socket !== excepto && socket.readyState === WebSocket.OPEN) {
      socket.send(datos);
    }
  });
}

async function guardarMensaje(mensaje) {
  await db.collection('mensajes').add(mensaje);
}

async function enviarHistorial(socket) {
  try {
    const snapshot = await db.collection('mensajes')
      .orderBy('hora', 'desc')
      .limit(50)
      .get();

    const historial = snapshot.docs.map(doc => doc.data()).reverse();
    socket.send(JSON.stringify({ tipo: 'historial', mensajes: historial }));
  } catch (err) {
    console.error('Error cargando historial:', err.message);
  }
}

// Arrancar el websocket y servidor
server.listen(PORT, () => {
  console.log(` Servidor en http://localhost:${PORT}`);
  console.log(` WebSocket en ws://localhost:${PORT}/ws`);
});