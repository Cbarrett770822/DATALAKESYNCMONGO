// Sync Configuration MongoDB Schema
const mongoose = require('mongoose');

// Define the schema for sync configurations
const syncConfigSchema = new mongoose.Schema({
  tableId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    enum: ['taskdetail', 'receipt', 'receiptdetail', 'orders', 'orderdetail']
  },
  tableName: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  enabled: {
    type: Boolean,
    default: false
  },
  syncFrequency: {
    type: Number, // in minutes
    default: 60
  },
  initialSync: {
    type: Boolean,
    default: true
  },
  batchSize: {
    type: Number,
    default: 1000
  },
  maxRecords: {
    type: Number,
    default: 10000
  },
  lastSyncDate: {
    type: Date
  },
  lastSyncStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
  },
  lastSyncJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SyncJob'
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
const SyncConfig = mongoose.models.SyncConfig || mongoose.model('SyncConfig', syncConfigSchema);

module.exports = SyncConfig;
