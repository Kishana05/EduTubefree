/**
 * Script loader utility to dynamically load external scripts after the app has loaded
 */

export function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    
    document.body.appendChild(script);
  });
}

// Create utility function to load sync-courses.js
export async function loadSyncCoursesScript() {
  try {
    // Use a relative path from the base URL
    await loadExternalScript('/src/sync-courses.js');
    console.log('Successfully loaded sync-courses.js');
    return true;
  } catch (error) {
    console.error('Error loading sync-courses.js:', error);
    return false;
  }
}
