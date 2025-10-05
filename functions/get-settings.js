// Netlify function to get application settings
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
    // Connect to MongoDB
    // MongoDB connection string from environment variable
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Check for structured settings first
    let structuredSettings = await Settings.findOne({ name: 'default' }).lean().exec();
    
    // If no structured settings exist, create default ones
    if (!structuredSettings) {
      // Default DataFabric settings
      const defaultDataFabric = {
        tenant: process.env.ION_TENANT || '',
        saak: process.env.ION_SAAK || '',
        sask: process.env.ION_SASK || '',
        clientId: process.env.ION_CLIENT_ID || '',
        clientSecret: process.env.ION_CLIENT_SECRET || '',
        apiUrl: process.env.ION_API_URL || '',
        ssoUrl: process.env.ION_SSO_URL || ''
      };
      
      // Default MongoDB settings
      const defaultMongoDB = {
        uri: process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01',
        database: 'datalake_sync',
        username: '',
        password: ''
      };
      
      structuredSettings = {
        name: 'default',
        dataFabric: defaultDataFabric,
        mongodb: defaultMongoDB,
        options: {
          batchSize: 50,
          timeout: 30000,
          retryAttempts: 3
        },
        isActive: true
      };
    }
    
    // For backward compatibility, also get the old-style settings
    const oldSettings = await Setting.find().lean();
    
    // Convert array of settings to an object
    const oldSettingsObject = oldSettings.reduce((obj, setting) => {
      obj[setting.key] = setting.value;
      return obj;
    }, {});
    
    // Add default settings if not present
    const defaultSettings = {
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
    const mergedOldSettings = { ...defaultSettings, ...oldSettingsObject };
    
    // Combine both settings types
    const combinedSettings = {
      ...mergedOldSettings,
      credentials: {
        dataFabric: structuredSettings.dataFabric,
        mongodb: structuredSettings.mongodb
      },
      options: structuredSettings.options
    };
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
    // Return success response
    return successResponse(combinedSettings);
  } catch (error) {
    console.error('Error in get-settings function:', error);
    
    // Disconnect from MongoDB
    try {
      await mongoose.disconnect();
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
