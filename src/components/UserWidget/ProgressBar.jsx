import React from 'react';
import './ProgressBar.css';

/**
 * Reusable progress bar component
 * Supports different colors and shows percentage optionally
 */
const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  color = 'primary',
  showPercentage = true,
  className = '',
  size = 'medium'
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div className={`progress-bar ${className} progress-${color} progress-${size}`}>
      <div className="progress-track">
        <div 
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className="progress-text">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
