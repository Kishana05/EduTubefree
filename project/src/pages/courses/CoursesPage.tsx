import React, { useState, useEffect } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { courses as mockCourses, categories } from '../../data/mockData';
import CourseCard from '../../components/ui/CourseCard';
import { Course } from '../../types';

const CoursesPage: React.FC = () => {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Load courses from API with real-time polling
  useEffect(() => {
    // Flag to track if component is mounted
    let isMounted = true;
    
    const loadCourses = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      
      try {
        // Add timestamp to bust cache and ensure fresh data
        const timestamp = new Date().getTime();
        const apiUrl = `${API_ENDPOINTS.courses}?_t=${timestamp}`;
        console.log(`Fetching courses from API (${new Date().toLocaleTimeString()})...`);
        
        let apiCoursesFound = false;
        try {
          // Force a new request with no-cache
          const response = await fetch(apiUrl, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (response.ok) {
            const apiCourses = await response.json();
            console.log(`Found ${apiCourses.length} courses from MongoDB:`, apiCourses);
            
            // Map API courses to match the expected Course type format
            const coursesFromAPI = apiCourses.map((course: any) => ({
              id: course._id,
              title: course.title,
              description: course.description || '',
              instructor: course.instructor || 'Unknown Instructor',
              thumbnail: course.thumbnail || 'https://placehold.co/640x360/eee/999?text=Course+Image',
              category: course.category?.name || 'Uncategorized',
              level: course.level || 'beginner',
              rating: course.rating || 4.5,
              duration: course.duration || '1h 30m',
              studentsCount: course.totalStudents || 0,
              lessonsCount: course.modules?.reduce((total: number, module: any) => total + (module.lessons?.length || 0), 0) || 0,
              videoUrl: course.videoUrl || null
            }));
            
            // If courses were found in the API, use them
            if (coursesFromAPI.length > 0) {
              if (isMounted) {
                setAllCourses(coursesFromAPI);
                setFilteredCourses(coursesFromAPI);
                apiCoursesFound = true;
                
                // Update localStorage to match API data
                localStorage.setItem('edutube_courses', JSON.stringify(apiCourses));
                localStorage.setItem('adminCourses', JSON.stringify(apiCourses));
                console.log(`Updated local storage with ${apiCourses.length} courses from MongoDB`);
              }
            }
          } else {
            console.warn('API response not OK:', response.status);
          }
        } catch (apiError) {
          console.error('Error fetching from API:', apiError);
        }
        
        // If API fetch didn't return any courses, try localStorage
        if (!apiCoursesFound) {
          console.log('No courses from API, checking localStorage...');
          
          // Force the browser to check local storage keys
          const storage_keys = Object.keys(localStorage);
          console.log('Available localStorage keys:', storage_keys);
          
          // Check all possible storage keys
          const possibleKeys = ['edutube_courses', 'adminCourses', 'courses_data', 'user_courses'];
          let storedCourses = null;
          
          // Try each key until we find courses
          for (const key of possibleKeys) {
            console.log(`Checking ${key} storage...`);
            const courseData = localStorage.getItem(key);
            if (courseData) {
              console.log(`Found courses in ${key}`);
              storedCourses = courseData;
              break;
            }
          }
          
          // If courses exist in any storage key, use them
          if (storedCourses) {
            try {
              const parsedCourses = JSON.parse(storedCourses);
              console.log('Admin courses from localStorage:', parsedCourses);
              
              // Map admin courses to match the expected Course type format
              const coursesData = parsedCourses.map((course: any) => ({
                id: course._id,
                title: course.title,
                description: course.description || '',
                instructor: course.instructor || 'Unknown Instructor',
                thumbnail: course.thumbnail || 'https://placehold.co/640x360/eee/999?text=Course+Image',
                category: course.category?.name || 'Uncategorized',
                level: course.level || 'beginner',
                rating: course.rating || 4.5,
                duration: '3h 15m',
                studentsCount: course.totalStudents || 0,
                lessonsCount: 12,
                videoUrl: course.videoUrl || null
              }));
              
              // Always use admin courses even if there's just one
              console.log('Using only admin-added courses');
              setAllCourses(coursesData);
              setFilteredCourses(coursesData);
              return; // Exit early - don't fall back to mock courses
            } catch (e) {
              console.error('Error parsing admin courses:', e);
            }
          }
          
          // If we reach here, no admin courses were found or they couldn't be parsed
          console.log('No valid admin courses, using mock data');
          setAllCourses(mockCourses);
          setFilteredCourses(mockCourses);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
        setAllCourses([]);
        setFilteredCourses([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Load courses immediately
    loadCourses();
    
    // Set up polling interval for real-time updates
    const pollingInterval = setInterval(() => {
      console.log('Polling for course updates from MongoDB...');
      loadCourses();
    }, 5000); // Poll every 5 seconds
    
    // Clean up function
    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
      console.log('Courses polling stopped');
    };
  }, [location.search]); // Re-run when search parameters change
  
  // Apply URL parameters for filtering
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    const categoryParam = params.get('category');
    
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    
    if (allCourses.length > 0) {
      applyFilters(searchParam || searchQuery, categoryParam || selectedCategory, selectedLevel);
    }
  }, [location.search, allCourses]);
  
  const applyFilters = (search: string, category: string, level: string) => {
    let result = [...allCourses];
    
    if (search) {
      result = result.filter(course => 
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    if (category) {
      // Fix for category matching - handle both string and object formats
      result = result.filter(course => {
        // Case 1: Direct string match (e.g., course.category === 'DevOps')
        if (typeof course.category === 'string') {
          return (course.category as string).toLowerCase() === category.toLowerCase();
        }
        
        // Case 2: Object with name property (e.g., course.category.name === 'DevOps')
        if (course.category && typeof course.category === 'object') {
          // Safely access the name property with type checking
          const categoryObj = course.category as { name: string };
          if (categoryObj.name) {
            return categoryObj.name.toLowerCase() === category.toLowerCase();
          }
        }
        
        // Case 3: Check if category is in the title or description as fallback
        return course.title.toLowerCase().includes(category.toLowerCase()) ||
               (course.description && course.description.toLowerCase().includes(category.toLowerCase()));
      });
    }
    
    if (level) {
      result = result.filter(course => course.level === level);
    }
    
    setFilteredCourses(result);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(searchQuery, selectedCategory, selectedLevel);
    
    // Update URL
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    navigate(`/courses?${params.toString()}`);
  };
  
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };
  
  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLevel(e.target.value);
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLevel('');
    setFilteredCourses(allCourses);
    navigate('/courses');
  };

  const toggleFilters = () => {
    setIsFilterOpen(!isFilterOpen);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse All Courses</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our collection of organized YouTube tutorials across different categories
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for courses..."
                className="input pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <span className="px-3 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-md hidden sm:block">
                  Enter
                </span>
              </button>
            </div>
          </form>
          
          <div className="flex space-x-4">
            <button 
              className="btn btn-outline flex items-center md:hidden"
              onClick={toggleFilters}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            
            <div className="hidden md:flex space-x-4">
              <select
                className="input"
                value={selectedCategory}
                onChange={handleCategoryChange}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category._id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              
              <select
                className="input"
                value={selectedLevel}
                onChange={handleLevelChange}
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              
              <button 
                className="btn btn-primary"
                onClick={handleSearch}
              >
                Apply Filters
              </button>
              
              {(searchQuery || selectedCategory || selectedLevel) && (
                <button 
                  className="btn btn-outline flex items-center"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Filters */}
        {isFilterOpen && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6 md:hidden">
            <div className="space-y-4">
              <div>
                <label htmlFor="mobileCategory" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="mobileCategory"
                  className="input w-full"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="mobileLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  id="mobileLevel"
                  className="input w-full"
                  value={selectedLevel}
                  onChange={handleLevelChange}
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button 
                  className="btn btn-primary flex-1"
                  onClick={handleSearch}
                >
                  Apply Filters
                </button>
                
                {(searchQuery || selectedCategory || selectedLevel) && (
                  <button 
                    className="btn btn-outline flex items-center"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Filter summary */}
        {(searchQuery || selectedCategory || selectedLevel) && (
          <div className="bg-white px-4 py-3 rounded-lg shadow-sm mb-6 flex flex-wrap items-center">
            <span className="text-gray-700 mr-3">Active filters:</span>
            {searchQuery && (
              <span className="badge badge-primary m-1 px-3 py-1">
                Search: {searchQuery}
              </span>
            )}
            {selectedCategory && (
              <span className="badge badge-secondary m-1 px-3 py-1">
                Category: {selectedCategory}
              </span>
            )}
            {selectedLevel && (
              <span className="badge badge-accent m-1 px-3 py-1">
                Level: {selectedLevel}
              </span>
            )}
          </div>
        )}
        
        {/* Results */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {filteredCourses.length} {filteredCourses.length === 1 ? 'Course' : 'Courses'} Found
          </h2>
        </div>
        
        {isLoading ? (
          <div className="text-center">
            <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-gray-600" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No courses found</h3>
            <p className="text-gray-600 mb-6">
              We couldn't find any courses matching your search criteria.
            </p>
            <button 
              className="btn btn-primary"
              onClick={clearFilters}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;