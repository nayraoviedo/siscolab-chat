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
│           SERVIDOR (Node.js)           │   │   FIREBASE SERVICES  │
│                                        │   │                      │
│   ┌────────────────────────────────┐   │   │  ┌────────────────┐  │
│   │         server.js              │   │   │  │  Firebase Auth │  │
│   │                                │   │   │  │  (Google IAM)  │  │
│   │  ┌──────────┐  ┌───────────┐   │   │   │  └────────────────┘  │
│   │  │ HTTP     │  │ WebSocket │   │   │   │                      │
│   │  │ Server   │  │ Server    │   │   │   │ ┌────────────────┐   │
│   │  │ (static) │  │ (wss)     │   │   │   │ │   Firestore    │   │
│   │  └──────────┘  └─────┬─────┘   │   │   │ │  (Historial)   │   │
│   └───────────────────────┼────────┘   │   │ └────────────────┘   │
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
   │◀─── {tipo: "bienvenida", texto: "Eres          │
   │      Usuario_XXX"}                              │
   │                                                 │
   │◀─── {tipo: "historial", mensajes: [...]}       │ ← Últimos 20 msgs de Firestore
   │                                                 │
   │──── {tipo: "cambioNombre", nombre: "Juan"} ───▶│
   │                                                 │
   │                         ┌──────────────────────▶│ broadcast a TODOS:
   │◀────────────────────────┤ {tipo: "sistema",     │  "Walter se unió al chat"
   │                         └──────────────────────▶│
   │                                                 │
   │◀─── {tipo: "usuarios", lista: ["Walter",…]}      │ ← Lista actualizada
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
   │──▶ Clic en    │                        │                       │
   │   "Iniciar     │                        │                       │
   │   con Google"  │                        │                       │
   │                │──▶ signInWithPopup() ─▶│                      │
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
micelio/
│
├── client/                   # Frontend 
│   ├── index.html            # Interfaz principal del chat
│   ├── styles.css            # Estilos 
│   └── app.js                # Lógica cliente: WebSocket + Firebase Auth
│
├── server/                   # Backend (Node.js)
│   ├── server.js             # Servidor HTTP + WebSocket
│   └── firebase.js           # Inicialización de Firebase Admin SDK
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

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- Cuenta de Google con un proyecto Firebase creado
- Firestore habilitado en el proyecto Firebase
- Autenticación Google habilitada en Firebase Auth
- Tener instalado Live Server como extensión en Visual Studio Code (No es indispensable)

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

## Variables de Entorno

Crear el archivo `.env` en la raíz con el siguiente contenido:

```env
PORT=3000

FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@tu-proyecto.iam.gserviceaccount.com
```

> ⚠️ **Nunca subir el archivo `.env` al repositorio.** Este debe estar incluido en `.gitignore`.

---

## Ejecución

### 1. Iniciar el servidor

```bash
node server/server.js
```

Si todo está correcto, verás en la terminal:

```
Servidor en http://localhost:3000
WebSocket en ws://localhost:3000/ws
```

### 2. Abrir el cliente

Abre el archivo `client/index.html` con **Live Server** desde VS Code:

> Clic derecho sobre `index.html` → **Open with Live Server**

> ⚠️ **No abras el archivo directamente con doble clic** — los módulos ES6 y las conexiones WebSocket requieren que el HTML se sirva desde un servidor HTTP.

### 3. Probar el chat

Abre **dos o más pestañas** del navegador con la misma URL del Live Server. Cada pestaña será un usuario distinto, si y solo si no te conectas en Google, en el caso de que te autentiques tendrás que usar otro navegador o pestaña de incognito para que te reconozca como otro usuario. Con todo eso listo, podrás chatear entre ellas en tiempo real.

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
| `sistema` | `texto` | Notificación del sistema (join/leave) |
| `usuarios` | `lista[]` | Lista actualizada de conectados |

### Cliente → Servidor

| `tipo` | Campos adicionales | Descripción |
|--------|-------------------|-------------|
| `cambioNombre` | `nombre` | Confirmar/cambiar nombre de usuario |
| `mensaje` | `texto` | Enviar un mensaje al chat |

---

## Equipo de desarrollo

Desarrollado como proyecto para la materia de **Sistemas colaborativos**.

| Integrante | Contribuciones principales |
|------------|---------------------------|
| **Andy Santiago Rocha Claure** | Configuración inicial del repositorio, estructura del proyecto, documentación (README) |
| **小丽花** | Implementación del servidor WebSocket, integración Firebase Auth + Firestore, correcciones de bugs (nombre de usuario, lectura de historial, clave expuesta) |
| **Lenny Zoraida Calle Machaca** | Persistencia de mensajes y recuperación del historial, eliminación de clave de servicio expuesta |
| **Jhonatan Ortuño Caceres** | Cliente web y conexión WebSocket |
| **OB-789** | Gestión de usuarios y presencia, generador de nombres temporales |
| **Onmipresent1** | Estructura estándar del chat |
| **202010014-png** | Agregación de autenticación con Google |

### Historial de commits por integrante

**Andy Santiago Rocha Claure**
- `Initial commit` — estructura base del repositorio
- `docs: actualizar README con integrantes y descripcion`
- `Merge pull request #1 from SaantinoCorleone/configuracion-repositorio-y-estructura-...`

**小丽花** Nayra Oviedo Paco
- `Implementación del servidor-de WebSocket`
- `Merge branch 'Jhonatan-INT-01-cliente-web' into walter-autenticacion`
- `Mejora del chat con firebase`
- `Corrección de error de base de datos, auth y clave de exposición expuesta`
- `Merge branch 'walter-autenticacion' of https://github.com/SaantinoCorleone/SisCola...`
- `fix: remove exposed service account key`
- `Correciones de nombre de usuario al momento de entrar y salir, corrección de la lectura...`

**Lenny Zoraida Calle Machaca**
- `feat: add message persistence and history retrieval`
- `Remove exposed service account key`

**Jhonatan Ortuño Caceres**
- `feat: implementar cliente web y conexion WebSocket`

**OB-789** Orlando Condori Balderrama
- `feat(Gestion de usurios y presencia): Se implemento generador de nombres temporal...`

**Onmipresent1** Mannuel Antonio Guzman 
- `implementacion de estructura estandar para el chat`
- `Merge branch 'walter-autenticacion' of https://github.com/SaantinoCorleone/SisCola...`

**202010014-png** Walter Bullain Muñoz
- `AGRGACION DE AUTENTICACION CON GOOGLE`

---

## Licencia

Proyecto académico desarrollado para la materia de **Sistemas Colaborativos de la UMSS**.  
Uso educativo — sin licencia comercial.



> *"Micelio: la red invisible que conecta."* 🍄

> *"Micelio: la red invisible que conecta."* 🍄
