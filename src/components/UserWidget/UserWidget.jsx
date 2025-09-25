import React from 'react';
import ProgressBar from './ProgressBar';
import './UserWidget.css';

/**
 * User widget component showing avatar and progress indicators
 * Displays fatigue, task clarity, motivation and last update status
 */
const UserWidget = ({ user, onClick, className = '' }) => {
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const lastUpdate = new Date(timestamp);
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Ahora';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return `${Math.floor(diffMinutes / 1440)}d`;
  };

  const getUpdateFreshness = (timestamp) => {
    const now = new Date();
    const lastUpdate = new Date(timestamp);
    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 100;
    if (diffHours < 8) return 80;
    if (diffHours < 24) return 60;
    if (diffHours < 72) return 30;
    return 10;
  };

  const handleClick = () => {
    if (onClick) {
      onClick(user);
    }
  };

  // Get user display name and initials
  const getDisplayName = (user) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.name || 'Usuario Sin Nombre';
  };

  const getUserInitials = (user) => {
    if (user.firstName || user.lastName) {
      const first = user.firstName ? user.firstName[0] : '';
      const last = user.lastName ? user.lastName[0] : '';
      return (first + last).toUpperCase() || '?';
    }
    // Fallback to old name format
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return '?';
  };

  // Get avatar source (user avatar field or fallback)
  const getAvatarSource = (user) => {
    // Use the avatar field from the user object
    if (user.avatar) {
      // If it's a relative path, prepend the server URL
      if (user.avatar.startsWith('/uploads/')) {
        return `http://localhost:5000${user.avatar}`;
      }
      // If it's already a full URL or base64, use as is
      return user.avatar;
    }
    return null;
  };

  const displayName = getDisplayName(user);
  const initials = getUserInitials(user);
  const avatarSource = getAvatarSource(user);

  return (
    <div 
      className={`user-widget ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="user-main-info">
        <div className="user-avatar">
          {avatarSource ? (
            <img 
              src={avatarSource} 
              alt={displayName}
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              {initials}
            </div>
          )}
        </div>
        
        <div className="user-header">
          <h3 className="user-name">{displayName}</h3>
          <span className="user-role">{user.role}</span>
        </div>
      </div>
      
      <div className="user-metrics">
          <div className="metric-item">
            <span className="metric-label">Cansancio</span>
            <ProgressBar 
              value={user.fatigue} 
              max={100}
              color="warning"
              showPercentage={false}
            />
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Claridad</span>
            <ProgressBar 
              value={user.taskClarity} 
              max={100}
              color="success"
              showPercentage={false}
            />
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Motivación</span>
            <ProgressBar 
              value={user.motivation} 
              max={100}
              color="info"
              showPercentage={false}
            />
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Actualización</span>
            <div className="update-info">
              <ProgressBar 
                value={getUpdateFreshness(user.lastUpdate)} 
                max={100}
                color="secondary"
                showPercentage={false}
              />
              <span className="update-time">{getTimeAgo(user.lastUpdate)}</span>
            </div>
          </div>
      </div>
      
    </div>
  );
};

export default UserWidget;
