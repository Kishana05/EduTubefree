/**
 * Safe wrapper for EduTubeSync functionality
 * This module safely imports EduTube synchronization functionality
 * in a way that's compatible with ES modules
 */

// Create a safe proxy for the EduTubeSync functions
const EduTubeSyncProxy = {
  syncCourse: async (course) => {
    try {
      // Only call if window.EduTubeSync exists
      if (typeof window !== 'undefined' && window.EduTubeSync && window.EduTubeSync.syncCourse) {
        return await window.EduTubeSync.syncCourse(course);
      }
      console.log('EduTubeSync not available, skipping sync');
      return course;
    } catch (error) {
      console.error('Error in syncCourse:', error);
      return course;
    }
  },
  
  forceSync: async () => {
    try {
      if (typeof window !== 'undefined' && window.EduTubeSync && window.EduTubeSync.forceSync) {
        return await window.EduTubeSync.forceSync();
      }
      console.log('EduTubeSync not available, skipping forceSync');
      return false;
    } catch (error) {
      console.error('Error in forceSync:', error);
      return false;
    }
  }
};

// Export the proxy
export default EduTubeSyncProxy;
