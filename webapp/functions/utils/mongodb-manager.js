/**
 * Enhanced MongoDB Connection Manager
 */
const mongoose = require('mongoose');
const logger = require('./logger');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 10
};

// Cache the database connection
let cachedDb = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

/**
 * Connect to MongoDB with retry logic
 */
async function connectToDatabase() {
  // If we have a cached connection, use it
  if (cachedDb && mongoose.connection.readyState === 1) {
    logger.info('Using cached database connection');
    return cachedDb;
  }

  // Reset connection attempts if this is a new connection
  if (!cachedDb || mongoose.connection.readyState === 0) {
    connectionAttempts = 0;
  }

  while (connectionAttempts < MAX_RETRIES) {
    try {
      logger.info(`Connecting to MongoDB (attempt ${connectionAttempts + 1}/${MAX_RETRIES})`);
      
      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI, options);
      
      // Cache the database connection
      cachedDb = mongoose.connection;
      
      // Log successful connection
      logger.info('Connected to MongoDB Atlas successfully');
      
      // Handle connection errors after initial connection
      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
        cachedDb = null;
      });
      
      // Handle disconnection
      mongoose.connection.on('disconnected', () => {
        logger.info('MongoDB disconnected');
        cachedDb = null;
      });
      
      return cachedDb;
    } catch (error) {
      connectionAttempts++;
      logger.error(`Error connecting to MongoDB: ${error.message}`);
      
      if (connectionAttempts >= MAX_RETRIES) {
        logger.error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
        throw error;
      }
      
      // Wait before retrying
      const delay = 1000 * connectionAttempts;
      logger.info(`Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      cachedDb = null;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error(`Error disconnecting from MongoDB: ${error.message}`);
    }
  }
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  getConnectionStatus: () => mongoose.connection.readyState
};
