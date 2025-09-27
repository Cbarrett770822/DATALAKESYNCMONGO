// Setting MongoDB Schema
const mongoose = require('mongoose');

// Define the schema for settings
const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String
  }
}, {
  // Enable timestamps
  timestamps: true
});

// Create a model from the schema
const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

module.exports = Setting;
