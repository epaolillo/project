const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const tingodb = require('tingodb')();

// Database configuration
const DB_PATH = path.join(__dirname, 'database');

console.log('🚀 Installing database...');

// Ensure database directory exists
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
  console.log('✅ Created database directory:', DB_PATH);
} else {
  console.log('📁 Database directory already exists:', DB_PATH);
}

// Initialize TingoDB
const db = new tingodb.Db(DB_PATH, {});

// Collections
const users = db.collection('users');
const tasks = db.collection('tasks'); // Collection for tasks and incidents
const persons = db.collection('persons');
const edges = db.collection('edges'); // Flow edges/connections

// Hash password function
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Main installation function
async function install() {
  try {
    console.log('🔧 Setting up collections...');

    // Create indexes for better performance
    console.log('📊 Creating database indexes...');
    
    // Users collection indexes
    users.ensureIndex({ fieldName: 'username', unique: true }, (err) => {
      if (err) console.error('Error creating users username index:', err);
      else console.log('✅ Created unique index on users.username');
    });

    // Tasks collection indexes (for tasks and incidents)
    tasks.ensureIndex({ fieldName: 'id', unique: true }, (err) => {
      if (err) console.error('Error creating tasks id index:', err);
      else console.log('✅ Created unique index on tasks.id');
    });

    tasks.ensureIndex({ fieldName: 'assignedTo' }, (err) => {
      if (err) console.error('Error creating tasks assignedTo index:', err);
      else console.log('✅ Created index on tasks.assignedTo');
    });

    tasks.ensureIndex({ fieldName: 'status' }, (err) => {
      if (err) console.error('Error creating tasks status index:', err);
      else console.log('✅ Created index on tasks.status');
    });

    tasks.ensureIndex({ fieldName: 'task_type' }, (err) => {
      if (err) console.error('Error creating tasks task_type index:', err);
      else console.log('✅ Created index on tasks.task_type');
    });

    tasks.ensureIndex({ fieldName: 'severity' }, (err) => {
      if (err) console.error('Error creating tasks severity index:', err);
      else console.log('✅ Created index on tasks.severity (for incidents)');
    });

    // Persons collection indexes
    persons.ensureIndex({ fieldName: 'id', unique: true }, (err) => {
      if (err) console.error('Error creating persons id index:', err);
      else console.log('✅ Created unique index on persons.id');
    });

    // Edges collection indexes (for React Flow connections)
    edges.ensureIndex({ fieldName: 'id', unique: true }, (err) => {
      if (err) console.error('Error creating edges id index:', err);
      else console.log('✅ Created unique index on edges.id');
    });

    edges.ensureIndex({ fieldName: 'source' }, (err) => {
      if (err) console.error('Error creating edges source index:', err);
      else console.log('✅ Created index on edges.source');
    });

    edges.ensureIndex({ fieldName: 'target' }, (err) => {
      if (err) console.error('Error creating edges target index:', err);
      else console.log('✅ Created index on edges.target');
    });

    // Create default admin user
    console.log('👤 Creating default admin user...');
    
    const adminPassword = await hashPassword('admin123');
    const defaultAdmin = {
      username: 'admin',
      password: adminPassword,
      email: 'admin@company.com',
      role: 'administrator',
      name: 'Administrator',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Check if admin user already exists
    users.findOne({ username: 'admin' }, (err, existingAdmin) => {
      if (err) {
        console.error('Error checking for existing admin:', err);
        return;
      }

      if (existingAdmin) {
        console.log('⚠️  Admin user already exists, skipping creation');
      } else {
        users.insert(defaultAdmin, (err, result) => {
          if (err) {
            console.error('❌ Error creating admin user:', err);
          } else {
            console.log('✅ Created default admin user');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('   ⚠️  Please change the default password after first login!');
          }
        });
      }
    });

    // Create some test users
    console.log('👥 Creating test users...');
    
    const testUsers = [
      {
        username: 'alejandro',
        password: await hashPassword('password123'),
        email: 'alejandro@company.com',
        role: 'developer',
        name: 'Alejandro Campo',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        username: 'maria',
        password: await hashPassword('password123'),
        email: 'maria@company.com',
        role: 'developer',
        name: 'María González',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        username: 'carlos',
        password: await hashPassword('password123'),
        email: 'carlos@company.com',
        role: 'developer',
        name: 'Carlos Rodriguez',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Insert test users
    testUsers.forEach(user => {
      users.findOne({ username: user.username }, (err, existingUser) => {
        if (err) {
          console.error(`Error checking for existing user ${user.username}:`, err);
          return;
        }

        if (existingUser) {
          console.log(`⚠️  User ${user.username} already exists, skipping creation`);
        } else {
          users.insert(user, (err, result) => {
            if (err) {
              console.error(`❌ Error creating user ${user.username}:`, err);
            } else {
              console.log(`✅ Created test user: ${user.username}`);
            }
          });
        }
      });
    });

    // Add a small delay to ensure all operations complete
    setTimeout(() => {
      console.log('');
      console.log('🎉 Database installation completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run "npm run seed-db" to populate with sample data');
      console.log('2. Run "npm run server" to start the backend server');
      console.log('');
      console.log('Default login credentials:');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('');
      
      // Close database connection
      process.exit(0);
    }, 2000);

  } catch (error) {
    console.error('❌ Installation failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Installation interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Installation terminated');
  process.exit(0);
});

// Run installation
install().catch((error) => {
  console.error('❌ Fatal error during installation:', error);
  process.exit(1);
});
