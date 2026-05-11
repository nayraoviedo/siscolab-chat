# 🍄 Micelio Chat — Chat colaborativo en tiempo Real

> Sistema de mensajería instantánea para equipos, con autenticación Google y persistencia en Firestore.

---

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Flujo de comunicación webSocket](#flujo-de-comunicación-websocket)
- [Flujo de autenticación](#flujo-de-autenticación)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Requisitos previos](#requisitos-previos)
- [Instalación y configuración](#instalación-y-configuración)
- [Variables de entorno](#variables-de-entorno)
- [Ejecución](#ejecución)
- [Funcionalidades](#funcionalidades)
- [Protocolo de mensajes webSocket](#protocolo-de-mensajes-websocket)

---

## Descripción

**Micelio Chat** es una aplicación web de chat colaborativo en tiempo real desarrollada con WebSockets como proyecto de la materia de **Sistemas Colaborativos**. Permite la comunicación instantánea entre múltiples usuarios conectados simultáneamente, con autenticación mediante Google (Firebase Auth) y persistencia de mensajes en Firestore.

El nombre *Micelio* hace referencia a la red de hongos subterráneos que conecta organismos entre sí, es una metáfora que usamos de la comunicación en red que establece el sistema.

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Navegador)                          │
│                                                                     │
│   ┌──────────────┐     ┌─────────────────┐     ┌───────────────┐   │
│   │  index.html  │────▶│    app.js        │────▶│  Firebase JS  │   │
│   │  styles.css  │     │  (WebSocket +   │     │  (Auth SDK)   │   │
│   └──────────────┘     │   Auth Client)  │     └──────┬────────┘   │
│                         └────────┬────────┘            │            │
└────────────────────────────────┬─┴────────────────────┼────────────┘
                                 │ WebSocket             │ OAuth2
                                 │ ws://host:3000/ws     │
                                 ▼                       ▼
┌────────────────────────────────────────┐   ┌──────────────────────┐
│           SERVIDOR (Node.js)           │   │   FIREBASE SERVICES   │
│                                        │   │                      │
│   ┌────────────────────────────────┐   │   │  ┌────────────────┐  │
│   │         server.js              │   │   │  │  Firebase Auth │  │
│   │                                │   │   │  │  (Google IAM)  │  │
│   │  ┌──────────┐  ┌───────────┐  │   │   │  └────────────────┘  │
│   │  │ HTTP     │  │ WebSocket │  │   │   │                      │
│   │  │ Server   │  │ Server    │  │   │   │  ┌────────────────┐  │
│   │  │ (static) │  │ (wss)     │  │   │   │  │   Firestore    │  │
│   │  └──────────┘  └─────┬─────┘  │   │   │  │  (Historial)   │  │
│   └───────────────────────┼────────┘   │   │  └────────────────┘  │
│                           │            │   └──────────────────────┘
│   ┌───────────────────────▼────────┐   │
│   │        firebase.js (Admin)     │───┼──────────────────────────▶
│   │   (Firebase Admin SDK)         │   │    Escritura/Lectura
│   └────────────────────────────────┘   │
└────────────────────────────────────────┘
```

---

## Flujo de comunicación WebSocket

```
CLIENTE                                          SERVIDOR
   │                                                 │
   │──── Conexión WebSocket (ws://host:3000/ws) ────▶│
   │                                                 │
   │◀─── {tipo: "bienvenida", texto: "Eres         │
   │      Usuario_XXX"}                              │
   │                                                 │
   │◀─── {tipo: "historial", mensajes: [...]}       │ ← Últimos 20 msgs de Firestore
   │                                                 │
   │──── {tipo: "cambioNombre", nombre: "Juan"} ───▶│
   │                                                 │
   │                         ┌──────────────────────▶│ broadcast a TODOS:
   │◀────────────────────────┤ {tipo: "sistema",     │  "Juan se unió al chat"
   │                         └──────────────────────▶│
   │                                                 │
   │◀─── {tipo: "usuarios", lista: ["Juan",…]}      │ ← Lista actualizada
   │                                                 │
   │──── {tipo: "mensaje", texto: "Hola!"} ────────▶│
   │                                                 │──▶ Guarda en Firestore
   │                         ┌──────────────────────▶│ broadcast a TODOS:
   │◀────────────────────────┤ {tipo: "mensaje",     │
   │                         └──────────────────────▶│  autor, texto, hora
   │                                                 │
   │──── Cierre de conexión ───────────────────────▶│
   │                                                 │
   │                         ┌──────────────────────▶│ (si era última pestaña)
   │◀────────────────────────┤ {tipo: "sistema",     │ broadcast: "Juan abandonó"
   │                         └──────────────────────▶│
```

---

## Flujo de autenticación

```
USUARIO          CLIENTE                FIREBASE AUTH           SERVIDOR WS
   │                │                        │                       │
   │──▶ Clic en     │                        │                       │
   │   "Iniciar     │                        │                       │
   │   con Google"  │                        │                       │
   │                │──▶ signInWithPopup() ─▶│                       │
   │                │                        │                       │
   │◀─── Ventana Google OAuth ─────────────▶│                       │
   │                │                        │                       │
   │──▶ Acepta      │                        │                       │
   │                │◀── user.displayName ───│                       │
   │                │                        │                       │
   │                │── localStorage.setItem('usuario', nombre)      │
   │                │── location.reload()                            │
   │                │                        │                       │
   │                │──────── Nueva conexión WebSocket ─────────────▶│
   │                │                        │                       │
   │                │──── {cambioNombre: "Juan García"} ────────────▶│
   │                │                        │                       │
   │                │◀─── {usuarios, historial, sistema} ───────────│
   │                │                        │                       │

Sin Google → el servidor asigna "Usuario_XXX" automáticamente
```

---

## Estructura del proyecto

```
nexochat/
│
├── client/                   # Frontend (SPA)
│   ├── index.html            # Interfaz principal del chat
│   ├── styles.css            # Estilos 
│   └── app.js                # Lógica cliente: WebSocket + Firebase Auth
│
├── server/                   # Backend (Node.js)
│   ├── server.js             # Servidor HTTP + WebSocket
│   └── firebase.js           # Inicialización Firebase Admin SDK
│
├── .env                      # Variables de entorno 
├── .gitignore
├── package.json
└── README.md
```

---

## Tecnologías utilizadas

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Frontend | HTML5 / CSS3 / JS (ES Modules) | Interfaz SPA |
| Comunicación | WebSocket (`ws`) | Mensajería en tiempo real |
| Autenticación | Firebase Auth (Google OAuth2) | Identidad de usuarios |
| Base de datos | Cloud Firestore | Historial de mensajes |
| Backend | Node.js (sin frameworks) | Servidor HTTP + WS |
| Servidor WS | librería `ws` | WebSocket server |
| Admin SDK | `firebase-admin` | Acceso seguro a Firestore |
| Config | `dotenv` | Variables de entorno |

---

## Requisitos Previos

- [Node.js](https://nodejs.org/) v18 o superior
- Cuenta de Google con un proyecto Firebase creado
- Firestore habilitado en el proyecto Firebase
- Autenticación Google habilitada en Firebase Auth

---

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-equipo/micelio-chat.git
cd micelio-chat
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto (ver sección siguiente).

### 4. Obtener credenciales de Firebase Admin

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Proyecto → Configuración del proyecto → Cuentas de servicio
3. Generar nueva clave privada (descarga un `.json`)
4. Copiar `project_id`, `private_key` y `client_email` al `.env`

---

## Variables de entorno

Crear el archivo `.env` en la raíz con el siguiente contenido:

```env
PORT=3000

FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@tu-proyecto.iam.gserviceaccount.com
```

> ⚠️ **Nunca subir el archivo `.env` al repositorio.** Está incluido en `.gitignore`.

---

## Ejecución

```bash
node server/server.js
```

Luego abrir en el navegador o usar la extensión de live server en vs code, hacer click derecho en index, y abrir archivo con 
live server:

```
http://localhost:3000
```

Para detener el servidor: `Ctrl + C`

---

## Funcionalidades

- ✅ Conexión WebSocket persistente y bidireccional
- ✅ Múltiples usuarios simultáneos con sesiones independientes
- ✅ Nombre de usuario temporal automático (`Usuario_XXX`) si no hay sesión
- ✅ Autenticación con Google (Firebase Auth)
- ✅ Notificación al chat cuando un usuario entra o sale
- ✅ Lista en tiempo real de usuarios conectados
- ✅ Historial de los últimos 20 mensajes al conectarse (Firestore)
- ✅ Persistencia de mensajes en Firestore
- ✅ Reconexión automática si se pierde la conexión (cada 3 segundos)
- ✅ Soporte para múltiples pestañas del mismo usuario (sin anunciar salida hasta cerrar todas)
- ✅ Interfaz responsive con burbujas de chat diferenciadas (propio / ajeno)

---

## Protocolo de mensajes WebSocket

Todos los mensajes se envían como JSON.

### Servidor → Cliente

| `tipo` | Campos adicionales | Descripción |
|--------|-------------------|-------------|
| `bienvenida` | `texto` | Nombre temporal asignado |
| `historial` | `mensajes[]` | Últimos 20 mensajes de Firestore |
| `mensaje` | `autor`, `texto`, `hora` | Nuevo mensaje de un usuario |
| `sistema` | `texto` | Notificación del sistema (si se une al chat/si deja el chat) |
| `usuarios` | `lista[]` | Lista actualizada de conectados |

### Cliente → Servidor

| `tipo`         | Campos adicionales | Descripción |
|----------------|-------------------|-------------|
| `cambioNombre` | `nombre`          | Confirmar/cambiar nombre de usuario |
| `mensaje`      | `texto`           | Enviar un mensaje al chat |

---

## Equipo de Desarrollo

Desarrollado como proyecto académico para la materia de **Arquitectura de Software**.

| Integrante | Rol |
|------------|-----|
| [Nombre 1] | Backend / WebSocket Server |
| [Nombre 2] | Frontend / UI |
| [Nombre 3] | Firebase / Auth |
| [Nombre 4] | Documentación / Testing |

---

> *"Micelio: la red invisible que conecta."* 🍄
