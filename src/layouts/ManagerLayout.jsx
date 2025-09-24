import React, { useState, useEffect, useCallback } from 'react';
import FlowDiagram from '../components/ReactFlow/FlowDiagram';
import UserWidget from '../components/UserWidget/UserWidget';
import UserDrawer from '../components/UserDrawer/UserDrawer';
import TaskDrawer from '../components/TaskDrawer/TaskDrawer';
import apiService from '../services/ApiService';
import webSocketService from '../services/WebSocketService';
import { getTaskStatistics } from '../utils/flowUtils';
import './ManagerLayout.css';

/**
 * Manager layout component with user overlay and React Flow diagram
 * Displays team overview with user widgets floating over the task flow
 */
const ManagerLayout = () => {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      console.error('Error loading manager data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Setup WebSocket listeners for real-time updates
    const handleTaskCompleted = (data) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'task_completed',
        message: `Usuario completó una tarea: ${data.taskId}`,
        userId: data.userId,
        timestamp: new Date(),
        data
      }, ...prev.slice(0, 9)]); // Keep last 10 notifications

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === data.taskId 
          ? { ...task, status: 'completed' }
          : task
      ));
    };

    const handleHelpRequested = (data) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'help_requested',
        message: `Usuario solicita ayuda: ${data.message}`,
        userId: data.userId,
        taskId: data.taskId,
        timestamp: new Date(),
        data
      }, ...prev.slice(0, 9)]);
    };

    const handleUserFeedback = (data) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'user_feedback',
        message: `Usuario envió feedback`,
        userId: data.userId,
        timestamp: new Date(),
        data
      }, ...prev.slice(0, 9)]);

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

    webSocketService.on('task_completed', handleTaskCompleted);
    webSocketService.on('help_requested', handleHelpRequested);
    webSocketService.on('user_feedback', handleUserFeedback);
    webSocketService.connect();

    return () => {
      webSocketService.off('task_completed', handleTaskCompleted);
      webSocketService.off('help_requested', handleHelpRequested);
      webSocketService.off('user_feedback', handleUserFeedback);
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

  const handleTaskChange = (userId, taskId) => {
    // Update user's current task in the local state
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, currentTaskId: taskId, lastUpdate: new Date().toISOString() }
        : user
    ));
    
    // Optionally, also update the task status
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: 'in_progress' }
        : task
    ));
  };

  const handleBitacoraAdd = (userId, bitacoraEntry) => {
    // Handle bitacora entry addition - could send to WebSocket or API
    console.log('New bitacora entry for user', userId, ':', bitacoraEntry);
    
    // Update user's last update time
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, lastUpdate: new Date().toISOString() }
        : user
    ));
  };

  const handleTaskSelect = (taskData) => {
    setSelectedTask(taskData);
    setIsTaskDrawerOpen(true);
  };

  const handleTaskDrawerClose = () => {
    setIsTaskDrawerOpen(false);
  };

  const handleTaskUpdate = (updatedTask) => {
    // Update local tasks state
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    
    // Update selected task
    setSelectedTask(updatedTask);
    
    // Set updated task for React Flow to update specifically (avoids full reload)
    setLastUpdatedTask({ ...updatedTask, _timestamp: Date.now() });
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  if (loading) {
    return (
      <div className="manager-layout loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Cargando panel de administrador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-layout">

      <div className="manager-content">
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

      {/* Notifications panel */}
      {notifications.length > 0 && (
        <div className="notifications-panel">
          <h3>Notificaciones en tiempo real</h3>
          <div className="notifications-list">
            {notifications.slice(0, 5).map(notification => (
              <div key={notification.id} className={`notification ${notification.type}`}>
                <div className="notification-content">
                  <p>{notification.message}</p>
                  <small>
                    {notification.timestamp.toLocaleTimeString()}
                  </small>
                </div>
                <button 
                  onClick={() => dismissNotification(notification.id)}
                  className="dismiss-notification"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Drawer Modal */}
      <UserDrawer
        user={drawerUser}
        tasks={tasks}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onTaskChange={handleTaskChange}
        onBitacoraAdd={handleBitacoraAdd}
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

export default ManagerLayout;
