# Project Task Manager

Sistema completo de gestión gamificada de tareas con backend, autenticación JWT, base de datos TingoDB y frontend React interactivo.

## 🚀 Características Principales

### 🔐 Sistema de Autenticación
- **Login seguro** con JWT tokens almacenados en cookies HTTP-only
- **Protección de rutas** con middleware de autenticación
- **Roles de usuario** (administrador, desarrollador)
- **Sesiones persistentes** con verificación automática

### 👨‍💼 Vista Manager (Administrador)
- **Layout landscape** con widgets del personal flotando sobre React Flow
- **Diagrama de flujos** interactivo con todas las tareas del proyecto
- **Modal UserDrawer** con:
  - Selector de tarea actual
  - Sistema de bitácora personal con timestamps
  - Avatar e información completa del usuario
- **Notificaciones en tiempo real** via WebSocket
- **Panel de estadísticas** dinámico

### 👨‍💻 Vista User (Usuario)
- **React Flow** personalizado con tareas del usuario
- **Sidebar** con información de tarea actual y controles
- **Tres botones principales**:
  - **Solicitar Ayuda**: Notifica a administradores
  - **Feedback**: Cuestionario sobre claridad y progreso
  - **Terminar tarea**: Marca como completada con notas
- **Bitácora personal** con persistencia en localStorage y base de datos

### 🗄️ Backend Completo
- **Express.js** con TingoDB para persistencia
- **API RESTful** completa con endpoints:
  - `/api/login` - Autenticación
  - `/api/tasks` - CRUD de tareas
  - `/api/persons` - CRUD de personas
  - `/api/incidents` - Gestión de incidentes
- **WebSocket** para comunicación en tiempo real
- **Middleware de autenticación** JWT para todas las rutas protegidas

## 🏗️ Arquitectura del Sistema

```
project/
├── Backend (Node.js + Express)
│   ├── server.js              # Servidor principal
│   ├── install.js             # Script instalación DB
│   ├── seed.js                # Script población datos
│   └── database/              # TingoDB files (auto-created)
│
├── Frontend (React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login/         # Autenticación
│   │   │   ├── UserDrawer/    # Modal usuario
│   │   │   ├── ReactFlow/     # Diagramas interactivos
│   │   │   └── UserWidget/    # Widgets personas
│   │   ├── layouts/
│   │   │   ├── ManagerLayout/ # Vista administrador
│   │   │   └── UserLayout/    # Vista usuario
│   │   ├── services/
│   │   │   ├── ApiService.js  # Cliente API REST
│   │   │   └── WebSocketService.js # Cliente WebSocket
│   │   └── data/              # Datos mock originales
│   └── package.json
```

## 📦 Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TingoDB** - Base de datos embebida (compatible MongoDB)
- **JWT** - Autenticación con tokens
- **bcryptjs** - Hash de contraseñas
- **Socket.io** - WebSocket en tiempo real
- **CORS** - Soporte cross-origin

### Frontend
- **React 18** - Framework UI
- **React Flow** - Diagramas interactivos
- **React Router** - Navegación SPA
- **Socket.io Client** - Cliente WebSocket
- **CSS Modular** - Estilos componentizados

## ⚡ Instalación y Configuración

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Base de Datos
```bash
# Inicializar base de datos y crear colecciones
npm run install-db

# Poblar con datos de prueba
npm run seed-db
```

### 3. Iniciar Servicios

**Terminal 1 - Backend:**
```bash
npm run server
# Servidor corriendo en http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm start
# React app en http://localhost:3000
```

## 🔑 Credenciales de Acceso

El sistema crea usuarios de prueba automáticamente:

### Administrador
- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Acceso:** Vista Manager completa

### Usuarios de Desarrollo
- **Usuario:** `alejandro`
- **Contraseña:** `password123`

- **Usuario:** `maria`
- **Contraseña:** `password123`

- **Usuario:** `carlos`
- **Contraseña:** `password123`

## 🌐 API Endpoints

### Autenticación
- `POST /api/login` - Iniciar sesión
- `POST /api/logout` - Cerrar sesión
- `GET /api/auth/status` - Estado autenticación

### Datos (requieren autenticación)
- `GET /api/tasks` - Obtener tareas
- `POST /api/tasks` - Crear tarea
- `PUT /api/tasks/:id` - Actualizar tarea
- `GET /api/persons` - Obtener personas
- `POST /api/persons` - Crear persona
- `PUT /api/persons/:id` - Actualizar persona
- `GET /api/incidents` - Obtener incidentes

### Utilidades
- `GET /api/health` - Estado del servidor
- `GET/POST /api/bitacora/:userId` - Bitácora usuario

## 🔄 Flujo de Trabajo

### Administrador
1. **Login** con credenciales admin
2. **Vista Manager** - Monitorea todo el equipo
3. **Click en UserWidget** → Abre modal UserDrawer
4. **Gestión de tareas** - Asigna y supervisa progreso
5. **Recibe notificaciones** en tiempo real

### Usuario
1. **Login** con credenciales personales
2. **Vista User** - Ve sus tareas asignadas
3. **Gestión personal**:
   - Actualizar progreso de tareas
   - Escribir en bitácora personal
   - Solicitar ayuda cuando necesario
   - Marcar tareas como completadas

## 📊 Datos del Sistema

### Usuarios Mock
- **10 desarrolladores** con métricas completas
- **Roles variados**: Mobile, Web, Backend, Frontend, DevOps, QA, etc.
- **Métricas de estado**: Cansancio, claridad, motivación
- **Tareas asignadas** por desarrollador

### Tareas Mock  
- **40+ tareas** con estados realistas
- **Tipos variados**: feature, bug, infrastructure, testing
- **Dependencias** entre tareas
- **Estimaciones** y progreso real

### Incidentes Mock
- **10 incidentes** con severidades variables
- **Estados**: open, in_progress, resolved
- **Información completa** de reproducción y afectación

## 🎮 Características de Gamificación

### Para Usuarios
- **Progress bars** visuales de métricas personales
- **Bitácora personal** como diario de trabajo
- **Sistema de feedback** para mejorar claridad
- **Notificaciones de logros** al completar tareas

### Para Administradores
- **Dashboard visual** con estado del equipo
- **Métricas en tiempo real** de productividad
- **Alertas proactivas** cuando se necesita ayuda
- **Vista consolidada** del roadmap del proyecto

## 🔧 Scripts Disponibles

### Producción
- `npm run server` - Iniciar servidor backend
- `npm start` - Iniciar frontend React

### Desarrollo
- `npm run server:dev` - Servidor con auto-reload
- `npm run install-db` - Configurar base de datos
- `npm run seed-db` - Poblar datos de prueba

### Base de Datos
- `install.js` - Crea colecciones e índices, usuario admin
- `seed.js` - Inserta datos mock en colecciones

## 🛡️ Seguridad

### Backend
- **JWT tokens** con expiración 24h
- **Contraseñas hasheadas** con bcryptjs
- **Cookies HTTP-only** para prevenir XSS  
- **CORS configurado** para frontend específico
- **Middleware de autenticación** en rutas protegidas

### Frontend
- **Verificación automática** de tokens
- **Redirection automático** al login si token inválido
- **Eventos de autenticación** para manejo global
- **LocalStorage** solo para datos no sensibles

## 🎯 Próximas Mejoras

### Backend
- [ ] Rate limiting en API
- [ ] Logs estructurados
- [ ] Tests automatizados
- [ ] Docker containerization
- [ ] Base de datos externa (MongoDB/PostgreSQL)

### Frontend
- [ ] Tests de componentes
- [ ] Modo offline
- [ ] PWA capabilities
- [ ] Internacionalización i18n
- [ ] Modo oscuro

### Funcionalidades
- [ ] Notificaciones push del navegador
- [ ] Integración con calendarios
- [ ] Reportes exportables
- [ ] API para integraciones externas
- [ ] Sistema de roles granulares

## 🐛 Solución de Problemas

### El backend no inicia
```bash
# Verificar puerto disponible
netstat -tulpn | grep :5000

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Base de datos corrupta
```bash
# Eliminar y recrear
rm -rf database/
npm run install-db
npm run seed-db
```

### Error de autenticación
```bash
# Limpiar cookies y localStorage
# En DevTools: Application > Storage > Clear All
```

### Puerto ya en uso
```bash
# Cambiar puerto en server.js
const PORT = process.env.PORT || 5001;
```

## 📝 Logs y Debugging

### Backend Logs
- Conexiones WebSocket
- Requests API con respuestas
- Errores de base de datos
- Eventos de autenticación

### Frontend DevTools
- Network tab para llamadas API
- Console para eventos WebSocket
- Application tab para cookies/localStorage
- React DevTools para estado componentes
