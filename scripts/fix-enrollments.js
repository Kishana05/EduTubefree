const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Course = require('../models/Course');

// Load environment variables
dotenv.config();

const findExistingUser = async () => {
  try {
    const user = await User.findOne({ role: 'user' }).select('+password');
    return user;
  } catch (err) {
    console.error('Error finding user:', err);
    return null;
  }
};

const findExistingCourses = async () => {
  try {
    const courses = await Course.find().limit(3);
    return courses;
  } catch (err) {
    console.error('Error finding courses:', err);
    return [];
  }
};

const addEnrollments = async (userId, courseIds) => {
  try {
    // First find the user by ID and check existing enrollments
    const user = await User.findById(userId);
    console.log(`Found user: ${user.name} (${user.email})`);
    
    console.log('Current enrollments:', user.enrolledCourses.length);
    
    // Add enrollments for courses that aren't already enrolled
    let enrollmentCount = 0;
    
    for (const courseId of courseIds) {
      // Check if already enrolled
      const isEnrolled = user.enrolledCourses.some(
        enrollment => enrollment.course.toString() === courseId.toString()
      );
      
      if (!isEnrolled) {
        // Add to enrolled courses
        user.enrolledCourses.push({
          course: courseId,
          progress: Math.floor(Math.random() * 100), // Random progress for testing
          completedLessons: [],
          startDate: new Date(),
          lastAccessDate: new Date()
        });
        enrollmentCount++;
      }
    }
    
    if (enrollmentCount > 0) {
      // Save the updated user
      await user.save();
      console.log(`Added ${enrollmentCount} new course enrollments`);
    } else {
      console.log('No new enrollments added (courses already enrolled)');
    }
    
    // Verify enrollments with a fresh query
    const updatedUser = await User.findById(userId).populate('enrolledCourses.course');
    console.log('Updated enrollments:', updatedUser.enrolledCourses.length);
    
    // Print details of enrolled courses
    updatedUser.enrolledCourses.forEach((enrollment, idx) => {
      console.log(`Enrollment ${idx+1}:`);
      console.log(`  Course: ${enrollment.course.title || enrollment.course}`);
      console.log(`  Progress: ${enrollment.progress}%`);
      console.log(`  Start Date: ${enrollment.startDate}`);
    });
    
    return updatedUser.enrolledCourses;
  } catch (err) {
    console.error('Error adding enrollments:', err);
    return [];
  }
};

// Main function to run the fix
const fixEnrollments = async () => {
  try {
    // Connect to MongoDB Atlas
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edutube', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Atlas connected successfully');
    
    // Find an existing user
    const user = await findExistingUser();
    if (!user) {
      console.error('No users found in the database');
      process.exit(1);
    }
    
    // Find courses to enroll in
    const courses = await findExistingCourses();
    if (courses.length === 0) {
      console.error('No courses found in the database');
      process.exit(1);
    }
    
    // Add enrollments
    const courseIds = courses.map(course => course._id);
    await addEnrollments(user._id, courseIds);
    
    console.log('Enrollment fix complete!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the fix
fixEnrollments();
