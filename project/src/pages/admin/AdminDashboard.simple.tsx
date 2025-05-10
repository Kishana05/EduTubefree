import { useState, useEffect, FormEvent } from 'react';
import { saveCourse, deleteCourse, debugCourses } from '../../utils/courseUtils';
// EduTubeSync is globally available through the script loaded in index.html
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

// Define interfaces for admin dashboard specific needs
interface AdminUser extends Omit<User, 'id'> {
  _id: string;
  status?: 'active' | 'blocked';
  enrolledCourses?: Array<{
    course: { _id: string; title: string };
    progress: number;
  }>;
  lastLogin?: string;
}

// Component definition using arrow function
const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get tab from URL or default to 'courses'
  const tabFromUrl = new URLSearchParams(location.search).get('tab') || 'courses';
  
  // State declarations
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
  
  // Simple placeholder render
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <p>Loading the admin dashboard...</p>
    </div>
  );
};

// Export the component
export default AdminDashboard;
