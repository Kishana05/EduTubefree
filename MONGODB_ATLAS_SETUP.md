# MongoDB Atlas Setup for EduTube Platform

This guide will help you set up MongoDB Atlas for storing user data in the EduTube platform.

## Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and click "Try Free"
2. Sign up with your email or use Google/GitHub authentication
3. Complete the registration process

## Step 2: Create a New Cluster

1. Click "Build a Database"
2. Choose the free tier option (M0 Sandbox)
3. Select your preferred cloud provider (AWS, Google Cloud, or Azure)
4. Choose a region close to your users for better performance
5. Click "Create Cluster" (this may take a few minutes to provision)

## Step 3: Create a Database User

1. In the left sidebar, click "Database Access" under SECURITY
2. Click "Add New Database User"
3. Create a username and password (use a strong password and save it securely)
4. Set privileges to "Read and Write to Any Database"
5. Click "Add User"

## Step 4: Allow Network Access

1. In the left sidebar, click "Network Access" under SECURITY
2. Click "Add IP Address"
3. For development, you can click "Allow Access from Anywhere" (not recommended for production)
4. For production, add specific IP addresses that need access
5. Click "Confirm"

## Step 5: Get Connection String

1. In the left sidebar, click "Database" under DEPLOYMENTS
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<username>` and `<password>` with your database user credentials
6. Add database name `edutube` to the connection string

## Step 6: Update Environment Variables

1. Create or edit your `.env` file (based on the `.env.example` template)
2. Set `MONGODB_URI` to your Atlas connection string:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/edutube?retryWrites=true&w=majority
   ```

## Step 7: Run the Application

1. The application is already configured to connect to MongoDB Atlas
2. Start your server with `npm start` in the root directory
3. The server will automatically connect to your MongoDB Atlas database

## Step 8: Seed the Database (Optional)

If you want to populate your MongoDB Atlas database with initial data:

1. Run the seed script: `node scripts/seedDB.js`
2. The script will add sample users, categories, and courses to your database

## Troubleshooting

If you encounter connection issues:

1. Verify your connection string in the `.env` file
2. Check that your IP is whitelisted in the Network Access settings
3. Confirm the database user has the correct permissions
4. Ensure your MongoDB Atlas cluster is active and running

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
