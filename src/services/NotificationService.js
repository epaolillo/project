import apiService from './ApiService';
import WebSocketService from './WebSocketService';

/**
 * Notification Service
 * Handles all notification-related operations
 */
class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.isConnected = false;
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
  }

  /**
   * Connect to WebSocket and load initial notifications
   */
  async connect() {
    try {
      // Load existing notifications
      await this.loadNotifications();
      
      // Connect to WebSocket
      WebSocketService.connect();
      
      // Listen for WebSocket events
      WebSocketService.on('notification_created', this.handleWebSocketMessage);
      WebSocketService.on('notification_updated', this.handleWebSocketMessage);
      WebSocketService.on('notification_archived', this.handleWebSocketMessage);
      WebSocketService.on('notifications_marked_read', this.handleWebSocketMessage);
      
      this.isConnected = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Error connecting notification service:', error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    WebSocketService.off('notification_created', this.handleWebSocketMessage);
    WebSocketService.off('notification_updated', this.handleWebSocketMessage);
    WebSocketService.off('notification_archived', this.handleWebSocketMessage);
    WebSocketService.off('notifications_marked_read', this.handleWebSocketMessage);
    
    this.isConnected = false;
  }

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'notification_created':
        this.addNotification(data.notification);
        break;
      case 'notification_updated':
        this.updateNotification(data.notification);
        break;
      case 'notification_archived':
        this.removeNotification(data.notificationId);
        break;
      case 'notifications_marked_read':
        this.markAllAsRead();
        break;
      default:
        break;
    }
  }

  /**
   * Load notifications from API
   */
  async loadNotifications() {
    try {
      const response = await apiService.getNotifications();
      this.notifications = response || [];
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  /**
   * Get all notifications
   */
  getNotifications() {
    return this.notifications;
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications() {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Add notification to local state
   */
  addNotification(notification) {
    // Check if notification already exists
    const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
    
    if (existingIndex >= 0) {
      this.notifications[existingIndex] = notification;
    } else {
      this.notifications.unshift(notification);
    }
    
    this.notifyListeners();
  }

  /**
   * Update notification in local state
   */
  updateNotification(notification) {
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index >= 0) {
      this.notifications[index] = notification;
      this.notifyListeners();
    }
  }

  /**
   * Remove notification from local state
   */
  removeNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId) {
    try {
      await apiService.archiveNotification(notificationId);
      
      // Remove from local state
      this.removeNotification(notificationId);
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      await apiService.markAllNotificationsAsRead();
      
      // Update local state
      this.notifications.forEach(n => n.read = true);
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(notificationData) {
    try {
      const notification = await apiService.createNotification(notificationData);
      this.addNotification(notification);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener({
          notifications: this.notifications,
          unreadCount: this.getUnreadCount(),
          unreadNotifications: this.getUnreadNotifications()
        });
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  /**
   * Format notification time
   */
  formatTime(isoString) {
    const now = new Date();
    const notificationTime = new Date(isoString);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Hace un momento';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Hace ${days} día${days > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type) {
    switch (type) {
      case 'task_completed':
        return '✅';
      case 'task_assigned':
        return '📋';
      case 'help_requested':
        return '🆘';
      case 'feedback_received':
        return '💬';
      case 'user_deleted':
        return '🗑️';
      case 'task_deleted':
        return '🗑️';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type) {
    switch (type) {
      case 'task_completed':
        return '#28a745';
      case 'task_assigned':
        return '#007bff';
      case 'help_requested':
        return '#dc3545';
      case 'feedback_received':
        return '#17a2b8';
      case 'user_deleted':
        return '#dc3545';
      case 'task_deleted':
        return '#dc3545';
      case 'system':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
