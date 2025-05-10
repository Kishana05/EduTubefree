/**
 * Type definitions for courseUtils module
 */

import { Course } from '../types';

/**
 * Save a course to both MongoDB Atlas and localStorage
 * @param course - The course to save
 * @returns The saved course with MongoDB _id
 */
export const saveCourse: (course: Course) => Promise<Course>;

/**
 * Get all courses from localStorage with MongoDB fallback
 * @param forceRefresh - Whether to force refresh from MongoDB
 * @returns Array of courses
 */
export const getCourses: (forceRefresh?: boolean) => Promise<Course[]>;

/**
 * Delete a course by ID from both MongoDB Atlas and localStorage
 * @param courseId - The ID of the course to delete
 * @returns True if deletion was successful
 */
export const deleteCourse: (courseId: string) => Promise<boolean>;

/**
 * Debug function to print all courses to console
 * @param includeMongoCount - Whether to include MongoDB count
 */
export const debugCourses: (includeMongoCount?: boolean) => Promise<void>;

/**
 * Verify MongoDB synchronization and return course count
 * @param verbose - Whether to log detailed information
 * @returns Number of courses in MongoDB
 */
export const verifyMongoDBSync: (verbose?: boolean) => Promise<number>;
