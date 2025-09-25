const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const tingodb = require('tingodb')();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
});

// Environment variables
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DB_PATH = path.join(__dirname, 'database');

// Ensure database directory exists
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
}

// Initialize TingoDB
const db = new tingodb.Db(DB_PATH, {});
const users = db.collection('users');
const tasks = db.collection('tasks'); // Collection for tasks and incidents
const edges = db.collection('edges'); // Flow edges/connections
const persons = db.collection('persons');
const notifications = db.collection('notifications'); // User notifications

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Helper functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// API Routes

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user in database
    users.findOne({ username }, async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Compare password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = generateToken(user._id);

      // Set token as HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Return user info without password
      const { password: _, ...userInfo } = user;
      res.json({
        message: 'Login successful',
        user: userInfo,
        token // Also include token in response for frontend storage if needed
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Check authentication status
app.get('/api/auth/status', authenticateToken, (req, res) => {
  users.findOne({ _id: req.user.userId }, (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...userInfo } = user;
    res.json({ authenticated: true, user: userInfo });
  });
});

// Tasks endpoints (for tasks and incidents)
app.get('/api/tasks', authenticateToken, (req, res) => {
  const { task_type, include_archived } = req.query;
  const filter = { task_type: task_type || { $exists: true } };
  
  // By default, exclude archived tasks unless explicitly requested
  if (include_archived !== 'true') {
    filter.archived = { $ne: true };
  }
  
  tasks.find(filter).toArray((err, tasksList) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(tasksList);
  });
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  // Generate a proper ID for the new task
  const generateTaskId = (taskType) => {
    const prefix = taskType === 'incident' ? 'incident' : 'task';
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const newTask = {
    ...req.body,
    id: generateTaskId(req.body.task_type || 'task'),
    task_type: req.body.task_type || 'task',
    position: req.body.position || { x: 100, y: 100 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Remove any temporary ID that might have been sent
  if (req.body.id && req.body.id.startsWith('task-') && req.body.id.length < 20) {
    console.log('Replacing temporary ID:', req.body.id, 'with:', newTask.id);
  }

  tasks.insert(newTask, (err, result) => {
    if (err) {
      console.error('Error creating task:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log('Task created successfully:', result.id);
    
    // Emit to socket.io clients
    io.emit('task_created', result);
    
    res.status(201).json(result);
  });
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const updateData = {
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  tasks.update({ id: taskId }, { $set: updateData }, (err, numReplaced) => {
    if (err) {
      console.error('Error updating task:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (numReplaced === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get updated task
    tasks.findOne({ id: taskId }, (err, updatedTask) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Emit to socket.io clients
      io.emit('task_updated', updatedTask);
      
      res.json(updatedTask);
    });
  });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  
  tasks.remove({ id: taskId }, (err, numRemoved) => {
    if (err) {
      console.error('Error deleting task:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log('Task deleted successfully:', taskId);
    
    // Emit to socket.io clients
    io.emit('task_deleted', { taskId });
    
    res.json({ success: true, deleted: numRemoved, taskId });
  });
});

// Persons endpoints
app.get('/api/persons', authenticateToken, (req, res) => {
  persons.find({}).toArray((err, personsList) => {
    if (err) {
      console.error('Error fetching persons:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(personsList);
  });
});

app.post('/api/persons', authenticateToken, (req, res) => {
  const newPerson = {
    ...req.body,
    id: req.body.id || `user-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  persons.insert(newPerson, (err, result) => {
    if (err) {
      console.error('Error creating person:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Emit to socket.io clients
    io.emit('person_created', result);
    
    res.status(201).json(result);
  });
});

app.put('/api/persons/:id', authenticateToken, (req, res) => {
  const personId = req.params.id;
  const updateData = {
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  persons.update({ id: personId }, { $set: updateData }, (err, numReplaced) => {
    if (err) {
      console.error('Error updating person:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (numReplaced === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Get updated person
    persons.findOne({ id: personId }, (err, updatedPerson) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Emit to socket.io clients
      io.emit('person_updated', updatedPerson);
      
      res.json(updatedPerson);
    });
  });
});

app.delete('/api/persons/:id', authenticateToken, async (req, res) => {
  const personId = req.params.id;
  
  try {
    // First, get the person to check if it exists
    const person = await new Promise((resolve, reject) => {
      persons.findOne({ id: personId }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Remove all task assignments for this person
    const taskResult = await new Promise((resolve, reject) => {
      tasks.update(
        { assignedTo: personId },
        { $unset: { assignedTo: "", assigneeName: "" } },
        { multi: true },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    // Remove all notifications for this person
    const notificationResult = await new Promise((resolve, reject) => {
      notifications.remove({ userId: personId }, { multi: true }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Finally, remove the person
    const personResult = await new Promise((resolve, reject) => {
      persons.remove({ id: personId }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    if (personResult === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    console.log(`Person ${personId} deleted successfully`);
    console.log(`Removed ${taskResult} task assignments`);
    console.log(`Removed ${notificationResult} notifications`);
    
    // Emit to socket.io clients
    io.emit('person_deleted', { 
      personId, 
      tasksUpdated: taskResult, 
      notificationsRemoved: notificationResult 
    });
    
    res.json({ 
      success: true, 
      deleted: personResult,
      tasksUpdated: taskResult,
      notificationsRemoved: notificationResult
    });

  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Incidents endpoints (legacy endpoint - filters tasks by task_type)
app.get('/api/incidents', authenticateToken, (req, res) => {
  tasks.find({ task_type: 'incident' }).toArray((err, incidentsList) => {
    if (err) {
      console.error('Error fetching incidents:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(incidentsList);
  });
});

// Flow position and edges endpoints
app.put('/api/tasks/:id/position', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const { position } = req.body;
  
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    return res.status(400).json({ error: 'Invalid position data' });
  }

  tasks.update(
    { id: taskId },
    { $set: { position, updatedAt: new Date().toISOString() } },
    (err, numReplaced) => {
      if (err) {
        console.error('Error updating task position:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (numReplaced === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Emit position update to other clients
      io.emit('task_position_updated', { taskId, position });
      
      res.json({ success: true, taskId, position });
    }
  );
});

// Batch update positions
app.put('/api/tasks/positions/batch', authenticateToken, (req, res) => {
  const { updates } = req.body; // Array of { id, position }
  
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates must be an array' });
  }
  
  let completed = 0;
  let errors = [];
  
  if (updates.length === 0) {
    return res.json({ success: true, updated: 0 });
  }
  
    updates.forEach((update, index) => {
    const { id, position } = update;
    
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      errors.push({ id, error: 'Invalid position data' });
      completed++;
      
      if (completed === updates.length) {
        res.json({ success: true, updated: updates.length - errors.length, errors });
      }
      return;
    }
    
    tasks.update(
      { id },
      { $set: { position, updatedAt: new Date().toISOString() } },
      (err, numReplaced) => {
        if (err) {
          errors.push({ id, error: err.message });
        } else if (numReplaced === 0) {
          errors.push({ id, error: 'Task not found' });
        }
        
        completed++;
        
        if (completed === updates.length) {
          // Emit batch update to other clients
          io.emit('tasks_positions_updated', { updates: updates.filter(u => !errors.find(e => e.id === u.id)) });
          
          res.json({ success: true, updated: updates.length - errors.length, errors });
        }
      }
    );
  });
});

// Edges endpoints
app.get('/api/edges', authenticateToken, (req, res) => {
  edges.find({}).toArray((err, edgesList) => {
    if (err) {
      console.error('Error fetching edges:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(edgesList);
  });
});

app.post('/api/edges', authenticateToken, (req, res) => {
  // Generate a unique ID if not provided
  const generateEdgeId = (source, target) => {
    return `edge-${source}-${target}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const newEdge = {
    ...req.body,
    id: req.body.id || generateEdgeId(req.body.source, req.body.target),
    createdAt: new Date().toISOString()
  };

  // Check if edge already exists to avoid duplicates
  edges.findOne({ id: newEdge.id }, (err, existingEdge) => {
    if (err) {
      console.error('Error checking existing edge:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (existingEdge) {
      console.log('Edge already exists:', newEdge.id);
      return res.status(200).json(existingEdge); // Return existing edge
    }
    
    edges.insert(newEdge, (err, result) => {
      if (err) {
        console.error('Error creating edge:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log('Edge created successfully:', result.id);
      
      // Emit to socket.io clients
      io.emit('edge_created', result);
      
      res.status(201).json(result);
    });
  });
});

app.put('/api/edges/:id', authenticateToken, (req, res) => {
  const edgeId = req.params.id;
  const updateData = {
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  edges.update({ id: edgeId }, { $set: updateData }, (err, numReplaced) => {
    if (err) {
      console.error('Error updating edge:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (numReplaced === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    // Get updated edge
    edges.findOne({ id: edgeId }, (err, updatedEdge) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Emit to socket.io clients
      io.emit('edge_updated', updatedEdge);
      
      res.json(updatedEdge);
    });
  });
});

app.delete('/api/edges/:id', authenticateToken, (req, res) => {
  const edgeId = req.params.id;
  
  edges.remove({ id: edgeId }, (err, numRemoved) => {
    if (err) {
      console.error('Error deleting edge:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    // Emit to socket.io clients
    io.emit('edge_deleted', { edgeId });
    
    res.json({ success: true, deleted: numRemoved });
  });
});

// Batch edges update
app.put('/api/edges/batch', authenticateToken, (req, res) => {
  const { edges: edgesData } = req.body;
  
  if (!Array.isArray(edgesData)) {
    return res.status(400).json({ error: 'Edges must be an array' });
  }
  
  // Clear existing edges and insert new ones
  edges.remove({}, { multi: true }, (err) => {
    if (err) {
      console.error('Error clearing edges:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (edgesData.length === 0) {
      io.emit('edges_updated', []);
      return res.json({ success: true, edges: [] });
    }
    
    const processedEdges = edgesData.map(edge => ({
      ...edge,
      id: edge.id || `${edge.source}-${edge.target}`,
      createdAt: edge.createdAt || new Date().toISOString()
    }));
    
    edges.insert(processedEdges, (err, result) => {
      if (err) {
        console.error('Error inserting new edges:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Emit to socket.io clients
      io.emit('edges_updated', result);
      
      res.json({ success: true, edges: result });
    });
  });
});

// Archive/Unarchive task endpoint
app.put('/api/tasks/:id/archive', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const { archived = true } = req.body;
  
  tasks.update(
    { id: taskId },
    { $set: { archived, updatedAt: new Date().toISOString() } },
    (err, numReplaced) => {
      if (err) {
        console.error('Error updating task archive status:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (numReplaced === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Get updated task
      tasks.findOne({ id: taskId }, (err, updatedTask) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Emit to socket.io clients
        io.emit('task_updated', updatedTask);
        
        res.json({ success: true, task: updatedTask });
      });
    }
  );
});

// Bitacora endpoints (for user notes)
app.get('/api/bitacora/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  
  // For now, return empty array since bitacora is stored in localStorage
  // In a real implementation, you might want to store this in the database
  res.json([]);
});

app.post('/api/bitacora/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  const { entry } = req.body;
  
  // For now, just return success since bitacora is stored in localStorage
  // In a real implementation, you would store this in the database
  res.json({ success: true, entry });
});

// Notifications endpoints
app.get('/api/notifications', authenticateToken, (req, res) => {
  const { include_archived = false } = req.query;
  const filter = { userId: req.user.userId };
  
  // By default, exclude archived notifications unless explicitly requested
  if (include_archived !== 'true') {
    filter.archived = { $ne: true };
  }
  
  notifications.find(filter).sort({ createdAt: -1 }).toArray((err, notificationsList) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(notificationsList);
  });
});

app.post('/api/notifications', authenticateToken, (req, res) => {
  const newNotification = {
    ...req.body,
    id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: req.body.userId || req.user.userId,
    read: false,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  notifications.insert(newNotification, (err, result) => {
    if (err) {
      console.error('Error creating notification:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Emit to socket.io clients
    io.emit('notification_created', result);
    
    res.status(201).json(result);
  });
});

app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notificationId = req.params.id;
  
  notifications.update(
    { id: notificationId, userId: req.user.userId },
    { $set: { read: true, updatedAt: new Date().toISOString() } },
    (err, numReplaced) => {
      if (err) {
        console.error('Error marking notification as read:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (numReplaced === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Get updated notification
      notifications.findOne({ id: notificationId }, (err, updatedNotification) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Emit to socket.io clients
        io.emit('notification_updated', updatedNotification);
        
        res.json({ success: true, notification: updatedNotification });
      });
    }
  );
});

app.put('/api/notifications/:id/archive', authenticateToken, (req, res) => {
  const notificationId = req.params.id;
  
  notifications.update(
    { id: notificationId, userId: req.user.userId },
    { $set: { archived: true, updatedAt: new Date().toISOString() } },
    (err, numReplaced) => {
      if (err) {
        console.error('Error archiving notification:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (numReplaced === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Emit to socket.io clients
      io.emit('notification_archived', { notificationId, userId: req.user.userId });
      
      res.json({ success: true, notificationId });
    }
  );
});

app.put('/api/notifications/mark-all-read', authenticateToken, (req, res) => {
  notifications.update(
    { userId: req.user.userId, read: false },
    { $set: { read: true, updatedAt: new Date().toISOString() } },
    { multi: true },
    (err, numReplaced) => {
      if (err) {
        console.error('Error marking all notifications as read:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Emit to socket.io clients
      io.emit('notifications_marked_read', { userId: req.user.userId, count: numReplaced });
      
      res.json({ success: true, markedRead: numReplaced });
    }
  );
});

// Helper function to create notification
const createNotification = (userId, type, title, message, data = {}) => {
  const notification = {
    id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title,
    message,
    data,
    read: false,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  notifications.insert(notification, (err, result) => {
    if (err) {
      console.error('Error creating notification:', err);
      return;
    }
    
    // Emit to socket.io clients
    io.emit('notification_created', result);
  });
};

// WebSocket events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle task completion
  socket.on('task_completed', (data) => {
    // Update task in database
    tasks.update(
      { id: data.taskId }, 
      { $set: { status: 'completed', updatedAt: new Date().toISOString() } },
      (err, numReplaced) => {
        if (!err && numReplaced > 0) {
          // Get task details for notification
          tasks.findOne({ id: data.taskId }, (err, task) => {
            if (!err && task) {
              // Get user who completed the task
              users.findOne({ _id: data.userId }, (err, user) => {
                if (!err && user) {
                  // Find all admin users to send notifications
                  users.find({ role: 'admin' }).toArray((err, admins) => {
                    if (!err && admins) {
                      // Send notification to each admin
                      admins.forEach(admin => {
                        createNotification(
                          admin._id,
                          'task_completed',
                          'Tarea Completada',
                          `${user.name} ha completado la tarea: "${task.title}"`,
                          {
                            taskId: task.id,
                            taskTitle: task.title,
                            completedBy: user.name,
                            completedByUserId: user._id
                          }
                        );
                      });
                    }
                  });
                }
              });
            }
          });
          
          // Broadcast to all clients
          io.emit('task_completed', data);
        }
      }
    );
  });

  // Handle help requests
  socket.on('help_requested', (data) => {
    console.log('Help requested:', data);
    // Broadcast to all clients (managers)
    io.emit('help_requested', data);
  });

  // Handle user feedback
  socket.on('user_feedback', (data) => {
    console.log('User feedback received:', data);
    
    // Update person data in database
    persons.update(
      { id: data.userId },
      { 
        $set: { 
          taskClarity: data.feedback.taskClarity,
          lastUpdate: new Date().toISOString()
        }
      },
      (err, numReplaced) => {
        if (!err && numReplaced > 0) {
          // Broadcast to all clients
          io.emit('user_feedback', data);
        }
      }
    );
  });

  // Handle flow updates
  socket.on('flow_node_position_changed', (data) => {
    console.log('Node position changed:', data);
    // This will be handled by the REST API endpoints
    // but we can emit to other clients for real-time updates
    socket.broadcast.emit('flow_node_position_changed', data);
  });

  socket.on('flow_edge_created', (data) => {
    console.log('Edge created:', data);
    socket.broadcast.emit('flow_edge_created', data);
  });

  socket.on('flow_edge_deleted', (data) => {
    console.log('Edge deleted:', data);
    socket.broadcast.emit('flow_edge_deleted', data);
  });

  socket.on('flow_edges_updated', (data) => {
    console.log('Edges updated:', data);
    socket.broadcast.emit('flow_edges_updated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database path: ${DB_PATH}`);
});

module.exports = app;
