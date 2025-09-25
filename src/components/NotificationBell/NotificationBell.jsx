import React, { useState, useEffect, useRef } from 'react';
import notificationService from '../../services/NotificationService';
import './NotificationBell.css';

/**
 * Notification Bell component with dropdown
 * Shows notification count and displays notifications in a dropdown
 */
const NotificationBell = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Subscribe to notification changes
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((data) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });

    // Connect to notification service
    notificationService.connect();

    return () => {
      unsubscribe();
      notificationService.disconnect();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle bell click
  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Mark all as read when opening
      notificationService.markAllAsRead();
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
    }
  };

  // Handle archive notification
  const handleArchiveNotification = async (notificationId, event) => {
    event.stopPropagation();
    await notificationService.archiveNotification(notificationId);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead();
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_completed':
        return '✅';
      case 'task_assigned':
        return '📋';
      case 'help_requested':
        return '🆘';
      case 'feedback_received':
        return '💬';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  // Format notification time
  const formatTime = (isoString) => {
    return notificationService.formatTime(isoString);
  };

  // Get notification type class
  const getNotificationTypeClass = (type) => {
    switch (type) {
      case 'task_completed':
        return 'task-completed';
      case 'task_assigned':
        return 'task-assigned';
      case 'help_requested':
        return 'help-requested';
      case 'feedback_received':
        return 'feedback-received';
      case 'system':
        return 'system';
      default:
        return 'system';
    }
  };

  return (
    <div className={`notification-bell-container ${className}`}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        className="notification-bell"
        onClick={handleBellClick}
        aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} sin leer)` : ''}`}
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className={`notification-badge ${unreadCount === 0 ? 'zero' : ''}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div ref={dropdownRef} className="notification-dropdown">
          {/* Header */}
          <div className="notification-header">
            <h3 className="notification-title">Notificaciones</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button
                  className="notification-action"
                  onClick={handleMarkAllAsRead}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="notification-list">
            {isLoading ? (
              <div className="notification-loading">
                <div className="notification-loading-spinner"></div>
                <p>Cargando notificaciones...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">🔔</div>
                <h4 className="notification-empty-title">No hay notificaciones</h4>
                <p className="notification-empty-message">
                  Te notificaremos cuando tengas nuevas actualizaciones
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={`notification-item-icon ${getNotificationTypeClass(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="notification-content">
                    <h4 className="notification-item-title">
                      {notification.title}
                    </h4>
                    <p className="notification-item-message">
                      {notification.message}
                    </p>
                    <p className="notification-item-time">
                      {formatTime(notification.createdAt)}
                    </p>
                    
                    {!notification.read && (
                      <div className="notification-item-actions">
                        <button
                          className="notification-item-action"
                          onClick={(e) => handleArchiveNotification(notification.id, e)}
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
