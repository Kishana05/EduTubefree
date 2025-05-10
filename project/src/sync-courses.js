/**
 * Enhanced Course synchronization script for EduTube
 * This file ensures real-time synchronization between admin dashboard, MongoDB Atlas, and courses page
 * Rewritten to be fully ES module compatible
 */

// Guard against SSR or non-browser environments
const isClient = typeof window !== 'undefined';

// Key constants - only initialize if in browser
let API_BASE_URL, COURSES_ENDPOINT;

if (isClient) {
  API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:5000/api`
    : '/api';
  
  COURSES_ENDPOINT = `${API_BASE_URL}/courses`;
}

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
  
  // For debugging
  console.log('Storage after sync:');
  console.log('- adminCourses:', adminCourses.length, 'courses');
  console.log('- edutube_courses:', eduTubeCourses.length, 'courses');
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
    // Fetch fresh data from MongoDB
    const mongoDBCourses = await fetchMongoDBCourses(true);
    
    if (mongoDBCourses && mongoDBCourses.length > 0) {
      console.log(`✅ Synced ${mongoDBCourses.length} courses from MongoDB to local storage`);
      return mongoDBCourses.length;
    }
    
    // If no MongoDB courses found, try local admin courses as fallback
    const adminCoursesStr = localStorage.getItem('adminCourses');
    if (adminCoursesStr) {
      const adminCourses = JSON.parse(adminCoursesStr);
      if (adminCourses && adminCourses.length > 0) {
        console.log(`⚠️ No MongoDB courses found. Using ${adminCourses.length} admin courses as fallback`);
        
        // Update all storage keys with admin courses
        localStorage.setItem('edutube_courses', adminCoursesStr);
        localStorage.setItem('courses_data', adminCoursesStr);
        localStorage.setItem('user_courses', adminCoursesStr);
        
        return adminCourses.length;
      }
    }
    
    console.warn('⚠️ No courses found in MongoDB or local storage');
    return 0;
  } catch (e) {
    console.error('❌ Error during force sync:', e);
    return -1;
  }
}

// Check for courses in any storage with MongoDB verification
async function checkAllStorage() {
  const keys = ['adminCourses', 'edutube_courses', 'courses_data', 'user_courses'];
  const results = {};
  
  // Check localStorage keys
  keys.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        results[key] = {
          found: true,
          count: parsed.length,
          titles: parsed.map(c => c.title || 'Unknown')
        };
      } else {
        results[key] = { found: false };
      }
    } catch (e) {
      results[key] = { found: false, error: e.message };
    }
  });
  
  // Check MongoDB
  try {
    const mongoDBCourses = await fetchMongoDBCourses(false);
    results.mongodb = {
      found: mongoDBCourses.length > 0,
      count: mongoDBCourses.length,
      titles: mongoDBCourses.map(c => c.title || 'Unknown')
    };
  } catch (error) {
    results.mongodb = {
      found: false,
      error: error.message
    };
  }
  
  console.log('Storage check results:', results);
  return results;
}

// Auto-refresh function to poll MongoDB for updates
function startAutoRefresh(intervalMs = 5000) {
  console.log(`🔄 Starting auto-refresh for MongoDB courses every ${intervalMs/1000} seconds`);
  
  // Run immediate sync
  forceSync();
  
  // Set up polling interval
  const intervalId = setInterval(async () => {
    console.log('💫 Auto-refreshing courses from MongoDB...');
    await fetchMongoDBCourses(true);
    
    // Get updated counts
    const mongoCount = (await fetchMongoDBCourses(false)).length;
    const localCount = JSON.parse(localStorage.getItem('adminCourses') || '[]').length;
    
    console.log(`MongoDB has ${mongoCount} courses, local storage has ${localCount} courses`);
    
    // If there's a mismatch, force sync
    if (mongoCount !== localCount) {
      console.log('⚠️ Course count mismatch detected! Forcing sync...');
      await forceSync();
    }
  }, intervalMs);
  
  // Store the interval ID so it can be cleared later if needed
  window.EduTubeSync.refreshIntervalId = intervalId;
  return intervalId;
}

// Stop auto-refresh if needed
function stopAutoRefresh() {
  if (window.EduTubeSync && window.EduTubeSync.refreshIntervalId) {
    clearInterval(window.EduTubeSync.refreshIntervalId);
    console.log('Auto-refresh stopped');
    return true;
  }
  return false;
}

// Create a module object to export
const eduTubeSync = {
  fetchMongoDBCourses,
  checkCourseExistsInMongoDB,
  saveCourseToDB,
  forceSync,
  checkAllStorage,
  startAutoRefresh,
  stopAutoRefresh
};

// Safe initialization that works in both ESM and browser contexts
function initializeSync() {
  if (!isClient) return; // Skip if not in browser
  
  try {
    // Make functions available globally
    window.EduTubeSync = eduTubeSync;
    
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
  } catch (error) {
    console.error('Error initializing EduTubeSync:', error);
  }
}

// Only run initialization in browser environment
if (isClient) {
  initializeSync();
}

// Clean ES module export
export default eduTubeSync;
