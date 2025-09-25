# Sistema de Notificaciones

## 📖 Historia del Flujo

Cuando en el código se dispara una notificación para el usuario de ID 1, si este usuario está logueado en algún browser (o varios), se dispara una (o más) notificaciones a esos browsers donde se encuentra el usuario. Además se genera una fila en la DB en la collection notifications. Cuando el usuario lee la notificación se marca como leída.

El sistema funciona de la siguiente manera: el servidor crea la notificación en la base de datos y la emite a través de WebSocket a todos los clientes conectados. El frontend recibe la notificación, la almacena localmente y la muestra en la campanita. Si el usuario abre el dropdown de notificaciones, todas las notificaciones se marcan automáticamente como leídas. El sistema también muestra toasts para notificaciones importantes como eliminación de usuarios o tareas.

## 📋 Descripción General

El sistema de notificaciones proporciona una forma centralizada de mostrar notificaciones en tiempo real a los usuarios. Está diseñado para ser escalable, fácil de usar y consistente en toda la aplicación.

## 🏗️ Arquitectura

### Componentes Principales

1. **NotificationService** (`src/services/NotificationService.js`)
   - Servicio central que maneja todas las notificaciones
   - Se conecta al WebSocket para recibir notificaciones en tiempo real
   - Gestiona el estado local de las notificaciones
   - Proporciona métodos para crear, leer, archivar y marcar notificaciones

2. **NotificationBell** (`src/components/NotificationBell/NotificationBell.jsx`)
   - Componente UI que muestra el ícono de la campanita
   - Incluye contador de notificaciones no leídas
   - Dropdown con lista de notificaciones
   - Funcionalidad para marcar como leídas

3. **WebSocketService** (`src/services/WebSocketService.js`)
   - Maneja la conexión WebSocket con el servidor
   - Escucha eventos de notificaciones en tiempo real
   - Reenvía eventos al NotificationService

4. **Servidor** (`server.js`)
   - Endpoints REST para CRUD de notificaciones
   - Función `createNotification()` para crear notificaciones
   - Emisión de eventos WebSocket para notificaciones en tiempo real

## 🔄 Flujo de Notificaciones

### 1. Creación de Notificación

```javascript
// En el servidor (server.js)
const createNotification = (userId, type, title, message, data = {}) => {
  const notification = {
    id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title,
    message,
    data,
    read: false,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  notifications.insert(notification, (err, result) => {
    if (err) {
      console.error('Error creating notification:', err);
      return;
    }
    
    // Emitir evento WebSocket
    io.emit('notification_created', { 
      type: 'notification_created', 
      notification: notification 
    });
  });
};
```

### 2. Recepción en Tiempo Real

```javascript
// En el frontend (Layout.jsx)
webSocketService.on('notification_created', (data) => {
  console.log('🔔 New notification received via WebSocket:', data);
  // Reenviar al NotificationService
  notificationService.handleWebSocketMessage(data);
});
```

### 3. Procesamiento y Almacenamiento

```javascript
// En NotificationService
handleWebSocketMessage(data) {
  // Extraer datos del array si es necesario
  const notificationData = Array.isArray(data) ? data[0] : data;
  
  if (notificationData.type === 'notification_created' && notificationData.notification) {
    this.addNotification(notificationData.notification);
  }
}

addNotification(notification) {
  // Verificar si ya existe
  const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
  
  if (existingIndex >= 0) {
    this.notifications[existingIndex] = notification;
  } else {
    this.notifications.unshift(notification);
    // Mostrar toast para tipos específicos
    this.showNotificationToast(notification);
  }
  
  this.notifyListeners();
}
```

### 4. Actualización de UI

```javascript
// En NotificationBell
useEffect(() => {
  const unsubscribe = notificationService.subscribe((data) => {
    const limitedNotifications = data.notifications.slice(0, 5);
    setNotifications(limitedNotifications);
    setUnreadCount(data.unreadCount);
  });

  notificationService.connect();
  
  return () => {
    unsubscribe();
    notificationService.disconnect();
  };
}, []);
```

## 🎯 Tipos de Notificaciones

### Tipos Soportados

| Tipo | Descripción | Icono | Color |
|------|-------------|-------|-------|
| `user_deleted` | Usuario eliminado | 🗑️ | Rojo |
| `task_deleted` | Tarea eliminada | 🗑️ | Rojo |
| `task_completed` | Tarea completada | ✅ | Verde |
| `help_requested` | Solicitud de ayuda | 🆘 | Rojo |
| `feedback_received` | Feedback recibido | 💬 | Azul |
| `system` | Notificación del sistema | 🔔 | Gris |

### Agregar Nuevo Tipo

1. **Actualizar el servidor** para crear notificaciones del nuevo tipo:

```javascript
// En server.js
createNotification(
  userId,
  'nuevo_tipo', // Nuevo tipo
  'Título de la Notificación',
  'Mensaje descriptivo',
  { /* datos adicionales */ }
);
```

2. **Actualizar NotificationService** para mostrar toasts:

```javascript
// En NotificationService.js
showNotificationToast(notification) {
  const shouldShowToast = [
    'user_deleted',
    'task_deleted', 
    'task_completed',
    'help_requested',
    'nuevo_tipo' // Agregar aquí
  ].includes(notification.type);
  
  // ... resto del código
}
```

3. **Actualizar NotificationBell** para el icono y estilo:

```javascript
// En NotificationBell.jsx
const getNotificationIcon = (type) => {
  switch (type) {
    case 'nuevo_tipo':
      return '🆕'; // Nuevo icono
    // ... otros casos
  }
};

const getNotificationTypeClass = (type) => {
  switch (type) {
    case 'nuevo_tipo':
      return 'nuevo-tipo'; // Nueva clase CSS
    // ... otros casos
  }
};
```

4. **Agregar estilos CSS**:

```css
/* En NotificationBell.css */
.notification-item-icon.nuevo-tipo {
  background: #e3f2fd;
  color: #1976d2;
}
```

## 🚀 Cómo Usar el Sistema

### Crear una Notificación

```javascript
// Desde cualquier parte del código
import notificationService from '../services/NotificationService';

// Crear notificación local (solo frontend)
notificationService.createNotification({
  type: 'custom',
  title: 'Mi Notificación',
  message: 'Este es un mensaje personalizado',
  data: { customField: 'valor' }
});
```

### Escuchar Cambios

```javascript
// Suscribirse a cambios de notificaciones
const unsubscribe = notificationService.subscribe((data) => {
  console.log('Notificaciones actualizadas:', data.notifications);
  console.log('No leídas:', data.unreadCount);
});

// Limpiar suscripción
unsubscribe();
```

### Marcar como Leída

```javascript
// Marcar notificación específica como leída
await notificationService.markAsRead(notificationId);

// Marcar todas como leídas
await notificationService.markAllAsRead();
```

### Archivar Notificación

```javascript
// Archivar notificación
await notificationService.archiveNotification(notificationId);
```

## 🔧 Configuración

### Límites y Configuración

```javascript
// En NotificationBell.jsx
// Límite de notificaciones mostradas
const limitedNotifications = data.notifications.slice(0, 5);

// En NotificationService.js
// Tipos que muestran toast
const shouldShowToast = [
  'user_deleted',
  'task_deleted', 
  'task_completed',
  'help_requested'
].includes(notification.type);
```

### Personalización de Toasts

```javascript
// En NotificationService.js
showNotificationToast(notification) {
  if (shouldShowToast) {
    window.dispatchEvent(new CustomEvent('showNotificationToast', {
      detail: {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        duration: 5000 // Duración personalizable
      }
    }));
  }
}
```

## 📱 API del Servidor

### Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/notifications` | Obtener notificaciones del usuario |
| POST | `/api/notifications` | Crear nueva notificación |
| PUT | `/api/notifications/:id/read` | Marcar como leída |
| PUT | `/api/notifications/:id/archive` | Archivar notificación |
| PUT | `/api/notifications/mark-all-read` | Marcar todas como leídas |

### Estructura de Notificación

```javascript
{
  id: "notification-1234567890-abc123",
  userId: "user-123",
  type: "user_deleted",
  title: "Usuario Eliminado",
  message: "Has eliminado exitosamente al usuario...",
  data: {
    deletedUserId: "user-456",
    deletedUserName: "Juan Pérez",
    tasksUpdated: 3
  },
  read: false,
  archived: false,
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

## 🐛 Debugging

### Logs de Debug

El sistema incluye logs detallados para debugging:

```javascript
// En NotificationService.js
console.log('🔔 Adding notification to local state:', notification);
console.log('🔔 Notifying listeners:', {
  totalNotifications: this.notifications.length,
  unreadCount,
  unreadNotifications: unreadNotifications.length
});

// En WebSocketService.js
console.log('🔔 Socket.io event received:', eventName, args);

// En server.js
console.log('🔔 Server emitting notification_created:', { 
  type: 'notification_created', 
  notification: result 
});
```

### Verificar Estado

```javascript
// Verificar estado del servicio
console.log('Notificaciones:', notificationService.getNotifications());
console.log('No leídas:', notificationService.getUnreadCount());
console.log('Conectado:', notificationService.isConnected);
```

## 🔄 Extensión del Sistema

### Agregar Notificaciones a Nuevas Funcionalidades

1. **Identificar el evento** que debe generar la notificación
2. **Crear la notificación** usando `createNotification()`
3. **Definir el tipo** y agregarlo a los tipos soportados
4. **Personalizar el mensaje** y datos adicionales
5. **Probar** la funcionalidad completa

### Ejemplo: Notificación de Tarea Asignada

```javascript
// En el servidor, cuando se asigna una tarea
const assignTask = async (taskId, userId) => {
  // ... lógica de asignación
  
  // Crear notificación
  createNotification(
    userId,
    'task_assigned',
    'Nueva Tarea Asignada',
    `Se te ha asignado la tarea: "${task.title}"`,
    {
      taskId: taskId,
      taskTitle: task.title,
      assignedBy: currentUser.name
    }
  );
};
```

## 📊 Métricas y Monitoreo

### Estadísticas Disponibles

```javascript
// Obtener estadísticas de notificaciones
const stats = {
  total: notificationService.getNotifications().length,
  unread: notificationService.getUnreadCount(),
  byType: notificationService.getNotifications().reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {})
};
```

## 🚨 Consideraciones de Rendimiento

### Optimizaciones Implementadas

1. **Límite de notificaciones mostradas** (5 en el dropdown)
2. **Deduplicación** de notificaciones por ID
3. **Ordenamiento eficiente** por fecha de creación
4. **Limpieza automática** de listeners
5. **Debounce** en operaciones de escritura

### Recomendaciones

- No crear más de 100 notificaciones por usuario
- Archivar notificaciones antiguas regularmente
- Usar paginación para listas grandes
- Implementar limpieza automática de notificaciones muy antiguas

## 🔒 Seguridad

### Consideraciones de Seguridad

1. **Autenticación requerida** para todos los endpoints
2. **Filtrado por usuario** - solo se muestran notificaciones del usuario actual
3. **Validación de datos** en el servidor
4. **Sanitización** de mensajes de notificación
5. **Rate limiting** para prevenir spam

## 📝 Changelog

### v1.0.0
- Sistema básico de notificaciones
- Soporte para WebSocket en tiempo real
- Componente NotificationBell
- Tipos básicos de notificaciones
- Sistema de toasts integrado

### v1.1.0
- Eliminación de duplicados
- Optimización de rendimiento
- Mejoras en debugging
- Documentación completa

---

*Última actualización: Enero 2024*
