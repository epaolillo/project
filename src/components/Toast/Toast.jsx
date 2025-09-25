import React, { useEffect, useState } from 'react';
import './Toast.css';

/**
 * Individual Toast component
 */
const Toast = ({ 
  id, 
  type = 'info', 
  title, 
  message, 
  duration = 5000, 
  onClose, 
  actions = [],
  showProgress = true 
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
      case 'task-completed':
        return '✅';
      case 'info':
      case 'task-assigned':
        return '📋';
      case 'warning':
        return '⚠️';
      case 'error':
      return '❌';
      case 'help-requested':
        return '🆘';
      case 'feedback-received':
        return '💬';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  return (
    <div className={`toast ${type} ${isExiting ? 'exiting' : ''}`}>
      <div className="toast-icon">
        {getIcon(type)}
      </div>
      
      <div className="toast-content">
        <h4 className="toast-title">{title}</h4>
        <p className="toast-message">{message}</p>
        
        {actions.length > 0 && (
          <div className="toast-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                className={`toast-action ${action.primary ? 'primary' : ''}`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button 
        className="toast-close" 
        onClick={handleClose}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
      
      {showProgress && duration > 0 && (
        <div className="toast-progress">
          <div 
            className="toast-progress-bar" 
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Toast Container component
 */
const ToastContainer = ({ toasts, onRemoveToast }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onRemoveToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
export { Toast };
