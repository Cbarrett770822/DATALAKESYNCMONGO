/**
 * Job Status Model
 * Enhanced schema for tracking data sync jobs
 */
const mongoose = require('mongoose');

// Define the JobStatus schema
const jobStatusSchema = new mongoose.Schema({
  // Unique job identifier
  jobId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  // Job status
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'failed', 'canceled'],
    default: 'pending'
  },
  
  // Operation type
  operation: {
    type: String,
    required: true
  },
  
  // Total records to process
  totalRecords: {
    type: Number,
    default: 0
  },
  
  // Records processed so far
  processedRecords: {
    type: Number,
    default: 0
  },
  
  // Records inserted (new)
  insertedRecords: {
    type: Number,
    default: 0
  },
  
  // Records updated (existing)
  updatedRecords: {
    type: Number,
    default: 0
  },
  
  // Records with errors
  errorRecords: {
    type: Number,
    default: 0
  },
  
  // Percentage complete (0-100)
  percentComplete: {
    type: Number,
    default: 0
  },
  
  // Job start time
  startTime: {
    type: Date,
    default: Date.now
  },
  
  // Job end time
  endTime: {
    type: Date
  },
  
  // Current batch being processed
  currentBatch: {
    type: Number,
    default: 0
  },
  
  // Total batches to process
  totalBatches: {
    type: Number,
    default: 0
  },
  
  // Last batch completion time
  lastBatchTime: {
    type: Date
  },
  
  // Status message
  message: {
    type: String
  },
  
  // Error details if any
  error: {
    type: String
  },
  
  // Additional options/parameters
  options: {
    type: mongoose.Schema.Types.Mixed
  }
}, { 
  // Enable timestamps
  timestamps: true 
});

// Create a TTL index to automatically delete old job statuses after 7 days
jobStatusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Create the model
const JobStatus = mongoose.models.JobStatus || mongoose.model('JobStatus', jobStatusSchema);

module.exports = JobStatus;
