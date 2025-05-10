export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  createdAt: string;
}

export interface Course {
  _id: string; // Using _id to match MongoDB convention
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  category: {
    _id: string;
    name: string;
  };
  level: string;
  rating: number;
  totalStudents: number;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
  videoUrl?: string;
  duration?: string;
  lessonsCount?: number;
  studentsCount?: number;
  featured?: boolean;

  // Additional properties to handle backward compatibility
  id?: string; // For legacy code still using 'id' instead of '_id'
}

export interface Module {
  _id: string; // Using _id to match MongoDB convention
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  _id: string; // Using _id to match MongoDB convention
  title: string;
  description?: string;
  duration: string;
  videoUrl?: string;
}

export interface Category {
  _id: string; // Using _id to match MongoDB convention
  name: string;
  icon: string;
  count: number;
}