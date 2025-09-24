const fs = require('fs');
const path = require('path');
const tingodb = require('tingodb')();

// Database configuration
const DB_PATH = path.join(__dirname, 'database');
const DATA_PATH = path.join(__dirname, 'src', 'data');

console.log('🌱 Seeding database with mock data...');

// Initialize TingoDB
const db = new tingodb.Db(DB_PATH, {});

// Collections
const tasks = db.collection('tasks');
const persons = db.collection('persons');
const incidents = db.collection('incidents');

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
    const mockIncidents = readJsonFile('mockIncidents.json');

    if (!mockTasks || !mockUsers || !mockIncidents) {
      throw new Error('Failed to read one or more mock data files');
    }

    console.log(`📊 Found ${mockTasks.length} tasks, ${mockUsers.length} users, ${mockIncidents.length} incidents`);

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    
    await clearCollection(tasks, 'tasks');
    await clearCollection(persons, 'persons');
    await clearCollection(incidents, 'incidents');

    // Insert mock data
    console.log('📤 Inserting mock data...');

    // Insert tasks
    const tasksInserted = await insertData(tasks, mockTasks, 'tasks');

    // Insert persons (users)
    const personsInserted = await insertData(persons, mockUsers, 'persons');

    // Insert incidents
    const incidentsInserted = await insertData(incidents, mockIncidents, 'incidents');

    // Create some additional computed data
    console.log('🔧 Creating additional computed data...');

    // Add some completed tasks to demonstrate the system
    const additionalTasks = [
      {
        "id": "task-11",
        "title": "Implement Password Reset",
        "description": "Create password reset functionality with email verification",
        "status": "completed",
        "assignedTo": "user-3",
        "priority": "medium",
        "estimatedHours": 8,
        "completedHours": 8,
        "dependencies": ["task-1"],
        "type": "feature",
        "completedAt": new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        "id": "task-12",
        "title": "Setup Error Monitoring",
        "description": "Integrate error tracking and monitoring system",
        "status": "in_progress",
        "assignedTo": "user-3",
        "priority": "high",
        "estimatedHours": 12,
        "completedHours": 6,
        "dependencies": [],
        "type": "infrastructure"
      },
      {
        "id": "task-13",
        "title": "Create User Profile Page",
        "description": "Build user profile management interface",
        "status": "pending",
        "assignedTo": "user-3",
        "priority": "medium",
        "estimatedHours": 16,
        "completedHours": 0,
        "dependencies": ["task-1"],
        "type": "feature"
      }
    ];

    await insertData(tasks, additionalTasks, 'additional tasks');

    // Verify data insertion
    console.log('🔍 Verifying data insertion...');
    
    tasks.count({}, (err, taskCount) => {
      if (err) console.error('Error counting tasks:', err);
      else console.log(`📋 Total tasks in database: ${taskCount}`);
    });

    persons.count({}, (err, personCount) => {
      if (err) console.error('Error counting persons:', err);
      else console.log(`👥 Total persons in database: ${personCount}`);
    });

    incidents.count({}, (err, incidentCount) => {
      if (err) console.error('Error counting incidents:', err);
      else console.log(`🚨 Total incidents in database: ${incidentCount}`);
    });

    // Add a delay to ensure all operations complete
    setTimeout(() => {
      console.log('');
      console.log('🎉 Database seeding completed successfully!');
      console.log('');
      console.log('Summary:');
      console.log(`- Tasks: ${tasksInserted + additionalTasks.length} records`);
      console.log(`- Persons: ${personsInserted} records`);
      console.log(`- Incidents: ${incidentsInserted} records`);
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
  tasks.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ], (err, results) => {
    if (!err && results) {
      console.log('📊 Tasks by status:', results);
    }
  });

  // Find high priority tasks
  tasks.find({ priority: 'high' }).toArray((err, highPriorityTasks) => {
    if (!err) {
      console.log(`⚡ Found ${highPriorityTasks.length} high priority tasks`);
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
