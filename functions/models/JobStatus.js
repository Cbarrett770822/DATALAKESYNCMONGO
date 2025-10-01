const mongoose = require('mongoose');

// Define the JobStatus schema
const jobStatusSchema = new mongoose.Schema({
  jobId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  operation: {
    type: String,
    required: true
  },
  totalRecords: {
    type: Number,
    default: 0
  },
  processedRecords: {
    type: Number,
    default: 0
  },
  insertedRecords: {
    type: Number,
    default: 0
  },
  updatedRecords: {
    type: Number,
    default: 0
  },
  errorRecords: {
    type: Number,
    default: 0
  },
  percentComplete: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  message: {
    type: String
  },
  error: {
    type: String
  },
  options: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Create a TTL index to automatically delete old job statuses after 7 days
jobStatusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Create the model
const JobStatus = mongoose.model('JobStatus', jobStatusSchema);

module.exports = JobStatus;
