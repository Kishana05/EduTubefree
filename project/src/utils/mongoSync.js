/**
 * MongoDB Synchronization Utility
 * This module ensures that all course operations sync properly with MongoDB Atlas
 */

// Import API utils
import { API_BASE_URL } from '../config';
import { getToken } from './auth';

/**
 * Saves a course to MongoDB Atlas
 * @param {Object} course - The course to save
 * @returns {Promise<Object>} The saved course with MongoDB _id
 */
export const saveToMongoDB = async (course) => {
  try {
    console.log('🔄 Saving course to MongoDB Atlas:', course.title);
    
    // Get the auth token
    const token = getToken();
    
    if (!token) {
      console.error('❌ Authentication token not found. User may not be logged in.');
      throw new Error('Authentication required to save courses');
    }
    
    // Format the request payload
    const payload = {
      ...course,
      // If category is an object, extract the id or name
      category: typeof course.category === 'object' 
        ? (course.category._id || course.category.name || 'web-development')
        : course.category
    };
    
    // Determine if this is a new course or an update
    const method = course._id ? 'PUT' : 'POST';
    const apiUrl = course._id 
      ? `${API_BASE_URL}/api/courses/${course._id}`
      : `${API_BASE_URL}/api/courses`;
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload)
    });
    
    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ MongoDB API error (${response.status}):`, errorText);
      throw new Error(`Failed to save course: ${response.status} ${errorText || response.statusText}`);
    }
    
    // Parse the response
    const savedCourse = await response.json();
    console.log('✅ Course saved to MongoDB Atlas successfully:', savedCourse.title);
    
    return savedCourse;
  } catch (error) {
    console.error('❌ Error saving to MongoDB:', error);
    throw error;
  }
};

/**
 * Deletes a course from MongoDB Atlas
 * @param {string} courseId - The ID of the course to delete
 * @returns {Promise<boolean>} True if deletion succeeded
 */
export const deleteFromMongoDB = async (courseId) => {
  try {
    console.log('🔄 Deleting course from MongoDB Atlas:', courseId);
    
    // Get the auth token
    const token = getToken();
    
    if (!token) {
      console.error('❌ Authentication token not found. User may not be logged in.');
      throw new Error('Authentication required to delete courses');
    }
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ MongoDB API error (${response.status}):`, errorText);
      throw new Error(`Failed to delete course: ${response.status} ${errorText || response.statusText}`);
    }
    
    console.log('✅ Course deleted from MongoDB Atlas successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting from MongoDB:', error);
    throw error;
  }
};

/**
 * Fetches all courses from MongoDB Atlas
 * @returns {Promise<Array>} Array of courses
 */
export const fetchFromMongoDB = async () => {
  try {
    console.log('🔄 Fetching courses from MongoDB Atlas');
    
    // Get the auth token
    const token = getToken();
    
    if (!token) {
      console.warn('⚠️ Authentication token not found. Attempting to fetch without auth.');
    }
    
    // Set up request headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/courses`, {
      method: 'GET',
      headers
    });
    
    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ MongoDB API error (${response.status}):`, errorText);
      throw new Error(`Failed to fetch courses: ${response.status} ${errorText || response.statusText}`);
    }
    
    // Parse the response
    const courses = await response.json();
    console.log(`✅ Fetched ${courses.length} courses from MongoDB Atlas`);
    
    return courses;
  } catch (error) {
    console.error('❌ Error fetching from MongoDB:', error);
    throw error;
  }
};

/**
 * Verifies MongoDB connection and returns course count
 * @returns {Promise<number>} Number of courses in MongoDB
 */
export const verifyMongoDBConnection = async () => {
  try {
    const courses = await fetchFromMongoDB();
    return courses.length;
  } catch (error) {
    console.error('❌ MongoDB connection verification failed:', error);
    return 0;
  }
};

// Export as a default object for backward compatibility
export default {
  saveToMongoDB,
  deleteFromMongoDB,
  fetchFromMongoDB,
  verifyMongoDBConnection
};
