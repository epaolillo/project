import React from 'react';
import { Handle, Position } from '@xyflow/react';
import './TaskNode.css';

/**
 * Custom task node for React Flow
 * Displays task information with different styles based on status and type
 */
const TaskNode = ({ data, selected }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'in_progress':
        return '#ffc107';
      case 'pending':
        return '#6c757d';
      case 'backlog':
        return '#e9ecef';
      default:
        return '#6c757d';
    }
  };

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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'feature':
        return '⚡';
      case 'bug':
        return '🐛';
      case 'infrastructure':
        return '⚙️';
      case 'design':
        return '🎨';
      case 'documentation':
        return '📝';
      case 'testing':
        return '🧪';
      case 'security':
        return '🔒';
      case 'optimization':
        return '🚀';
      default:
        return '📋';
    }
  };

  const getProgressPercentage = () => {
    if (data.estimatedHours === 0) return 0;
    return Math.round((data.completedHours / data.estimatedHours) * 100);
  };

  return (
    <div className={`task-node ${selected ? 'selected' : ''} ${data.isIncident ? 'incident' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="task-handle"
        isConnectable={true}
        id="left"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="task-handle"
        isConnectable={true}
        id="top"
      />
      
      <div className="task-header">
        <div className="task-type-icon">
          {data.isIncident ? '🚨' : getTypeIcon(data.type)}
        </div>
        <div className="task-priority" style={{ backgroundColor: getPriorityColor(data.priority) }}>
          {data.priority}
        </div>
      </div>
      
      <div className="task-content">
        <h4 className="task-title">{data.title}</h4>
        <p className="task-description">{data.description}</p>
        
        {data.assignedTo && (
          <div className="task-assignee">
            <span className="assignee-label">Asignado a:</span>
            <span className="assignee-name">{data.assigneeName}</span>
          </div>
        )}
        
        {!data.isIncident && data.estimatedHours > 0 && (
          <div className="task-progress">
            <div className="progress-info">
              <span>{data.completedHours}h / {data.estimatedHours}h</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ 
                  width: `${getProgressPercentage()}%`,
                  backgroundColor: getStatusColor(data.status)
                }}
              />
            </div>
          </div>
        )}
        
        {data.isIncident && (
          <div className="incident-info">
            <div className="incident-severity">
              Severidad: <span className={`severity-${data.severity}`}>{data.severity}</span>
            </div>
            {data.affectedUsers && (
              <div className="affected-users">
                {data.affectedUsers} usuarios afectados
              </div>
            )}
          </div>
        )}
      </div>
      
      
      <Handle
        type="source"
        position={Position.Right}
        className="task-handle"
        isConnectable={true}
        id="right"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="task-handle"
        isConnectable={true}
        id="bottom"
      />
    </div>
  );
};

export default TaskNode;
