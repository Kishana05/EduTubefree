import { useState, useEffect, FormEvent } from 'react';
import { saveCourse, deleteCourse, debugCourses } from '../../utils/courseUtils';
import { 
  Plus, 
  Edit, Trash,
  Eye, X, Youtube,
  Search,
  AlertCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';
import ProgressBar from '../../components/ui/ProgressBar';
import { isValidYoutubeUrl, formatYoutubeUrl } from '../../utils/videoUtils';
import { Course, User, Category } from '../../types';

// Local interface extensions for additional properties needed in AdminDashboard
interface AdminUser extends Omit<User, 'id'> {
  _id: string; // Using _id instead of id for MongoDB compatibility
  status?: 'active' | 'blocked'; // User access status
  enrolledCourses?: Array<{
    course: { _id: string; title: string };
    progress: number;
  }>;
  lastLogin?: string;
}

// Ensure Course interface has all required properties
type AdminCourse = Course & {
  _id: string;
  featured: boolean;
};

const MOCK_COURSES: Course[] = [
  {
    _id: 'mock-course-1',
    title: 'Introduction to React',
    description: 'Learn the fundamentals of React, including components, state, and props.',
    instructor: 'Jane Smith',
    thumbnail: 'https://via.placeholder.com/640x360?text=React+Course',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    category: { _id: 'web-dev', name: 'Web Development' },
    level: 'Beginner',
    rating: 4.7,
    totalStudents: 1243,
    featured: true,
    createdAt: '2023-01-15T12:00:00Z',
    updatedAt: '2023-03-20T15:30:00Z',
    modules: [
      {
        _id: 'module-1',
        title: 'Getting Started with React',
        lessons: [
          { _id: 'lesson-1', title: 'What is React?', duration: '10:30' },
          { _id: 'lesson-2', title: 'Setting Up Your Environment', duration: '15:45' }
        ]
      }
    ]
  },
  {
    _id: 'mock-course-2',
    title: 'Advanced JavaScript Patterns',
    description: 'Deep dive into advanced JavaScript concepts and design patterns.',
    instructor: 'John Doe',
    thumbnail: 'https://via.placeholder.com/640x360?text=JavaScript+Course',
    videoUrl: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
    category: { _id: 'javascript', name: 'JavaScript' },
    level: 'Advanced',
    rating: 4.9,
    totalStudents: 856,
    featured: false,
    createdAt: '2023-02-10T14:20:00Z',
    updatedAt: '2023-04-05T09:15:00Z',
    modules: [
      {
        _id: 'module-1',
        title: 'Closures and Scopes',
        lessons: [
          { _id: 'lesson-1', title: 'Understanding Closures', duration: '12:20' },
          { _id: 'lesson-2', title: 'Lexical Scope', duration: '08:15' }
        ]
      }
    ]
  }
];

// No longer using mock users - using registered users from localStorage instead

// Define the component as a named function expression
const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get tab from URL or default to 'courses'
  const tabFromUrl = new URLSearchParams(location.search).get('tab') || 'courses';
  
  // State
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  
  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Sort users by last login time for login tracking
  const sortedUsersByLogin = [...users].sort((a, b) => {
    // If lastLogin is missing for either, sort them to the bottom
    if (!a.lastLogin) return 1;
    if (!b.lastLogin) return -1;
    
    // Sort newest logins first
    return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
  });
  
  // Handle toggling user access status
  const toggleUserAccess = async (userId: string, currentStatus: string | undefined) => {
    try {
      // Determine new status
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      
      // Optimistically update the UI
      const updatedUsers = users.map(user => {
        if (user._id === userId) {
          return { ...user, status: newStatus as 'active' | 'blocked' };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      
      // Try to update in the API
      try {
        const response = await fetch(`${API_ENDPOINTS.users}/${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update user status');
        }
      } catch (error) {
        console.error('API error updating user status:', error);
        // Status change is kept locally even if API fails
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };
  
  // Listen for tab changes in URL
  useEffect(() => {
    const queryTab = new URLSearchParams(location.search).get('tab');
    if (queryTab) {
      setActiveTab(queryTab);
    }
  }, [location.search]);

  // Calculate course progress based on enrolled user data
  useEffect(() => {
    if (users.length > 0 && courses.length > 0) {
      const progress: Record<string, number> = {};
      
      // Initialize all courses with 0% progress
      courses.forEach(course => {
        progress[course._id] = 0;
      });
      
      // Calculate progress for each course based on enrolled users
      users.forEach(user => {
        if (user.enrolledCourses && user.enrolledCourses.length > 0) {
          user.enrolledCourses.forEach(enrollment => {
            const courseId = enrollment.course._id;
            if (progress[courseId] !== undefined) {
              // Update the progress value by averaging with existing values
              const currentTotal = progress[courseId] || 0;
              const count = Object.keys(progress).includes(courseId) ? 2 : 1;
              progress[courseId] = (currentTotal + enrollment.progress) / count;
            }
          });
        }
      });
      
      // Random progress for demo purposes if no real progress data exists
      courses.forEach(course => {
        if (progress[course._id] === 0) {
          // Generate random progress between 0 and 100 for each course for demonstration
          progress[course._id] = Math.floor(Math.random() * 101);
        }
      });
      
      setCourseProgress(progress);
    }
  }, [users, courses]);

  // Load admin dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get courses from localStorage first if they exist
        const storedCourses = localStorage.getItem('adminCourses');
        let localCourses = [];
        if (storedCourses) {
          try {
            localCourses = JSON.parse(storedCourses);
          } catch (e) {
            console.error('Error parsing stored courses:', e);
          }
        }
        
        // Fetch courses from API
        try {
          // Use centralized API configuration
          const API_URL = API_BASE_URL;
          console.log('Fetching admin data from API:', API_URL);
          
          const [coursesRes, usersRes, categoriesRes] = await Promise.all([
            fetch(`${API_URL}/courses`),
            fetch(`${API_URL}/users`),
            fetch(`${API_URL}/categories`),
          ]);
          
          if (!coursesRes.ok || !usersRes.ok || !categoriesRes.ok) {
            throw new Error('Failed to fetch data');
          }
          
          const [coursesData, usersData, categoriesData] = await Promise.all([
            coursesRes.json(),
            usersRes.json(),
            categoriesRes.json(),
          ]);
          
          // Merge API courses with any locally added ones that aren't in the API response
          if (localCourses.length > 0) {
            // Get all course IDs from API response
            const apiCourseIds = coursesData.map((c: Course) => c._id);
            
            // Filter local courses to only include those not in the API response
            const localOnlyCourses = localCourses.filter((c: Course) => {
              return !apiCourseIds.includes(c._id);
            });
            
            // Combine API courses with local-only courses
            const mergedCourses = [...coursesData, ...localOnlyCourses];
            setCourses(mergedCourses);
          } else {
            setCourses(coursesData);
          }
          
          setUsers(usersData);
          
          // If categories API fails or returns empty, use default categories
          if (!categoriesData || categoriesData.length === 0) {
            const defaultCategories = [
              { _id: 'web-dev', name: 'Web Development', icon: '💻', count: 10 },
              { _id: 'javascript', name: 'JavaScript', icon: '🧩', count: 5 },
              { _id: 'react', name: 'React', icon: '⚛️', count: 8 },
              { _id: 'mobile-dev', name: 'Mobile Development', icon: '📱', count: 6 },
              { _id: 'data-science', name: 'Data Science', icon: '📊', count: 7 },
              { _id: 'machine-learning', name: 'Machine Learning', icon: '🤖', count: 4 },
              { _id: 'design', name: 'Design', icon: '🎨', count: 3 },
              { _id: 'devops', name: 'DevOps', icon: '🔄', count: 2 }
            ];
            setCategories(defaultCategories);
          } else {
            setCategories(categoriesData);
          }
        } catch (error) {
          console.error('Error fetching from API:', error);
          setError(error instanceof Error ? error.message : 'An unknown error occurred');
          
          // Use localStorage courses if available, otherwise use mock data
          if (localCourses.length > 0) {
            setCourses(localCourses);
          } else {
            setCourses(MOCK_COURSES);
          }
          
          // Get registered users from localStorage
          const registeredUsers = localStorage.getItem('mockUsers');
          if (registeredUsers) {
            try {
              const parsedUsers = JSON.parse(registeredUsers);
              // Add status and lastLogin attributes if they don't exist
              const formattedUsers = parsedUsers.map((user: any) => ({
                ...user,
                _id: user._id || `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                status: user.status || 'active',
                lastLogin: user.lastLogin || new Date().toISOString(),
                role: user.role || 'student',
                enrolledCourses: user.enrolledCourses || []
              }));
              setUsers(formattedUsers);
            } catch (e) {
              console.error('Error parsing registered users:', e);
              setUsers([]);
            }
          } else {
            // If no registered users found, don't use mock data - show empty state
            setUsers([]);
          }
          
          // Set default categories if error occurs
          const defaultCategories = [
            { _id: 'web-dev', name: 'Web Development', icon: '💻', count: 10 },
            { _id: 'javascript', name: 'JavaScript', icon: '🧩', count: 5 },
            { _id: 'react', name: 'React', icon: '⚛️', count: 8 },
            { _id: 'mobile-dev', name: 'Mobile Development', icon: '📱', count: 6 },
            { _id: 'data-science', name: 'Data Science', icon: '📊', count: 7 },
            { _id: 'machine-learning', name: 'Machine Learning', icon: '🤖', count: 4 },
            { _id: 'design', name: 'Design', icon: '🎨', count: 3 },
            { _id: 'devops', name: 'DevOps', icon: '🔄', count: 2 }
          ];
          setCategories(defaultCategories);
        }
      } catch (err) {
        console.error('Error in overall data fetching:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setCourses(MOCK_COURSES);
        
        // Get registered users from localStorage as fallback
        const registeredUsers = localStorage.getItem('mockUsers');
        if (registeredUsers) {
          try {
            const parsedUsers = JSON.parse(registeredUsers);
            const formattedUsers = parsedUsers.map((user: any) => ({
              ...user,
              _id: user._id || `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              status: user.status || 'active',
              lastLogin: user.lastLogin || new Date().toISOString(),
              role: user.role || 'student',
              enrolledCourses: user.enrolledCourses || []
            }));
            setUsers(formattedUsers);
          } catch (e) {
            console.error('Error parsing registered users:', e);
            setUsers([]);
          }
        } else {
          setUsers([]);
        }
        
        // Set default categories if error occurs
        const defaultCategories = [
          { _id: 'web-dev', name: 'Web Development', icon: '💻', count: 10 },
          { _id: 'javascript', name: 'JavaScript', icon: '🧩', count: 5 },
          { _id: 'react', name: 'React', icon: '⚛️', count: 8 },
          { _id: 'mobile-dev', name: 'Mobile Development', icon: '📱', count: 6 },
          { _id: 'data-science', name: 'Data Science', icon: '📊', count: 7 },
          { _id: 'machine-learning', name: 'Machine Learning', icon: '🤖', count: 4 },
          { _id: 'design', name: 'Design', icon: '🎨', count: 3 },
          { _id: 'devops', name: 'DevOps', icon: '🔄', count: 2 }
        ];
        setCategories(defaultCategories);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Change tab function
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/admin?tab=${tab}`);
  };

  // Filter courses based on search query
  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Course CRUD operations
  const handleAddCourse = async (newCourseData: Partial<Course>) => {
    try {
      setIsLoading(true);
      console.log('💾 Creating new course:', newCourseData.title);
      
      // Get category from categories list
      let categoryObj = { _id: '', name: '' };
      if (newCourseData.category?._id) {
        const foundCategory = categories.find(c => c._id === newCourseData.category?._id);
        if (foundCategory) {
          categoryObj = { _id: foundCategory._id, name: foundCategory.name };
        } else {
          // Default to first category if category not found
          categoryObj = categories.length > 0 ? 
            { _id: categories[0]._id, name: categories[0].name } : 
            { _id: 'web-dev', name: 'Web Development' };
        }
      }
      
      // Collection of real thumbnail images based on category
      const thumbnailImages: Record<string, string[]> = {
        'Web Development': [
          'https://cdn.pixabay.com/photo/2016/11/19/14/00/code-1839406_1280.jpg',
          'https://cdn.pixabay.com/photo/2019/10/03/12/12/javascript-4523100_1280.jpg',
          'https://cdn.pixabay.com/photo/2016/12/28/09/36/web-1935737_1280.png',
          'https://cdn.pixabay.com/photo/2018/05/08/08/44/artificial-intelligence-3382507_1280.jpg'
        ],
        'Mobile Development': [
          'https://cdn.pixabay.com/photo/2017/01/22/12/07/imac-1999636_1280.png',
          'https://cdn.pixabay.com/photo/2020/01/26/20/14/computer-4795762_1280.jpg',
          'https://cdn.pixabay.com/photo/2018/01/29/13/03/internet-3116062_1280.jpg',
          'https://cdn.pixabay.com/photo/2019/04/29/07/04/software-development-4165307_1280.jpg'
        ],
        'Data Science': [
          'https://cdn.pixabay.com/photo/2017/08/30/01/05/milky-way-2695569_1280.jpg',
          'https://cdn.pixabay.com/photo/2016/10/11/21/43/geometric-1732847_1280.jpg',
          'https://cdn.pixabay.com/photo/2018/04/11/19/48/data-3311458_1280.png',
          'https://cdn.pixabay.com/photo/2018/09/18/11/19/artificial-intelligence-3685928_1280.png'
        ],
        'Machine Learning': [
          'https://cdn.pixabay.com/photo/2017/05/10/19/29/robot-2301646_1280.jpg',
          'https://cdn.pixabay.com/photo/2018/06/07/16/49/virtual-3460451_1280.jpg',
          'https://cdn.pixabay.com/photo/2020/05/07/04/01/digitization-5140071_1280.jpg',
          'https://cdn.pixabay.com/photo/2021/11/04/06/27/artificial-intelligence-6767502_1280.jpg'
        ],
        'Design': [
          'https://cdn.pixabay.com/photo/2017/08/10/02/05/tiles-shapes-2617112_1280.jpg',
          'https://cdn.pixabay.com/photo/2017/01/20/19/53/productivity-1995786_1280.jpg',
          'https://cdn.pixabay.com/photo/2018/02/23/04/38/laptop-3174729_1280.jpg',
          'https://cdn.pixabay.com/photo/2016/11/29/08/41/apple-1868496_1280.jpg'
        ],
        'DevOps': [
          'https://cdn.pixabay.com/photo/2016/11/27/21/42/stock-1863880_1280.jpg',
          'https://cdn.pixabay.com/photo/2018/02/15/10/35/server-3155000_1280.jpg',
          'https://cdn.pixabay.com/photo/2016/11/30/20/58/programming-1873854_1280.png',
          'https://cdn.pixabay.com/photo/2018/08/10/15/45/woman-3597101_1280.jpg'
        ],
        'JavaScript': [
          'https://cdn.pixabay.com/photo/2019/10/03/12/12/javascript-4523100_1280.jpg',
          'https://cdn.pixabay.com/photo/2015/10/02/15/09/javascript-968983_1280.jpg',
          'https://cdn.pixabay.com/photo/2018/04/20/21/10/code-3337044_1280.jpg',
          'https://cdn.pixabay.com/photo/2015/12/04/14/05/code-1076536_1280.jpg'
        ],
        'React': [
          'https://cdn.pixabay.com/photo/2017/12/12/12/44/programming-3014296_1280.jpg',
          'https://cdn.pixabay.com/photo/2016/11/30/20/58/programming-1873854_1280.png',
          'https://cdn.pixabay.com/photo/2015/09/17/17/25/code-944499_1280.jpg',
          'https://cdn.pixabay.com/photo/2018/05/08/08/46/artificial-intelligence-3382509_1280.jpg'
        ]
      };
      
      // Make sure we have a proper thumbnail
      if (!newCourseData.thumbnail || newCourseData.thumbnail === '' || newCourseData.thumbnail.includes('placeholder')) {
        // Get category name or use fallback
        const categoryName = categoryObj.name || 'Web Development';
        
        // Find images for this category or use web development as fallback
        const categoryImages = thumbnailImages[categoryName] || thumbnailImages['Web Development'];
        
        // Pick a random image from the category
        const randomIndex = Math.floor(Math.random() * categoryImages.length);
        newCourseData.thumbnail = categoryImages[randomIndex];
      }
      
      // Format course data for MongoDB
      const courseData = {
        ...newCourseData,
        totalStudents: newCourseData.totalStudents || 0,
        rating: newCourseData.rating || 4.5,
        featured: newCourseData.featured || false,
        modules: newCourseData.modules || [],
        category: categoryObj // Use full category object for better UI display
      };
      
      console.log('💾 Prepared course data for MongoDB:', courseData);

      // Use our improved saveCourse function to save directly to MongoDB
      // This now returns the course with its MongoDB-generated _id
      const savedCourse = await saveCourse(courseData);
      
      console.log('✅ Course successfully saved to MongoDB:', savedCourse);
      
      // Update the courses list with the saved course from MongoDB
      setCourses(prevCourses => {
        // Check if this course already exists (might be an update)
        const existingIndex = prevCourses.findIndex(c => c._id === savedCourse._id);
        if (existingIndex >= 0) {
          // Replace existing course
          const updatedCourses = [...prevCourses];
          updatedCourses[existingIndex] = savedCourse;
          return updatedCourses;
        } else {
          // Add new course
          return [...prevCourses, savedCourse];
        }
      });
      
      // Force a sync across all storage and apps
      if (window.EduTubeSync && typeof window.EduTubeSync.forceSync === 'function') {
        console.log('🔄 Forcing sync with MongoDB and all storage keys...');
        await window.EduTubeSync.forceSync();
      }
      
      // Check with the API for the final number of courses
      await verifyCoursesInMongoDB();
      
      return savedCourse;
    } catch (error) {
      console.error('❌ Error saving course:', error);
      setError(error instanceof Error ? error.message : 'Failed to save course');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to verify courses in MongoDB
  const verifyCoursesInMongoDB = async () => {
    try {
      // Make direct API call to get current MongoDB count
      const response = await fetch(`${API_BASE_URL}/courses?_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const mongoDbCourses = await response.json();
        console.log(`✅ Verified ${mongoDbCourses.length} courses in MongoDB Atlas`);
        
        // If MongoDB has different course count than our local state, refresh
        if (mongoDbCourses.length !== courses.length) {
          console.log('🔄 Course count mismatch, updating UI with MongoDB data...');
          setCourses(mongoDbCourses);
        }
        
        return mongoDbCourses.length;
      }
      return -1;
    } catch (error) {
      console.error('❌ Error verifying MongoDB courses:', error);
      return -1;
    }
  
  // Handle updating an existing course
  const handleUpdateCourse = async (courseData: Course) => {
    try {
      setIsLoading(true);
      console.log('💾 Updating course:', courseData.title);
      
      // Use the improved saveCourse function which now handles MongoDB properly
      const updatedCourse = await saveCourse(courseData);
      
      // Update courses list
      setCourses(prevCourses => prevCourses.map(c => 
        c._id === updatedCourse._id ? updatedCourse : c
      ));
      
      // Force sync across all apps
      if (window.EduTubeSync && typeof window.EduTubeSync.forceSync === 'function') {
        await window.EduTubeSync.forceSync();
      }
      
      console.log('✅ Course successfully updated:', updatedCourse);
      return updatedCourse;
    } catch (error) {
      console.error('❌ Error updating course:', error);
      setError(error instanceof Error ? error.message : 'Failed to update course');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle MongoDB data operations
  const handleMongoDBOperations = async (courseToProcess: Course) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(courseToProcess)
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to add course: ${response.status} ${text || response.statusText}`);
      }
      
      const data = await response.json();

      console.log('Course added successfully to MongoDB:', data);
      setError(''); // Clear any previous errors
      
      // Show success message to user
      setError(`Course "${courseToProcess.title}" successfully saved to MongoDB Atlas!`);
      
      // Force an immediate API refresh to pull the latest data from MongoDB
      console.log('Triggering course refresh from MongoDB...');
      const refreshResponse = await fetch(`${API_BASE_URL}/api/courses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          // Add cache-busting parameter
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!refreshResponse.ok) {
        throw new Error(`Failed to refresh courses: ${refreshResponse.status}`);
      }
      
      const refreshedCourses = await refreshResponse.json();
      console.log(`Refreshed ${refreshedCourses.length} courses from MongoDB`);
      
      // Replace entire courses state with fresh data from MongoDB
      setCourses(refreshedCourses);
      
      // Also update localStorage with the latest data from MongoDB
      localStorage.setItem('adminCourses', JSON.stringify(refreshedCourses));
      localStorage.setItem('edutube_courses', JSON.stringify(refreshedCourses));
      localStorage.setItem('courses_data', JSON.stringify(refreshedCourses));
      localStorage.setItem('user_courses', JSON.stringify(refreshedCourses));
      
      // Debug: Log all stored courses to verify what's in storage
      debugCourses();
    } catch (error: any) {
      console.error('Error adding/refreshing course:', error);
      // Course is still added locally even if API fails
      setError(`Failed to sync with MongoDB Atlas: ${error.message}. Course has been saved locally.`);
    }
  }

  const handleViewCourse = (course: Course) => {
    setViewingCourse(course);
    setShowViewModal(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setShowEditModal(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Optimistic update - remove course from UI immediately
      const updatedCourses = courses.filter(c => c._id !== courseId);
      setCourses(updatedCourses);
      
      // Delete from storage using utility function
      deleteCourse(courseId);
      
      // Force sync deletions across all storage keys
      if (window.EduTubeSync && typeof window.EduTubeSync.forceSync === 'function') {
        window.EduTubeSync.forceSync();
        console.log('Auto-synced course deletion to all storage keys');
      }
      
      // Log storage state for debugging
      debugCourses();
      
      // Close modals and reset state
      setShowDeleteModal(false);
      setDeletingCourse(null);
      
      // Try to delete from server if we have a token
      // Note: Local-only courses (added during this session) may not exist on server
      if (token) {
        try {
          // Use centralized API configuration
          const API_URL = API_BASE_URL;
          console.log('Deleting course from API:', courseId);
          
          const response = await fetch(`${API_URL}/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok && response.status !== 404) {
            // 404 is expected for local courses, only throw for other errors
            throw new Error(`Failed to delete course from server: ${response.status}`);
          }
        } catch (error) {
          console.error('Error deleting from server:', error);
          // Course is already removed from localStorage - no need to restore
        }
      }
    } catch (err) {
      console.error('Error deleting course:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleUpdateCourseUI = (updatedCourse: Course) => {
    try {
      // Update course locally
      const updatedCourses = courses.map(course => course._id === updatedCourse._id ? updatedCourse : course);
      setCourses(updatedCourses);
      localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
      
      // Update in API
      // Use centralized API configuration
      const API_URL = API_BASE_URL;
      console.log('Updating course in API:', updatedCourse.title);
      
      fetch(`${API_URL}/courses/${updatedCourse._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updatedCourse),
      })
      .then(response => {
        if (!response.ok) throw new Error('Failed to update course');
        return response.json();
      })
      .then(data => {
        console.log('Course updated successfully:', data);
      })
      .catch(error => {
        console.error('Error updating course:', error);
        setError('Failed to update course in API.');
      });
    } catch (err) {
      console.error('Error updating course:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  // Render
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage your platform content and users</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
              onClick={() => setShowEditModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('overview')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleTabChange('courses')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'courses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => handleTabChange('progress')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Progress Tracking
            </button>
            <button
              onClick={() => handleTabChange('login')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'login'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Login Tracking
            </button>
          </nav>
        </div>
        
        {/* Courses Tab Content */}
        {activeTab === 'courses' && (
          <div>
            <div className="mb-6 flex justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Course Management</h2>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 hover:text-blue-800"
                  onClick={() => setSearchQuery('')}
                >
                  {searchQuery && <X className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="bg-white shadow overflow-x-auto rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCourses.map((course) => (
                    <tr key={course._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md overflow-hidden">
                            {course.thumbnail ? (
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="h-10 w-10 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40x40?text=Course';
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-500">
                                <span className="text-xs">No img</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{course.title}</div>
                            <div className="text-sm text-gray-500">{course.instructor}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {course.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {course.totalStudents || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ProgressBar 
                          progress={courseProgress[course._id] || 0} 
                          height={8} 
                          showPercentage={true}
                          color={courseProgress[course._id] < 30 ? 'bg-red-500' : 
                                courseProgress[course._id] < 70 ? 'bg-yellow-500' : 'bg-green-500'}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewCourse(course)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View course details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEditCourse(course)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit course"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingCourse(course);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete course"
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {filteredCourses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        {isLoading ? (
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <div>
                            {error ? (
                              <div className="text-red-500">{error}</div>
                            ) : (
                              <div>No courses found</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Login Tracking Tab Content */}
        {activeTab === 'login' && (
          <div>
            <div className="mb-6 flex justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Login Activity</h2>
              <div className="text-sm text-gray-500">
                Showing most recent logins first
              </div>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Courses Enrolled
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedUsersByLogin.length > 0 ? (
                    sortedUsersByLogin.map((user) => {
                      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
                      const now = new Date();
                      const daysDifference = lastLogin ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : null;
                      
                      // Determine status based on last login
                      let statusColor = 'bg-gray-100 text-gray-800';
                      let statusText = 'Never Logged In';
                      
                      if (lastLogin) {
                        if (daysDifference === 0) {
                          statusColor = 'bg-green-100 text-green-800';
                          statusText = 'Today';
                        } else if (daysDifference === 1) {
                          statusColor = 'bg-green-100 text-green-800';
                          statusText = 'Yesterday';
                        } else if (daysDifference && daysDifference < 7) {
                          statusColor = 'bg-blue-100 text-blue-800';
                          statusText = `${daysDifference} days ago`;
                        } else if (daysDifference && daysDifference < 30) {
                          statusColor = 'bg-yellow-100 text-yellow-800';
                          statusText = `${Math.floor(daysDifference / 7)} weeks ago`;
                        } else if (daysDifference) {
                          statusColor = 'bg-red-100 text-red-800';
                          statusText = `${Math.floor(daysDifference / 30)} months ago`;
                        }
                      }
                      
                      return (
                        <tr key={user._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-xl text-gray-600">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {lastLogin ? (
                              <div>
                                <div className="text-sm text-gray-900">
                                  {lastLogin.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {lastLogin.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Never</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.enrolledCourses ? user.enrolledCourses.length : 0}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        {isLoading ? (
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <div>
                            {error ? (
                              <div className="text-red-500">{error}</div>
                            ) : (
                              <div>No user login data available</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6 flex justify-between">
              <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 hover:text-blue-800"
                  onClick={() => setSearchQuery('')}
                >
                  {searchQuery && <X className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Courses
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.filter(user => 
                    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    user.email.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(user => {
                    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
                    return (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xl text-gray-600">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role || 'student'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lastLogin ? (
                            <div className="text-sm text-gray-900">
                              {lastLogin.toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Never</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.enrolledCourses ? user.enrolledCourses.length : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {user.role !== 'admin' && (
                            <button 
                              onClick={() => toggleUserAccess(user._id, user.status)}
                              className={`px-3 py-1 rounded-md ${
                                user.status === 'active' || !user.status
                                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              {user.status === 'active' || !user.status ? 'Block Access' : 'Allow Access'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        {isLoading ? (
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <div>
                            {error ? (
                              <div className="text-red-500">{error}</div>
                            ) : (
                              <div>No users found</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Progress Tracking Tab Content */}
        {activeTab === 'progress' && (
          <div>
            <div className="mb-6 flex justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Course Progress Overview</h2>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map(course => {
                  const progress = courseProgress[course._id] || 0;
                  return (
                    <div key={course._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden mr-3">
                          {course.thumbnail ? (
                            <img 
                              src={course.thumbnail} 
                              alt={course.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120?text=Course';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <span className="text-xs">No img</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{course.title}</h3>
                          <p className="text-sm text-gray-500">{course.totalStudents || 0} enrolled</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <ProgressBar 
                          progress={progress} 
                          height={8} 
                          showPercentage={true}
                          color={progress < 30 ? 'bg-red-500' : progress < 70 ? 'bg-yellow-500' : 'bg-green-500'}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-500">Completion rate</span>
                        <span className="font-medium text-gray-700">
                          {progress < 30 ? 'Low' : progress < 70 ? 'Medium' : 'High'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Platform Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Courses</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{courses.length}</dd>
                  </dl>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{users.length}</dd>
                  </dl>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Categories</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{categories.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Course Modal */}
        {showViewModal && viewingCourse && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{viewingCourse.title}</h3>
                    <button
                      type="button"
                      onClick={() => setShowViewModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="mt-2 space-y-4">
                    {viewingCourse.thumbnail && (
                      <div className="mb-4">
                        <img 
                          src={viewingCourse.thumbnail} 
                          alt={viewingCourse.title}
                          className="w-full h-48 object-cover rounded-lg" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/640x360?text=Course+Thumbnail';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h2 className="text-xl font-bold">{viewingCourse.title}</h2>
                      <p className="text-sm text-gray-500">by {viewingCourse.instructor}</p>
                      
                      <div className="mt-3 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          {viewingCourse.category?.name || 'Uncategorized'}
                        </span>
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          {viewingCourse.level}
                        </span>
                        {viewingCourse.featured && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">Description</h4>
                      <p className="mt-1 text-gray-600 whitespace-pre-line">{viewingCourse.description}</p>
                    </div>
                    
                    {viewingCourse.videoUrl && (
                      <div>
                        <h4 className="font-medium text-gray-900">Video</h4>
                        <div className="mt-2">
                          <a 
                            href={viewingCourse.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:underline"
                          >
                            <Youtube className="h-5 w-5 mr-1 text-red-600" />
                            Watch on YouTube
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {viewingCourse.modules && viewingCourse.modules.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900">Course Modules</h4>
                        <div className="mt-2 space-y-3">
                          {viewingCourse.modules.map((module) => (
                            <div key={module._id} className="border border-gray-200 rounded-md p-3">
                              <h5 className="font-medium">{module.title}</h5>
                              {module.lessons && module.lessons.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {module.lessons.map((lesson) => (
                                    <li key={lesson._id} className="text-sm text-gray-600 flex justify-between">
                                      <span>{lesson.title}</span>
                                      <span className="text-gray-500">{lesson.duration}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-gray-200">
                      <span>Created: {new Date(viewingCourse.createdAt).toLocaleDateString()}</span>
                      <span>Last updated: {new Date(viewingCourse.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => setShowViewModal(false)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewModal(false);
                      handleEditCourse(viewingCourse);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Edit Course
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingCourse && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <div className="flex justify-between">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Course</h3>
                        <button
                          onClick={() => setShowDeleteModal(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete this course? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(deletingCourse._id)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingCourse(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Course Form Modal - Add/Edit Course */}
        {showEditModal && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <form onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  
                  // Get and validate video URL for proper embedding
                  const rawVideoUrl = formData.get('videoUrl') as string;
                  const videoUrl = rawVideoUrl ? 
                    (isValidYoutubeUrl(rawVideoUrl) ? formatYoutubeUrl(rawVideoUrl) : rawVideoUrl) : 
                    '';
                  console.log('Processing video URL:', rawVideoUrl, '→', videoUrl);
                  
                  if (editingCourse) {
                    // Update existing course
                    const updatedCourse = {
                      ...editingCourse,
                      title: formData.get('title') as string,
                      description: formData.get('description') as string,
                      instructor: formData.get('instructor') as string,
                      thumbnail: editingCourse.thumbnail,
                      level: formData.get('level') as string,
                      videoUrl: videoUrl, // Use the formatted video URL
                      category: {
                        _id: formData.get('category') as string,
                        name: categories.find(c => c._id === formData.get('category'))?.name || editingCourse.category.name
                      }
                    };
                    
                    handleUpdateCourse(updatedCourse);
                  } else {
                    // Add new course
                    const newCourse: Partial<Course> = {
                      title: formData.get('title') as string,
                      description: formData.get('description') as string,
                      instructor: formData.get('instructor') as string,
                      thumbnail: formData.get('thumbnail') as string,
                      videoUrl: videoUrl, // Use the formatted video URL
                      level: formData.get('level') as string,
                      category: {
                        _id: formData.get('category') as string,
                        name: categories.find(c => c._id === formData.get('category'))?.name || ''
                      }
                    };
                    
                    // Add duration if available
                    if (formData.get('duration')) {
                      (newCourse as any).duration = formData.get('duration') as string;
                    }
                    
                    handleAddCourse(newCourse);
                  }
                  
                  setShowEditModal(false);
                  setEditingCourse(null);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter course title"
                        defaultValue={editingCourse?.title || ''}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        name="description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter course description"
                        rows={4}
                        defaultValue={editingCourse?.description || ''}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instructor *
                      </label>
                      <input
                        type="text"
                        name="instructor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter instructor name"
                        defaultValue={editingCourse?.instructor || ''}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          name="category"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          defaultValue={editingCourse?.category?._id || ''}
                          required
                        >
                          <option value="">Select category</option>
                          {categories && categories.length > 0 ? (
                            categories.map(category => (
                              <option key={category._id} value={category._id}>
                                {category.name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="web-dev">Web Development</option>
                              <option value="javascript">JavaScript</option>
                              <option value="react">React</option>
                              <option value="mobile-dev">Mobile Development</option>
                              <option value="data-science">Data Science</option>
                              <option value="machine-learning">Machine Learning</option>
                              <option value="design">Design</option>
                              <option value="devops">DevOps</option>
                            </>
                          )}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Level
                        </label>
                        <select
                          name="level"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          defaultValue={editingCourse?.level || 'beginner'}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Video URL (YouTube)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                          <Youtube size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="videoUrl"
                          className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://www.youtube.com/watch?v=..."
                          defaultValue={editingCourse?.videoUrl || ''}
                          onChange={(e) => {
                            const isValid = isValidYoutubeUrl(e.target.value);
                            e.target.classList.toggle('border-red-500', !isValid && e.target.value !== '');
                            e.target.classList.toggle('border-green-500', isValid && e.target.value !== '');
                          }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500 flex items-start">
                        <AlertCircle size={14} className="mr-1 mt-0.5 flex-shrink-0" />
                        <span>
                          Enter a valid YouTube URL (e.g., youtube.com/watch?v=ID, youtu.be/ID) or video ID. 
                          This will be automatically formatted for embedding.
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thumbnail
                      </label>
                      <input
                        type="url"
                        name="thumbnail"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="https://example.com/image.jpg"
                        value={editingCourse?.thumbnail || ''}
                        onChange={(e) => {
                          if (editingCourse) {
                            setEditingCourse({
                              ...editingCourse,
                              thumbnail: e.target.value
                            });
                          }
                        }}
                      />
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Or select a thumbnail:
                        </label>
                        <div className="max-h-60 overflow-y-auto">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {editingCourse?.category && [
                              'Web Development',
                              'Mobile Development',
                              'Data Science',
                              'Machine Learning',
                              'Design',
                              'DevOps',
                              'JavaScript',
                              'React'
                            ].includes(editingCourse.category.name) ? (
                              // Display category-specific thumbnails
                              [
                                'https://cdn.pixabay.com/photo/2016/11/19/14/00/code-1839406_1280.jpg',
                                'https://cdn.pixabay.com/photo/2019/10/03/12/12/javascript-4523100_1280.jpg',
                                'https://cdn.pixabay.com/photo/2016/12/28/09/36/web-1935737_1280.png',
                                'https://cdn.pixabay.com/photo/2018/05/08/08/44/artificial-intelligence-3382507_1280.jpg'
                              ].map((url, index) => (
                                <div
                                  key={index}
                                  onClick={() => {
                                    if (editingCourse) {
                                      setEditingCourse({
                                        ...editingCourse,
                                        thumbnail: url
                                      });
                                    }
                                  }}
                                  className={`cursor-pointer border-2 overflow-hidden hover:opacity-90 transition rounded ${
                                    editingCourse?.thumbnail === url ? 'border-blue-500' : 'border-transparent'
                                  }`}
                                >
                                  <img src={url} alt={`Thumbnail option ${index + 1}`} className="w-full h-24 object-cover" />
                                </div>
                              ))
                            ) : (
                              // Display generic thumbnails
                              [
                                'https://cdn.pixabay.com/photo/2016/11/19/14/00/code-1839406_1280.jpg',
                                'https://cdn.pixabay.com/photo/2019/10/03/12/12/javascript-4523100_1280.jpg',
                                'https://cdn.pixabay.com/photo/2017/08/10/02/05/tiles-shapes-2617112_1280.jpg',
                                'https://cdn.pixabay.com/photo/2017/05/10/19/29/robot-2301646_1280.jpg',
                                'https://cdn.pixabay.com/photo/2018/02/15/10/35/server-3155000_1280.jpg',
                                'https://cdn.pixabay.com/photo/2018/09/18/11/19/artificial-intelligence-3685928_1280.png'
                              ].map((url, index) => (
                                <div
                                  key={index}
                                  onClick={() => {
                                    if (editingCourse) {
                                      setEditingCourse({
                                        ...editingCourse,
                                        thumbnail: url
                                      });
                                    }
                                  }}
                                  className={`cursor-pointer border-2 overflow-hidden hover:opacity-90 transition rounded ${
                                    editingCourse?.thumbnail === url ? 'border-blue-500' : 'border-transparent'
                                  }`}
                                >
                                  <img src={url} alt={`Thumbnail option ${index + 1}`} className="w-full h-24 object-cover" />
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        name="duration"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., 1h 30m"
                        defaultValue={editingCourse?.duration || '1h 30m'}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingCourse(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingCourse ? 'Save Changes' : 'Add Course'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export at the top level
export default AdminDashboard;