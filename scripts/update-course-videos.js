const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('Database Connection Error:', err);
    process.exit(1);
  });

// Import models
const Course = require('../models/Course');

/**
 * This script updates existing courses to ensure they have a videoUrl field.
 * If a course doesn't have a videoUrl, it will look for a video URL in the first lesson of the first module.
 */
async function updateCourseVideos() {
  try {
    console.log('Starting course video URL migration...');
    
    // Get all courses
    const courses = await Course.find({});
    console.log(`Found ${courses.length} courses to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Update each course
    for (const course of courses) {
      // If course already has a videoUrl, skip it
      if (course.videoUrl && course.videoUrl.trim() !== '') {
        console.log(`Course "${course.title}" already has a video URL: ${course.videoUrl}`);
        skippedCount++;
        continue;
      }
      
      // Look for video URL in the first lesson of the first module
      if (course.modules && course.modules.length > 0 && 
          course.modules[0].lessons && course.modules[0].lessons.length > 0) {
        
        const firstLesson = course.modules[0].lessons[0];
        if (firstLesson.videoUrl && firstLesson.videoUrl.trim() !== '') {
          // Update course with video URL from the first lesson
          course.videoUrl = firstLesson.videoUrl;
          await course.save();
          
          console.log(`Updated course "${course.title}" with video URL: ${course.videoUrl}`);
          updatedCount++;
        } else {
          console.log(`Course "${course.title}" has no video URL in its first lesson`);
          skippedCount++;
        }
      } else {
        console.log(`Course "${course.title}" has no modules or lessons`);
        skippedCount++;
      }
    }
    
    console.log('\nMigration complete:');
    console.log(`- Updated ${updatedCount} courses with video URLs`);
    console.log(`- Skipped ${skippedCount} courses`);
    
    // Disconnect from DB
    await mongoose.disconnect();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error updating course videos:', error);
  }
}

// Run the migration
updateCourseVideos();
