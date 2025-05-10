/**
 * Admin Dashboard Fix Script
 * This script will add all necessary courses to MongoDB
 * without relying on the broken AdminDashboard.tsx file
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Connect to MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

// Define Course Schema (same as in models/Course.js)
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

// Sample course data to ensure we have at least 3 courses
const sampleCourses = [
  {
    title: "React Masterclass",
    description: "Master React with hands-on projects and advanced concepts",
    instructor: "Jane Smith",
    thumbnail: "https://cdn.pixabay.com/photo/2017/12/12/12/44/programming-3014296_1280.jpg",
    category: "react",
    level: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=example1",
    rating: 4.8,
    totalStudents: 857,
    featured: true,
    modules: []
  },
  {
    title: "Data Science Fundamentals",
    description: "Learn the core concepts of data science and machine learning",
    instructor: "John Anderson",
    thumbnail: "https://cdn.pixabay.com/photo/2018/04/11/19/48/data-3311458_1280.png", 
    category: "data-science",
    level: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=example2",
    rating: 4.6,
    totalStudents: 1023,
    featured: false,
    modules: []
  },
  {
    title: "Advanced JavaScript Patterns",
    description: "Master advanced JavaScript patterns and techniques",
    instructor: "Alex Johnson",
    thumbnail: "https://cdn.pixabay.com/photo/2015/10/02/15/09/javascript-968983_1280.jpg",
    category: "javascript",
    level: "advanced",
    videoUrl: "https://www.youtube.com/watch?v=example3",
    rating: 4.9,
    totalStudents: 764,
    featured: true,
    modules: []
  },
  {
    title: "MongoDB Essentials",
    description: "Learn how to work with MongoDB database",
    instructor: "Database Expert",
    thumbnail: "https://cdn.pixabay.com/photo/2018/04/11/19/48/data-3311458_1280.png",
    category: "database",
    level: "intermediate",
    videoUrl: "https://www.youtube.com/watch?v=pWbMrx5rVBE",
    rating: 4.6,
    totalStudents: 750,
    featured: false,
    modules: []
  },
  {
    title: "Web Development Bootcamp",
    description: "Complete full-stack web development course from beginner to advanced",
    instructor: "Web Dev Pro",
    thumbnail: "https://cdn.pixabay.com/photo/2019/10/03/12/12/javascript-4523100_1280.jpg",
    category: "web-dev",
    level: "beginner",
    videoUrl: "https://www.youtube.com/watch?v=example5",
    rating: 4.9,
    totalStudents: 1750,
    featured: true,
    modules: []
  }
];

// Connect to MongoDB and ensure we have at least 3 courses
async function ensureCoursesExist() {
  try {
    console.log(`🔍 Connecting to MongoDB: ${MONGODB_URI.substring(0, 20)}...`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Get current course count
    const count = await Course.countDocuments();
    console.log(`Current course count in MongoDB: ${count}`);
    
    if (count >= 3) {
      console.log('✅ MongoDB already has 3 or more courses, no need to add more');
      
      // List existing courses
      const courses = await Course.find({});
      console.log('Existing courses:');
      courses.forEach((course, index) => {
        console.log(`${index + 1}. ${course.title} (ID: ${course._id})`);
      });
    } else {
      console.log(`Need to add at least ${3 - count} more courses to reach 3...`);
      
      // Find existing course titles to avoid duplicates
      const existingCourses = await Course.find({});
      const existingTitles = existingCourses.map(course => course.title);
      
      // Filter out courses that already exist
      const coursesToAdd = sampleCourses.filter(course => !existingTitles.includes(course.title));
      console.log(`Found ${coursesToAdd.length} unique courses to add`);
      
      // Insert new courses
      const result = await Course.insertMany(coursesToAdd);
      console.log(`✅ Successfully added ${result.length} new courses to MongoDB`);
      
      // Show final course count
      const finalCount = await Course.countDocuments();
      console.log(`Final course count in MongoDB: ${finalCount}`);
      
      // List all courses
      const allCourses = await Course.find({});
      console.log('All courses in MongoDB:');
      allCourses.forEach((course, index) => {
        console.log(`${index + 1}. ${course.title} (ID: ${course._id})`);
      });
    }
    
    return {
      success: true,
      message: 'MongoDB course verification complete',
      count: await Course.countDocuments()
    };
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the function
ensureCoursesExist()
  .then(result => {
    if (result.success) {
      console.log(`✅ SUCCESS: MongoDB now has ${result.count} courses`);
      if (result.count >= 3) {
        console.log('✅ The requirement for showing "1-3 of 3" in query results should now be met');
      } else {
        console.log('⚠️ WARNING: Could not meet the requirement of 3 courses');
      }
    } else {
      console.error('❌ ERROR:', result.message);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  });
