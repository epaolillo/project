import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/ApiService';
import './UserDrawer.css';

/**
 * UserDrawer component - Fully editable modal/drawer for user profile management
 * Includes all user attributes, avatar upload, vacation management, and feedbacks
 */
const UserDrawer = ({ user, tasks = [], isOpen, onClose, onUserUpdate }) => {
  const [editedUser, setEditedUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [newVacationStart, setNewVacationStart] = useState('');
  const [newVacationEnd, setNewVacationEnd] = useState('');

  // Initialize edited user when user prop changes
  useEffect(() => {
    if (user) {
      // Parse the full name into first and last name if needed
      const nameParts = user.name ? user.name.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setEditedUser({
        id: user.id,
        firstName: user.firstName || firstName,
        lastName: user.lastName || lastName,
        role: user.role || '',
        avatar: user.avatar || '',
        fatigue: user.fatigue || 0,
        taskClarity: user.taskClarity || 0,
        motivation: user.motivation || 0,
        lastUpdate: user.lastUpdate || new Date().toISOString(),
        assignedTasks: user.assignedTasks || [],
        currentTaskId: user.currentTaskId || '',
        feedbacks: user.feedbacks || [],
        vacations: user.vacations || []
      });
      setHasChanges(false);
    }
  }, [user]);

  // Handle field changes
  const handleFieldChange = useCallback((field, value) => {
    setEditedUser(prev => {
      if (!prev) return null;
      
      const updatedUser = { ...prev, [field]: value };
      
      // Update lastUpdate timestamp when making changes
      if (field !== 'lastUpdate') {
        updatedUser.lastUpdate = new Date().toISOString();
      }
      
      return updatedUser;
    });
    setHasChanges(true);
  }, []);

  // Handle avatar upload
  const handleAvatarUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type and size
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('La imagen no puede superar los 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const avatarData = e.target.result;
      
      // Save to localStorage with user ID
      localStorage.setItem(`avatar_${editedUser.id}`, avatarData);
      
      // Update the edited user with the avatar data
      handleFieldChange('avatar', avatarData);
    };
    reader.readAsDataURL(file);
  }, [editedUser?.id, handleFieldChange]);

  // Handle current task change
  const handleCurrentTaskChange = useCallback((taskId) => {
    handleFieldChange('currentTaskId', taskId);
  }, [handleFieldChange]);

  // Handle feedback entry addition
  const handleAddFeedback = useCallback(() => {
    if (!feedbackText.trim() || !editedUser) return;

    const newFeedback = {
      id: Date.now(),
      text: feedbackText.trim(),
      timestamp: new Date().toISOString(),
      taskId: editedUser.currentTaskId
    };

    const updatedFeedbacks = [...(editedUser.feedbacks || []), newFeedback];
    handleFieldChange('feedbacks', updatedFeedbacks);
    setFeedbackText('');
  }, [feedbackText, editedUser, handleFieldChange]);

  // Handle vacation addition
  const handleAddVacation = useCallback(() => {
    if (!newVacationStart || !newVacationEnd || !editedUser) return;
    
    if (new Date(newVacationStart) >= new Date(newVacationEnd)) {
      alert('La fecha de inicio debe ser anterior a la fecha de fin.');
      return;
    }

    const newVacation = {
      id: Date.now(),
      start: newVacationStart,
      end: newVacationEnd,
      createdAt: new Date().toISOString()
    };

    const updatedVacations = [...(editedUser.vacations || []), newVacation];
    handleFieldChange('vacations', updatedVacations);
    setNewVacationStart('');
    setNewVacationEnd('');
  }, [newVacationStart, newVacationEnd, editedUser, handleFieldChange]);

  // Handle vacation removal
  const handleRemoveVacation = useCallback((vacationId) => {
    if (!editedUser) return;
    
    const updatedVacations = editedUser.vacations.filter(v => v.id !== vacationId);
    handleFieldChange('vacations', updatedVacations);
  }, [editedUser, handleFieldChange]);

  // Handle feedback removal
  const handleRemoveFeedback = useCallback((feedbackId) => {
    if (!editedUser) return;
    
    const updatedFeedbacks = editedUser.feedbacks.filter(f => f.id !== feedbackId);
    handleFieldChange('feedbacks', updatedFeedbacks);
  }, [editedUser, handleFieldChange]);

  // Auto-save changes with debounce
  useEffect(() => {
    if (!editedUser || !hasChanges || isSaving) return;

    const saveTimeout = setTimeout(async () => {
      try {
        setIsSaving(true);
        
        // Prepare user data for saving (combine firstName and lastName)
        const userDataToSave = {
          ...editedUser,
          name: `${editedUser.firstName} ${editedUser.lastName}`.trim(),
          lastUpdate: new Date().toISOString()
        };
        
        // Update user via API
        const savedUser = await apiService.updatePerson(editedUser.id, userDataToSave);
        
        // Notify parent component with the saved user
        if (onUserUpdate) {
          onUserUpdate(savedUser);
        }
        
        setHasChanges(false);
      } catch (error) {
        console.error('Error saving user:', error);
        alert('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(saveTimeout);
  }, [editedUser, hasChanges, isSaving, onUserUpdate]);

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

  // Format date for input
  const formatDateForInput = (isoString) => {
    const date = new Date(isoString);
    return date.toISOString().split('T')[0];
  };

  // Get user's assigned tasks
  const userTasks = tasks.filter(task => 
    editedUser && editedUser.assignedTasks && editedUser.assignedTasks.includes(task.id)
  );

  // Get current task details
  const currentTask = tasks.find(task => task.id === editedUser?.currentTaskId);

  // Get user initials for avatar
  const getUserInitials = (firstName, lastName) => {
    const first = firstName ? firstName[0] : '';
    const last = lastName ? lastName[0] : '';
    return (first + last).toUpperCase() || '?';
  };

  // Handle close
  const handleClose = useCallback(() => {
    if (hasChanges && editedUser) {
      const confirmClose = window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar sin guardar?');
      if (!confirmClose) {
        return;
      }
    }
    
    if (onClose) {
      onClose();
    }
  }, [onClose, hasChanges, editedUser]);

  if (!isOpen || !editedUser) return null;

  return (
    <div className="user-drawer-overlay" onClick={handleClose}>
      <div className="user-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header with Avatar and Status */}
        <div className="drawer-header">
          <div className="user-info-header">
            <div className="user-avatar-large">
              {editedUser.avatar ? (
                <img 
                  src={editedUser.avatar} 
                  alt={`${editedUser.firstName} ${editedUser.lastName}`}
                  className="avatar-image-large"
                />
              ) : (
                <div className="avatar-placeholder-large">
                  {getUserInitials(editedUser.firstName, editedUser.lastName)}
                </div>
              )}
            </div>
            <div className="user-details">
              <h2 className="user-name-large">
                {editedUser.firstName} {editedUser.lastName}
              </h2>
              <span className="user-role-large">{editedUser.role}</span>
              {isSaving && <span className="saving-indicator">Guardando...</span>}
              {hasChanges && !isSaving && <span className="changes-indicator">Sin guardar</span>}
            </div>
          </div>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="drawer-content">
          {/* Personal Information Section */}
          <div className="drawer-section">
            <h3>📝 Información Personal</h3>
            
            <div className="fields-row">
              <div className="field-group">
                <label htmlFor="firstName">Nombre</label>
                <input
                  id="firstName"
                  type="text"
                  value={editedUser.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  className="field-input"
                  placeholder="Nombre..."
                />
              </div>

              <div className="field-group">
                <label htmlFor="lastName">Apellido</label>
                <input
                  id="lastName"
                  type="text"
                  value={editedUser.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  className="field-input"
                  placeholder="Apellido..."
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="role">Puesto</label>
              <input
                id="role"
                type="text"
                value={editedUser.role}
                onChange={(e) => handleFieldChange('role', e.target.value)}
                className="field-input"
                placeholder="Puesto de trabajo..."
              />
            </div>

            <div className="field-group">
              <label htmlFor="avatar">Avatar</label>
              <div className="avatar-upload-container">
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="avatar-input"
                />
                <button 
                  type="button" 
                  className="avatar-button"
                  onClick={() => document.getElementById('avatar').click()}
                >
                  📷 Cambiar Avatar
                </button>
                {editedUser.avatar && (
                  <button 
                    type="button" 
                    className="avatar-remove-button"
                    onClick={() => {
                      handleFieldChange('avatar', '');
                      localStorage.removeItem(`avatar_${editedUser.id}`);
                    }}
                  >
                    🗑️ Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Section */}
          <div className="drawer-section">
            <h3>📊 Métricas de Rendimiento</h3>
            
            <div className="metric-slider-container">
              <div className="metric-slider">
                <label htmlFor="fatigue">Cansancio: {editedUser.fatigue}%</label>
                <input
                  id="fatigue"
                  type="range"
                  min="0"
                  max="100"
                  value={editedUser.fatigue}
                  onChange={(e) => handleFieldChange('fatigue', parseInt(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="metric-slider">
                <label htmlFor="taskClarity">Claridad en la tarea: {editedUser.taskClarity}%</label>
                <input
                  id="taskClarity"
                  type="range"
                  min="0"
                  max="100"
                  value={editedUser.taskClarity}
                  onChange={(e) => handleFieldChange('taskClarity', parseInt(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="metric-slider">
                <label htmlFor="motivation">Motivación: {editedUser.motivation}%</label>
                <input
                  id="motivation"
                  type="range"
                  min="0"
                  max="100"
                  value={editedUser.motivation}
                  onChange={(e) => handleFieldChange('motivation', parseInt(e.target.value))}
                  className="slider"
                />
              </div>
            </div>
          </div>

          {/* Current Task Section */}
          <div className="drawer-section">
            <h3>🎯 Tarea Actual</h3>
            <div className="task-selector">
              <select 
                value={editedUser.currentTaskId} 
                onChange={(e) => handleCurrentTaskChange(e.target.value)}
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

          {/* Vacations Section */}
          <div className="drawer-section">
            <h3>🏖️ Vacaciones</h3>
            
            <div className="vacation-add-container">
              <div className="vacation-inputs">
                <div className="field-group">
                  <label htmlFor="vacationStart">Fecha de inicio</label>
                  <input
                    id="vacationStart"
                    type="date"
                    value={newVacationStart}
                    onChange={(e) => setNewVacationStart(e.target.value)}
                    className="field-input"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="vacationEnd">Fecha de fin</label>
                  <input
                    id="vacationEnd"
                    type="date"
                    value={newVacationEnd}
                    onChange={(e) => setNewVacationEnd(e.target.value)}
                    className="field-input"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddVacation}
                disabled={!newVacationStart || !newVacationEnd}
                className="add-vacation-button"
              >
                Agregar Vacaciones
              </button>
            </div>

            <div className="vacation-list">
              {editedUser.vacations && editedUser.vacations.length === 0 ? (
                <p className="no-vacations">No hay vacaciones programadas.</p>
              ) : (
                editedUser.vacations?.map((vacation) => (
                  <div key={vacation.id} className="vacation-item">
                    <div className="vacation-dates">
                      <span>{formatDateForInput(vacation.start)}</span>
                      <span>→</span>
                      <span>{formatDateForInput(vacation.end)}</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveVacation(vacation.id)}
                      className="remove-vacation-button"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Feedbacks Section */}
          <div className="drawer-section">
            <h3>💬 Feedbacks</h3>
            
            <div className="feedback-input-container">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleAddFeedback();
                  }
                }}
                placeholder="Escribe tu feedback aquí... (Ctrl+Enter para guardar)"
                className="feedback-input"
                rows={3}
              />
              <button 
                onClick={handleAddFeedback}
                disabled={!feedbackText.trim()}
                className="add-feedback-button"
              >
                Agregar Feedback
              </button>
            </div>

            <div className="feedback-entries">
              {editedUser.feedbacks && editedUser.feedbacks.length === 0 ? (
                <p className="no-feedbacks">No hay feedbacks aún.</p>
              ) : (
                editedUser.feedbacks?.map((feedback) => (
                  <div key={feedback.id} className="feedback-entry">
                    <div className="entry-header">
                      <div className="entry-info">
                        <span className="entry-timestamp">
                          {formatTimestamp(feedback.timestamp)}
                        </span>
                        {feedback.taskId && tasks.find(t => t.id === feedback.taskId) && (
                          <span className="entry-task">
                            {tasks.find(t => t.id === feedback.taskId).title}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => handleRemoveFeedback(feedback.id)}
                        className="remove-feedback-button"
                        title="Eliminar feedback"
                      >
                        🗑️
                      </button>
                    </div>
                    <p className="entry-text">{feedback.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDrawer;
