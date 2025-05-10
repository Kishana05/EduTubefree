/**
 * Utility functions for managing course data
 * Provides consistent storage and retrieval with MongoDB Atlas synchronization
 */

// Import MongoDB sync utilities
import { saveToMongoDB, deleteFromMongoDB, fetchFromMongoDB } from './mongoSync';

// Use a consistent storage key across the entire application
const STORAGE_KEY = 'edutube_courses';

/**
 * Save a course to both MongoDB Atlas and localStorage
 * @param {Object} course - The course to save
 * @returns {Promise<Object>} The saved course with MongoDB _id
 */
export const saveCourse = async (course) => {
  try {
    console.log('🔄 Starting course save process:', course.title);

    // First, save to MongoDB Atlas through our mongoSync utility
    const savedCourse = await saveToMongoDB(course);
    
    // Ensure we have a valid response
    if (!savedCourse || !savedCourse._id) {
      throw new Error('MongoDB did not return a valid course with _id');
    }
    
    console.log('✅ Course successfully saved to MongoDB Atlas:', savedCourse);

    // Now save to localStorage with the MongoDB _id to ensure consistency
    // Get existing courses
    const existingCoursesStr = localStorage.getItem(STORAGE_KEY);
    let courses = [];
    
    if (existingCoursesStr) {
      try {
        courses = JSON.parse(existingCoursesStr);
      } catch (e) {
        console.warn('⚠️ Error parsing courses from localStorage, using empty array');
        courses = [];
      }
    }
    
    // Use the MongoDB _id from the response
    const updatedCourse = { 
      ...course, 
      _id: savedCourse._id,
      updatedAt: new Date().toISOString() 
    };
    
    // Check if course already exists by ID
    const courseExists = courses.some(c => c._id === updatedCourse._id);
    
    if (!courseExists) {
      // Add new course
      courses.push(updatedCourse);
    } else {
      // Update existing course
      courses = courses.map(c => c._id === updatedCourse._id ? updatedCourse : c);
    }
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    
    // Also update the old key for backward compatibility
    localStorage.setItem('adminCourses', JSON.stringify(courses));
    
    // Synchronize data between sites for cross-app compatibility
    localStorage.setItem('courses_data', JSON.stringify(courses));
    localStorage.setItem('user_courses', JSON.stringify(courses));
    
    console.log(`✅ Saved course ${updatedCourse.title} to localStorage. Total courses: ${courses.length}`);
    
    // Verify MongoDB synchronization
    try {
      const mongoCount = await verifyMongoDBSync();
      console.log(`ℹ️ MongoDB Atlas now has ${mongoCount} courses`);
    } catch (error) {
      console.error('❌ Error verifying MongoDB sync:', error);
    }
    
    return updatedCourse;
  } catch (error) {
    console.error('❌ Error saving course:', error);
    throw error;
  }
};

/**
 * Get all courses from localStorage with MongoDB fallback
 * @param {boolean} forceRefresh - Whether to force refresh from MongoDB
 * @returns {Promise<Array>} Array of courses
 */
export const getCourses = async (forceRefresh = false) => {
  try {
    // If force refresh, get from MongoDB first
    if (forceRefresh) {
      try {
        // Try to fetch from MongoDB
        const mongoDbCourses = await fetchFromMongoDB();
        
        // Update localStorage with MongoDB data
        if (mongoDbCourses && mongoDbCourses.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mongoDbCourses));
          localStorage.setItem('adminCourses', JSON.stringify(mongoDbCourses));
          localStorage.setItem('courses_data', JSON.stringify(mongoDbCourses));
          localStorage.setItem('user_courses', JSON.stringify(mongoDbCourses));
          
          console.log(`✅ Refreshed ${mongoDbCourses.length} courses from MongoDB Atlas`);
          return mongoDbCourses;
        }
      } catch (error) {
        console.error('❌ Error fetching from MongoDB:', error);
        // Continue to get from localStorage as fallback
      }
    }
    
    // Get from localStorage
    const coursesStr = localStorage.getItem(STORAGE_KEY);
    if (coursesStr) {
      try {
        return JSON.parse(coursesStr);
      } catch (error) {
        console.error('❌ Error parsing courses from localStorage:', error);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error('❌ Error getting courses:', error);
    return [];
  }
};

/**
 * Delete a course by ID from both MongoDB Atlas and localStorage
 * @param {string} courseId - The ID of the course to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
export const deleteCourse = async (courseId) => {
  try {
    console.log(`🔄 Deleting course with ID: ${courseId}`);
    
    // First, delete from MongoDB Atlas using our sync utility
    await deleteFromMongoDB(courseId);
    console.log('✅ Course successfully deleted from MongoDB Atlas');
    
    // Now delete from localStorage
    const coursesStr = localStorage.getItem(STORAGE_KEY);
    if (coursesStr) {
      try {
        const courses = JSON.parse(coursesStr);
        const updatedCourses = courses.filter(course => course._id !== courseId);
        
        // Save back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCourses));
        
        // Update other keys for backward compatibility
        localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
        localStorage.setItem('courses_data', JSON.stringify(updatedCourses));
        localStorage.setItem('user_courses', JSON.stringify(updatedCourses));
        
        console.log(`✅ Course deleted from localStorage. Remaining courses: ${updatedCourses.length}`);
      } catch (error) {
        console.error('❌ Error parsing localStorage courses:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting course:', error);
    throw error;
  }
};

/**
 * Debug function to print all courses to console
 * @param {boolean} includeMongoCount - Whether to include MongoDB count
 */
export const debugCourses = async (includeMongoCount = true) => {
  // Log localStorage courses
  const coursesStr = localStorage.getItem(STORAGE_KEY);
  if (coursesStr) {
    try {
      const courses = JSON.parse(coursesStr);
      console.group('📊 Courses in localStorage');
      console.table(courses.map(c => ({
        _id: c._id,
        title: c.title,
        instructor: c.instructor,
        category: typeof c.category === 'object' ? c.category.name : c.category
      })));
      console.log(`Total courses in localStorage: ${courses.length}`);
      console.groupEnd();
    } catch (error) {
      console.error('❌ Error debugging localStorage courses:', error);
    }
  } else {
    console.log('No courses found in localStorage');
  }
  
  // Also check MongoDB if requested
  if (includeMongoCount) {
    try {
      await verifyMongoDBSync(true); // true = verbose logging
    } catch (error) {
      console.error('❌ Error checking MongoDB courses:', error);
    }
  }
};

/**
 * Verify MongoDB synchronization and return course count
 * @param {boolean} verbose - Whether to log detailed information
 * @returns {Promise<number>} Number of courses in MongoDB
 */
export const verifyMongoDBSync = async (verbose = false) => {
  try {
    // Import the module dynamically to avoid circular dependencies
    const { verifyMongoDBConnection } = await import('./mongoSync');
    const count = await verifyMongoDBConnection();
    
    if (verbose) {
      console.log(`MongoDB Atlas has ${count} courses`);
      
      // Compare with localStorage
      const localCourses = await getCourses();
      if (localCourses.length !== count) {
        console.warn(`⚠️ Sync issue: localStorage has ${localCourses.length} courses, MongoDB has ${count}`);
      } else {
        console.log('✅ MongoDB and localStorage are in sync');
      }
    }
    
    return count;
  } catch (error) {
    console.error('❌ Error verifying MongoDB sync:', error);
    return 0;
  }
};
