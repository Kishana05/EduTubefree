const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const auth = require('../middleware/auth');

// @route   GET /api/courses
// @desc    Get all courses
// @access  Public
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().populate('category', 'name icon');
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('category', 'name icon');
    
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    
    res.json(course);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST /api/courses
// @desc    Create a course
// @access  Private/Admin
router.post('/', auth, async (req, res) => {
  try {
    // Log the incoming request body for debugging
    console.log('----------------------------------------');
    console.log('COURSE CREATION REQUEST RECEIVED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User making request:', req.user);
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('----------------------------------------');

    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('Access denied - user is not admin:', req.user.role);
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const {
      title,
      description,
      instructor,
      thumbnail,
      category,
      level,
      modules,
      rating,
      totalStudents,
      videoUrl,
      featured
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !instructor || !thumbnail || !category || !level) {
      console.log('Validation failed - missing required fields');
      return res.status(400).json({ 
        msg: 'Missing required fields',
        required: ['title', 'description', 'instructor', 'thumbnail', 'category', 'level'],
        received: Object.keys(req.body)
      });
    }

    // Process category - ensure it's properly formatted
    let categoryToSave;
    if (typeof category === 'string') {
      // If category is a string ID, try to find it
      try {
        const categoryObj = await mongoose.model('Category').findById(category);
        if (categoryObj) {
          categoryToSave = categoryObj._id;
        } else {
          // Default to a generic category if not found
          categoryToSave = category;
        }
      } catch (err) {
        console.log('Error looking up category, using as-is:', err.message);
        categoryToSave = category;
      }
    } else if (category && typeof category === 'object') {
      // If it's an object with _id, use the _id
      categoryToSave = category._id || category;
    } else {
      categoryToSave = category;
    }
    
    // Prepare course data
    const courseData = {
      title,
      description,
      instructor,
      thumbnail,
      category: categoryToSave,
      level,
      modules: modules || [],
      videoUrl: videoUrl || '',
      rating: rating || 0,
      totalStudents: totalStudents || 0,
      featured: featured || false
    };

    // Log the processed course data
    console.log('Creating course with processed data:', JSON.stringify(courseData, null, 2));
    
    // Create new course
    const newCourse = new Course(courseData);
    
    try {
      // Explicitly validate the document before saving
      await newCourse.validate();
      
      // Save with explicit promise handling
      const course = await newCourse.save();
      
      // Double check that it was actually saved by querying for it
      const savedCourse = await Course.findById(course._id);
      
      if (savedCourse) {
        console.log('✅ COURSE SUCCESSFULLY SAVED TO MONGODB:', course._id);
        console.log('Database now has the following course:');
        console.log(JSON.stringify(savedCourse.toObject(), null, 2));
      } else {
        console.log('⚠️ Course appeared to save but could not be retrieved afterward');
      }
      
      // Get updated count
      const count = await Course.countDocuments();
      console.log(`Total courses in database: ${count}`);
      console.log('----------------------------------------');
      
      res.json(course);
    } catch (validationError) {
      console.error('❌ COURSE VALIDATION ERROR:', validationError.message);
      throw new Error(`Course validation failed: ${validationError.message}`);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private/Admin
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    
    // Update course fields
    const updateFields = req.body;
    updateFields.updatedAt = Date.now();
    
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );
    
    res.json(updatedCourse);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private/Admin
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    
    await course.deleteOne();
    
    res.json({ msg: 'Course removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET /api/courses/featured
// @desc    Get featured courses
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const courses = await Course.find({ featured: true }).populate('category', 'name icon');
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/courses/category/:categoryId
// @desc    Get courses by category
// @access  Public
router.get('/category/:categoryId', async (req, res) => {
  try {
    const courses = await Course.find({ category: req.params.categoryId }).populate('category', 'name icon');
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
