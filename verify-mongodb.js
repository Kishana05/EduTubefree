/**
 * MongoDB Connection Verification Script
 * This script directly tests the MongoDB Atlas connection
 * and verifies the courses collection
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Get the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set.');
  console.log('Please ensure your .env file contains a valid MONGODB_URI.');
  process.exit(1);
}

console.log('=== MongoDB Atlas Connection Test ===');
console.log(`Using MongoDB URI: ${MONGODB_URI.substring(0, 20)}...`);

// Log file setup
const logStream = fs.createWriteStream('./mongodb-verification.log', { flags: 'a' });
const log = (message) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s default
})
.then(async () => {
  log('MongoDB Atlas connected successfully!');

  // Check available databases
  try {
    const admin = mongoose.connection.db.admin();
    const databases = await admin.listDatabases();
    log(`Available databases: ${databases.databases.map(db => db.name).join(', ')}`);
  } catch (err) {
    log(`Error listing databases: ${err.message}`);
  }

  // Get current database name
  const dbName = mongoose.connection.db.databaseName;
  log(`Currently connected to database: ${dbName}`);

  // Check collections in the current database
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    log(`Collections in ${dbName}: ${collections.map(coll => coll.name).join(', ')}`);
    
    const coursesCollection = collections.find(coll => coll.name === 'courses');
    if (coursesCollection) {
      log('FOUND "courses" collection ✓');
      
      // Check document count in courses collection
      const count = await mongoose.connection.db.collection('courses').countDocuments();
      log(`Documents in courses collection: ${count}`);
      
      // Show sample document if available
      if (count > 0) {
        const sampleCourse = await mongoose.connection.db.collection('courses').findOne();
        log('Sample course document:');
        log(JSON.stringify(sampleCourse, null, 2));
      } else {
        log('No course documents found in the collection.');
        
        // Add a test document to verify write access
        log('Attempting to add a test course document...');
        const testCourse = {
          title: 'Test Course',
          description: 'This is a test course created by the verification script',
          instructor: 'System',
          thumbnail: 'https://via.placeholder.com/640x360?text=Test+Course',
          category: 'test',
          level: 'beginner',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        try {
          const result = await mongoose.connection.db.collection('courses').insertOne(testCourse);
          log(`Test course added successfully with ID: ${result.insertedId}`);
          log('WRITE ACCESS TO MONGODB CONFIRMED ✓');
          
          // Verify the document was added
          const newCount = await mongoose.connection.db.collection('courses').countDocuments();
          log(`Updated document count in courses collection: ${newCount}`);
        } catch (writeErr) {
          log(`ERROR: Failed to add test course: ${writeErr.message}`);
          log('This indicates you may not have write access to this collection.');
        }
      }
    } else {
      log('WARNING: "courses" collection not found in the database!');
      log('Attempting to create courses collection...');
      
      try {
        await mongoose.connection.db.createCollection('courses');
        log('Successfully created "courses" collection ✓');
        
        // Add a test document to the new collection
        const testCourse = {
          title: 'Test Course',
          description: 'This is a test course created by the verification script',
          instructor: 'System',
          thumbnail: 'https://via.placeholder.com/640x360?text=Test+Course',
          category: 'test',
          level: 'beginner',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await mongoose.connection.db.collection('courses').insertOne(testCourse);
        log(`Test course added successfully with ID: ${result.insertedId}`);
        log('WRITE ACCESS TO MONGODB CONFIRMED ✓');
      } catch (createErr) {
        log(`ERROR: Failed to create courses collection: ${createErr.message}`);
      }
    }
  } catch (err) {
    log(`Error listing collections: ${err.message}`);
  }
  
  // Provide recommendations
  log('\n=== RECOMMENDATIONS ===');
  log('1. Ensure your MongoDB Atlas network access allows connections from your IP');
  log('2. Verify the database name in your connection string (after the last / before any ?)');
  log('3. Check that your user has both read and write permissions to this database');
  log('4. Ensure the server is connecting with the correct authentication credentials');
  
  log('\n=== VERIFICATION COMPLETE ===');
})
.catch(err => {
  log(`ERROR connecting to MongoDB Atlas: ${err.message}`);
  log('Full error:');
  log(JSON.stringify(err, null, 2));
  
  log('\nPOSSIBLE SOLUTIONS:');
  log('1. Check your MongoDB Atlas connection string in .env file');
  log('2. Ensure your IP address is whitelisted in MongoDB Atlas');
  log('3. Verify username and password in connection string');
  log('4. Make sure MongoDB Atlas cluster is running');
  log('5. Check network connectivity to MongoDB Atlas');
})
.finally(() => {
  // Close the connection
  mongoose.connection.close();
  logStream.end();
  log('Connection closed.');
});
