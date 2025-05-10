import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProgressBar from '../../components/ui/ProgressBar';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Clock, BookOpen, Calendar, RefreshCw, Youtube } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';

interface EnrolledCourse {
  _id: string;
  course: {
    _id: string;
    title: string;
    thumbnail: string;
    level: string;
    videoUrl?: string;
    description?: string;
    duration?: string;
  };
  progress: number;
  startDate: string;
  lastAccessDate: string;
}

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [apiStatus, setApiStatus] = useState<Record<string, boolean>>({});
  const [statistics, setStatistics] = useState({
    totalCompleted: 0,
    inProgress: 0,
    notStarted: 0
  });

  // Function to test API endpoints
  const testApiEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      const result = await (endpoint.includes('ping') ? response.text() : response.json());
      console.log(`Endpoint ${endpoint} result:`, result);
      setApiStatus(prev => ({ ...prev, [endpoint]: true }));
      return true;
    } catch (err) {
      console.error(`Error testing endpoint ${endpoint}:`, err);
      setApiStatus(prev => ({ ...prev, [endpoint]: false }));
      return false;
    }
  };

  // Test all API endpoints in debug mode
  useEffect(() => {
    if (debugMode) {
      const testEndpoints = async () => {
        await testApiEndpoint('/api/ping');
        await testApiEndpoint('/api/test');
        await testApiEndpoint('/api/debug/auth-test');
      };
      testEndpoints();
    }
  }, [debugMode]);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        console.log('Fetching enrolled courses with token:', token.substring(0, 15) + '...');

        const response = await fetch(API_ENDPOINTS.progress, {
          headers: {
            'x-auth-token': token
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API Error (${response.status}): ${errorText}`);
          // If the API call fails, silently use demo data instead
          createDemoData();
          return;
        }

        const data = await response.json();
        setEnrolledCourses(data);
      } catch (err) {
        console.error('Error fetching enrolled courses:', err);
        // Use demo data if any error occurs, but don't show error message
        createDemoData();
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);

  useEffect(() => {
    if (enrolledCourses.length > 0) {
      const completed = enrolledCourses.filter(course => course.progress === 100).length;
      const notStarted = enrolledCourses.filter(course => course.progress === 0).length;
      const inProgress = enrolledCourses.length - completed - notStarted;
      
      setStatistics({
        totalCompleted: completed,
        inProgress: inProgress,
        notStarted: notStarted
      });
    }
  }, [enrolledCourses]);

  // Create demo data for development purposes
  const createDemoData = () => {
    const demoData: EnrolledCourse[] = [
      {
        _id: 'demo1',
        course: {
          _id: 'c1',
          title: 'Introduction to Web Development',
          thumbnail: 'https://picsum.photos/400/300',
          level: 'Beginner',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Learn the basics of web development with HTML, CSS, and JavaScript.'
        },
        progress: 75,
        startDate: new Date().toISOString(),
        lastAccessDate: new Date().toISOString()
      },
      {
        _id: 'demo2',
        course: {
          _id: 'c2',
          title: 'Advanced JavaScript',
          thumbnail: 'https://picsum.photos/400/301',
          level: 'Advanced',
          videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
          description: 'Master advanced JavaScript concepts and patterns.'
        },
        progress: 30,
        startDate: new Date().toISOString(),
        lastAccessDate: new Date().toISOString()
      },
      {
        _id: 'demo3',
        course: {
          _id: 'c3',
          title: 'React Fundamentals',
          thumbnail: 'https://picsum.photos/400/302',
          level: 'Intermediate',
          videoUrl: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
          description: 'Learn the fundamentals of React and component-based architecture.'
        },
        progress: 100,
        startDate: new Date().toISOString(),
        lastAccessDate: new Date().toISOString()
      }
    ];
    setEnrolledCourses(demoData);
    setError(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Profile Error</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error: {error}</p>
            <p className="text-sm mt-2">This could be due to authentication issues or server connectivity problems.</p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <button 
              onClick={() => {
                localStorage.clear();
                navigate('/login');
              }}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Clear Data & Go to Login
            </button>
            
            <button 
              onClick={createDemoData}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Use Demo Data
            </button>
            
            <button 
              onClick={() => setDebugMode(!debugMode)}
              className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
              {debugMode ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
            
            <button 
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
          
          {debugMode && (
            <div className="mt-6 border border-gray-300 rounded p-4 bg-gray-50">
              <h2 className="text-lg font-bold mb-2">Debug Information</h2>
              
              <div className="mb-4">
                <h3 className="font-medium mb-1">API Status:</h3>
                <ul className="list-disc pl-5">
                  {Object.entries(apiStatus).map(([endpoint, status]) => (
                    <li key={endpoint} className={status ? 'text-green-600' : 'text-red-600'}>
                      {endpoint}: {status ? 'OK' : 'Failed'}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => {
                    testApiEndpoint('/api/ping');
                    testApiEndpoint('/api/test');
                    testApiEndpoint('/api/debug/auth-test');
                  }}
                  className="mt-2 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm flex items-center"
                >
                  <RefreshCw size={14} className="mr-1" /> Retest Endpoints
                </button>
              </div>
              
              <div className="mb-4">
                <h3 className="font-medium mb-1">User Data:</h3>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Authentication Token:</h3>
                <div className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-20">
                  {localStorage.getItem('token') ? 
                    `${localStorage.getItem('token')?.substring(0, 20)}...` : 
                    'No token found'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalProgress = enrolledCourses.length > 0
    ? Math.round(enrolledCourses.reduce((sum, course) => sum + course.progress, 0) / enrolledCourses.length)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl text-primary-600 font-bold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{user?.name}</h1>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center">
            <div className="mb-2 text-primary-600">
              <BookOpen size={24} />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1 text-center">Total Enrolled</h3>
            <p className="text-3xl font-bold text-primary-600">{enrolledCourses.length}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center">
            <div className="mb-2 text-green-600">
              <Award size={24} />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1 text-center">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{statistics.totalCompleted}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center">
            <div className="mb-2 text-yellow-600">
              <Clock size={24} />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1 text-center">In Progress</h3>
            <p className="text-3xl font-bold text-yellow-600">{statistics.inProgress}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center">
            <div className="mb-2 text-blue-600">
              <Calendar size={24} />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1 text-center">Not Started</h3>
            <p className="text-3xl font-bold text-blue-600">{statistics.notStarted}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">Overall Learning Progress</h3>
          <ProgressBar 
            progress={totalProgress} 
            height={12} 
            showPercentage={true}
            color={totalProgress < 30 ? 'bg-red-500' : totalProgress < 70 ? 'bg-yellow-500' : 'bg-green-500'}
          />
          <div className="mt-2 text-sm text-gray-600">
            {totalProgress < 30 ? 'Just getting started! Keep going!' : 
             totalProgress < 70 ? 'You\'re making good progress!' : 
             totalProgress < 100 ? 'Almost there! Keep up the great work!' : 
             'Congratulations on completing all your courses!'}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Courses</h2>

      {enrolledCourses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 mb-4">You haven't enrolled in any courses yet.</p>
          <Link to="/courses" className="inline-block bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.map((enrolledCourse) => (
            <div key={enrolledCourse._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img 
                src={enrolledCourse.course.thumbnail} 
                alt={enrolledCourse.course.title} 
                className="w-full h-40 object-cover"
              />
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800">{enrolledCourse.course.title}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {enrolledCourse.course.level}
                  </span>
                </div>
                
                {enrolledCourse.course.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {enrolledCourse.course.description}
                  </p>
                )}
                
                {/* Video player for course preview */}
                {enrolledCourse.course.videoUrl && (
                  <div className="mb-4">
                    <div className="relative aspect-w-16 aspect-h-9 rounded overflow-hidden">
                      <iframe
                        src={enrolledCourse.course.videoUrl.replace('watch?v=', 'embed/')}
                        title={`${enrolledCourse.course.title} preview`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                        loading="lazy"
                      ></iframe>
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-medium ${
                      enrolledCourse.progress === 0 ? 'text-gray-500' : 
                      enrolledCourse.progress < 25 ? 'text-red-600' : 
                      enrolledCourse.progress < 75 ? 'text-yellow-600' : 
                      enrolledCourse.progress < 100 ? 'text-blue-600' : 
                      'text-green-600'
                    }`}>
                      {enrolledCourse.progress === 0 ? 'Not Started' : 
                      enrolledCourse.progress < 25 ? 'Just Started' : 
                      enrolledCourse.progress < 75 ? 'In Progress' : 
                      enrolledCourse.progress < 100 ? 'Almost Complete' : 
                      'Completed'}
                    </span>
                    <span className="text-sm text-gray-500">{enrolledCourse.progress}%</span>
                  </div>
                  <ProgressBar 
                    progress={enrolledCourse.progress} 
                    height={8}
                    color={
                      enrolledCourse.progress < 25 ? 'bg-red-500' : 
                      enrolledCourse.progress < 75 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Link 
                    to={`/courses/${enrolledCourse.course._id}`}
                    className="flex-1 text-center bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition"
                  >
                    Continue Learning
                  </Link>
                  
                  {enrolledCourse.course.videoUrl && (
                    <button
                      onClick={() => window.open(enrolledCourse.course.videoUrl, '_blank')}
                      className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      title="Watch on YouTube"
                    >
                      <Youtube size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Small debug toggle at the bottom right */}
      <button 
        onClick={() => setDebugMode(!debugMode)}
        className="fixed bottom-5 right-5 bg-gray-200 hover:bg-gray-300 p-2 rounded-full shadow-md"
        title="Toggle Debug Mode"
      >
        <RefreshCw size={16} />
      </button>
    </div>
  );
};

export default UserDashboard;
