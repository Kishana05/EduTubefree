const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Set up CORS to allow ALL localhost origins in development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  console.log(`Received request from origin: ${origin}`);
  
  // Simply allow all localhost origins for development
  if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    console.log(`Allowing CORS for origin: ${origin}`);
    
    // Set CORS headers for all localhost origins
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    console.log('CORS headers set for development origin');
  } else {
    console.log(`Origin not allowed by CORS: ${origin}`);
  }
  
  // Handle preflight OPTIONS requests more thoroughly
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request from:', origin);
    
    // Immediately respond to preflight requests with appropriate headers
    if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
      
      console.log('Preflight response headers set for:', origin);
      return res.status(204).end();
    }
  }
  
  next();
});

// Middleware
app.use(express.json());

// Connect to MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edutube';
console.log(`Connecting to MongoDB with URI: ${MONGODB_URI.substring(0, 20)}...`);

mongoose.connect(MONGODB_URI, {
  // These options are no longer needed in newer driver versions but kept for backward compatibility
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000, // Increased timeout to 15s for better reliability
  socketTimeoutMS: 60000, // Increased timeout for better reliability
})
.then(() => {
  console.log('✅ MongoDB Atlas connected successfully');
  
  // Verify database and collections
  const dbName = mongoose.connection.db.databaseName;
  console.log(`Connected to database: ${dbName}`);
  
  // Check for courses collection
  mongoose.connection.db.listCollections({name: 'courses'}).next((err, collinfo) => {
    if (err) {
      console.error('Error checking collections:', err);
      return;
    }
    
    if (collinfo) {
      console.log('✅ Courses collection verified');
    } else {
      console.warn('⚠️ Courses collection not found - will be created automatically');
    }
  });
})
.catch(err => {
  console.error('❌ MongoDB Atlas connection error:', err);
  console.log('Falling back to local storage mode due to database connection failure');
  // Don't exit the process, application will use localStorage fallback
});

// Display connection status on reconnect attempts
mongoose.connection.on('connected', () => {
  console.log('MongoDB Atlas connection re-established');
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB Atlas disconnected');
});

// Import routes
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const categoryRoutes = require('./routes/categories');
const progressRoutes = require('./routes/progress');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/progress', progressRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Server error' 
      : err.message
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('project/dist'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'project', 'dist', 'index.html'));
  });
}

// Add basic routes for testing
app.get('/', (req, res) => {
  res.send('EduTube API is running');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API test endpoint is working' });
});

app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

// MongoDB connection and data verification endpoint
app.get('/api/debug/mongodb-status', async (req, res) => {
  try {
    // Check MongoDB connection status
    const connectionState = mongoose.connection.readyState;
    const connectionStatus = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[connectionState] || 'unknown';
    
    // Only proceed with collection checks if connected
    let userCount = 0;
    let courseCount = 0;
    let categoryCount = 0;
    let progressCount = 0;
    
    if (connectionState === 1) {
      // Count documents in collections
      try {
        // Get collections without importing models
        const collections = mongoose.connection.collections;
        
        if (collections.users) {
          userCount = await mongoose.connection.collection('users').countDocuments();
        }
        
        if (collections.courses) {
          courseCount = await mongoose.connection.collection('courses').countDocuments();
        }
        
        if (collections.categories) {
          categoryCount = await mongoose.connection.collection('categories').countDocuments();
        }
        
        if (collections.progresses) {
          progressCount = await mongoose.connection.collection('progresses').countDocuments();
        }
      } catch (countError) {
        console.error('Error counting documents:', countError);
      }
    }
    
    // Send response with connection status and document counts
    res.json({
      success: true,
      mongodb: {
        connection: {
          status: connectionStatus,
          readyState: connectionState,
          uri: process.env.MONGODB_URI ? 
            `${process.env.MONGODB_URI.split('@')[0].substring(0,15)}...` : 
            'Not configured'
        },
        collections: {
          users: { count: userCount },
          courses: { count: courseCount },
          categories: { count: categoryCount },
          progresses: { count: progressCount }
        }
      }
    });
  } catch (error) {
    console.error('MongoDB status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check MongoDB status',
      message: error.message
    });
  }
});

// Add a specific test endpoint for the profile issue
app.get('/api/debug/auth-test', (req, res) => {
  res.json({ 
    message: 'Auth test endpoint is working',
    timestamp: new Date().toISOString(),
    server: 'EduTube API',
    port: PORT
  });
});

// Add a simple test endpoint for registration debugging
app.get('/api/debug/register-check', (req, res) => {
  res.json({
    success: true,
    message: 'Registration API route is available',
    routes: {
      register: '/api/users/register',
      login: '/api/users/login'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test the API at http://localhost:${PORT}`);
});
