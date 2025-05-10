const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Admin credentials to check
const ADMIN_EMAIL = 'kishan05anand@gmail.com';
const ADMIN_PASSWORD = 'Ki@7259107113';

// Main function to check admin credentials
const checkAdminCredentials = async () => {
  try {
    // Connect to MongoDB Atlas
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edutube', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Atlas connected successfully');
    
    // Find the admin user
    console.log(`Searching for admin with email: ${ADMIN_EMAIL}`);
    const adminUser = await User.findOne({ email: ADMIN_EMAIL }).select('+password');
    
    if (!adminUser) {
      console.error('Admin user not found in the database');
      process.exit(1);
    }
    
    console.log(`Found admin user: ${adminUser.name} (${adminUser.email})`);
    console.log(`Admin user ID: ${adminUser._id}`);
    console.log(`Admin role in DB: ${adminUser.role}`);
    
    // Check if the password is properly hashed
    console.log('Checking password format...');
    if (!adminUser.password.startsWith('$2a$') && !adminUser.password.startsWith('$2b$')) {
      console.error('Password does not appear to be properly hashed with bcrypt!');
      console.log('Current password in DB:', adminUser.password);
      console.log('This is likely the cause of login failure - password needs to be hashed correctly');
    } else {
      console.log('Password is properly hashed with bcrypt');
      
      // Try to verify the password
      console.log('Attempting to verify password...');
      const isMatch = await bcrypt.compare(ADMIN_PASSWORD, adminUser.password);
      
      if (isMatch) {
        console.log('✅ Password verification SUCCESSFUL - admin should be able to log in');
      } else {
        console.error('❌ Password verification FAILED - admin password is incorrect');
        console.log('Let\'s fix this by updating the password directly...');
        
        // Generate a new hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        
        // Update the admin user's password
        adminUser.password = hashedPassword;
        await adminUser.save();
        
        console.log('Admin password has been updated with the correct hash');
        
        // Verify the password again
        const isMatchAfterUpdate = await bcrypt.compare(ADMIN_PASSWORD, adminUser.password);
        if (isMatchAfterUpdate) {
          console.log('✅ Password verification now SUCCESSFUL - admin should be able to log in');
        } else {
          console.error('❌ Password verification still FAILED - please check your User model hooks');
        }
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the check
checkAdminCredentials();
