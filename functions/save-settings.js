// Netlify function to save application settings
const mongoose = require('mongoose');
const Setting = require('./models/setting'); // Keep for backward compatibility
const Settings = require('./models/settings'); // New structured settings model
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Parse the request body
    const requestData = JSON.parse(event.body);
    
    // Connect to MongoDB
    // MongoDB connection string from environment variable
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Handle structured credentials settings
    if (requestData.credentials) {
      // Find existing settings or create new ones
      let structuredSettings = await Settings.findOne({ name: 'default' });
      
      if (!structuredSettings) {
        structuredSettings = new Settings({
          name: 'default',
          dataFabric: {},
          mongodb: {},
          options: {}
        });
      }
      
      // Update DataFabric credentials if provided
      if (requestData.credentials.dataFabric) {
        structuredSettings.dataFabric = {
          ...structuredSettings.dataFabric,
          ...requestData.credentials.dataFabric
        };
      }
      
      // Update MongoDB credentials if provided
      if (requestData.credentials.mongodb) {
        structuredSettings.mongodb = {
          ...structuredSettings.mongodb,
          ...requestData.credentials.mongodb
        };
      }
      
      // Update options if provided
      if (requestData.options) {
        structuredSettings.options = {
          ...structuredSettings.options,
          ...requestData.options
        };
      }
      
      // Save the structured settings
      await structuredSettings.save();
      
      console.log('Saved structured settings');
    }
    
    // Handle legacy settings (for backward compatibility)
    const legacySettings = { ...requestData };
    delete legacySettings.credentials;
    delete legacySettings.options;
    
    if (Object.keys(legacySettings).length > 0) {
      // Create bulk operations for upsert
      const operations = Object.entries(legacySettings).map(([key, value]) => ({
        updateOne: {
          filter: { key },
          update: { $set: { key, value } },
          upsert: true
        }
      }));
      
      // Execute bulk operations
      if (operations.length > 0) {
        await Setting.bulkWrite(operations);
        console.log(`Saved ${operations.length} legacy settings`);
      }
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
    // Return success response
    return successResponse({
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error in save-settings function:', error);
    
    // Disconnect from MongoDB
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    // Return error response
    return errorResponse(
      'Failed to save settings',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};
