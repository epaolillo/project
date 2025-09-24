/**
 * WebSocket service for real-time communication
 * Handles notifications and real-time updates between users and managers
 */
class WebSocketService {
  constructor(config = {}) {
    this.url = config.url || 'ws://localhost:3001';
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectInterval = config.reconnectInterval || 5000;
    this.listeners = new Map();
    this.mockMode = config.mockMode !== undefined ? config.mockMode : true;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.mockMode) {
      console.log('WebSocket: Running in mock mode');
      this.simulateConnection();
      return;
    }

    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }

  /**
   * Simulate WebSocket connection for development/testing
   */
  simulateConnection() {
    setTimeout(() => {
      this.emit('connected');
    }, 100);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.mockMode) {
      console.log('WebSocket Mock: Sending message', message);
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Handle incoming messages
   */
  handleMessage(data) {
    const { type, payload } = data;
    this.emit(type, payload);
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
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(eventType, data = null) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Notify managers when a user completes a task
   */
  notifyTaskCompletion(userId, taskId, completionNotes) {
    this.send({
      type: 'task_completed',
      payload: {
        userId,
        taskId,
        completionNotes,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Notify managers when a user requests help
   */
  notifyHelpRequest(userId, taskId, message) {
    this.send({
      type: 'help_requested',
      payload: {
        userId,
        taskId,
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send user feedback update
   */
  sendFeedbackUpdate(userId, feedback) {
    this.send({
      type: 'user_feedback',
      payload: {
        userId,
        feedback,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Create a default instance
const webSocketService = new WebSocketService({
  mockMode: true
});

export default webSocketService;
