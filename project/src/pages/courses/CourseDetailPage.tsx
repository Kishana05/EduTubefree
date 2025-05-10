import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Star } from 'lucide-react';
import { courses as mockCourses } from '../../data/mockData';
import { Course, Lesson } from '../../types';
import VideoPlaceholder from '../../components/ui/VideoPlaceholder';
import { formatYoutubeUrl } from '../../utils/videoUtils';

const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLDivElement>(null);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  // These state variables will be used in future feature implementations
  // const [progress, setProgress] = useState(0);
  // const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [courseProgress, setCourseProgress] = useState<number>(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const loadCourse = async () => {
      setIsLoading(true);
      
      try {
        // First check if this is a course added through admin dashboard
        const storedCourses = localStorage.getItem('adminCourses');
        if (storedCourses) {
          const parsedCourses = JSON.parse(storedCourses);
          const adminCourse = parsedCourses.find((c: any) => c._id === id);
          
          if (adminCourse) {
            // Convert admin course to expected format
            const convertedCourse: Course = {
              id: adminCourse._id,
              title: adminCourse.title,
              description: adminCourse.description || '',
              instructor: adminCourse.instructor || 'Unknown Instructor',
              thumbnail: adminCourse.thumbnail || 'https://via.placeholder.com/640x360?text=No+Image',
              category: adminCourse.category?.name || 'Uncategorized',
              level: adminCourse.level || 'beginner',
              rating: adminCourse.rating || 4.5,
              totalStudents: adminCourse.totalStudents || 0,
              createdAt: adminCourse.createdAt || new Date().toISOString(),
              updatedAt: adminCourse.updatedAt || new Date().toISOString(),
              videoUrl: adminCourse.videoUrl || null,
              duration: adminCourse.duration || '1h 30m',
              // Create a simple module structure if none exists
              modules: adminCourse.modules || [
                {
                  id: 'module-1',
                  title: 'Introduction to Course',
                  lessons: [
                    {
                      id: 'lesson-1',
                      title: 'Course Overview',
                      description: adminCourse.description || 'Overview of the course',
                      duration: '15:20',
                      videoUrl: adminCourse.videoUrl || ''
                    },
                    {
                      id: 'lesson-2',
                      title: 'Setting Up Your Environment',
                      description: 'Learn how to set up your development environment',
                      duration: '22:45',
                      videoUrl: adminCourse.videoUrl || ''
                    }
                  ]
                },
                {
                  id: 'module-2',
                  title: 'Core Concepts',
                  lessons: [
                    {
                      id: 'lesson-3',
                      title: 'Understanding the Basics',
                      description: 'Learn the fundamental concepts',
                      duration: '18:30',
                      videoUrl: adminCourse.videoUrl || ''
                    }
                  ]
                }
              ]
            };
            
            setCourse(convertedCourse);
            
            // Calculate total lessons
            const lessons = convertedCourse.modules.reduce((acc, module) => acc + module.lessons.length, 0);
            setTotalLessons(lessons);
            
            // Set the first lesson as current or create a placeholder
            if (convertedCourse.modules.length > 0 && convertedCourse.modules[0].lessons.length > 0) {
              setCurrentLesson(convertedCourse.modules[0].lessons[0]);
              setExpandedModules(new Set([convertedCourse.modules[0].id]));
            }
            
            setIsLoading(false);
            return; // Exit early if we found the course
          }
        }
        
        // If not found in localStorage, check mock courses
        const foundCourse = mockCourses.find(c => c.id === id);
        if (foundCourse) {
          setCourse(foundCourse);
          
          // Calculate total lessons
          const lessons = foundCourse.modules.reduce((acc, module) => acc + module.lessons.length, 0);
          setTotalLessons(lessons);
          
          // Set the first lesson as the current lesson
          if (foundCourse.modules.length > 0 && foundCourse.modules[0].lessons.length > 0) {
            setCurrentLesson(foundCourse.modules[0].lessons[0]);
            // Expand the first module by default
            setExpandedModules(new Set([foundCourse.modules[0].id]));
          }
        }
      } catch (error) {
        console.error('Error loading course:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      loadCourse();
    }
  }, [id]);
  
  // Track course progress
  useEffect(() => {
    if (course) {
      // Load completed lessons from localStorage
      const savedProgress = localStorage.getItem(`course-progress-${course.id}`);
      if (savedProgress) {
        try {
          const parsed = JSON.parse(savedProgress);
          setCompletedLessons(new Set(parsed.completedLessons));
          setCourseProgress(parsed.progress);
        } catch (e) {
          console.error('Error parsing saved progress', e);
        }
      }
    }
  }, [course]);
  
  // Calculate progress whenever completedLessons changes
  useEffect(() => {
    if (course && course.modules) {
      // Count total lessons
      let totalLessons = 0;
      course.modules.forEach(module => {
        totalLessons += module.lessons?.length || 0;
      });
      
      if (totalLessons > 0) {
        const progress = Math.round((completedLessons.size / totalLessons) * 100);
        setCourseProgress(progress);
        
        // Save progress to localStorage
        if (course.id) {
          localStorage.setItem(`course-progress-${course.id}`, JSON.stringify({
            completedLessons: Array.from(completedLessons),
            progress
          }));
        }
      }
    }
  }, [completedLessons, course]);
  
  // Simulate progress tracking
  useEffect(() => {
    if (course && totalLessons > 0) {
      // Get or initialize progress data
      const progressKey = `course-progress-${course.id}`;
      let progressData = localStorage.getItem(progressKey);
      
      if (progressData) {
        try {
          const parsedData = JSON.parse(progressData);
          // Update only the course progress percentage and completed lessons set
          // Progress tracking functionality will be expanded in future updates
          const completedCount = parsedData.completedLessons?.length || 0;
          setCourseProgress(Math.round((completedCount / totalLessons) * 100));
        } catch (e) {
          console.error('Error parsing progress data:', e);
          setCourseProgress(0);
        }
      } else {
        // Initialize with no progress
        setCourseProgress(0);
      }
    }
  }, [course, totalLessons]);
  
  // Mark lesson as complete
  const markLessonAsComplete = (lessonId: string) => {
    if (!lessonId) return;
    
    const newCompletedLessons = new Set(completedLessons);
    
    if (newCompletedLessons.has(lessonId)) {
      newCompletedLessons.delete(lessonId);
    } else {
      newCompletedLessons.add(lessonId);
    }
    
    setCompletedLessons(newCompletedLessons);
  };
  
  const isLessonCompleted = (lessonId: string): boolean => {
    if (!course) return false;
    
    const progressKey = `course-progress-${course.id}`;
    let progressData = localStorage.getItem(progressKey);
    
    if (progressData) {
      try {
        const parsedData = JSON.parse(progressData);
        return parsedData.completedLessons?.includes(lessonId) || false;
      } catch (e) {
        console.error('Error parsing progress data:', e);
        return false;
      }
    }
    
    return false;
  };
  
  const handleLessonSelect = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    // Find the module of this lesson and expand it
    if (!course) return;
    
    for (const module of course.modules) {
      if (module.lessons.some(l => l.id === lesson.id)) {
        const newExpandedModules = new Set(expandedModules);
        newExpandedModules.add(module.id);
        setExpandedModules(newExpandedModules);
        break;
      }
    }
    
    // Scroll to top for mobile users
    if (videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const toggleModule = (moduleId: string) => {
    const newExpandedModules = new Set(expandedModules);
    if (newExpandedModules.has(moduleId)) {
      newExpandedModules.delete(moduleId);
    } else {
      newExpandedModules.add(moduleId);
    }
    setExpandedModules(newExpandedModules);
  };
  
  // We're using the formatYoutubeUrl utility function imported from '../../utils/videoUtils'
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-400 mb-4">
              <BookOpen className="h-12 w-12 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Course not found</h1>
            <p className="text-gray-600 mb-6">
              The course you're looking for doesn't exist or has been removed.
            </p>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded"
              onClick={() => navigate('/courses')}
            >
              Browse all courses
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const formattedDuration = course.duration || "0h 0m";
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* No duplicated navbar - using the global Navbar component instead */}
      
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="mx-2 text-gray-400">/</span>
            <Link to="/courses" className="text-gray-500 hover:text-gray-700">Courses</Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900">{course.title}</span>
          </div>
        </div>
      </div>
      
      {/* Course header */}
      <div className="bg-blue-600 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <div className="flex items-center">
              <span className="flex items-center"><Star className="h-5 w-5 text-yellow-400 mr-1" fill="currentColor" /> {course.rating}</span>
              <span className="mx-2">•</span>
              <span>{course.totalStudents || 0} students</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2">
            {/* Video player */}
            <div ref={videoRef} className="relative rounded-lg overflow-hidden shadow-lg max-w-3xl mx-auto">
              {(currentLesson?.videoUrl || course?.videoUrl) ? (
                <div className="relative" style={{ paddingTop: '56.25%', width: '100%' }}>
                  <iframe
                    src={formatYoutubeUrl(currentLesson?.videoUrl || course?.videoUrl || '')}
                    title={currentLesson?.title || course?.title || ''}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              ) : (
                <VideoPlaceholder 
                  title="No video available for this lesson" 
                  progress={courseProgress}
                />
              )}
            </div>
            
            {/* Progress tracking below video */}
            <div className="mt-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-700 font-medium">Your Progress</div>
                <div className="text-sm text-gray-500">
                  {completedLessons.size} of {totalLessons} lessons
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <input 
                    type="radio" 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                    checked={completedLessons.has(currentLesson?.id || '')}
                    onChange={() => currentLesson && markLessonAsComplete(currentLesson.id)}
                  />
                </div>
                <div className="text-sm font-medium text-gray-600">
                  {courseProgress}% complete
                </div>
                <div className="flex-grow"></div>
                <button 
                  onClick={() => currentLesson && markLessonAsComplete(currentLesson.id)}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-1.5 rounded text-sm"
                >
                  Mark as complete
                </button>
              </div>
            </div>
            
            {/* Current lesson title and description */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-2">{currentLesson?.title || 'What is React?'}</h2>
              <p className="text-gray-600">
                {currentLesson?.description || 'Learn about React and its core concepts.'}
              </p>
              <div className="flex items-center mt-2 text-gray-500 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {currentLesson?.duration || '15:20'}
              </div>
            </div>
          </div>
          
          {/* Right sidebar - Course Content */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Course Content</h3>
              <button 
                onClick={() => setExpandedModules(new Set(course?.modules?.map(m => m.id) || []))}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Expand all
              </button>
            </div>
            
            {course?.modules?.map((module, moduleIndex) => (
              <div key={module.id || moduleIndex} className="mb-3 border-b border-gray-100 pb-2 last:border-0">
                <div 
                  className="flex items-center justify-between py-2 cursor-pointer"
                  onClick={() => toggleModule(module.id)}
                >
                  <div className="flex items-center">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 mr-2 transition-transform ${expandedModules.has(module.id) ? 'transform rotate-90' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <h4 className="font-medium">{module.title}</h4>
                  </div>
                  <div className="text-sm text-gray-500">{module.lessons?.length || 0} lessons</div>
                </div>
                
                {expandedModules.has(module.id) && (
                  <div className="pl-6 py-1">
                    {module.lessons?.map((lesson, lessonIndex) => (
                      <div 
                        key={lesson.id || lessonIndex}
                        className={`py-2 flex items-start cursor-pointer ${lesson.id === currentLesson?.id ? 'bg-blue-50 -mx-2 px-2 rounded' : ''}`}
                        onClick={() => handleLessonSelect(lesson)}
                      >
                        <div className="flex-shrink-0 mr-3 mt-1">
                          {completedLessons.has(lesson.id) ? (
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="text-sm font-medium">{lesson.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {lesson.duration}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;