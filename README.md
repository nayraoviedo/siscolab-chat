# CollabSync - Chat Colaborativo en Tiempo Real

## Descripción del proyecto

CollabSync es una aplicación web SPA (Single Page Application) de mensajería colaborativa en tiempo real desarrollada mediante WebSocket. El sistema permite que múltiples usuarios se comuniquen simultáneamente dentro de una plataforma web utilizando comunicación bidireccional persistente entre cliente y servidor.

La aplicación fue desarrollada como parte de una práctica académica orientada al aprendizaje de tecnologías WebSocket, arquitecturas cliente-servidor y trabajo colaborativo utilizando Scrum y Git.

---

# Objetivo

Desarrollar un sistema de chat colaborativo en tiempo real que permita:

- Comunicación instantánea entre múltiples usuarios.
- Interacción simultánea mediante WebSocket.
- Visualización del historial de mensajes.
- Gestión automática de usuarios temporales.
- Persistencia básica de datos.
- Autenticación mediante proveedor externo.

---

# Características Principales

- Chat en tiempo real utilizando WebSocket.
- Interfaz web SPA.
- Múltiples usuarios conectados simultáneamente.
- Historial visible de mensajes.
- Notificaciones de conexión y desconexión.
- Asignación automática de nombres temporales.
- Persistencia de mensajes en base de datos.
- Autenticación OAuth.

---

# Arquitectura del Sistema

```text
Cliente Web (SPA)
        │
        ▼
Express API + WebSocket Server
        │
        ▼
MongoDB Database