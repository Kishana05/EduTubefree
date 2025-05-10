import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: 'user' | 'admin') => Promise<void>;
  register: (name: string, email: string, password: string, role?: 'user' | 'admin') => Promise<void>;
  logout: () => void;
}

interface AuthResponse {
  token: string;
  user: User;
}

// Import API configuration
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

// Set the correct API URL to the backend server port
const API_URL = API_BASE_URL;

// Flag to use mock auth only when backend is unavailable
// Set this based on whether we can successfully ping the server
const USE_MOCK_AUTH = false; // Set to false to prioritize MongoDB Atlas connection

// Admin credentials
const ADMIN_EMAIL = 'kishan05anand@gmail.com';
const ADMIN_PASSWORD = 'Ki@7259107113';

// Password validation utility function
export const validatePassword = (password: string): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check for minimum length
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long');
  }
  
  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  }
  
  // Check for numbers
  if (!/[0-9]/.test(password)) {
    issues.push('Password must contain at least one number');
  }
  
  // Check for special characters
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push('Password must contain at least one special character');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved auth data in localStorage
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // You could also validate the token here by making a request to the backend
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: 'user' | 'admin') => {
    setIsLoading(true);
    try {
      // First attempt to connect to the real API
      try {
        console.log('Attempting real API login to MongoDB Atlas');
        const response = await fetch(API_ENDPOINTS.auth.login, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password, role }) // Include role in the request
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.msg || 'Login failed');
        }
        
        const data: AuthResponse = await response.json();
        
        // Verify the user has the requested role
        if (data.user.role !== role) {
          throw new Error(`You don't have ${role} privileges. Please contact the administrator.`);
        }
        
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update last login time in the database
        try {
          await fetch(API_ENDPOINTS.auth.updateLogin, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            }
          });
        } catch (updateError) {
          // Non-critical error, just log it
          console.warn('Failed to update last login time:', updateError);
        }
        
        setUser(data.user);
        console.log('Successfully logged in with MongoDB Atlas');
        return;
      } catch (apiError) {
        console.error('API login failed:', apiError);
        
        // If not using mock auth as fallback, throw the error
        if (!USE_MOCK_AUTH) {
          throw apiError;
        }
        
        // Otherwise proceed to mock auth as fallback
        console.log('Falling back to mock authentication');
      }
      
      // Mock authentication as fallback
      if (role === 'admin') {
        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
          throw new Error('Invalid admin credentials. Access denied.');
        }
        
        // Admin authentication successful
        console.log('Admin mock authentication successful');
        const mockAdminUser: User = {
          id: 'admin-user-id',
          name: 'Administrator',
          email: ADMIN_EMAIL,
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        
        // Store mock data
        localStorage.setItem('token', 'mock-jwt-token-admin');
        localStorage.setItem('user', JSON.stringify(mockAdminUser));
        
        setUser(mockAdminUser);
        return;
      }
      
      // Regular user mock authentication - check if the user exists in localStorage
      console.log('Using mock auth for login:', email, 'as', role);
      
      // Check if user exists in mockUsers list
      const existingUsers = localStorage.getItem('mockUsers') || '[]';
      let users = [];
      try {
        users = JSON.parse(existingUsers);
      } catch (e) {
        console.error('Error parsing mockUsers:', e);
      }
      
      // Find the user with matching email
      const existingUser = users.find((u: any) => u.email === email);
      
      if (!existingUser) {
        throw new Error('User not found. Please register first.');
      }
      
      // For registered users, we should have stored their password during registration
      // Since we don't store passwords in localStorage for security reasons,
      // let's check if this is a previously registered user with the stored information
      const savedUserData = localStorage.getItem(`user_${email}`);
      
      if (savedUserData) {
        try {
          const userData = JSON.parse(savedUserData);
          if (userData.password !== password) {
            throw new Error('Invalid password. Please try again.');
          }
        } catch (e) {
          throw new Error('Invalid password or user data. Please try again.');
        }
      }
      
      const mockUser: User = {
        id: existingUser._id || `mock-user-id-${Date.now()}`,
        name: existingUser.name || email.split('@')[0],
        email,
        role: role,
        createdAt: existingUser.createdAt || new Date().toISOString()
      };
      
      // Store mock data
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      setUser(mockUser);
    } catch (error) {
      console.error('Login completely failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: 'user' | 'admin' = 'user') => {
    setIsLoading(true);
    try {
      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(`Password doesn't meet security requirements: ${passwordValidation.issues[0]}`);
      }
      
      // If trying to register as admin with the special email address, enforce password policy
      if (role === 'admin' && email === ADMIN_EMAIL && password !== ADMIN_PASSWORD) {
        throw new Error('Cannot register with this admin email. Please use a different email.');
      }
      
      // First check if API is reachable
      try {
        console.log('Testing API connectivity...');
        const pingResponse = await fetch(API_ENDPOINTS.ping, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }).catch(err => {
          console.error('API connectivity test failed:', err);
          throw new Error(`API connectivity test failed: ${err.message}`);
        });
        
        console.log('API ping response status:', pingResponse.status);
        
        if (pingResponse.ok) {
          console.log('API is reachable! Proceeding with registration...');
        } else {
          throw new Error(`API is not reachable. Status: ${pingResponse.status}`);
        }
      } catch (pingError) {
        console.error('API ping error:', pingError);
        // Continue with registration attempt even if ping fails
      }
        
      // Attempt to register with the real MongoDB Atlas API  
      try {
        console.log('Attempting registration with MongoDB Atlas:', { name, email, password: '***', role });
        console.log('API URL being used:', `${API_URL}/users/register`);
        
        // Make multiple attempts to register with the API
        let response = null;
        let attemptCount = 0;
        const maxAttempts = 3;
        
        while (attemptCount < maxAttempts) {
          attemptCount++;
          try {
            console.log(`Registration attempt ${attemptCount} of ${maxAttempts}...`);
            
            response = await fetch(API_ENDPOINTS.auth.register, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name, email, password, role })
            });
            
            // If successful, break out of the retry loop
            if (response.ok) {
              console.log('Registration successful on attempt', attemptCount);
              break;
            }
            
            // If we got a response but it's not ok, check if it's a 409 (user exists)
            if (response.status === 409) {
              const errorData = await response.json().catch(_ => ({ msg: 'Email already in use' }));
              throw new Error(errorData.msg || 'Email already in use');
            }
            
            // Log the error and wait before retrying
            console.log(`Attempt ${attemptCount} failed with status ${response.status}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (fetchError) {
            console.error(`Error during registration attempt ${attemptCount}:`, fetchError);
            if (attemptCount === maxAttempts) throw fetchError;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // After all attempts, if there's still no valid response, throw an error
        if (!response || !response.ok) {
          const errorData = response ? 
            await response.json().catch(_ => ({ msg: 'Could not parse error response' })) : 
            { msg: 'Failed to connect to server after multiple attempts' };
          console.error('Registration error data:', errorData);
          throw new Error(errorData.msg || 'Registration failed');
        }
        
        const data: AuthResponse = await response.json();
        
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setUser(data.user);
        console.log('Successfully registered with MongoDB Atlas');
        return;
      } catch (apiError) {
        console.error('API registration failed:', apiError);
        
        // If not using mock auth as fallback, throw the error
        if (!USE_MOCK_AUTH) {
          throw apiError;
        }
        
        // Otherwise proceed to mock auth as fallback
        console.log('Falling back to mock registration');
      }
      
      // Mock registration as fallback
      console.log('Using mock auth for registration:', { name, email, role });
      
      // For admin registration, use specific naming
      const mockUser: User = {
        id: role === 'admin' ? 'admin-user-id' : `user-${Date.now()}`,
        name: role === 'admin' ? 'Administrator' : name,
        email,
        role: role, // Use the role parameter (defaults to 'user')
        createdAt: new Date().toISOString()
      };
      
      // Additional fields for admin dashboard (will be stored in localStorage)
      const mockUserExtended = {
        ...mockUser,
        _id: `user-${Date.now()}`,
        status: 'active',
        lastLogin: new Date().toISOString(),
      };
      
      // Store mock data
      localStorage.setItem('token', role === 'admin' ? 'mock-jwt-token-admin' : 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      // Save user to mockUsers list in localStorage for admin dashboard
      const existingUsers = localStorage.getItem('mockUsers') || '[]';
      let users = [];
      try {
        users = JSON.parse(existingUsers);
      } catch (e) {
        console.error('Error parsing mockUsers:', e);
      }
      
      // Make sure we don't add duplicates
      const userExists = users.some((u: any) => u.email === email);
      if (!userExists) {
        users.push(mockUserExtended);
        localStorage.setItem('mockUsers', JSON.stringify(users));
      }
      
      // Store user credentials separately for login validation
      // In a real app, we'd never store passwords like this
      // This is only for the mock authentication scenario
      localStorage.setItem(`user_${email}`, JSON.stringify({
        email,
        password,
        role
      }));
      
      setUser(mockUser);
    } catch (error) {
      console.error('Registration completely failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};