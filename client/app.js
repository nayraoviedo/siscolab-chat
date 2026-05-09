// app.js — Lógica del cliente WebSocket

const WS_URL = 'ws://localhost:3000/ws';

// Referencias al DOM
const areaMensajes    = document.getElementById('area-mensajes');
const inputMensaje    = document.getElementById('input-mensaje');
const btnEnviar       = document.getElementById('btn-enviar');
const estadoConexion  = document.getElementById('estado-conexion');

let socket       = null;
let nombrePropio = null;   // se recibe del servidor al conectarse
let intentoReconexion = null;

// ── Conectar al servidor WebSocket ────────────────────────
function conectar() {
  socket = new WebSocket(WS_URL);

  // Conexión establecida
  socket.onopen = () => {
    console.log('✅ Conectado al servidor');
    estadoConexion.textContent = '🟢 Conectado';
    estadoConexion.className   = 'estado conectado';
    btnEnviar.disabled = false;

    // Limpiar el reintento si estaba activo
    if (intentoReconexion) {
      clearTimeout(intentoReconexion);
      intentoReconexion = null;
    }
  };

  // Mensaje recibido
  socket.onmessage = (evento) => {
    const datos = JSON.parse(evento.data);

    if (datos.tipo === 'bienvenida') {
      // Guardar nuestro nombre asignado por el servidor
      nombrePropio = datos.texto.replace('Eres ', '');

    } else if (datos.tipo === 'historial') {
      // Mostrar mensajes anteriores al conectarse
      datos.mensajes.forEach(msg => mostrarMensaje(msg));

    } else if (datos.tipo === 'mensaje') {
      mostrarMensaje(datos);

    } else if (datos.tipo === 'sistema') {
      mostrarSistema(datos.texto);
    }
  };

  // Conexión cerrada → intentar reconectar
  socket.onclose = () => {
    console.log('❌ Desconectado del servidor');
    estadoConexion.textContent = '🔴 Desconectado';
    estadoConexion.className   = 'estado desconectado';
    btnEnviar.disabled = true;

    // Reintento automático cada 3 segundos
    intentoReconexion = setTimeout(() => {
      console.log('🔄 Intentando reconectar...');
      conectar();
    }, 3000);
  };

  // Error de conexión
  socket.onerror = (err) => {
    console.error('⚠️ Error en WebSocket:', err);
  };
}

// ── Enviar mensaje ────────────────────────────────────────
function enviarMensaje() {
  const texto = inputMensaje.value.trim();

  if (!texto || !socket || socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify({ tipo: 'mensaje', texto }));
  inputMensaje.value = '';
  inputMensaje.focus();
}

// ── Mostrar mensaje en el área ────────────────────────────
function mostrarMensaje(datos) {
  const burbuja = document.createElement('div');

  // Detectar si es mensaje propio
  const esPropio = datos.autor === nombrePropio;
  burbuja.className = `mensaje ${esPropio ? 'propio' : 'otro'}`;

  // Formatear la hora
  const hora = datos.hora
    ? new Date(datos.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  burbuja.innerHTML = `
    ${!esPropio ? `<div class="autor">${datos.autor}</div>` : ''}
    <div>${datos.texto}</div>
    <div class="hora">${hora}</div>
  `;

  areaMensajes.appendChild(burbuja);
  scrollAbajo();
}

// ── Mostrar mensaje de sistema ────────────────────────────
function mostrarSistema(texto) {
  const aviso = document.createElement('div');
  aviso.className = 'mensaje sistema';
  aviso.textContent = texto;
  areaMensajes.appendChild(aviso);
  scrollAbajo();
}

// ── Hacer scroll hasta el último mensaje ─────────────────
function scrollAbajo() {
  areaMensajes.scrollTop = areaMensajes.scrollHeight;
}

// ── Eventos ───────────────────────────────────────────────

// Enviar al hacer click en el botón
btnEnviar.addEventListener('click', enviarMensaje);

// Enviar al presionar Enter
inputMensaje.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') enviarMensaje();
});

// Deshabilitar botón hasta conectar
btnEnviar.disabled = true;

// Iniciar conexión al cargar la página
conectar();