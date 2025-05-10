import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';
import { Course, User, Category } from '../../types';
import { 
  Plus, 
  Edit, Trash,
  Eye, X, Youtube,
  Search,
  AlertCircle
} from 'lucide-react';

// Simple AdminDashboard component
const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get tab from URL or default to 'courses'
  const tabFromUrl = new URLSearchParams(location.search).get('tab') || 'courses';
  
  // State
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Load courses from localStorage
        const coursesStr = localStorage.getItem('edutube_courses');
        if (coursesStr) {
          const parsedCourses = JSON.parse(coursesStr);
          setCourses(parsedCourses);
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Simple UI for testing
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <p>Loaded {courses.length} courses</p>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => navigate('/')}
          >
            Go to Home
          </button>
        </div>
      )}
    </div>
  );
};

// Export at the top level
export default AdminDashboard;
