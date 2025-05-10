// Import environment variables
const API_PORT = import.meta.env.VITE_API_PORT || 5000; // Changed to 5000 which is the correct backend port

// Make sure we're using the correct URL format
export const API_BASE_URL = import.meta.env.PROD
  ? '/api'  // In production, use relative path
  : `http://localhost:${API_PORT}`;

export const API_ENDPOINTS = {
  users: `${API_BASE_URL}/api/users`,
  courses: `${API_BASE_URL}/api/courses`,
  categories: `${API_BASE_URL}/api/categories`,
  progress: `${API_BASE_URL}/api/progress`,
  auth: {
    login: `${API_BASE_URL}/api/users/login`,
    register: `${API_BASE_URL}/api/users/register`,
    updateLogin: `${API_BASE_URL}/api/users/update-login`,
  },
  ping: `${API_BASE_URL}/api/ping`
};