const mongoose = require('mongoose');

// Define schema for API credentials
const settingsSchema = new mongoose.Schema({
  // Settings identifier (e.g., 'default', 'production', 'development')
  name: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },
  
  // DataFabric API credentials
  dataFabric: {
    tenant: String,
    saak: String,
    sask: String,
    clientId: String,
    clientSecret: String,
    apiUrl: String,
    ssoUrl: String
  },
  
  // MongoDB Atlas credentials
  mongodb: {
    uri: String,
    database: String,
    username: String,
    password: String
  },
  
  // Additional settings
  options: {
    batchSize: {
      type: Number,
      default: 50
    },
    timeout: {
      type: Number,
      default: 30000
    },
    retryAttempts: {
      type: Number,
      default: 3
    }
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the 'updatedAt' field on save
settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create model
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
