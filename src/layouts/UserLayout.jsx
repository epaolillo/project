import React, { useState, useEffect, useCallback } from 'react';
import FlowDiagram from '../components/ReactFlow/FlowDiagram';
import TaskDrawer from '../components/TaskDrawer/TaskDrawer';
import apiService from '../services/ApiService';
import webSocketService from '../services/WebSocketService';
import { getNextTask, calculateUserWorkload } from '../utils/flowUtils';
import './UserLayout.css';

/**
 * User layout component with task flow and sidebar for current task
 * Includes help request, feedback, and task completion functionality
 */
const UserLayout = ({ userId = 'user-1' }) => {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [newLogEntry, setNewLogEntry] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({
    taskClarity: 50,
    progress: 0
  });
  const [helpMessage, setHelpMessage] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  
  // TaskDrawer state
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [lastUpdatedTask, setLastUpdatedTask] = useState(null);

  // Load user data and tasks
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const [userData, tasksData, usersData] = await Promise.all([
        apiService.getUserById(userId),
        apiService.getAllTasks(),
        apiService.getUsers()
      ]);

      setUser(userData);
      setAllTasks(tasksData);
      setAllUsers(usersData);

      // Get user's assigned tasks (both tasks and incidents)
      const userTasks = tasksData.filter(task => task.assignedTo === userId);
      
      // Find current task (first in progress task or next available task)
      const inProgressTask = userTasks.find(task => task.status === 'in_progress');
      const nextTask = inProgressTask || getNextTask(userTasks, tasksData);
      
      setCurrentTask(nextTask);
      
      // Initialize feedback with current user metrics
      if (userData) {
        setFeedback({
          taskClarity: userData.taskClarity || 50,
          progress: nextTask && nextTask.estimatedHours ? Math.round(((nextTask.completedHours || 0) / nextTask.estimatedHours) * 100) || 0 : 0
        });
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Handle task completion
  const handleCompleteTask = async () => {
    if (!currentTask || !completionNotes.trim()) {
      return;
    }

    try {
      // Update task status
      await apiService.updateTaskStatus(currentTask.id, 'completed', completionNotes);
      
      // Notify managers via WebSocket
      webSocketService.notifyTaskCompletion(userId, currentTask.id, completionNotes);
      
      // Find next task
      const userTasks = allTasks.filter(task => task.assignedTo === userId && task.id !== currentTask.id);
      const nextTask = getNextTask(userTasks, allTasks);
      
      setCurrentTask(nextTask);
      setCompletionNotes('');
      setShowCompletionModal(false);
      
      // Add log entry
      const logText = `Tarea completada: ${currentTask.title}. ${completionNotes}`;
      setLogEntries(prev => [{
        id: Date.now(),
        text: logText,
        timestamp: new Date(),
        type: 'completion'
      }, ...prev]);
      
      await apiService.addLogEntry(userId, logText);
      
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  // Handle help request
  const handleRequestHelp = async () => {
    if (!helpMessage.trim() || !currentTask) {
      return;
    }

    try {
      await apiService.requestHelp(userId, currentTask.id, helpMessage);
      webSocketService.notifyHelpRequest(userId, currentTask.id, helpMessage);
      
      // Add log entry
      const logText = `Solicité ayuda para: ${currentTask.title}. ${helpMessage}`;
      setLogEntries(prev => [{
        id: Date.now(),
        text: logText,
        timestamp: new Date(),
        type: 'help'
      }, ...prev]);
      
      await apiService.addLogEntry(userId, logText);
      
      setHelpMessage('');
      setShowHelpModal(false);
      
    } catch (error) {
      console.error('Error requesting help:', error);
    }
  };

  // Handle feedback submission
  const handleSubmitFeedback = async () => {
    try {
      await apiService.submitUserFeedback(userId, feedback);
      webSocketService.sendFeedbackUpdate(userId, feedback);
      
      // Update local user data
      setUser(prev => ({
        ...prev,
        taskClarity: feedback.taskClarity,
        lastUpdate: new Date().toISOString()
      }));
      
      // Add log entry
      const logText = `Feedback enviado - Claridad: ${feedback.taskClarity}%, Progreso: ${feedback.progress}%`;
      setLogEntries(prev => [{
        id: Date.now(),
        text: logText,
        timestamp: new Date(),
        type: 'feedback'
      }, ...prev]);
      
      await apiService.addLogEntry(userId, logText);
      
      setShowFeedbackModal(false);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Add log entry
  const addLogEntry = async () => {
    if (!newLogEntry.trim()) return;

    const entry = {
      id: Date.now(),
      text: newLogEntry,
      timestamp: new Date(),
      type: 'note'
    };

    setLogEntries(prev => [entry, ...prev]);
    await apiService.addLogEntry(userId, newLogEntry);
    setNewLogEntry('');
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
    setAllTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    
    // If this is the current task, update it too
    if (currentTask && currentTask.id === updatedTask.id) {
      setCurrentTask(updatedTask);
    }
    
    // Update selected task
    setSelectedTask(updatedTask);
    
    // Set updated task for React Flow to update specifically (avoids full reload)
    setLastUpdatedTask({ ...updatedTask, _timestamp: Date.now() });
  };

  if (loading) {
    return (
      <div className="user-layout loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Cargando tu espacio de trabajo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-layout error">
        <p>No se pudo cargar la información del usuario</p>
      </div>
    );
  }

  return (
    <div className="user-layout">
      <header className="user-header">
        <div className="user-info">
          <h1>Hola, {user.name.split(' ')[0]}</h1>
          <p>{user.role}</p>
        </div>
        <div className="workload-info">
          <div className="workload-item">
            <span className="workload-value">
              {calculateUserWorkload(allTasks.filter(t => t.assignedTo === userId))}h
            </span>
            <span className="workload-label">Trabajo restante</span>
          </div>
        </div>
      </header>

      <div className="user-content">
        {/* React Flow diagram */}
        <div className="user-flow-container">
          <FlowDiagram
            onTaskSelect={handleTaskSelect}
            selectedTaskId={currentTask?.id}
            showIncidents={false}
            tasks={allTasks}
            users={allUsers}
            updatedTask={lastUpdatedTask}
          />
        </div>

        {/* Task sidebar */}
        <div className="task-sidebar">
          <div className="sidebar-header">
            <h2>Tarea Actual</h2>
          </div>
          
          {currentTask ? (
            <div className="current-task">
              <h3>{currentTask.title}</h3>
              <p className="task-description">{currentTask.description}</p>
              
              {currentTask.task_type === 'task' && currentTask.estimatedHours > 0 && (
                <div className="task-progress">
                  <div className="progress-info">
                    <span>Progreso: {currentTask.completedHours || 0}h / {currentTask.estimatedHours}h</span>
                    <span>{Math.round(((currentTask.completedHours || 0) / currentTask.estimatedHours) * 100) || 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${Math.round(((currentTask.completedHours || 0) / currentTask.estimatedHours) * 100) || 0}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="task-actions">
                <button 
                  className="help-button"
                  onClick={() => setShowHelpModal(true)}
                >
                  Solicitar Ayuda
                </button>
                
                <button 
                  className="feedback-button"
                  onClick={() => setShowFeedbackModal(true)}
                >
                  Feedback
                </button>
                
                <button 
                  className="complete-button"
                  onClick={() => setShowCompletionModal(true)}
                >
                  Terminar Tarea
                </button>
              </div>
            </div>
          ) : (
            <div className="no-task">
              <p>¡Excelente! No tienes tareas pendientes en este momento.</p>
              <p>Las nuevas tareas aparecerán aquí cuando estén disponibles.</p>
            </div>
          )}

          <div className="bitacora-section">
            <h3>Bitácora</h3>
            
            <div className="log-input">
              <textarea
                value={newLogEntry}
                onChange={(e) => setNewLogEntry(e.target.value)}
                placeholder="Escribe una anotación..."
                rows="2"
              />
              <button onClick={addLogEntry} disabled={!newLogEntry.trim()}>
                Agregar
              </button>
            </div>
            
            <div className="log-entries">
              {logEntries.map(entry => (
                <div key={entry.id} className={`log-entry ${entry.type}`}>
                  <div className="log-content">
                    <p>{entry.text}</p>
                    <small>{entry.timestamp.toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Feedback de Tarea</h3>
              <button onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>¿Está clara tu tarea actual?</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={feedback.taskClarity}
                    onChange={(e) => setFeedback(prev => ({
                      ...prev,
                      taskClarity: parseInt(e.target.value)
                    }))}
                  />
                  <span>{feedback.taskClarity}%</span>
                </div>
              </div>
              
              <div className="form-group">
                <label>¿Cuál es tu porcentaje de avance?</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={feedback.progress}
                    onChange={(e) => setFeedback(prev => ({
                      ...prev,
                      progress: parseInt(e.target.value)
                    }))}
                  />
                  <span>{feedback.progress}%</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowFeedbackModal(false)}>Cancelar</button>
              <button onClick={handleSubmitFeedback} className="primary">
                Enviar Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Solicitar Ayuda</h3>
              <button onClick={() => setShowHelpModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Describe en qué necesitas ayuda:</label>
                <textarea
                  value={helpMessage}
                  onChange={(e) => setHelpMessage(e.target.value)}
                  placeholder="Explica tu situación o duda..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowHelpModal(false)}>Cancelar</button>
              <button 
                onClick={handleRequestHelp} 
                className="primary"
                disabled={!helpMessage.trim()}
              >
                Solicitar Ayuda
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompletionModal && (
        <div className="modal-overlay" onClick={() => setShowCompletionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Completar Tarea</h3>
              <button onClick={() => setShowCompletionModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <p><strong>Tarea:</strong> {currentTask?.title}</p>
              <div className="form-group">
                <label>¿Qué fue lo que realizaste?</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Describe brevemente lo que completaste..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCompletionModal(false)}>Cancelar</button>
              <button 
                onClick={handleCompleteTask} 
                className="primary"
                disabled={!completionNotes.trim()}
              >
                Marcar como Completada
              </button>
            </div>
          </div>
        </div>
      )}

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

export default UserLayout;
