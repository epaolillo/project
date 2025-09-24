import React, { useState, useEffect, useCallback } from 'react';
import AutocompleteInput from './AutocompleteInput';
import apiService from '../../services/ApiService';
import './TaskDrawer.css';

/**
 * TaskDrawer component - Editable modal/drawer that shows task details
 * All fields are editable and save automatically
 */
const TaskDrawer = ({ task, isOpen, onClose, onTaskUpdate }) => {
  const [editedTask, setEditedTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize edited task when task prop changes
  useEffect(() => {
    if (task) {
      setEditedTask({
        id: task.id,
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        type: task.type || 'feature',
        assignedTo: task.assignedTo || '',
        assigneeName: task.assigneeName || '',
        estimatedHours: task.estimatedHours || 0,
        completedHours: task.completedHours || 0,
        task_type: task.task_type || 'task',
        // Incident specific fields
        severity: task.severity || 'medium',
        affectedUsers: task.affectedUsers || 0,
        // Important: Copy the isNew flag
        isNew: task.isNew || false,
        // Copy archived status
        archived: task.archived || false
      });
      setHasChanges(false);
    }
  }, [task]);

  // Load users for autocomplete
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const usersData = await apiService.getUsers();
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  // Handle field changes
  const handleFieldChange = useCallback((field, value) => {
    setEditedTask(prev => {
      if (!prev) return null;
      
      const newTask = { ...prev, [field]: value };
      
      // If assigning to a user, also set the assigneeName
      if (field === 'assignedTo') {
        const selectedUser = users.find(user => user.id === value);
        newTask.assigneeName = selectedUser ? selectedUser.name : '';
      }
      
      return newTask;
    });
    setHasChanges(true);
  }, [users]);

  // Handle task type change (task <-> incident)
  const handleTaskTypeChange = useCallback((newTaskType) => {
    setEditedTask(prev => {
      if (!prev) return null;
      
      const updated = { ...prev, task_type: newTaskType };
      
      // When changing to incident, set default incident fields
      if (newTaskType === 'incident') {
        updated.severity = updated.severity || 'medium';
        updated.affectedUsers = updated.affectedUsers || 0;
        // Clear task-specific fields that don't apply to incidents
        updated.estimatedHours = 0;
        updated.completedHours = 0;
        // Adjust status to incident-appropriate values
        if (['backlog', 'pending', 'completed'].includes(updated.status)) {
          updated.status = updated.status === 'completed' ? 'resolved' : 'open';
        }
      } else if (newTaskType === 'task') {
        // When changing to task, set default task fields
        updated.estimatedHours = updated.estimatedHours || 0;
        updated.completedHours = updated.completedHours || 0;
        // Adjust status to task-appropriate values
        if (['open', 'resolved', 'closed'].includes(updated.status)) {
          updated.status = updated.status === 'resolved' ? 'completed' : 
                          updated.status === 'closed' ? 'completed' : 'pending';
        }
        // Keep severity and affectedUsers in case user wants to switch back
      }
      
      return updated;
    });
    setHasChanges(true);
  }, []);

  // Auto-save changes with debounce (only for existing tasks)
  useEffect(() => {
    if (!editedTask || !hasChanges || isSaving) return;
    // Skip auto-save for new tasks - they need manual save
    if (editedTask.isNew) return;

    const saveTimeout = setTimeout(async () => {
      try {
        setIsSaving(true);
        
        // Update existing task
        const savedTask = await apiService.updateTask(editedTask.id, editedTask);
        
        // Notify parent component with the saved task
        if (onTaskUpdate) {
          onTaskUpdate(savedTask);
        }
        
        // Update local state with the saved task
        setEditedTask(savedTask);
        setHasChanges(false);
      } catch (error) {
        console.error('Error saving task:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(saveTimeout);
  }, [editedTask, hasChanges, isSaving, onTaskUpdate]);

  // Handle manual save for new tasks
  const handleManualSave = useCallback(async () => {
    if (!editedTask || !editedTask.isNew) return;
    
    // Validate required fields
    if (!editedTask.title.trim()) {
      alert('El título es requerido para crear la tarea.');
      return;
    }

    try {
      setIsSaving(true);
      
      // Create new task
      const taskToCreate = { ...editedTask };
      delete taskToCreate.isNew; // Remove the isNew flag before sending to API
      delete taskToCreate.id; // Remove temporary ID, let server generate real ID
      const savedTask = await apiService.createTask(taskToCreate);
      
      // Notify parent component with the saved task, marking it as new
      if (onTaskUpdate) {
        onTaskUpdate({ ...savedTask, isNew: true });
      }
      
      // Close the drawer
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error al crear la tarea. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }, [editedTask, onTaskUpdate, onClose]);

  // Handle task deletion
  const handleDelete = useCallback(async () => {
    if (!editedTask || editedTask.isNew) return;

    try {
      setIsSaving(true);
      
      // Delete task via API
      await apiService.deleteTask(editedTask.id);
      
      // Notify parent component about the deletion
      if (onTaskUpdate) {
        onTaskUpdate({ ...editedTask, deleted: true });
      }
      
      // Close the drawer
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error al eliminar la tarea. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }, [editedTask, onTaskUpdate, onClose]);

  // Handle task archiving
  const handleArchive = useCallback(async () => {
    if (!editedTask || editedTask.isNew) return;
    
    const isArchiving = !editedTask.archived;

    try {
      setIsSaving(true);
      
      // Archive/unarchive task via API
      const result = await apiService.archiveTask(editedTask.id, isArchiving);
      
      // Update local state
      setEditedTask(prev => prev ? { ...prev, archived: isArchiving } : null);
      
      // Notify parent component about the update
      if (onTaskUpdate) {
        onTaskUpdate({ ...editedTask, archived: isArchiving });
      }
      
      // Close the drawer
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error(`Error archiving task:`, error);
      alert(`Error al archivar la tarea. Por favor, inténtalo de nuevo.`);
    } finally {
      setIsSaving(false);
    }
  }, [editedTask, onTaskUpdate, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'resolved':
      case 'closed':
        return '#28a745';
      case 'in_progress':
        return '#ffc107';
      case 'pending':
      case 'open':
        return '#6c757d';
      case 'backlog':
        return '#e9ecef';
      default:
        return '#6c757d';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#fd7e14';
      case 'low':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!editedTask || editedTask.estimatedHours === 0) return 0;
    return Math.min(100, Math.round((editedTask.completedHours / editedTask.estimatedHours) * 100));
  };

  if (!isOpen || !editedTask) return null;

  const isIncident = editedTask.task_type === 'incident';

  return (
    <div className="task-drawer-overlay" onClick={handleClose}>
      <div className="task-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="header-info">
            <div className="task-type-badge" data-type={editedTask.task_type}>
              {editedTask.isNew ? (
                isIncident ? '🚨 Nuevo Incident' : '📋 Nueva Tarea'
              ) : (
                <>
                  {isIncident ? '🚨 Incident' : '📋 Task'}
                  {editedTask.archived && <span style={{ marginLeft: '8px' }}>📁 Archivada</span>}
                </>
              )}
            </div>
            <div className="save-indicator">
              {isSaving && <span className="saving">{editedTask.isNew ? 'Creando...' : 'Guardando...'}</span>}
              {hasChanges && !isSaving && <span className="unsaved">Sin guardar</span>}
              {!hasChanges && !isSaving && !editedTask.isNew && <span className="saved">Guardado</span>}
              {editedTask.isNew && !editedTask.title.trim() && <span className="new-task-hint">Escribe un título para crear la tarea</span>}
            </div>
          </div>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        {/* Content */}
        <div className="drawer-content">
          {/* Title */}
          <div className="field-group">
            <label htmlFor="task-title">Título</label>
            <input
              id="task-title"
              type="text"
              value={editedTask.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="field-input title-input"
              placeholder="Título de la tarea..."
            />
          </div>

          {/* Description */}
          <div className="field-group">
            <label htmlFor="task-description">Descripción</label>
            <textarea
              id="task-description"
              value={editedTask.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="field-input description-input"
              placeholder="Descripción de la tarea..."
              rows="4"
            />
          </div>

          <div className="fields-row">
            {/* Status */}
            <div className="field-group">
              <label htmlFor="task-status">Estado</label>
              <select
                id="task-status"
                value={editedTask.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="field-input select-input"
                style={{ borderLeft: `4px solid ${getStatusColor(editedTask.status)}` }}
              >
                {isIncident ? (
                  // Status options for incidents
                  <>
                    <option value="open">Abierto</option>
                    <option value="in_progress">En progreso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </>
                ) : (
                  // Status options for tasks
                  <>
                    <option value="backlog">Backlog</option>
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En progreso</option>
                    <option value="completed">Completada</option>
                  </>
                )}
              </select>
            </div>

            {/* Priority */}
            <div className="field-group">
              <label htmlFor="task-priority">Prioridad</label>
              <select
                id="task-priority"
                value={editedTask.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
                className="field-input select-input"
                style={{ borderLeft: `4px solid ${getPriorityColor(editedTask.priority)}` }}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div className="fields-row">
            {/* Task Type */}
            <div className="field-group">
              <label htmlFor="task-task-type">Categoría</label>
              <select
                id="task-task-type"
                value={editedTask.task_type}
                onChange={(e) => handleTaskTypeChange(e.target.value)}
                className="field-input select-input task-type-selector"
                style={{ borderLeft: `4px solid ${editedTask.task_type === 'incident' ? '#dc3545' : '#007bff'}` }}
              >
                <option value="task">📋 Tarea</option>
                <option value="incident">🚨 Incident</option>
              </select>
            </div>

            {/* Type */}
            <div className="field-group">
              <label htmlFor="task-type">Tipo</label>
              <select
                id="task-type"
                value={editedTask.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
                className="field-input select-input"
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="infrastructure">Infraestructura</option>
                <option value="design">Diseño</option>
                <option value="documentation">Documentación</option>
                <option value="testing">Testing</option>
                <option value="security">Seguridad</option>
                <option value="optimization">Optimización</option>
              </select>
            </div>
          </div>

          {/* Assigned To */}
          <div className="field-group">
            <label htmlFor="task-assignee">Asignado a</label>
            <AutocompleteInput
              id="task-assignee"
              value={editedTask.assignedTo}
              displayValue={editedTask.assigneeName}
              options={users}
              onSelect={(user) => handleFieldChange('assignedTo', user ? user.id : '')}
              placeholder="Buscar persona..."
              getOptionLabel={(user) => user.name}
              getOptionValue={(user) => user.id}
              className="field-input"
            />
          </div>

          {/* Hours - Only for regular tasks */}
          {!isIncident && (
            <div className="fields-row">
              <div className="field-group">
                <label htmlFor="estimated-hours">Horas estimadas</label>
                <input
                  id="estimated-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={editedTask.estimatedHours}
                  onChange={(e) => handleFieldChange('estimatedHours', parseFloat(e.target.value) || 0)}
                  className="field-input number-input"
                />
              </div>

              <div className="field-group">
                <label htmlFor="completed-hours">Horas completadas</label>
                <input
                  id="completed-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  max={editedTask.estimatedHours}
                  value={editedTask.completedHours}
                  onChange={(e) => handleFieldChange('completedHours', parseFloat(e.target.value) || 0)}
                  className="field-input number-input"
                />
              </div>
            </div>
          )}

          {/* Progress Bar - Only for regular tasks */}
          {!isIncident && editedTask.estimatedHours > 0 && (
            <div className="progress-section">
              <div className="progress-info">
                <span>Progreso</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ 
                    width: `${getProgressPercentage()}%`,
                    backgroundColor: getStatusColor(editedTask.status)
                  }}
                />
              </div>
            </div>
          )}

          {/* Incident specific fields */}
          {isIncident && (
            <div className="incident-fields">
              <div className="fields-row">
                <div className="field-group">
                  <label htmlFor="incident-severity">Severidad</label>
                  <select
                    id="incident-severity"
                    value={editedTask.severity}
                    onChange={(e) => handleFieldChange('severity', e.target.value)}
                    className="field-input select-input"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor="affected-users">Usuarios afectados</label>
                  <input
                    id="affected-users"
                    type="number"
                    min="0"
                    value={editedTask.affectedUsers}
                    onChange={(e) => handleFieldChange('affectedUsers', parseInt(e.target.value) || 0)}
                    className="field-input number-input"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <div className="footer-left">
            {!editedTask.isNew && (
              <>
                <button 
                  type="button"
                  className={`footer-button ${editedTask.archived ? 'unarchive-button' : 'archive-button'}`}
                  onClick={handleArchive}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="button-spinner"></span>
                      {editedTask.archived ? 'Desarchivando...' : 'Archivando...'}
                    </>
                  ) : (
                    editedTask.archived ? '📂 Desarchivar' : '📁 Archivar'
                  )}
                </button>
                <button 
                  type="button"
                  className="footer-button delete-button" 
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="button-spinner"></span>
                      Eliminando...
                    </>
                  ) : (
                    '🗑️ Eliminar'
                  )}
                </button>
              </>
            )}
          </div>
          
          <div className="footer-right">
            {editedTask.isNew ? (
              <>
                <button 
                  type="button"
                  className="footer-button cancel-button" 
                  onClick={handleClose}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  className="footer-button save-button" 
                  onClick={handleManualSave}
                  disabled={isSaving || !editedTask.title.trim()}
                >
                  {isSaving ? (
                    <>
                      <span className="button-spinner"></span>
                      Guardando...
                    </>
                  ) : (
                    '💾 Guardar Tarea'
                  )}
                </button>
              </>
            ) : (
              <button 
                type="button"
                className="footer-button close-only-button" 
                onClick={handleClose}
                disabled={isSaving}
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDrawer;
