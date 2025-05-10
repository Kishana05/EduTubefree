/**
 * MongoDB Change Stream Monitor
 * This script ensures real-time synchronization between EduTube and MongoDB Atlas
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Create log file
const logFile = fs.createWriteStream('./mongodb-sync.log', { flags: 'a' });
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logFile.write(logMessage + '\n');
};

log('=== MongoDB Change Stream Monitor Started ===');
log(`Connecting to: ${MONGODB_URI.substring(0, 20)}...`);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  log('✅ Connected to MongoDB Atlas');
  
  const db = mongoose.connection.db;
  
  // Make sure we're watching the correct database
  log(`Connected to database: ${db.databaseName}`);
  
  // Check if courses collection exists
  const collections = await db.listCollections({name: 'courses'}).toArray();
  if (collections.length === 0) {
    log('❌ Error: courses collection does not exist');
    process.exit(1);
  }
  
  log('✅ Courses collection found');
  
  // Get current document count
  const count = await db.collection('courses').countDocuments();
  log(`Current courses count: ${count}`);
  
  // Set up change stream to track course collection changes
  const courseChangeStream = db.collection('courses').watch();
  
  log('🔄 Watching for changes in courses collection...');
  
  // Listen for changes
  courseChangeStream.on('change', async (change) => {
    try {
      // Get updated count
      const newCount = await db.collection('courses').countDocuments();
      
      // Log the change
      if (change.operationType === 'insert') {
        log(`➕ New course added: "${change.fullDocument.title}"`);
        log(`Updated course count: ${newCount}`);
        
        // Force refresh local data
        await ensureLocalSync(db);
      } else if (change.operationType === 'delete') {
        log(`➖ Course deleted with ID: ${change.documentKey._id}`);
        log(`Updated course count: ${newCount}`);
        
        // Force refresh local data
        await ensureLocalSync(db);
      } else if (change.operationType === 'update') {
        log(`🔄 Course updated with ID: ${change.documentKey._id}`);
        
        // Force refresh local data
        await ensureLocalSync(db);
      }
    } catch (err) {
      log(`❌ Error processing change: ${err.message}`);
    }
  });
  
  // Also set up an interval to periodically check and verify the collection
  setInterval(async () => {
    try {
      const verificationCount = await db.collection('courses').countDocuments();
      log(`Verification check: ${verificationCount} courses in database`);
      
      // Ensure local data is in sync
      await ensureLocalSync(db);
    } catch (err) {
      log(`❌ Error during verification: ${err.message}`);
    }
  }, 30000); // Check every 30 seconds
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('Received SIGINT. Closing change stream and exiting...');
    courseChangeStream.close();
    mongoose.connection.close();
    process.exit(0);
  });

  // Trigger an initial sync
  await ensureLocalSync(db);
  
})
.catch(err => {
  log(`❌ Error connecting to MongoDB: ${err.message}`);
  process.exit(1);
});

// Function to ensure local data is in sync with MongoDB
async function ensureLocalSync(db) {
  try {
    // Get all courses from MongoDB
    const courses = await db.collection('courses').find({}).toArray();
    log(`Syncing ${courses.length} courses with local storage`);
    
    // Update local storage with the latest data
    if (courses.length > 0) {
      // Save to local storage (for mock mode fallback)
      fs.writeFileSync(
        './local-courses-backup.json', 
        JSON.stringify(courses, null, 2)
      );
      log('✅ Local backup saved successfully');
    }
    
    return courses.length;
  } catch (err) {
    log(`❌ Error syncing data: ${err.message}`);
    return -1;
  }
}
