/**
 * Enhanced Course synchronization script for EduTube (Global Version)
 * This file is loaded as a traditional script tag to avoid module system issues
 */

// Immediately-invoked function expression to avoid polluting global scope
(function() {
  // Key constants
  const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:5000/api`
    : '/api';
  
  const COURSES_ENDPOINT = `${API_BASE_URL}/courses`;

  // Function to be called after adding or updating a course in admin
  async function syncCourse(course) {
    console.log('🔄 Syncing course across storage and MongoDB Atlas:', course.title);
    
    // First sync to local storage (fallback in case API call fails)
    syncLocalStorage(course);
    
    // Then ensure MongoDB is in sync by checking latest data
    try {
      // Force a fetch from MongoDB to get latest state
      await fetchMongoDBCourses(true);
      
      // Check if the course exists in MongoDB by ID
      const doesExistInMongoDB = await checkCourseExistsInMongoDB(course._id);
      
      if (!doesExistInMongoDB) {
        console.warn(`⚠️ Course ${course.title} may not be saved to MongoDB. Attempting to save again...`);
        await saveCourseToDB(course);
      } else {
        console.log(`✅ Course ${course.title} exists in MongoDB Atlas.`);
      }
      
      // Refresh local storage with latest MongoDB data
      await fetchMongoDBCourses(true);
      
      return true;
    } catch (error) {
      console.error('❌ Error during MongoDB sync:', error.message);
      return false;
    }
  }

  // Function to sync local storage (fallback mechanism)
  function syncLocalStorage(course) {
    console.log('Syncing course to local storage:', course.title);
    
    // Get existing courses from both storages
    let adminCourses = [];
    let eduTubeCourses = [];
    
    try {
      const adminCoursesStr = localStorage.getItem('adminCourses');
      if (adminCoursesStr) {
        adminCourses = JSON.parse(adminCoursesStr);
      }
    } catch (e) {
      console.error('Error reading admin courses:', e);
    }
    
    try {
      const edutubeCoursesStr = localStorage.getItem('edutube_courses');
      if (edutubeCoursesStr) {
        eduTubeCourses = JSON.parse(edutubeCoursesStr);
      }
    } catch (e) {
      console.error('Error reading edutube courses:', e);
    }
    
    // Update or add course to admin courses
    let adminUpdated = false;
    const adminIndex = adminCourses.findIndex(c => c._id === course._id);
    if (adminIndex >= 0) {
      adminCourses[adminIndex] = course;
      adminUpdated = true;
    } else {
      adminCourses.push(course);
      adminUpdated = true;
    }
    
    // Update or add course to edutube courses
    let edutubeUpdated = false;
    const edutubeIndex = eduTubeCourses.findIndex(c => c._id === course._id);
    if (edutubeIndex >= 0) {
      eduTubeCourses[edutubeIndex] = course;
      edutubeUpdated = true;
    } else {
      eduTubeCourses.push(course);
      edutubeUpdated = true;
    }
    
    // Save back to localStorage
    if (adminUpdated) {
      localStorage.setItem('adminCourses', JSON.stringify(adminCourses));
      console.log('Updated adminCourses in localStorage');
    }
    
    if (edutubeUpdated) {
      localStorage.setItem('edutube_courses', JSON.stringify(eduTubeCourses));
      console.log('Updated edutube_courses in localStorage');
    }
    
    // Extra: Copy to additional keys to ensure visibility across ports
    localStorage.setItem('courses_data', JSON.stringify(adminCourses));
    localStorage.setItem('user_courses', JSON.stringify(adminCourses));
  }

  // Function to fetch the latest courses from MongoDB
  async function fetchMongoDBCourses(forceRefresh = false) {
    try {
      // Add cache-busting timestamp if forcing refresh
      const url = forceRefresh 
        ? `${COURSES_ENDPOINT}?_t=${Date.now()}` 
        : COURSES_ENDPOINT;
        
      // Make request with proper headers to avoid caching
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const courses = await response.json();
      console.log(`Fetched ${courses.length} courses from MongoDB Atlas`);
      
      // Update local storage with fresh data
      localStorage.setItem('adminCourses', JSON.stringify(courses));
      localStorage.setItem('edutube_courses', JSON.stringify(courses));
      localStorage.setItem('courses_data', JSON.stringify(courses));
      localStorage.setItem('user_courses', JSON.stringify(courses));
      
      return courses;
    } catch (error) {
      console.error('Error fetching MongoDB courses:', error);
      return [];
    }
  }

  // Function to check if a course exists in MongoDB by ID
  async function checkCourseExistsInMongoDB(courseId) {
    try {
      // Use a fetch to check if the course exists by ID
      const response = await fetch(`${COURSES_ENDPOINT}/${courseId}`);
      
      if (response.ok) {
        const course = await response.json();
        return !!course._id; // Return true if we got a course with an ID
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking if course ${courseId} exists:`, error);
      return false;
    }
  }

  // Function to save a course to MongoDB
  async function saveCourseToDB(course) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No auth token found! Cannot save course to MongoDB');
        return false;
      }
      
      // If the course has an ID, update it; otherwise create new
      const method = course._id ? 'PUT' : 'POST';
      const url = course._id ? `${COURSES_ENDPOINT}/${course._id}` : COURSES_ENDPOINT;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(course)
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const savedCourse = await response.json();
      console.log(`✅ Course ${savedCourse.title} saved to MongoDB successfully`);
      return true;
    } catch (error) {
      console.error('Error saving course to MongoDB:', error);
      return false;
    }
  }

  // Force sync all courses from MongoDB to local storage
  async function forceSync() {
    console.log('🔄 Force syncing all courses from MongoDB Atlas...');
    
    try {
      const mongoDbCourses = await fetchMongoDBCourses(true);
      
      if (mongoDbCourses && mongoDbCourses.length > 0) {
        console.log(`✅ Successfully synced ${mongoDbCourses.length} courses from MongoDB Atlas`);
        return mongoDbCourses.length;
      } else {
        console.warn('⚠️ No courses found in MongoDB Atlas during force sync');
        return 0;
      }
    } catch (error) {
      console.error('❌ Error during force sync:', error);
      return -1;
    }
  }

  // Check for courses in any storage with MongoDB verification
  async function checkAllStorage() {
    const storageKeys = ['adminCourses', 'edutube_courses', 'courses_data', 'user_courses'];
    const results = {};
    
    // Check each storage key
    for (const key of storageKeys) {
      try {
        const dataStr = localStorage.getItem(key);
        if (dataStr) {
          const data = JSON.parse(dataStr);
          results[key] = {
            count: data.length,
            example: data.length > 0 ? data[0].title : 'N/A',
            lastUpdated: data.length > 0 && data[0].updatedAt ? new Date(data[0].updatedAt).toLocaleString() : 'Unknown'
          };
        } else {
          results[key] = { count: 0, example: 'N/A', lastUpdated: 'Not found' };
        }
      } catch (error) {
        results[key] = { count: 0, example: 'Error', lastUpdated: 'Error parsing' };
      }
    }
    
    // Check MongoDB
    try {
      const mongoDbCourses = await fetchMongoDBCourses(true);
      results.mongoDB = {
        count: mongoDbCourses.length,
        example: mongoDbCourses.length > 0 ? mongoDbCourses[0].title : 'N/A',
        lastUpdated: mongoDbCourses.length > 0 && mongoDbCourses[0].updatedAt ? 
          new Date(mongoDbCourses[0].updatedAt).toLocaleString() : 'Unknown'
      };
    } catch (error) {
      results.mongoDB = { count: 0, example: 'Error', lastUpdated: 'Error fetching' };
    }
    
    console.table(results);
    return results;
  }

  // Variables for auto-refresh
  let refreshInterval = null;

  // Auto-refresh function to poll MongoDB for updates
  function startAutoRefresh(intervalMs = 5000) {
    if (refreshInterval) {
      console.log('Auto-refresh already running, stopping existing one first');
      clearInterval(refreshInterval);
    }
    
    console.log(`Starting auto-refresh with interval of ${intervalMs}ms`);
    
    // Initial fetch
    fetchMongoDBCourses(true).then(courses => {
      console.log(`Initial fetch complete, found ${courses.length} courses`);
    });
    
    // Set up interval
    refreshInterval = setInterval(async () => {
      try {
        const courses = await fetchMongoDBCourses(true);
        console.log(`Auto-refresh: Synced ${courses.length} courses from MongoDB Atlas`);
      } catch (error) {
        console.error('Error in auto-refresh:', error);
      }
    }, intervalMs);
    
    return true;
  }

  // Stop auto-refresh if needed
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      console.log('Stopped MongoDB auto-refresh');
      return true;
    }
    return false;
  }

  // Create global EduTubeSync object
  window.EduTubeSync = {
    syncCourse,
    forceSync,
    checkAllStorage,
    fetchMongoDBCourses,
    checkCourseExistsInMongoDB,
    saveCourseToDB,
    startAutoRefresh,
    stopAutoRefresh
  };

  // Start auto-refresh when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        console.log('DOM loaded, initializing MongoDB auto-refresh...');
        startAutoRefresh(5000);
      }, 2000);
    });
  } else {
    // DOM already loaded
    console.log('DOM already loaded, initializing MongoDB auto-refresh immediately...');
    startAutoRefresh(5000);
  }

  console.log('EduTubeSync global synchronization initialized');
})();
