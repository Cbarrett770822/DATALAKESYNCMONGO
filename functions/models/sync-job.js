// Sync Job MongoDB Schema
const mongoose = require('mongoose');

// Define the schema for sync jobs
const syncJobSchema = new mongoose.Schema({
  jobType: {
    type: String,
    required: true,
    enum: ['taskdetail', 'inventory', 'order', 'receipt'],
    default: 'taskdetail'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  options: {
    whseid: String,
    startDate: String,
    endDate: String,
    taskType: String,
    batchSize: Number,
    maxRecords: Number
  },
  stats: {
    totalRecords: Number,
    processedRecords: Number,
    insertedRecords: Number,
    updatedRecords: Number,
    errorRecords: Number,
    startTime: Date,
    endTime: Date,
    duration: Number
  },
  error: String,
  createdBy: String,
  updatedBy: String
}, {
  // Enable timestamps
  timestamps: true
});

// Create a model from the schema
const SyncJob = mongoose.models.SyncJob || mongoose.model('SyncJob', syncJobSchema);

module.exports = SyncJob;
