const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
const auth = require('../middleware/auth');

// @route   POST /api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    // Validate request body
    if (!req.body) {
      console.error('Empty request body received');
      return res.status(400).json({ msg: 'Request body is empty' });
    }
    
    const { name, email, password, role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      console.error('Missing required fields:', { name: !!name, email: !!email, password: !!password });
      return res.status(400).json({ msg: 'Please provide all required fields: name, email, password' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log(`User with email ${email} already exists`);
      return res.status(409).json({ msg: 'User already exists' });
    }

    // Create new user with role if provided (otherwise default role from model will be used)
    user = new User({
      name,
      email,
      password,
      role: role || 'user' // Use the role from request or default to 'user'
    });

    await user.save();

    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        
        // Return user without password
        const userResponse = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
        };
        
        res.json({ token, user: userResponse });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/users/login
// @desc    Login user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        
        // Return user without password
        const userResponse = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
        };
        
        res.json({ token, user: userResponse });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/users/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/users/update-login
// @desc    Update user's last login time
// @access  Private
router.post('/update-login', auth, async (req, res) => {
  try {
    // Find user and update lastLogin field
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { 
        $set: { lastLogin: new Date() },
        $push: { 
          activityLog: { 
            action: 'login',
            timestamp: new Date(),
            details: { ip: req.ip }
          }
        }
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json({ success: true, timestamp: user.lastLogin });
  } catch (err) {
    console.error('Error updating login time:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
