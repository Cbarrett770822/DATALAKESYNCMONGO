// Order Detail MongoDB Schema
const mongoose = require('mongoose');

// Define the schema based on the order detail data structure
const orderDetailSchema = new mongoose.Schema({
  SERIALKEY: { type: String, required: true, index: true },
  WHSEID: { type: String, required: true, index: true },
  ORDERKEY: { type: String, required: true, index: true },
  ORDERLINENUMBER: { type: String, required: true, index: true },
  STORERKEY: { type: String, index: true },
  SKU: { type: String, index: true },
  EXTERNORDERKEY: String,
  EXTERNLINENO: String,
  QTYORDERED: Number,
  QTYPICKED: Number,
  QTYSHIPPED: Number,
  STATUS: { type: String, index: true },
  OPENQTY: Number,
  ALLOCATEDQTY: Number,
  PICKEDQTY: Number,
  SHIPPEDQTY: Number,
  CARTONGROUP: String,
  PACKKEY: String,
  UOM: String,
  UOMQTY: Number,
  ADDDATE: Date,
  ADDWHO: String,
  EDITDATE: Date,
  EDITWHO: String,
  SUSR1: String,
  SUSR2: String,
  SUSR3: String,
  SUSR4: String,
  SUSR5: String,
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
orderDetailSchema.index({ WHSEID: 1, ORDERKEY: 1, ORDERLINENUMBER: 1 }, { unique: true });

// Create a model from the schema
const OrderDetail = mongoose.models.OrderDetail || mongoose.model('OrderDetail', orderDetailSchema);

module.exports = OrderDetail;
