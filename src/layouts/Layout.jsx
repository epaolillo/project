import React, { useState, useEffect, useCallback } from 'react';
import FlowDiagram from '../components/ReactFlow/FlowDiagram';
import UserWidget from '../components/UserWidget/UserWidget';
import UserDrawer from '../components/UserDrawer/UserDrawer';
import TaskDrawer from '../components/TaskDrawer/TaskDrawer';
import NotificationBell from '../components/NotificationBell/NotificationBell';
import ToastContainer from '../components/Toast/Toast';
import apiService from '../services/ApiService';
import webSocketService from '../services/WebSocketService';
import notificationService from '../services/NotificationService';
import { getTaskStatistics } from '../utils/flowUtils';
import './Layout.css';

/**
 * Main layout component with user overlay and React Flow diagram
 * Displays team overview with user widgets floating over the task flow
 */
const Layout = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  
  // UserDrawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  
  // TaskDrawer state
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [lastUpdatedTask, setLastUpdatedTask] = useState(null);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, unifiedTasksData] = await Promise.all([
        apiService.getUsers(),
        apiService.getAllTasks()
      ]);

      const tasksData = unifiedTasksData.filter(t => t.task_type === 'task');
      const incidentsData = unifiedTasksData.filter(t => t.task_type === 'incident');

      setUsers(usersData);
      setTasks(unifiedTasksData); // Store all unified tasks
      setIncidents(incidentsData);
      setStatistics(getTaskStatistics(unifiedTasksData));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Setup WebSocket listeners for real-time updates
    const handleTaskCompleted = (data) => {
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === data.taskId 
          ? { ...task, status: 'completed' }
          : task
      ));
    };

    const handleHelpRequested = (data) => {
      // Show toast notification
      addToast({
        type: 'help-requested',
        title: 'Solicitud de Ayuda',
        message: `Usuario solicita ayuda: ${data.message}`,
        duration: 5000
      });
    };

    const handleUserFeedback = (data) => {
      // Update user metrics based on feedback
      setUsers(prev => prev.map(user =>
        user.id === data.userId
          ? {
              ...user,
              taskClarity: data.feedback.taskClarity || user.taskClarity,
              lastUpdate: new Date().toISOString()
            }
          : user
      ));
    };

    const handlePersonDeleted = (data) => {
      // This is handled directly in UserDrawer now for immediate UI update
      // This WebSocket event is mainly for other clients connected to the system
      console.log('Person deleted via WebSocket:', data);
    };

    // Setup notification service
    const unsubscribe = notificationService.subscribe((data) => {
      // Show toast for new unread notifications
      if (data.unreadNotifications.length > 0) {
        const latestNotification = data.unreadNotifications[0];
        addToast({
          type: latestNotification.type,
          title: latestNotification.title,
          message: latestNotification.message,
          duration: 5000
        });
      }
    });

    webSocketService.on('task_completed', handleTaskCompleted);
    webSocketService.on('help_requested', handleHelpRequested);
    webSocketService.on('user_feedback', handleUserFeedback);
    webSocketService.on('person_deleted', handlePersonDeleted);
    webSocketService.connect();

    return () => {
      unsubscribe();
      webSocketService.off('task_completed', handleTaskCompleted);
      webSocketService.off('help_requested', handleHelpRequested);
      webSocketService.off('user_feedback', handleUserFeedback);
      webSocketService.off('person_deleted', handlePersonDeleted);
    };
  }, [loadData]);

  const handleUserClick = (user) => {
    setDrawerUser(user);
    setIsDrawerOpen(true);
    setSelectedUser(user);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setDrawerUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    // Update user in the local state
    setUsers(prev => prev.map(user => 
      user.id === updatedUser.id 
        ? { ...updatedUser }
        : user
    ));
    
    // If the user's current task changed, optionally update task status
    if (updatedUser.currentTaskId) {
      setTasks(prev => prev.map(task => 
        task.id === updatedUser.currentTaskId 
          ? { ...task, status: 'in_progress', updatedAt: new Date().toISOString() }
          : task
      ));
    }
    
    console.log('User updated:', updatedUser);
  };

  const handleUserDeleted = (userId, result) => {
    // Remove the deleted user from the users list immediately
    setUsers(prev => prev.filter(user => user.id !== userId));
    
    // Update tasks to remove assignee information
    setTasks(prev => prev.map(task => 
      task.assignedTo === userId
        ? { ...task, assignedTo: '', assigneeName: '' }
        : task
    ));
    
    // Show success toast
    addToast({
      type: 'success',
      title: 'Usuario Eliminado',
      message: `Usuario eliminado exitosamente. Tareas desasignadas: ${result.tasksUpdated}`,
      duration: 5000
    });
  };

  const handleTaskSelect = (taskData) => {
    setSelectedTask(taskData);
    setIsTaskDrawerOpen(true);
  };

  const handleTaskDrawerClose = () => {
    setIsTaskDrawerOpen(false);
  };

  const handleTaskUpdate = (updatedTask) => {
    if (updatedTask.deleted) {
      // This task was deleted, remove it from the list
      setTasks(prev => prev.filter(task => task.id !== updatedTask.id));
      setSelectedTask(null);
      // Signal React Flow to remove the node
      setLastUpdatedTask({ ...updatedTask, _timestamp: Date.now() });
    } else if (updatedTask.isNew) {
      // This is a new task, add it to the list
      setTasks(prev => [...prev, updatedTask]);
      // Update selected task
      setSelectedTask(updatedTask);
      // Set updated task for React Flow to update specifically (avoids full reload)
      setLastUpdatedTask({ ...updatedTask, _timestamp: Date.now() });
    } else {
      // This is an existing task, update it
      setTasks(prev => prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      // Update selected task
      setSelectedTask(updatedTask);
      // Set updated task for React Flow to update specifically (avoids full reload)
      setLastUpdatedTask({ ...updatedTask, _timestamp: Date.now() });
    }
  };

  const handleCreateTask = () => {
    // Create a new empty task template
    const newTask = {
      id: `task-${Date.now()}`, // Temporary ID, will be replaced by server
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      type: 'feature',
      task_type: 'task',
      assignedTo: '',
      assigneeName: '',
      estimatedHours: 0,
      completedHours: 0,
      severity: 'medium',
      affectedUsers: 0,
      position: { x: 100, y: 100 }, // Default position
      isNew: true // Flag to indicate this is a new task
    };
    
    setSelectedTask(newTask);
    setIsTaskDrawerOpen(true);
  };

  // Toast management
  const addToast = (toastData) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toastData, id }]);
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  if (loading) {
    return (
      <div className="layout loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      {/* Floating notification bell */}
      <NotificationBell className="floating-notification-bell" />
      
      {/* Floating create task button */}
      <button 
        className="floating-create-task-button"
        onClick={() => handleCreateTask()}
        title="Crear nueva tarea"
      >
        +
      </button>

      <div className="layout-content">
        {/* User widgets overlay */}
        <div className="users-overlay">
          <div className="users-panel">
            <div className="users-list">
              {users.map(user => (
                <UserWidget
                  key={user.id}
                  user={user}
                  onClick={handleUserClick}
                  className={selectedUser?.id === user.id ? 'selected' : ''}
                />
              ))}
            </div>
          </div>
        </div>

        {/* React Flow diagram */}
        <div className="flow-container">
          <FlowDiagram
            onTaskSelect={handleTaskSelect}
            selectedTaskId={selectedTask?.id}
            showIncidents={true}
            tasks={tasks}
            users={users}
            updatedTask={lastUpdatedTask}
          />
        </div>

      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* User Drawer Modal */}
      <UserDrawer
        user={drawerUser}
        tasks={tasks}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onUserUpdate={handleUserUpdate}
        onUserDeleted={handleUserDeleted}
      />

      {/* Task Drawer Modal */}
      <TaskDrawer
        task={selectedTask}
        isOpen={isTaskDrawerOpen}
        onClose={handleTaskDrawerClose}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  );
};

export default Layout;
