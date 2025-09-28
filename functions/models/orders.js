// Orders MongoDB Schema
const mongoose = require('mongoose');

// Define the schema based on the orders data structure
const ordersSchema = new mongoose.Schema({
  SERIALKEY: { type: String, required: true, index: true },
  WHSEID: { type: String, required: true, index: true },
  ORDERKEY: { type: String, required: true, index: true },
  STORERKEY: { type: String, index: true },
  EXTERNORDERKEY: String,
  TYPE: String,
  SUSR1: String,
  SUSR2: String,
  SUSR3: String,
  SUSR4: String,
  SUSR5: String,
  CONSIGNEEKEY: String,
  ORDERDATE: Date,
  DELIVERYDATE: Date,
  PRIORITY: String,
  STATUS: { type: String, index: true },
  NOTES: String,
  CARRIERCODE: String,
  CARRIERNAME: String,
  CARRIERADDRESS1: String,
  CARRIERADDRESS2: String,
  CARRIERADDRESS3: String,
  CARRIERCITY: String,
  CARRIERSTATE: String,
  CARRIERZIP: String,
  CARRIERPHONE: String,
  CARRIERCONTACT: String,
  BILLINGADDRESS1: String,
  BILLINGADDRESS2: String,
  BILLINGADDRESS3: String,
  BILLINGCITY: String,
  BILLINGSTATE: String,
  BILLINGZIP: String,
  BILLINGPHONE: String,
  BILLINGCONTACT: String,
  CONSIGNEEADDRESS1: String,
  CONSIGNEEADDRESS2: String,
  CONSIGNEEADDRESS3: String,
  CONSIGNEECITY: String,
  CONSIGNEESTATE: String,
  CONSIGNEEZIP: String,
  CONSIGNEEPHONE: String,
  CONSIGNEECONTACT: String,
  DOOR: String,
  ROUTE: String,
  STOP: String,
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
ordersSchema.index({ WHSEID: 1, ORDERKEY: 1 }, { unique: true });

// Create a model from the schema
const Orders = mongoose.models.Orders || mongoose.model('Orders', ordersSchema);

module.exports = Orders;
