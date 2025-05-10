/**
 * EduTube Course Synchronization Fix
 * Run this directly in browser console to fix course visibility issues
 */

function fixCourseSync() {
  console.log('Starting course synchronization fix...');
  
  try {
    // Get all admin courses
    const adminCoursesStr = localStorage.getItem('adminCourses');
    if (!adminCoursesStr) {
      console.error('No admin courses found in localStorage');
      return false;
    }
    
    // Parse admin courses
    const adminCourses = JSON.parse(adminCoursesStr);
    console.log(`Found ${adminCourses.length} courses in adminCourses`);
    
    // Save courses to all known storage keys
    const storageKeys = [
      'adminCourses',
      'edutube_courses', 
      'courses_data',
      'user_courses',
      'visible_courses',
      'all_courses'
    ];
    
    storageKeys.forEach(key => {
      localStorage.setItem(key, adminCoursesStr);
      console.log(`Saved ${adminCourses.length} courses to ${key}`);
    });
    
    console.log('Course synchronization completed successfully!');
    console.log('Please REFRESH this page to see the changes');
    
    return true;
  } catch (error) {
    console.error('Error during course synchronization:', error);
    return false;
  }
}

// Make the function available globally
window.fixCourseSync = fixCourseSync;
