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
  const [edgeStyle, setEdgeStyle] = useState({
    stroke: '#4a90e2',
    strokeWidth: 20,
    strokeDasharray: 'none'
  });
  const [edgeType, setEdgeType] = useState('smoothstep');
  const [animated, setAnimated] = useState(true);
  const [className, setClassName] = useState('');

  // Predefined style options
  const stylePresets = [
    {
      name: 'Dependencia',
      style: { stroke: '#4a90e2', strokeWidth: 20, strokeDasharray: 'none' },
      className: 'dependency-edge'
    },
    {
      name: 'Workflow',
      style: { stroke: '#28a745', strokeWidth: 18, strokeDasharray: 'none' },
      className: 'workflow-edge'
    },
    {
      name: 'Infraestructura',
      style: { stroke: '#fd7e14', strokeWidth: 16, strokeDasharray: 'none' },
      className: 'infrastructure-edge'
    },
    {
      name: 'Crítico',
      style: { stroke: '#dc3545', strokeWidth: 22, strokeDasharray: 'none' },
      className: 'critical-edge'
    },
    {
      name: 'Opcional',
      style: { stroke: '#6c757d', strokeWidth: 12, strokeDasharray: '10,5' },
      className: 'optional-edge'
    },
    {
      name: 'Bloqueante',
      style: { stroke: '#e83e8c', strokeWidth: 24, strokeDasharray: 'none' },
      className: 'blocking-edge'
    }
  ];

  const edgeTypes = [
    { value: 'smoothstep', label: 'Suave' },
    { value: 'straight', label: 'Recto' },
    { value: 'step', label: 'Escalón' },
    { value: 'bezier', label: 'Curva' }
  ];

  // Initialize form with current edge data
  useEffect(() => {
    if (edge) {
      setEdgeStyle({
        stroke: edge.style?.stroke || '#4a90e2',
        strokeWidth: edge.style?.strokeWidth || 20,
        strokeDasharray: edge.style?.strokeDasharray || 'none'
      });
      setEdgeType(edge.type || 'smoothstep');
      setAnimated(edge.animated !== false);
      setClassName(edge.className || '');
    }
  }, [edge]);

  // Get task names for display
  const getTaskName = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : taskId;
  };

  const handleStylePresetChange = (preset) => {
    setEdgeStyle(preset.style);
    setClassName(preset.className);
  };

  const handleCustomColorChange = (color) => {
    setEdgeStyle(prev => ({ ...prev, stroke: color }));
  };

  const handleWidthChange = (width) => {
    setEdgeStyle(prev => ({ ...prev, strokeWidth: parseInt(width) }));
  };

  const handleDashChange = (dash) => {
    setEdgeStyle(prev => ({ 
      ...prev, 
      strokeDasharray: dash === 'none' ? 'none' : dash 
    }));
  };

  const handleSave = () => {
    // Check if user made custom changes vs preset
    const isCustomStyle = !stylePresets.some(preset => 
      preset.style.stroke === edgeStyle.stroke &&
      preset.style.strokeWidth === edgeStyle.strokeWidth &&
      preset.style.strokeDasharray === edgeStyle.strokeDasharray &&
      preset.className === className
    );

    const updatedEdge = {
      ...edge,
      type: edgeType,
      animated,
      // If custom style, remove className to avoid CSS conflicts
      className: isCustomStyle ? 'custom-edge' : className,
      style: {
        ...edgeStyle,
        strokeDasharray: edgeStyle.strokeDasharray === 'none' ? undefined : edgeStyle.strokeDasharray
      }
    };
    onUpdateEdge(updatedEdge);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este enlace?')) {
      onDeleteEdge(edge.id);
      onClose();
    }
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

          {/* Style Presets */}
          <div className="form-section">
            <label>Estilos Predefinidos</label>
            <div className="style-presets">
              {stylePresets.map((preset, index) => (
                <button
                  key={index}
                  className={`preset-button ${className === preset.className ? 'active' : ''}`}
                  onClick={() => handleStylePresetChange(preset)}
                >
                  <div 
                    className="preset-line" 
                    style={{
                      backgroundColor: preset.style.stroke,
                      height: `${Math.min(preset.style.strokeWidth / 4, 6)}px`,
                      borderStyle: preset.style.strokeDasharray !== 'none' ? 'dashed' : 'solid'
                    }}
                  ></div>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Styling */}
          <div className="form-section">
            <label>Personalización</label>
            <div className="custom-controls">
              <div className="control-group">
                <label htmlFor="edge-color">Color</label>
                <input
                  id="edge-color"
                  type="color"
                  value={edgeStyle.stroke}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                />
              </div>

              <div className="control-group">
                <label htmlFor="edge-width">Grosor</label>
                <input
                  id="edge-width"
                  type="range"
                  min="8"
                  max="32"
                  value={edgeStyle.strokeWidth}
                  onChange={(e) => handleWidthChange(e.target.value)}
                />
                <span>{edgeStyle.strokeWidth}px</span>
              </div>

              <div className="control-group">
                <label htmlFor="edge-dash">Estilo de línea</label>
                <select
                  id="edge-dash"
                  value={edgeStyle.strokeDasharray || 'none'}
                  onChange={(e) => handleDashChange(e.target.value)}
                >
                  <option value="none">Sólida</option>
                  <option value="10,5">Punteada</option>
                  <option value="20,10">Rayada</option>
                  <option value="5,5,10,5">Punto-Raya</option>
                </select>
              </div>
            </div>
          </div>

          {/* Edge Type */}
          <div className="form-section">
            <label htmlFor="edge-type">Tipo de Conexión</label>
            <select
              id="edge-type"
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value)}
            >
              {edgeTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Animation */}
          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={animated}
                onChange={(e) => setAnimated(e.target.checked)}
              />
              Animación activada
            </label>
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
                  stroke={edgeStyle.stroke}
                  strokeWidth={Math.min(edgeStyle.strokeWidth / 2, 8)}
                  strokeDasharray={edgeStyle.strokeDasharray === 'none' ? undefined : edgeStyle.strokeDasharray}
                />
                <polygon
                  points="180,20 170,15 170,25"
                  fill={edgeStyle.stroke}
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
