/**
 * Utilities for creating React Flow nodes and edges from unified task data
 */

export const createNodesAndEdges = (unifiedTasks = [], edges = [], users = []) => {
  const userMap = new Map(users.map(user => [user.id, user]));
  const nodes = [];
  
  // Create nodes from unified tasks (both tasks and incidents)
  unifiedTasks.forEach((item) => {
    const assignedUser = item.assignedTo ? userMap.get(item.assignedTo) : null;
    const reportedUser = item.reportedBy ? userMap.get(item.reportedBy) : null;
    
    const node = {
      id: item.id,
      type: 'task',
      position: item.position || { x: 0, y: 0 }, // Use stored position or default
      data: {
        ...item,
        assigneeName: assignedUser ? assignedUser.name : 'Sin asignar',
        isIncident: item.task_type === 'incident',
        reportedByName: reportedUser ? reportedUser.name : null
      }
    };
    
    nodes.push(node);
  });
  
  // Process edges (now they come from the database)
  const processedEdges = edges.map(edge => ({
    ...edge,
    className: getEdgeClass(edge),
    style: {
      stroke: edge.style?.stroke || getEdgeColor(edge),
      strokeWidth: edge.style?.strokeWidth || 20,
      ...edge.style
    }
  }));
  
  return { nodes, edges: processedEdges };
};

/**
 * Get edge color based on edge or task data
 */
const getEdgeColor = (edgeOrTask) => {
  // If it's an edge with style, use that
  if (edgeOrTask.style?.stroke) {
    return edgeOrTask.style.stroke;
  }
  
  // Otherwise determine by status or default
  const status = edgeOrTask.status || edgeOrTask.targetStatus || 'default';
  
  switch (status) {
    case 'completed':
      return '#28a745';
    case 'in_progress':
      return '#28a745'; // Green for active flow
    case 'pending':
      return '#ffc107'; // Yellow for pending
    default:
      return '#4a90e2'; // Blue default
  }
};

/**
 * Get edge class based on edge data or task status
 */
const getEdgeClass = (edge) => {
  // If edge already has a className, use it
  if (edge.className) {
    return edge.className;
  }
  
  // If we have source and target status information
  if (edge.sourceStatus && edge.targetStatus) {
    const { sourceStatus, targetStatus } = edge;
    
    // If source is completed and target is in progress, show active flow
    if (sourceStatus === 'completed' && targetStatus === 'in_progress') {
      return 'flow-active';
    }
    
    // If source is completed and target is pending, show pending flow
    if (sourceStatus === 'completed' && targetStatus === 'pending') {
      return 'flow-pending';
    }
    
    // If both are completed, show completed flow
    if (sourceStatus === 'completed' && targetStatus === 'completed') {
      return 'flow-completed';
    }
  }
  
  // Default animated flow
  return 'animated';
};

/**
 * Auto-layout nodes using a simple grid approach (preserves saved positions)
 */
export const autoLayoutNodes = (nodes, edges) => {
  const GRID_COLS = 4;
  const GRID_SIZE = 300;
  
  return nodes.map((node, index) => {
    // If node already has a position, keep it
    if (node.position && node.position.x != null && node.position.y != null) {
      return node;
    }
    
    // Otherwise assign a grid position
    return {
      ...node,
      position: {
        x: (index % GRID_COLS) * GRID_SIZE,
        y: Math.floor(index / GRID_COLS) * 200
      }
    };
  });
};

/**
 * Filter nodes based on criteria
 */
export const filterNodes = (nodes, criteria) => {
  return nodes.filter(node => {
    if (criteria.status && node.data.status !== criteria.status) {
      return false;
    }
    
    if (criteria.assignedTo && node.data.assignedTo !== criteria.assignedTo) {
      return false;
    }
    
    if (criteria.priority && node.data.priority !== criteria.priority) {
      return false;
    }
    
    if (criteria.showIncidents === false && node.data.isIncident) {
      return false;
    }
    
    if (criteria.searchTerm) {
      const searchTerm = criteria.searchTerm.toLowerCase();
      const title = node.data.title?.toLowerCase() || '';
      const description = node.data.description?.toLowerCase() || '';
      
      if (!title.includes(searchTerm) && !description.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Get task statistics from unified tasks
 */
export const getTaskStatistics = (unifiedTasks = []) => {
  const tasks = unifiedTasks.filter(t => t.task_type === 'task');
  const incidents = unifiedTasks.filter(t => t.task_type === 'incident');
  
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    backlog: tasks.filter(t => t.status === 'backlog' || !t.assignedTo).length,
    incidents: {
      total: incidents.length,
      open: incidents.filter(i => i.status === 'open').length,
      inProgress: incidents.filter(i => i.status === 'in_progress').length,
      critical: incidents.filter(i => i.severity === 'critical').length,
      high: incidents.filter(i => i.severity === 'high').length,
    }
  };
  
  stats.completionRate = stats.total > 0 ? (stats.completed / stats.total * 100) : 0;
  
  return stats;
};

/**
 * Calculate the estimated completion time for a user's tasks
 */
export const calculateUserWorkload = (userTasks) => {
  return userTasks
    .filter(task => task.task_type === 'task') // Only count tasks, not incidents
    .reduce((total, task) => {
      const remainingHours = Math.max(0, (task.estimatedHours || 0) - (task.completedHours || 0));
      return total + remainingHours;
    }, 0);
};

/**
 * Get the next task for a user based on dependencies and priority
 */
export const getNextTask = (userTasks, allTasks) => {
  // Filter only tasks (not incidents) that are available
  const availableTasks = userTasks.filter(task => 
    task.task_type === 'task' &&
    task.status === 'pending' && 
    (!task.dependencies || !task.dependencies.some(depId => {
      const depTask = allTasks.find(t => t.id === depId);
      return depTask && depTask.status !== 'completed';
    }))
  );
  
  // Sort by priority and return the first one
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  
  return availableTasks.sort((a, b) => {
    const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Secondary sort by estimated hours (shorter tasks first)
    return (a.estimatedHours || 0) - (b.estimatedHours || 0);
  })[0] || null;
};
