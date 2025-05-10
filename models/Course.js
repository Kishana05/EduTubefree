const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  }
});

const ModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  lessons: [LessonSchema]
});

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.Mixed, // Changed from ObjectId to Mixed to support both ID strings and objects
    required: true,
    get: function(v) {
      // If it's already an object with name property, return it
      if (v && typeof v === 'object' && v.name) return v;
      
      // Otherwise, treat as an ID reference
      return v;
    },
    set: function(v) {
      // If it's an object with _id, extract the ID
      if (v && typeof v === 'object' && v._id) return v._id;
      
      // If it's an object with id, extract the ID
      if (v && typeof v === 'object' && v.id) return v.id;
      
      // Otherwise return as is (should be a string ID)
      return v;
    }
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  videoUrl: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  modules: [ModuleSchema]
});

module.exports = mongoose.model('Course', CourseSchema);
