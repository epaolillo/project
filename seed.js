const fs = require('fs');
const path = require('path');
const tingodb = require('tingodb')();
const bcrypt = require('bcryptjs');

// Database configuration
const DB_PATH = path.join(__dirname, 'database');
const DATA_PATH = path.join(__dirname, 'src', 'data');

console.log('🌱 Seeding database with mock data...');

// Initialize TingoDB
const db = new tingodb.Db(DB_PATH, {});

// Collections
const usersCollection = db.collection('users'); // Collection for authentication
const tasksCollection = db.collection('tasks'); // Collection for tasks and incidents
const persons = db.collection('persons');
const edges = db.collection('edges'); // Flow edges/connections

// Helper function to read JSON files
const readJsonFile = (fileName) => {
  const filePath = path.join(DATA_PATH, fileName);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error reading ${fileName}:`, error.message);
    return null;
  }
};

// Helper function to clear collection
const clearCollection = (collection, collectionName) => {
  return new Promise((resolve, reject) => {
    collection.remove({}, { multi: true }, (err, numRemoved) => {
      if (err) {
        console.error(`❌ Error clearing ${collectionName}:`, err);
        reject(err);
      } else {
        console.log(`🗑️  Cleared ${numRemoved} existing records from ${collectionName}`);
        resolve(numRemoved);
      }
    });
  });
};

// Helper function to insert data
const insertData = (collection, data, collectionName) => {
  return new Promise((resolve, reject) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`⚠️  No data to insert into ${collectionName}`);
      resolve(0);
      return;
    }

    collection.insert(data, (err, result) => {
      if (err) {
        console.error(`❌ Error inserting data into ${collectionName}:`, err);
        reject(err);
      } else {
        console.log(`✅ Inserted ${result.length} records into ${collectionName}`);
        resolve(result.length);
      }
    });
  });
};

// Main seeding function
async function seed() {
  try {
    console.log('📂 Reading mock data files...');

    // Read mock data files
    const mockTasks = readJsonFile('mockTasks.json');
    const mockUsers = readJsonFile('mockUsers.json');

    if (!mockTasks || !mockUsers) {
      throw new Error('Failed to read one or more mock data files');
    }

    // Separate tasks and incidents from the single file
    const tasks = mockTasks.filter(item => item.task_type === 'task');
    const incidents = mockTasks.filter(item => item.task_type === 'incident');

    console.log(`📊 Found ${tasks.length} tasks, ${mockUsers.length} users, ${incidents.length} incidents`);

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    
    await clearCollection(usersCollection, 'users');
    await clearCollection(tasksCollection, 'tasks');
    await clearCollection(persons, 'persons');
    await clearCollection(edges, 'edges');

    // Use all tasks from the single file (task_type already included)
    const allTasks = mockTasks;

    console.log(`📦 Using ${allTasks.length} items (${tasks.length} tasks + ${incidents.length} incidents)`);

    // Insert mock data
    console.log('📤 Inserting mock data...');

    // Create admin user for authentication
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    
    const adminInserted = await insertData(usersCollection, [adminUser], 'admin user');

    // Insert all tasks (tasks + incidents)
    const tasksInserted = await insertData(tasksCollection, allTasks, 'tasks');

    // Insert persons (users)
    const personsInserted = await insertData(persons, mockUsers, 'persons');

    // Create some additional computed data
    console.log('🔧 Creating additional computed data...');

    // Add some completed tasks to demonstrate the system
    const additionalTasks = [
      {
        "id": "task-11",
        "title": "Implement Password Reset",
        "description": "Create password reset functionality with email verification",
        "task_type": "task",
        "status": "completed",
        "assignedTo": "user-3",
        "priority": "medium",
        "estimatedHours": 8,
        "completedHours": 8,
        "dependencies": ["task-1"],
        "type": "feature",
        "position": { "x": 400, "y": 200 },
        "completedAt": new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        "id": "task-12",
        "title": "Setup Error Monitoring",
        "description": "Integrate error tracking and monitoring system",
        "task_type": "task",
        "status": "in_progress",
        "assignedTo": "user-3",
        "priority": "high",
        "estimatedHours": 12,
        "completedHours": 6,
        "dependencies": [],
        "type": "infrastructure",
        "position": { "x": 600, "y": 300 }
      },
      {
        "id": "task-13",
        "title": "Create User Profile Page",
        "description": "Build user profile management interface",
        "task_type": "task",
        "status": "pending",
        "assignedTo": "user-3",
        "priority": "medium",
        "estimatedHours": 16,
        "completedHours": 0,
        "dependencies": ["task-1"],
        "type": "feature",
        "position": { "x": 800, "y": 100 }
      }
    ];

    await insertData(tasksCollection, additionalTasks, 'additional tasks');

    // Create edges based on task dependencies
    console.log('🔗 Creating task dependencies edges...');
    const taskEdges = [];
    
    // Process all tasks to create edges from dependencies
    allTasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const edge = {
            id: `${depId}-${task.id}`,
            source: depId,
            target: task.id,
            type: 'bezier',
            animated: false,
            style: {
              stroke: '#4a90e2',
              strokeWidth: 20
            }
          };
          taskEdges.push(edge);
        });
      }
    });

    // Add some additional workflow edges for better visualization
    const additionalEdges = [
      {
        id: 'task-5-task-6',
        source: 'task-5',
        target: 'task-6',
        type: 'bezier',
        animated: false,
        style: {
          stroke: '#28a745',
          strokeWidth: 20
        }
      },
      {
        id: 'task-6-task-8',
        source: 'task-6',
        target: 'task-8',
        type: 'bezier',
        animated: false,
        style: {
          stroke: '#dc3545',
          strokeWidth: 20
        }
      },
      {
        id: 'task-7-task-3',
        source: 'task-7',
        target: 'task-3',
        type: 'bezier',
        animated: false,
        style: {
          stroke: '#fd7e14',
          strokeWidth: 20
        }
      }
    ];

    const allEdges = [...taskEdges, ...additionalEdges];
    
    if (allEdges.length > 0) {
      await insertData(edges, allEdges, 'task edges');
      console.log(`✅ Created ${allEdges.length} edges (${taskEdges.length} dependencies + ${additionalEdges.length} workflow)`);
    }

    // Verify data insertion
    console.log('🔍 Verifying data insertion...');
    
    usersCollection.count({}, (err, userCount) => {
      if (err) console.error('Error counting users:', err);
      else console.log(`🔐 Total users in database: ${userCount}`);
    });

    tasksCollection.count({}, (err, totalCount) => {
      if (err) console.error('Error counting total tasks:', err);
      else console.log(`📋 Total items in tasks collection: ${totalCount}`);
    });

    tasksCollection.count({ task_type: 'task' }, (err, taskCount) => {
      if (err) console.error('Error counting tasks:', err);
      else console.log(`✅ Tasks: ${taskCount}`);
    });

    tasksCollection.count({ task_type: 'incident' }, (err, incidentCount) => {
      if (err) console.error('Error counting incidents:', err);
      else console.log(`🚨 Incidents: ${incidentCount}`);
    });

    persons.count({}, (err, personCount) => {
      if (err) console.error('Error counting persons:', err);
      else console.log(`👥 Total persons in database: ${personCount}`);
    });

    // Add a delay to ensure all operations complete
    setTimeout(() => {
      console.log('');
      console.log('🎉 Database seeding completed successfully!');
      console.log('');
      console.log('Summary:');
      console.log(`- Users (Authentication): ${adminInserted} records`);
      console.log(`- Tasks Collection: ${tasksInserted + additionalTasks.length} records`);
      console.log(`  - Tasks: ${tasks.length + additionalTasks.length} records`);
      console.log(`  - Incidents: ${incidents.length} records`);
      console.log(`- Persons: ${personsInserted} records`);
      console.log('');
      console.log('Next steps:');
      console.log('1. Run "npm run server" to start the backend server');
      console.log('2. Access the application at http://localhost:3000');
      console.log('3. Login with username: admin, password: admin123');
      console.log('');
      
      process.exit(0);
    }, 2000);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Helper function to demonstrate database queries
const runDatabaseQueries = () => {
  console.log('🔍 Running sample database queries...');

  // Count tasks by status
  tasksCollection.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ], (err, results) => {
    if (!err && results) {
      console.log('📊 Items by status:', results);
    }
  });

  // Count by task_type
  tasksCollection.aggregate([
    { $group: { _id: '$task_type', count: { $sum: 1 } } }
  ], (err, results) => {
    if (!err && results) {
      console.log('📦 Items by type:', results);
    }
  });

  // Find high priority tasks (only tasks, not incidents)
  tasksCollection.find({ priority: 'high', task_type: 'task' }).toArray((err, highPriorityTasks) => {
    if (!err) {
      console.log(`⚡ Found ${highPriorityTasks.length} high priority tasks`);
    }
  });

  // Find critical incidents
  tasksCollection.find({ severity: 'critical', task_type: 'incident' }).toArray((err, criticalIncidents) => {
    if (!err) {
      console.log(`🚨 Found ${criticalIncidents.length} critical incidents`);
    }
  });

  // Find persons with high motivation
  persons.find({ motivation: { $gte: 90 } }).toArray((err, motivatedPersons) => {
    if (!err) {
      console.log(`🚀 Found ${motivatedPersons.length} highly motivated persons`);
    }
  });
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Seeding interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Seeding terminated');
  process.exit(0);
});

// Check if database directory exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database directory not found!');
  console.log('Please run "npm run install-db" first to initialize the database.');
  process.exit(1);
}

// Run seeding
seed().catch((error) => {
  console.error('❌ Fatal error during seeding:', error);
  process.exit(1);
});
