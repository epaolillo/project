import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TaskNode from './TaskNode';
import apiService from '../../services/ApiService';
import { createNodesAndEdges } from '../../utils/flowUtils';
import './FlowDiagram.css';

const nodeTypes = {
  task: TaskNode,
};

/**
 * React Flow diagram component
 * Displays tasks and incidents in a flowchart layout
 */
const FlowDiagram = ({ 
  onTaskSelect, 
  selectedTaskId, 
  showIncidents = true,
  className = '' 
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const onConnect = useCallback(
    async (params) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        className: 'animated',
        style: {
          stroke: '#4a90e2',
          strokeWidth: 20,
        },
      };
      
      try {
        // Save to database
        await apiService.createEdge(newEdge);
        
        // Update local state
        setEdges((eds) => addEdge(newEdge, eds));
      } catch (error) {
        console.error('Error creating edge:', error);
        // You could show a toast notification here
      }
    },
    [setEdges]
  );

  const loadFlowData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [unifiedTasks, edges, users] = await Promise.all([
        apiService.getAllTasks(),
        apiService.getEdges(),
        apiService.getUsers()
      ]);

      // Filter tasks if showIncidents is false
      const filteredTasks = showIncidents ? unifiedTasks : unifiedTasks.filter(t => t.task_type === 'task');

      const { nodes: flowNodes, edges: flowEdges } = createNodesAndEdges(
        filteredTasks,
        edges,
        users
      );

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error('Error loading flow data:', err);
      setError('Error al cargar los datos del diagrama');
    } finally {
      setLoading(false);
    }
  }, [showIncidents, setNodes, setEdges]);

  useEffect(() => {
    loadFlowData();
  }, [loadFlowData]);

  const handleNodeClick = useCallback((event, node) => {
    if (onTaskSelect && node.data) {
      onTaskSelect(node.data);
    }
  }, [onTaskSelect]);

  // Handle node position changes
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    
    // Filter position changes and batch update
    const positionChanges = changes.filter(change => 
      change.type === 'position' && change.dragging === false
    );
    
    if (positionChanges.length > 0) {
      const updates = positionChanges.map(change => ({
        id: change.id,
        position: change.position
      }));
      
      // Debounce the API call
      const timeoutId = setTimeout(async () => {
        try {
          await apiService.updateTaskPositions(updates);
          console.log('Positions updated:', updates);
        } catch (error) {
          console.error('Error updating positions:', error);
        }
      }, 500);
      
      // Store timeout ID for potential cleanup
      handleNodesChange.timeoutId = timeoutId;
    }
  }, [onNodesChange]);

  // Handle edge changes (deletions)
  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    
    // Handle edge removals
    const removeChanges = changes.filter(change => change.type === 'remove');
    
    if (removeChanges.length > 0) {
      removeChanges.forEach(async (change) => {
        try {
          await apiService.deleteEdge(change.id);
          console.log('Edge deleted:', change.id);
        } catch (error) {
          console.error('Error deleting edge:', error);
        }
      });
    }
  }, [onEdgesChange]);

  const nodeClassName = useCallback((node) => {
    let className = node.type || 'default';
    if (node.data?.isIncident) {
      className += ' incident-node';
    }
    if (node.data?.status === 'completed') {
      className += ' completed-node';
    }
    if (selectedTaskId && node.id === selectedTaskId) {
      className += ' selected-node';
    }
    return className;
  }, [selectedTaskId]);

  if (loading) {
    return (
      <div className={`flow-diagram loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando diagrama de flujo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flow-diagram error ${className}`}>
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={loadFlowData} className="retry-button">
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flow-diagram ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        connectOnClick={false}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 20, stroke: '#4a90e2' }
        }}
        fitView
        attributionPosition="bottom-left"
        className="react-flow-container"
      >
        <Background 
          variant="dots"
          gap={20}
          size={1}
          color="#e9ecef"
        />
        <Controls 
          position="top-right"
          showInteractive={false}
        />
        <MiniMap 
          nodeColor={nodeClassName}
          nodeStrokeWidth={3}
          zoomable
          pannable
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
};

export default FlowDiagram;
