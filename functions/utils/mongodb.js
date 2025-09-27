// MongoDB connection utility
const mongoose = require('mongoose');

// MongoDB connection string from environment variable or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10
};

// Cache the database connection
let cachedDb = null;

/**
 * Connect to MongoDB
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
async function connectToDatabase() {
  // If we have a cached connection, use it
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedDb;
  }

  // Otherwise, create a new connection
  console.log('Creating new database connection');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, options);
    
    // Cache the database connection
    cachedDb = mongoose.connection;
    
    // Log successful connection
    console.log('Connected to MongoDB Atlas');
    
    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cachedDb = null;
    });
    
    // Handle disconnection
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      cachedDb = null;
    });
    
    return cachedDb;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectFromDatabase() {
  if (cachedDb) {
    await mongoose.disconnect();
    cachedDb = null;
    console.log('Disconnected from MongoDB');
  }
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase
};
