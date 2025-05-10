const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');

// Load environment variables
dotenv.config();

// Sample categories
const categories = [
  { name: 'Web Development', icon: 'code' },
  { name: 'Data Science', icon: 'bar-chart' },
  { name: 'Mobile Development', icon: 'mobile' },
  { name: 'Cloud Computing', icon: 'cloud' },
  { name: 'Artificial Intelligence', icon: 'brain' }
];

// Sample courses
const courses = [
  {
    title: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming language',
    thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?ixlib=rb-1.2.1&auto=format&fit=crop&w=1489&q=80',
    level: 'beginner',
    duration: '10 hours',
    price: 0,
    videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
    instructor: 'John Smith',
    category: null // Will be filled later
  },
  {
    title: 'React.js for Beginners',
    description: 'Build modern user interfaces with React',
    thumbnail: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1470&q=80',
    level: 'intermediate',
    duration: '15 hours',
    price: 0,
    videoUrl: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
    instructor: 'Jane Doe',
    category: null // Will be filled later
  },
  {
    title: 'MongoDB Complete Course',
    description: 'Learn MongoDB from scratch to advanced concepts',
    thumbnail: 'https://images.unsplash.com/photo-1603349206295-da9cf0ede197?ixlib=rb-1.2.1&auto=format&fit=crop&w=1470&q=80',
    level: 'advanced',
    duration: '12 hours',
    price: 0,
    videoUrl: 'https://www.youtube.com/watch?v=pWbMrx5rVBE',
    instructor: 'Michael Johnson',
    category: null // Will be filled later
  },
  {
    title: 'Node.js Backend Development',
    description: 'Build scalable backend applications with Node.js',
    thumbnail: 'https://images.unsplash.com/photo-1535551951406-a19828b0a76b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1470&q=80',
    level: 'advanced',
    duration: '20 hours',
    price: 0,
    videoUrl: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4',
    instructor: 'Sarah Williams',
    category: null // Will be filled later
  },
  {
    title: 'Python Data Science',
    description: 'Learn data analysis and visualization with Python',
    thumbnail: 'https://images.unsplash.com/photo-1518932945647-7a1c969f8be2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1489&q=80',
    level: 'intermediate',
    duration: '18 hours',
    price: 0,
    videoUrl: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI',
    instructor: 'David Brown',
    category: null // Will be filled later
  }
];

// Sample users
const users = [
  {
    name: 'Admin User',
    email: 'kishan05anand@gmail.com', // Admin email as per memory
    password: 'Ki@7259107113', // Admin password as per memory
    role: 'admin'
  },
  {
    name: 'Test User',
    email: 'user@example.com',
    password: 'password123',
    role: 'user'
  }
];

// Function to seed categories
const seedCategories = async () => {
  try {
    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');
    
    // Insert new categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`Added ${createdCategories.length} categories`);
    
    return createdCategories;
  } catch (err) {
    console.error('Error seeding categories:', err);
    return [];
  }
};

// Function to seed courses
const seedCourses = async (createdCategories) => {
  try {
    // Clear existing courses
    await Course.deleteMany({});
    console.log('Cleared existing courses');
    
    // Assign categories to courses
    courses.forEach((course, index) => {
      const categoryIndex = index % createdCategories.length;
      course.category = createdCategories[categoryIndex]._id;
    });
    
    // Insert new courses
    const createdCourses = await Course.insertMany(courses);
    console.log(`Added ${createdCourses.length} courses`);
    
    return createdCourses;
  } catch (err) {
    console.error('Error seeding courses:', err);
    return [];
  }
};

// Function to seed users
const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');
    
    // Hash passwords and create users
    const createdUsers = [];
    
    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      const newUser = new User({
        ...user,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      });
      
      await newUser.save();
      createdUsers.push(newUser);
    }
    
    console.log(`Added ${createdUsers.length} users`);
    return createdUsers;
  } catch (err) {
    console.error('Error seeding users:', err);
    return [];
  }
};

// Function to enroll users in courses
const enrollUsersInCourses = async (users, courses) => {
  try {
    // Find the regular user
    const regularUser = users.find(user => user.role === 'user');
    
    if (!regularUser) {
      console.error('No regular user found');
      return;
    }
    
    // Enroll the regular user in all courses
    for (const course of courses) {
      // Check if already enrolled
      const isEnrolled = regularUser.enrolledCourses.some(
        enrollment => enrollment.course.toString() === course._id.toString()
      );
      
      if (!isEnrolled) {
        // Add to enrolled courses with random progress
        regularUser.enrolledCourses.push({
          course: course._id,
          progress: Math.floor(Math.random() * 100), // Random progress
          completedLessons: [],
          startDate: new Date(),
          lastAccessDate: new Date()
        });
      }
    }
    
    await regularUser.save();
    console.log(`Enrolled user "${regularUser.name}" in ${courses.length} courses`);
    
    // Verify enrollments
    const updatedUser = await User.findById(regularUser._id).populate('enrolledCourses.course');
    console.log('Enrolled courses:', updatedUser.enrolledCourses.length);
    
    // Print details of enrolled courses
    updatedUser.enrolledCourses.forEach((enrollment, idx) => {
      console.log(`Enrollment ${idx+1}:`);
      console.log(`  Course: ${enrollment.course.title}`);
      console.log(`  Progress: ${enrollment.progress}%`);
    });
    
  } catch (err) {
    console.error('Error enrolling users in courses:', err);
  }
};

// Main function to seed the database
const seedDatabase = async () => {
  try {
    // Connect to MongoDB Atlas
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edutube', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Atlas connected successfully');
    
    // Seed categories
    const createdCategories = await seedCategories();
    
    // Seed courses
    const createdCourses = await seedCourses(createdCategories);
    
    // Seed users
    const createdUsers = await seedUsers();
    
    // Enroll users in courses
    await enrollUsersInCourses(createdUsers, createdCourses);
    
    console.log('Database seeding complete!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the seed script
seedDatabase();
