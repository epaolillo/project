import React, { useCallback, useEffect, useState, useRef } from 'react';
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
import EdgeModal from '../EdgeModal/EdgeModal';
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
  className = '',
  tasks = null, // Optional: if provided, use these tasks instead of loading from API
  users = null,  // Optional: if provided, use these users instead of loading from API
  updatedTask = null // Optional: when a specific task is updated, pass it here to avoid full reload
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const positionUpdateTimeoutRef = useRef(null);

  // Effect to update a specific task node when updatedTask prop changes
  useEffect(() => {
    if (!updatedTask || !users) return;
    
    const userMap = new Map(users.map(user => [user.id, user]));
    const assignedUser = updatedTask.assignedTo ? userMap.get(updatedTask.assignedTo) : null;
    
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (node.id === updatedTask.id) {
          return {
            ...node,
            data: {
              ...updatedTask,
              assigneeName: assignedUser ? assignedUser.name : 'Sin asignar',
              isIncident: updatedTask.task_type === 'incident',
            }
          };
        }
        return node;
      })
    );
  }, [updatedTask, users, setNodes]);

  const onConnect = useCallback(
    async (params) => {
      console.log('onConnect triggered with params:', params);
      
      const newEdge = {
        ...params,
        id: `${params.source}-${params.target}-${Date.now()}`, // Generate unique ID
        type: 'bezier',
        animated: false,
        style: {
          stroke: '#4a90e2',
          strokeWidth: 20,
        },
      };
      
      // Add edge immediately to UI for instant feedback
      setEdges((eds) => {
        const updatedEdges = addEdge(newEdge, eds);
        console.log('Edge added immediately to UI:', updatedEdges);
        return updatedEdges;
      });
      
      // Then save to database in background
      try {
        console.log('Saving edge to database:', newEdge);
        const savedEdge = await apiService.createEdge(newEdge);
        console.log('Edge saved successfully:', savedEdge);
        
        // Update the edge with server data if different
        if (savedEdge.id !== newEdge.id) {
          setEdges((eds) => 
            eds.map(edge => 
              edge.id === newEdge.id 
                ? { ...edge, ...savedEdge }
                : edge
            )
          );
        }
      } catch (error) {
        console.error('Error saving edge to database:', error);
        console.error('Error details:', error.message);
        // Edge is already in UI, so we keep it there even if save fails
        // Could show a warning to user that edge wasn't saved
      }
    },
    [setEdges]
  );

  const loadFlowData = useCallback(async (forceReload = false) => {
    try {
      setLoading(true);
      setError(null);
      
      let unifiedTasks, edges, flowUsers;
      
      // Use provided data or load from API
      if (tasks && users && !forceReload) {
        unifiedTasks = tasks;
        flowUsers = users;
        // Still need to load edges from API
        edges = await apiService.getEdges();
      } else {
        [unifiedTasks, edges, flowUsers] = await Promise.all([
          apiService.getAllTasks(),
          apiService.getEdges(),
          apiService.getUsers()
        ]);
      }

      // Filter tasks if showIncidents is false
      const filteredTasks = showIncidents ? unifiedTasks : unifiedTasks.filter(t => t.task_type === 'task');

      const { nodes: flowNodes, edges: flowEdges } = createNodesAndEdges(
        filteredTasks,
        edges,
        flowUsers
      );

      // Preserve current node positions when updating
      setNodes(currentNodes => {
        // If no current nodes, just use new nodes
        if (!currentNodes || currentNodes.length === 0) {
          return flowNodes;
        }
        
        // Create a map of current positions by node id
        const currentPositions = new Map();
        currentNodes.forEach(node => {
          currentPositions.set(node.id, node.position);
        });
        
        // Merge new node data with current positions
        return flowNodes.map(newNode => ({
          ...newNode,
          // Use current position if available, otherwise use new/default position
          position: currentPositions.get(newNode.id) || newNode.position
        }));
      });
      
      setEdges(flowEdges);
    } catch (err) {
      console.error('Error loading flow data:', err);
      setError('Error al cargar los datos del diagrama');
    } finally {
      setLoading(false);
    }
  }, [showIncidents, tasks, users, setNodes, setEdges]);

  // Load effect with smarter dependency handling
  useEffect(() => {
    // Initial load or when showIncidents changes (these require full reload)
    if (nodes.length === 0 || !updatedTask) {
      loadFlowData();
    }
  }, [showIncidents, loadFlowData, nodes.length, updatedTask]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (positionUpdateTimeoutRef.current) {
        clearTimeout(positionUpdateTimeoutRef.current);
        positionUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  const handleNodeClick = useCallback((event, node) => {
    if (onTaskSelect && node.data) {
      onTaskSelect(node.data);
    }
  }, [onTaskSelect]);

  // Handle edge click to open modal
  const handleEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setIsEdgeModalOpen(true);
  }, []);

  // Handle edge update
  const handleEdgeUpdate = useCallback(async (updatedEdge) => {
    try {
      // Simplified edge processing - only color and 20px width
      const processedEdge = {
        ...updatedEdge,
        // Add a unique key to force re-render
        key: `${updatedEdge.id}-${Date.now()}`,
        animated: false,
        style: {
          stroke: updatedEdge.style?.stroke || '#4a90e2',
          strokeWidth: 20
        }
      };

      // Update edge in database via API
      await apiService.updateEdge(updatedEdge.id, processedEdge);
      
      // Force a complete re-render by temporarily removing and re-adding the edge
      setEdges(currentEdges => {
        const otherEdges = currentEdges.filter(edge => edge.id !== updatedEdge.id);
        return [...otherEdges, processedEdge];
      });
      
      console.log('Edge updated:', processedEdge);
    } catch (error) {
      console.error('Error updating edge:', error);
      // You could show a toast notification here
    }
  }, [setEdges]);

  // Handle edge deletion
  const handleEdgeDelete = useCallback(async (edgeId) => {
    try {
      // Delete from database
      await apiService.deleteEdge(edgeId);
      
      // Update local state
      setEdges(currentEdges => 
        currentEdges.filter(edge => edge.id !== edgeId)
      );
      
      console.log('Edge deleted:', edgeId);
    } catch (error) {
      console.error('Error deleting edge:', error);
      // You could show a toast notification here
    }
  }, [setEdges]);

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
      
      // Clear previous timeout if exists
      if (positionUpdateTimeoutRef.current) {
        clearTimeout(positionUpdateTimeoutRef.current);
      }
      
      // Debounce the API call
      positionUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          await apiService.updateTaskPositions(updates);
          console.log('Positions updated:', updates);
        } catch (error) {
          console.error('Error updating positions:', error);
        } finally {
          positionUpdateTimeoutRef.current = null;
        }
      }, 500);
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
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Strict}
        connectOnClick={true}
        defaultEdgeOptions={{
          type: 'bezier',
          animated: false,
          style: { strokeWidth: 20, stroke: '#4a90e2' }
        }}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.3,
          maxZoom: 1.5
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
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

      {/* Edge Modal */}
      <EdgeModal
        isOpen={isEdgeModalOpen}
        onClose={() => setIsEdgeModalOpen(false)}
        edge={selectedEdge}
        onUpdateEdge={handleEdgeUpdate}
        onDeleteEdge={handleEdgeDelete}
        tasks={tasks || []}
      />
    </div>
  );
};

export default FlowDiagram;
