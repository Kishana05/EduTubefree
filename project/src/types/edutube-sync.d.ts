/**
 * Type definitions for EduTubeSync global object
 */

interface EduTubeSyncType {
  syncCourse: (course: any) => boolean;
  forceSync: () => number;
  checkAllStorage: () => Record<string, { 
    found: boolean; 
    count?: number; 
    titles?: string[];
    error?: string;
  }>;
}

interface Window {
  EduTubeSync: EduTubeSyncType;
}
