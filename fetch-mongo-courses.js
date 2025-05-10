/**
 * MongoDB Courses Fetch Utility
 * This script fetches all courses from MongoDB Atlas and saves them to a local backup file
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

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

// Function to fetch courses from MongoDB
const fetchCoursesFromMongoDB = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('\u2705 Connected to MongoDB successfully');
    
    // Get all courses from MongoDB
    const courses = await Course.find({});
    console.log(`Found ${courses.length} courses in MongoDB Atlas`);
    
    // Save all courses to a local backup file
    fs.writeFileSync('./local-courses-backup.json', JSON.stringify(courses, null, 2));
    console.log(`\u2705 Saved ${courses.length} courses to local backup file`);
    
    // Create test course data
    if (courses.length < 3) {
      console.log('Adding test courses to ensure we have at least 3 courses...');
      
      // Sample test courses
      const testCourses = [
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
        }
      ];
      
      // Check for existing courses with the same titles
      const existingTitles = courses.map(course => course.title);
      const newCourses = testCourses.filter(course => !existingTitles.includes(course.title));
      
      if (newCourses.length > 0) {
        // Add courses
        const result = await Course.insertMany(newCourses);
        console.log(`\u2705 Added ${result.length} test courses to MongoDB Atlas`);
        
        // Get updated courses
        const updatedCourses = await Course.find({});
        console.log(`Now have ${updatedCourses.length} total courses in MongoDB Atlas`);
        
        // Update local backup
        fs.writeFileSync('./local-courses-backup.json', JSON.stringify(updatedCourses, null, 2));
        console.log('\u2705 Updated local backup with test courses');
      } else {
        console.log('No new test courses needed - we already have enough unique courses');
      }
    }
    
    return {
      success: true,
      count: courses.length
    };
  } catch (error) {
    console.error('\u274c Error fetching courses:', error);
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

// Run the fetch function
fetchCoursesFromMongoDB()
  .then(result => {
    if (result.success) {
      console.log(`\u2705 Successfully fetched and backed up ${result.count} courses`);
      
      // Check if we have at least 3 courses as required
      if (result.count >= 3) {
        console.log('\u2705 Success! MongoDB Atlas now has at least 3 courses');
      } else {
        console.warn(`\u26a0\ufe0f Warning: MongoDB only has ${result.count} courses, which is less than the required 3`);
      }
    } else {
      console.error('\u274c Fetch failed:', result.error);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\u274c Unexpected error during fetch:', error);
    process.exit(1);
  });
