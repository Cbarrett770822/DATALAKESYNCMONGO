// Receipt Detail MongoDB Schema
const mongoose = require('mongoose');

// Define the schema based on the receipt detail data structure
const receiptDetailSchema = new mongoose.Schema({
  SERIALKEY: { type: String, required: true, index: true },
  WHSEID: { type: String, required: true, index: true },
  RECEIPTKEY: { type: String, required: true, index: true },
  RECEIPTLINENUMBER: { type: String, required: true, index: true },
  STORERKEY: { type: String, index: true },
  SKU: { type: String, index: true },
  EXTERNRECEIPTKEY: String,
  EXTERNLINENO: String,
  QTYEXPECTED: Number,
  QTYRECEIVED: Number,
  QTYREJECTED: Number,
  NOTES: String,
  STATUS: { type: String, index: true },
  STATUSDATE: Date,
  TOLOC: String,
  TOID: String,
  PACKKEY: String,
  UOM: String,
  UOMQTY: Number,
  ADDDATE: Date,
  ADDWHO: String,
  EDITDATE: Date,
  EDITWHO: String,
  // Add metadata for sync tracking
  _syncDate: { type: Date, default: Date.now },
  _syncStatus: { type: String, default: 'synced' }
}, {
  // Enable timestamps
  timestamps: true,
  // Disable version key
  versionKey: false,
  // Allow additional fields not defined in schema
  strict: false
});

// Create a compound index for efficient lookups
receiptDetailSchema.index({ WHSEID: 1, RECEIPTKEY: 1, RECEIPTLINENUMBER: 1 }, { unique: true });

// Create a model from the schema
const ReceiptDetail = mongoose.models.ReceiptDetail || mongoose.model('ReceiptDetail', receiptDetailSchema);

module.exports = ReceiptDetail;
