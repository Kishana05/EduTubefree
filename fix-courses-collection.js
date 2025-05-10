/**
 * This script directly fixes issues with courses collection in MongoDB Atlas
 * It ensures the collection exists, has the correct schema, and contains data
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Define Course Schema to match our application
const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  videoUrl: String,
  rating: {
    type: Number,
    default: 0
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  modules: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create Course model
const Course = mongoose.model('Course', CourseSchema);

console.log('=== MongoDB Courses Collection Fix ===');

// Get the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;
console.log(`Using MongoDB URI: ${MONGODB_URI ? MONGODB_URI.substring(0, 20) + '...' : 'Not found!'}`);

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

// Sample course data
const sampleCourses = [
  {
    title: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming language.',
    instructor: 'John Doe',
    thumbnail: 'https://cdn.pixabay.com/photo/2019/10/03/12/12/javascript-4523100_1280.jpg',
    category: 'javascript',
    level: 'beginner',
    videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
    rating: 4.7,
    totalStudents: 1250,
    featured: true,
    modules: []
  },
  {
    title: 'React.js for Beginners',
    description: 'Build modern user interfaces with React.',
    instructor: 'Jane Smith',
    thumbnail: 'https://cdn.pixabay.com/photo/2017/12/12/12/44/programming-3014296_1280.jpg',
    category: 'react',
    level: 'beginner',
    videoUrl: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
    rating: 4.8,
    totalStudents: 980,
    featured: true,
    modules: []
  }
];

// Connect to MongoDB and fix courses collection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ Connected to MongoDB Atlas successfully');
  
  const db = mongoose.connection.db;
  const collections = await db.listCollections({name: 'courses'}).toArray();
  
  if (collections.length > 0) {
    console.log('✅ Courses collection exists');
    
    // Check if courses collection has data
    const count = await Course.countDocuments();
    console.log(`Found ${count} courses in the database`);
    
    if (count === 0) {
      console.log('⚠️ Courses collection is empty, adding sample data...');
      
      // Add sample courses
      const result = await Course.insertMany(sampleCourses);
      console.log(`✅ Successfully added ${result.length} sample courses`);
      
      // List the inserted courses
      const courses = await Course.find({});
      console.log('Now the database contains these courses:');
      courses.forEach(course => {
        console.log(`- ${course.title} (ID: ${course._id})`);
      });
    } else {
      // List existing courses
      const courses = await Course.find({});
      console.log('Existing courses in the database:');
      courses.forEach(course => {
        console.log(`- ${course.title} (ID: ${course._id})`);
      });
    }
    
    // Test adding a new course directly
    const testCourse = new Course({
      title: 'MongoDB Essentials',
      description: 'Learn how to work with MongoDB database.',
      instructor: 'Database Expert',
      thumbnail: 'https://cdn.pixabay.com/photo/2018/04/11/19/48/data-3311458_1280.png',
      category: 'database',
      level: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=pWbMrx5rVBE',
      rating: 4.6,
      totalStudents: 750,
      featured: false,
      modules: []
    });
    
    try {
      const saved = await testCourse.save();
      console.log(`✅ Test course successfully added with ID: ${saved._id}`);
    } catch (saveErr) {
      console.error(`❌ Failed to add test course: ${saveErr.message}`);
    }
    
    // Verify final count
    const finalCount = await Course.countDocuments();
    console.log(`Final course count: ${finalCount}`);
    
  } else {
    console.log('⚠️ Courses collection does not exist, creating it now...');
    
    // Create courses collection and add sample data
    try {
      await db.createCollection('courses');
      console.log('✅ Courses collection created successfully');
      
      // Add sample courses
      const result = await Course.insertMany(sampleCourses);
      console.log(`✅ Successfully added ${result.length} sample courses`);
    } catch (createErr) {
      console.error(`❌ Error creating courses collection: ${createErr.message}`);
    }
  }
  
  console.log('\n=== COURSE COLLECTION FIX COMPLETE ===');
  console.log('Now try adding courses from your admin dashboard');
  console.log('The MongoDB Atlas collection should be properly set up now');
})
.catch(err => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
})
.finally(() => {
  // Close connection
  mongoose.connection.close();
  console.log('MongoDB connection closed');
});
