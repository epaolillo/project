import { io } from 'socket.io-client';

/**
 * WebSocket service for real-time communication using Socket.io
 * Handles notifications and real-time updates between users and managers
 */
class WebSocketService {
  constructor(config = {}) {
    this.url = config.url || 'http://localhost:5000';
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectInterval = config.reconnectInterval || 5000;
    this.listeners = new Map();
    this.isConnected = false;
  }

  /**
   * Connect to Socket.io server
   */
  connect() {
    if (this.socket && this.socket.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });
      
      this.socket.on('connect', () => {
        console.log('🔔 Socket.io connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected:', reason);
        this.isConnected = false;
        this.emit('disconnected', reason);
        
        // Attempt to reconnect if not manually disconnected
        if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        this.emit('error', error);
      });

      // Listen for all events and forward them to our event system
      this.socket.onAny((eventName, ...args) => {
        console.log('🔔 Socket.io event received:', eventName, args);
        this.emit(eventName, ...args);
      });

    } catch (error) {
      console.error('Error connecting to Socket.io:', error);
      this.emit('error', error);
    }
  }

  /**
   * Attempt to reconnect to the server
   */
  attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Send message to server
   */
  send(eventName, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn('Socket.io is not connected');
    }
  }

  /**
   * Add event listener
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Remove event listener
   */
  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(eventType, ...args) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create a default instance
const webSocketService = new WebSocketService();

export default webSocketService;