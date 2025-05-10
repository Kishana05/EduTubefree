const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');

// Load environment variables
dotenv.config();

// Connect to MongoDB Atlas
console.log('Connecting to MongoDB Atlas...');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edutube', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Longer timeout for seeding operations
  socketTimeoutMS: 60000, // Close sockets after 60 seconds of inactivity
})
  .then(() => {
    console.log('MongoDB Atlas connected successfully for seeding');
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
  })
  .catch(err => {
    console.error('MongoDB Atlas connection error:', err);
    console.error('Cannot seed database without a proper connection. Exiting...');
    process.exit(1);
  });

// Seed data
const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    await Category.deleteMany({});

    console.log('Data cleared successfully');

    // Create admin and test user
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const userPassword = await bcrypt.hash('user123', salt);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      createdAt: new Date()
    });

    const testUser = await User.create({
      name: 'Test User',
      email: 'user@example.com',
      password: userPassword,
      role: 'user',
      createdAt: new Date()
    });

    console.log('Users created successfully');

    // Create categories
    const webDevCategory = await Category.create({
      name: 'Web Development',
      icon: 'code',
      count: 0
    });

    const dataScience = await Category.create({
      name: 'Data Science',
      icon: 'analytics',
      count: 0
    });

    const mobileDev = await Category.create({
      name: 'Mobile Development',
      icon: 'smartphone',
      count: 0
    });

    const design = await Category.create({
      name: 'Design',
      icon: 'brush',
      count: 0
    });

    console.log('Categories created successfully');

    // Create courses
    const reactCourse = await Course.create({
      title: 'React Masterclass',
      description: 'Learn React from beginner to advanced level with practical projects',
      instructor: 'John Smith',
      thumbnail: 'https://placehold.co/600x400?text=React+Course',
      category: webDevCategory._id,
      level: 'intermediate',
      rating: 4.8,
      totalStudents: 1543,
      featured: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [
        {
          title: 'Introduction to React',
          lessons: [
            {
              title: 'Getting Started with React',
              description: 'Learn the basics of React and its core concepts',
              duration: '15:30',
              videoUrl: 'https://example.com/videos/react-intro'
            },
            {
              title: 'Components and Props',
              description: 'Understanding React components and properties',
              duration: '22:15',
              videoUrl: 'https://example.com/videos/react-components'
            }
          ]
        },
        {
          title: 'React Hooks',
          lessons: [
            {
              title: 'useState and useEffect',
              description: 'Learn the most important React hooks',
              duration: '28:45',
              videoUrl: 'https://example.com/videos/react-hooks'
            }
          ]
        }
      ]
    });

    const pythonCourse = await Course.create({
      title: 'Python for Data Science',
      description: 'Learn Python programming for data analysis and visualization',
      instructor: 'Sarah Johnson',
      thumbnail: 'https://placehold.co/600x400?text=Python+Course',
      category: dataScience._id,
      level: 'beginner',
      rating: 4.6,
      totalStudents: 2187,
      featured: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [
        {
          title: 'Python Basics',
          lessons: [
            {
              title: 'Introduction to Python',
              description: 'Learn the basics of Python programming language',
              duration: '18:20',
              videoUrl: 'https://example.com/videos/python-intro'
            },
            {
              title: 'Data Types and Variables',
              description: 'Understanding Python data types and variables',
              duration: '24:10',
              videoUrl: 'https://example.com/videos/python-data-types'
            }
          ]
        }
      ]
    });

    const flutterCourse = await Course.create({
      title: 'Flutter App Development',
      description: 'Create beautiful mobile apps with Flutter framework',
      instructor: 'Michael Chen',
      thumbnail: 'https://placehold.co/600x400?text=Flutter+Course',
      category: mobileDev._id,
      level: 'advanced',
      rating: 4.9,
      totalStudents: 1157,
      featured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [
        {
          title: 'Flutter Fundamentals',
          lessons: [
            {
              title: 'Getting Started with Flutter',
              description: 'Setup your development environment for Flutter',
              duration: '20:15',
              videoUrl: 'https://example.com/videos/flutter-intro'
            }
          ]
        }
      ]
    });

    console.log('Courses created successfully');

    // Update category counts
    await Category.findByIdAndUpdate(webDevCategory._id, { count: 1 });
    await Category.findByIdAndUpdate(dataScience._id, { count: 1 });
    await Category.findByIdAndUpdate(mobileDev._id, { count: 1 });

    console.log('Categories updated successfully');
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

// Run seed function
seedDatabase();
