/**
 * API service for communicating with the backend server
 * Handles authentication, JWT tokens, and all API endpoints
 */
class ApiService {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'http://localhost:5000/api';
    this.timeout = config.timeout || 10000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    };
  }

  /**
   * Generic HTTP request method with JWT authentication
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: { ...this.defaultHeaders },
      credentials: 'include', // Include cookies for JWT
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      // Handle authentication errors
      if (response.status === 401) {
        // Token expired or invalid
        this.handleAuthenticationError();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return {};
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Handle authentication errors
   */
  handleAuthenticationError() {
    // Clear any stored authentication state
    localStorage.removeItem('user');
    
    // Emit custom event for authentication failure
    window.dispatchEvent(new CustomEvent('authenticationFailed'));
  }

  // Authentication methods

  /**
   * Login with username and password
   */
  async login(credentials) {
    return await this.request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  /**
   * Logout and clear authentication
   */
  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('user');
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus() {
    try {
      return await this.request('/auth/status');
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { authenticated: false };
      }
      throw error;
    }
  }

  // Data fetching methods

  /**
   * Get all users with role 'user' for the sidebar
   */
  async getUsers() {
    return await this.request('/users');
  }

  /**
   * Get all users including admin users
   */
  async getAllUsers() {
    return await this.request('/users/all');
  }

  /**
   * Get all tasks (assigned and unassigned)
   */
  async getTasks() {
    return await this.request('/tasks?task_type=task');
  }

  /**
   * Get all incidents/bugs
   */
  async getIncidents() {
    return await this.request('/tasks?task_type=incident');
  }

  /**
   * Get all unified tasks and incidents
   */
  async getAllTasks() {
    return await this.request('/tasks');
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const users = await this.getUsers();
    return users.find(user => user.id === userId);
  }

  /**
   * Get tasks assigned to a specific user
   */
  async getTasksByUser(userId) {
    const tasks = await this.getTasks();
    return tasks.filter(task => task.assignedTo === userId);
  }

  /**
   * Get unassigned tasks
   */
  async getUnassignedTasks() {
    const tasks = await this.getTasks();
    return tasks.filter(task => !task.assignedTo);
  }

  // Data modification methods

  /**
   * Create a new task
   */
  async createTask(taskData) {
    return await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  /**
   * Update task
   */
  async updateTask(taskId, updateData) {
    return await this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    return await this.request(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId, newStatus, completionNotes = '') {
    return await this.updateTask(taskId, { 
      status: newStatus, 
      completionNotes,
      ...(newStatus === 'completed' && { completedAt: new Date().toISOString() })
    });
  }

  /**
   * Archive or unarchive a task
   */
  async archiveTask(taskId, archived = true) {
    return await this.request(`/tasks/${taskId}/archive`, {
      method: 'PUT',
      body: JSON.stringify({ archived })
    });
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    return await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    return await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  /**
   * Delete user and clean up all related data
   */
  async deleteUser(userId) {
    return await this.request(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Update user's current task
   */
  async updateUserCurrentTask(userId, taskId) {
    return await this.updateUser(userId, { 
      currentTaskId: taskId,
      lastUpdate: new Date().toISOString()
    });
  }

  /**
   * Update user feedback/metrics
   */
  async submitUserFeedback(userId, feedback) {
    const updateData = {
      ...feedback,
      lastUpdate: new Date().toISOString()
    };
    return await this.updateUser(userId, updateData);
  }

  /**
   * Upload user avatar
   */
  async uploadUserAvatar(userId, file) {
    const formData = new FormData();
    formData.append('avatar', file);

    return await fetch(`${this.baseURL}/users/${userId}/avatar`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    }).then(response => {
      if (!response.ok) {
        return response.json().then(error => Promise.reject(new Error(error.error || 'Upload failed')));
      }
      return response.json();
    });
  }

  /**
   * Delete user avatar
   */
  async deleteUserAvatar(userId) {
    return await this.request(`/users/${userId}/avatar`, {
      method: 'DELETE'
    });
  }

  // Flow-specific methods

  /**
   * Update task position
   */
  async updateTaskPosition(taskId, position) {
    return await this.request(`/tasks/${taskId}/position`, {
      method: 'PUT',
      body: JSON.stringify({ position })
    });
  }

  /**
   * Batch update task positions
   */
  async updateTaskPositions(updates) {
    return await this.request('/tasks/positions/batch', {
      method: 'PUT',
      body: JSON.stringify({ updates })
    });
  }

  /**
   * Get all edges
   */
  async getEdges() {
    return await this.request('/edges');
  }

  /**
   * Create new edge
   */
  async createEdge(edgeData) {
    return await this.request('/edges', {
      method: 'POST',
      body: JSON.stringify(edgeData)
    });
  }

  /**
   * Update edge
   */
  async updateEdge(edgeId, edgeData) {
    return await this.request(`/edges/${edgeId}`, {
      method: 'PUT',
      body: JSON.stringify(edgeData)
    });
  }

  /**
   * Delete edge
   */
  async deleteEdge(edgeId) {
    return await this.request(`/edges/${edgeId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Batch update edges
   */
  async updateEdges(edges) {
    return await this.request('/edges/batch', {
      method: 'PUT',
      body: JSON.stringify({ edges })
    });
  }

  /**
   * Request help for a task
   */
  async requestHelp(userId, taskId, message) {
    // In a real implementation, this might create a help request record
    // For now, we'll just log it and could emit via WebSocket
    console.log(`Help requested by user ${userId} for task ${taskId}: ${message}`);
    return { success: true, helpRequestId: `help-${Date.now()}`, userId, taskId, message };
  }

  // Bitacora methods

  /**
   * Get bitacora entries for a user
   */
  async getBitacora(userId) {
    return await this.request(`/bitacora/${userId}`);
  }

  /**
   * Add log entry to user's bitacora
   */
  async addLogEntry(userId, entry) {
    return await this.request(`/bitacora/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ entry })
    });
  }

  // Notification methods

  /**
   * Get all notifications for the current user
   */
  async getNotifications(includeArchived = false) {
    const params = includeArchived ? '?include_archived=true' : '';
    return await this.request(`/notifications${params}`);
  }

  /**
   * Create a new notification
   */
  async createNotification(notificationData) {
    return await this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    });
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId) {
    return await this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId) {
    return await this.request(`/notifications/${notificationId}/archive`, {
      method: 'PUT'
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead() {
    return await this.request('/notifications/mark-all-read', {
      method: 'PUT'
    });
  }

  // Utility methods

  /**
   * Health check
   */
  async healthCheck() {
    return await this.request('/health');
  }

  /**
   * Get server status and statistics
   */
  async getServerStats() {
    try {
      const [users, tasks, incidents] = await Promise.all([
        this.getUsers(),
        this.getTasks(),
        this.getIncidents()
      ]);

      return {
        users: users.length,
        tasks: tasks.length,
        incidents: incidents.length,
        tasksCompleted: tasks.filter(t => t.status === 'completed').length,
        tasksInProgress: tasks.filter(t => t.status === 'in_progress').length,
        tasksPending: tasks.filter(t => t.status === 'pending').length,
        incidentsOpen: incidents.filter(i => i.status === 'open').length,
        incidentsCritical: incidents.filter(i => i.severity === 'critical').length
      };
    } catch (error) {
      console.error('Error getting server stats:', error);
      return null;
    }
  }
}

// Create a default instance
const apiService = new ApiService();

export default apiService;
