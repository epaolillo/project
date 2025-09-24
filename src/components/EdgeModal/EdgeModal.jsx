import React, { useState, useEffect } from 'react';
import './EdgeModal.css';

/**
 * Modal for editing and deleting React Flow edges
 */
const EdgeModal = ({ 
  isOpen, 
  onClose, 
  edge, 
  onUpdateEdge, 
  onDeleteEdge,
  tasks = [] 
}) => {
  const [edgeColor, setEdgeColor] = useState('#4a90e2');


  // Initialize form with current edge data
  useEffect(() => {
    if (edge) {
      setEdgeColor(edge.style?.stroke || '#4a90e2');
    }
  }, [edge]);

  // Get task names for display
  const getTaskName = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : taskId;
  };


  const handleSave = () => {
    const updatedEdge = {
      ...edge,
      style: {
        stroke: edgeColor,
        strokeWidth: 20
      }
    };
    onUpdateEdge(updatedEdge);
    onClose();
  };

  const handleDelete = () => {
    onDeleteEdge(edge.id);
    onClose();
  };

  if (!isOpen || !edge) return null;

  return (
    <div className="edge-modal-overlay" onClick={onClose}>
      <div className="edge-modal" onClick={e => e.stopPropagation()}>
        <div className="edge-modal-header">
          <h3>Editar Enlace</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="edge-modal-content">
          {/* Edge Info */}
          <div className="edge-info">
            <div className="edge-connection">
              <span className="source-task">{getTaskName(edge.source)}</span>
              <span className="arrow">→</span>
              <span className="target-task">{getTaskName(edge.target)}</span>
            </div>
          </div>

          {/* Color Configuration */}
          <div className="form-section">
            <label htmlFor="edge-color">Color del Enlace</label>
            <div className="color-control">
              <input
                id="edge-color"
                type="color"
                value={edgeColor}
                onChange={(e) => setEdgeColor(e.target.value)}
              />
              <span className="color-label">Línea sólida de 20px</span>
            </div>
          </div>

          {/* Preview */}
          <div className="form-section">
            <label>Vista Previa</label>
            <div className="edge-preview">
              <svg width="200" height="40">
                <line
                  x1="20"
                  y1="20"
                  x2="180"
                  y2="20"
                  stroke={edgeColor}
                  strokeWidth="10"
                />
                <polygon
                  points="180,20 170,15 170,25"
                  fill={edgeColor}
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="edge-modal-footer">
          <button className="delete-button" onClick={handleDelete}>
            🗑️ Eliminar
          </button>
          <div className="action-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancelar
            </button>
            <button className="save-button" onClick={handleSave}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdgeModal;
