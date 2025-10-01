// Netlify function to get application settings
const mongodb = require('./utils/mongodb');
const Setting = require('./models/setting');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Connect to MongoDB
    await mongodb.connectToDatabase();
    
    // Get all settings
    const settings = await Setting.find().lean();
    
    // Convert array of settings to an object
    const settingsObject = settings.reduce((obj, setting) => {
      obj[setting.key] = setting.value;
      return obj;
    }, {});
    
    // Add default settings if not present
    const defaultSettings = {
      // Connection settings
      mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01',
      ionCredentialsPath: process.env.ION_CREDENTIALS_PATH || 'D:\\Cascade\\DATALAKESYNC\\ION_Credentials\\IONAPI_CREDENTIALS.ionapi',
      
      // Sync settings
      defaultWhseid: 'wmwhse1',
      defaultBatchSize: 1000,
      defaultMaxRecords: 10000,
      
      // Schedule settings
      enableScheduledSync: false,
      scheduleCron: '0 0 * * *', // Daily at midnight
      
      // Notification settings
      enableEmailNotifications: false,
      notificationEmail: '',
      notifyOnSuccess: false,
      notifyOnFailure: true,
    };
    
    // Merge default settings with stored settings
    const mergedSettings = { ...defaultSettings, ...settingsObject };
    
    // Disconnect from MongoDB
    await mongodb.disconnectFromDatabase();
    
    // Return success response
    return successResponse(mergedSettings);
  } catch (error) {
    console.error('Error in get-settings function:', error);
    
    // Disconnect from MongoDB
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    // Return error response
    return errorResponse(
      'Failed to get settings',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};
