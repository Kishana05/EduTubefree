/**
 * MongoDB Course Count Verification
 * This script simply verifies the current number of courses in MongoDB Atlas
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is missing');
  process.exit(1);
}

// Connect to MongoDB and check course count
async function verifyCourseCount() {
  try {
    console.log(`Connecting to MongoDB: ${MONGODB_URI.substring(0, 20)}...`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Count the documents in the courses collection
    const count = await mongoose.connection.db.collection('courses').countDocuments();
    
    console.log(`==================================`);
    console.log(`MongoDB Atlas has ${count} courses`);
    console.log(`==================================`);
    
    if (count >= 3) {
      console.log('✅ SUCCESS: MongoDB has 3 or more courses as required!');
    } else {
      console.log('⚠️ WARNING: MongoDB has fewer than 3 courses');
    }
    
    // List all courses with their titles and IDs
    console.log('\nCourses in MongoDB Atlas:');
    const courses = await mongoose.connection.db.collection('courses').find({}).toArray();
    
    courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (ID: ${course._id})`);
    });
    
    return { success: true, count };
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error: error.message };
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the verification
verifyCourseCount()
  .then(result => {
    if (result.success) {
      console.log(`Verification complete: ${result.count} courses found`);
    } else {
      console.error(`Verification failed: ${result.error}`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
