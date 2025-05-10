/**
 * Utility for managing course data storage across different pages
 * to ensure consistency between admin dashboard and courses page
 */

// Course type is imported for documentation purposes
import type { Course } from '../types';

// Set a consistent storage key for courses
const COURSE_STORAGE_KEY = 'edutube_courses';

/**
 * Save a new course to storage
 */
export const saveCourse = (course: any): void => {
  try {
    // Get existing courses
    const existingCourses = getCourses();
    
    // Check if course already exists
    const exists = existingCourses.some((c: any) => c._id === course._id);
    
    // Add new course if it doesn't exist
    if (!exists) {
      const updatedCourses = [...existingCourses, course];
      // Save to all known storage keys to ensure cross-page availability
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(updatedCourses));
      localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
      localStorage.setItem('courses_data', JSON.stringify(updatedCourses));
      localStorage.setItem('user_courses', JSON.stringify(updatedCourses));
      
      console.log(`Course "${course.title}" saved to all storage keys. Total courses: ${updatedCourses.length}`);
    } else {
      console.log(`Course "${course.title}" already exists, updating it in all storage keys`);
      // Update the existing course in all storage locations
      const updatedCourses = existingCourses.map((c: any) => 
        c._id === course._id ? { ...c, ...course } : c
      );
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(updatedCourses));
      localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
      localStorage.setItem('courses_data', JSON.stringify(updatedCourses));
      localStorage.setItem('user_courses', JSON.stringify(updatedCourses));
    }
  } catch (error) {
    console.error('Error saving course:', error);
    // Fallback: try saving just this course
    localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify([course]));
    localStorage.setItem('adminCourses', JSON.stringify([course]));
  }
};

/**
 * Get all courses from storage
 */
export const getCourses = (): any[] => {
  try {
    // Try the new storage key first
    const coursesJson = localStorage.getItem(COURSE_STORAGE_KEY);
    if (coursesJson) {
      return JSON.parse(coursesJson);
    }
    
    // Fall back to the old storage key
    const oldCoursesJson = localStorage.getItem('adminCourses');
    if (oldCoursesJson) {
      const courses = JSON.parse(oldCoursesJson);
      // Save to the new key for future use
      localStorage.setItem(COURSE_STORAGE_KEY, oldCoursesJson);
      return courses;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting courses:', error);
    return [];
  }
};

/**
 * Delete a course by ID
 */
export const deleteCourse = (courseId: string): void => {
  try {
    const courses = getCourses();
    const updatedCourses = courses.filter((c: any) => c._id !== courseId);
    
    // Remove course from all storage keys to ensure consistency
    localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(updatedCourses));
    localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
    localStorage.setItem('courses_data', JSON.stringify(updatedCourses));
    localStorage.setItem('user_courses', JSON.stringify(updatedCourses));
    
    console.log(`Course with ID ${courseId} deleted from all storage keys. Remaining courses: ${updatedCourses.length}`);
  } catch (error) {
    console.error('Error deleting course:', error);
  }
};

/**
 * Update an existing course
 */
export const updateCourse = (courseId: string, updatedCourse: any): void => {
  try {
    const courses = getCourses();
    const updatedCourses = courses.map((c: any) => 
      c._id === courseId ? { ...c, ...updatedCourse, _id: courseId } : c
    );
    
    // Update course in all storage keys to ensure consistency
    localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(updatedCourses));
    localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
    localStorage.setItem('courses_data', JSON.stringify(updatedCourses));
    localStorage.setItem('user_courses', JSON.stringify(updatedCourses));
    
    console.log(`Course with ID ${courseId} updated in all storage keys`);
  } catch (error) {
    console.error('Error updating course:', error);
  }
};

/**
 * Debug function to log all stored courses to console
 */
export const debugCourses = (): void => {
  const courses = getCourses();
  console.log('===== STORED COURSES =====');
  console.log(`Total courses: ${courses.length}`);
  courses.forEach((c: any, i: number) => {
    console.log(`${i+1}. ${c.title} (ID: ${c._id})`);
  });
  console.log('=========================');
};
