import React, { useState, useEffect } from 'react';
import './UserDrawer.css';

/**
 * UserDrawer component - Modal/Drawer that shows user details, current task selection,
 * and bitacora functionality when clicking on a user widget
 */
const UserDrawer = ({ user, tasks = [], isOpen, onClose, onTaskChange, onBitacoraAdd }) => {
  const [currentTaskId, setCurrentTaskId] = useState('');
  const [bitacoraText, setBitacoraText] = useState('');
  const [bitacoraEntries, setBitacoraEntries] = useState([]);

  // Initialize current task and bitacora on user change
  useEffect(() => {
    if (user && user.assignedTasks && user.assignedTasks.length > 0) {
      // Use user's currentTaskId if available, otherwise find first in-progress task, or first assigned task
      const userTasks = tasks.filter(task => user.assignedTasks.includes(task.id));
      
      let defaultTask = null;
      if (user.currentTaskId && userTasks.find(task => task.id === user.currentTaskId)) {
        defaultTask = userTasks.find(task => task.id === user.currentTaskId);
      } else {
        const inProgressTask = userTasks.find(task => task.status === 'in_progress');
        defaultTask = inProgressTask || userTasks[0];
      }
      
      setCurrentTaskId(defaultTask ? defaultTask.id : '');
    }

    // Load bitacora from localStorage
    if (user) {
      const savedBitacora = localStorage.getItem(`bitacora_${user.id}`);
      if (savedBitacora) {
        setBitacoraEntries(JSON.parse(savedBitacora));
      } else {
        setBitacoraEntries([]);
      }
    }
  }, [user, tasks]);

  // Handle task selection change
  const handleTaskChange = (taskId) => {
    setCurrentTaskId(taskId);
    if (onTaskChange) {
      onTaskChange(user.id, taskId);
    }
  };

  // Handle bitacora entry addition
  const handleAddBitacoraEntry = () => {
    if (!bitacoraText.trim()) return;

    const newEntry = {
      id: Date.now(),
      text: bitacoraText.trim(),
      timestamp: new Date().toISOString(),
      taskId: currentTaskId
    };

    const updatedEntries = [...bitacoraEntries, newEntry];
    setBitacoraEntries(updatedEntries);

    // Save to localStorage
    if (user) {
      localStorage.setItem(`bitacora_${user.id}`, JSON.stringify(updatedEntries));
    }

    // Clear input
    setBitacoraText('');

    // Callback to parent
    if (onBitacoraAdd) {
      onBitacoraAdd(user.id, newEntry);
    }
  };

  // Handle key press in bitacora textarea
  const handleBitacoraKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddBitacoraEntry();
    }
  };

  // Format timestamp for display
  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get user's assigned tasks
  const userTasks = tasks.filter(task => 
    user && user.assignedTasks && user.assignedTasks.includes(task.id)
  );

  // Get current task details
  const currentTask = tasks.find(task => task.id === currentTaskId);

  // Get user initials for avatar
  const getUserInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="user-drawer-overlay" onClick={onClose}>
      <div className="user-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="user-info-header">
            <div className="user-avatar-large">
              <div className="avatar-placeholder-large">
                {getUserInitials(user.name)}
              </div>
            </div>
            <div className="user-details">
              <h2 className="user-name-large">{user.name}</h2>
              <span className="user-role-large">{user.role}</span>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Current Task Section */}
        <div className="drawer-section">
          <h3>Tarea Actual</h3>
          <div className="task-selector">
            <select 
              value={currentTaskId} 
              onChange={(e) => handleTaskChange(e.target.value)}
              className="task-dropdown"
            >
              <option value="">Seleccionar tarea...</option>
              {userTasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title} ({task.status})
                </option>
              ))}
            </select>
          </div>
          {currentTask && (
            <div className="current-task-details">
              <h4>{currentTask.title}</h4>
              <p className="task-description">{currentTask.description}</p>
              <div className="task-meta">
                <span className={`task-status ${currentTask.status}`}>
                  {currentTask.status}
                </span>
                <span className="task-priority">
                  Prioridad: {currentTask.priority}
                </span>
                <span className="task-hours">
                  {currentTask.completedHours}/{currentTask.estimatedHours}h
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bitacora Section */}
        <div className="drawer-section bitacora-section">
          <h3>Bitácora Personal</h3>
          
          {/* Bitacora Input */}
          <div className="bitacora-input-container">
            <textarea
              value={bitacoraText}
              onChange={(e) => setBitacoraText(e.target.value)}
              onKeyDown={handleBitacoraKeyPress}
              placeholder="Escribe tus anotaciones aquí... (Ctrl+Enter para guardar)"
              className="bitacora-input"
              rows={3}
            />
            <button 
              onClick={handleAddBitacoraEntry}
              disabled={!bitacoraText.trim()}
              className="add-entry-button"
            >
              Agregar Entrada
            </button>
          </div>

          {/* Bitacora Entries */}
          <div className="bitacora-entries">
            {bitacoraEntries.length === 0 ? (
              <p className="no-entries">No hay anotaciones aún.</p>
            ) : (
              bitacoraEntries.map((entry) => (
                <div key={entry.id} className="bitacora-entry">
                  <div className="entry-header">
                    <span className="entry-timestamp">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                    {entry.taskId && tasks.find(t => t.id === entry.taskId) && (
                      <span className="entry-task">
                        {tasks.find(t => t.id === entry.taskId).title}
                      </span>
                    )}
                  </div>
                  <p className="entry-text">{entry.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDrawer;
