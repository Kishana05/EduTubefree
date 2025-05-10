const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Admin credentials
const ADMIN_EMAIL = 'kishan05anand@gmail.com';
const ADMIN_PASSWORD = 'Ki@7259107113';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edutube', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected successfully');
  
  try {
    // Find the admin user directly in the MongoDB collection
    const User = mongoose.connection.collection('users');
    const adminUser = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!adminUser) {
      console.error('Admin user not found');
      return;
    }
    
    console.log(`Found admin: ${adminUser.name} (${adminUser.email})`);
    
    // Generate password hash manually (bypassing User model hooks)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    
    // Update the password directly in the database
    const result = await User.updateOne(
      { email: ADMIN_EMAIL },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Password update result:', result.modifiedCount === 1 ? 'Success' : 'Failed');
    
    // Verify the password was updated
    const updatedAdmin = await User.findOne({ email: ADMIN_EMAIL });
    
    // Try to verify the password manually
    const isMatch = await bcrypt.compare(ADMIN_PASSWORD, updatedAdmin.password);
    console.log('Password verification after direct update:', isMatch ? 'Success' : 'Failed');
    
    console.log('Admin login should now work with:');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});
