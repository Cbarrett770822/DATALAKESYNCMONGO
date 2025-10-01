// Sync History MongoDB Schema
const mongoose = require('mongoose');

// Define the schema for sync history
const syncHistorySchema = new mongoose.Schema({
  tableId: {
    type: String,
    required: true,
    index: true,
    enum: ['taskdetail', 'receipt', 'receiptdetail', 'orders', 'orderdetail']
  },
  tableName: {
    type: String,
    required: true
  },
  syncJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SyncJob',
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  recordsProcessed: {
    type: Number,
    default: 0
  },
  recordsInserted: {
    type: Number,
    default: 0
  },
  recordsUpdated: {
    type: Number,
    default: 0
  },
  recordsError: {
    type: Number,
    default: 0
  },
  error: {
    type: String
  },
  options: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  // Enable timestamps
  timestamps: true
});

// Create a model from the schema
const SyncHistory = mongoose.models.SyncHistory || mongoose.model('SyncHistory', syncHistorySchema);

module.exports = SyncHistory;
