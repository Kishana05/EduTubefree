require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB Atlas using the connection string from .env
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB Atlas successfully');
  updateCourseVideos();
}).catch(err => {
  console.error('Failed to connect to MongoDB Atlas:', err);
  process.exit(1);
});

// Import the Course model
const Course = require('../models/Course');

async function updateCourseVideos() {
  try {
    console.log('Starting course video URL migration...');
    
    // Get all courses
    const courses = await Course.find({});
    console.log(`Found ${courses.length} courses to process`);
    
    let updatedCount = 0;
    
    // Sample YouTube video URLs for different programming languages
    const sampleVideoUrls = {
      'javascript': 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
      'web': 'https://www.youtube.com/watch?v=pQN-pnXPaVg',
      'python': 'https://www.youtube.com/watch?v=rfscVS0vtbw',
      'java': 'https://www.youtube.com/watch?v=eIrMbAQSU34',
      'default': 'https://www.youtube.com/watch?v=rfscVS0vtbw'
    };
    
    // Update each course that doesn't have a videoUrl
    for (const course of courses) {
      // Skip if course already has a valid video URL
      if (course.videoUrl && course.videoUrl.trim() !== '') {
        console.log(`Course "${course.title}" already has a video URL: ${course.videoUrl}`);
        continue;
      }
      
      // Try to set the video URL based on course topic/title
      let videoUrl = sampleVideoUrls.default;
      const titleLower = course.title.toLowerCase();
      
      // Choose an appropriate video based on the course title
      for (const [topic, url] of Object.entries(sampleVideoUrls)) {
        if (titleLower.includes(topic)) {
          videoUrl = url;
          break;
        }
      }
      
      // Update the course with the new videoUrl
      course.videoUrl = videoUrl;
      await course.save();
      
      console.log(`Updated course "${course.title}" with video URL: ${videoUrl}`);
      updatedCount++;
    }
    
    console.log(`\nMigration complete: updated ${updatedCount} courses`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating course videos:', error);
    process.exit(1);
  }
}
