/**
 * MongoDB Synchronization Utility
 * This script ensures that all courses are properly saved to MongoDB Atlas
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

// Get MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('\u274c Error: MONGODB_URI environment variable is missing');
  process.exit(1);
}

// Define Course schema to match what's in the models/Course.js
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

// Create the Course model
const Course = mongoose.model('Course', CourseSchema);

// Connect to MongoDB
console.log(`\ud83d\udd0d Connecting to MongoDB: ${MONGODB_URI.substring(0, 20)}...`);

// Try to load courses from localStorage through a file (since this runs server-side)
const loadCoursesFromFile = () => {
  try {
    // Check if the localStorage backup file exists
    if (fs.existsSync('./local-courses-backup.json')) {
      const coursesJson = fs.readFileSync('./local-courses-backup.json', 'utf8');
      return JSON.parse(coursesJson);
    }
    
    console.warn('\u26a0\ufe0f No local courses backup file found');
    return [];
  } catch (error) {
    console.error('\u274c Error loading courses from file:', error.message);
    return [];
  }
};

// Function to sync courses to MongoDB
const syncCoursesToMongoDB = async () => {
  try {
    // Get all courses from local file
    const localCourses = loadCoursesFromFile();
    console.log(`Found ${localCourses.length} courses in local backup`);
    
    if (localCourses.length === 0) {
      console.log('No local courses found to sync. Exiting.');
      return;
    }
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('\u2705 Connected to MongoDB successfully');
    
    // Get existing courses from MongoDB
    const existingCourses = await Course.find({});
    console.log(`Found ${existingCourses.length} existing courses in MongoDB`);
    
    // Create a map of existing courses by title for easy lookup
    const existingCoursesByTitle = new Map();
    existingCourses.forEach(course => {
      existingCoursesByTitle.set(course.title, course);
    });
    
    // Prepare courses to be added
    const coursesToAdd = [];
    
    for (const localCourse of localCourses) {
      // Check if course already exists in MongoDB by title
      const existingCourse = existingCoursesByTitle.get(localCourse.title);
      
      if (!existingCourse) {
        // This is a new course, add it to MongoDB
        // Format category properly
        const categoryFormatted = typeof localCourse.category === 'object' 
          ? (localCourse.category._id || localCourse.category.name || 'web-development')
          : localCourse.category || 'web-development';
          
        // Fix any missing required fields
        const courseToAdd = {
          ...localCourse,
          category: categoryFormatted,
          level: localCourse.level || 'beginner',
          instructor: localCourse.instructor || 'Unknown Instructor',
          thumbnail: localCourse.thumbnail || 'https://placehold.co/640x360/eee/999?text=Course+Image',
          // Remove MongoDB _id if it exists to allow MongoDB to generate a new one
          _id: undefined
        };
        
        // Add to list for bulk insertion
        coursesToAdd.push(courseToAdd);
      }
    }
    
    console.log(`Found ${coursesToAdd.length} new courses to add to MongoDB`);
    
    if (coursesToAdd.length > 0) {
      // Insert all new courses at once
      const result = await Course.insertMany(coursesToAdd);
      console.log(`\u2705 Successfully added ${result.length} courses to MongoDB`);
      
      // Log the course titles that were added
      result.forEach(course => {
        console.log(`- Added: ${course.title} (ID: ${course._id})`);
      });
    } else {
      console.log('No new courses to add. MongoDB is already up to date.');
    }
    
    // Verify final count
    const finalCount = await Course.countDocuments();
    console.log(`Final MongoDB course count: ${finalCount}`);
    
    // Update the local backup with the MongoDB data
    const allMongoDBCourses = await Course.find({});
    fs.writeFileSync('./local-courses-backup.json', JSON.stringify(allMongoDBCourses, null, 2));
    console.log('\u2705 Updated local backup file with latest MongoDB data');
    
    return {
      success: true,
      count: finalCount,
      added: coursesToAdd.length
    };
  } catch (error) {
    console.error('\u274c Error synchronizing courses:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Close the MongoDB connection
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
};

// Run the sync function
syncCoursesToMongoDB()
  .then(result => {
    if (result.success) {
      console.log('\u2705 Sync completed successfully');
    } else {
      console.error('\u274c Sync failed:', result.error);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\u274c Unexpected error during sync:', error);
    process.exit(1);
  });
