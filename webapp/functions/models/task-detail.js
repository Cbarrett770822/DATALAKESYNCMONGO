/**
 * TaskDetail Model
 * Optimized schema for TaskDetail data
 */
const mongoose = require('mongoose');

// Define the schema based on the taskdetail data structure
const taskDetailSchema = new mongoose.Schema({
  // Primary keys
  SERIALKEY: { type: String, required: true, index: true },
  WHSEID: { type: String, required: true, index: true },
  TASKDETAILKEY: { type: String, required: true, index: true },
  
  // Common query fields (indexed)
  TASKTYPE: { type: String, index: true },
  STORERKEY: { type: String, index: true },
  SKU: { type: String, index: true },
  STATUS: { type: String, index: true },
  ORDERKEY: { type: String, index: true },
  
  // Regular fields
  LOT: String,
  UOM: String,
  UOMQTY: Number,
  QTY: Number,
  FROMLOC: String,
  LOGICALFROMLOC: String,
  FROMID: String,
  TOLOC: String,
  LOGICALTOLOC: String,
  TOID: String,
  CASEID: String,
  PICKMETHOD: String,
  STATUSMSG: String,
  PRIORITY: String,
  SOURCEPRIORITY: String,
  HOLDKEY: String,
  USERKEY: String,
  USERPOSITION: String,
  USERKEYOVERRIDE: String,
  
  // Date fields
  STARTTIME: Date,
  ENDTIME: Date,
  RELEASEDATE: Date,
  ADDDATE: Date,
  EDITDATE: Date,
  ORIGINALSTARTTIME: Date,
  ORIGINALENDTIME: Date,
  REQUESTEDSHIPDATE: Date,
  
  // Additional fields
  SOURCETYPE: String,
  SOURCEKEY: String,
  PICKDETAILKEY: String,
  ORDERLINENUMBER: String,
  LISTKEY: String,
  WAVEKEY: String,
  REASONKEY: String,
  MESSAGE01: String,
  MESSAGE02: String,
  MESSAGE03: String,
  FINALTOLOC: String,
  OPTBATCHID: String,
  OPTTASKSEQUENCE: String,
  OPTREPLENISHMENTUOM: String,
  OPTQTYLOCMINIMUM: String,
  OPTLOCATIONTYPE: String,
  OPTQTYLOCLIMIT: String,
  SEQNO: String,
  AMSTRATEGYKEY: String,
  STEPNUMBER: String,
  ADDWHO: String,
  EDITWHO: String,
  DOOR: String,
  ROUTE: String,
  STOP: String,
  PUTAWAYZONE: String,
  UASSGNNUMBER: String,
  EQUIPMENT: String,
  EQUIPMENTID: String,
  STANDARD: String,
  SUBTASK: String,
  CLUSTERKEY: String,
  TAREWGT: Number,
  NETWGT: Number,
  GROSSWGT: Number,
  ASSIGNMENTNUMBER: String,
  MAXNUMPERCLUSTERCARTON: String,
  PAID: String,
  BILLABLE: String,
  OWNERBILLTO: String,
  CHARGECODE: String,
  ACTUALTOLOC: String,
  ESTLABORSTD: String,
  ORIGINALPAID: String,
  PAYROLLCANCELED: String,
  COMMENTS: String,
  POSITION: String,
  PICKCONTPLACEMENT: String,
  RUNSEQUENCE: String,
  
  // Extended fields (UDF)
  EXT_UDF_STR1: String,
  EXT_UDF_STR2: String,
  EXT_UDF_STR3: String,
  EXT_UDF_STR4: String,
  EXT_UDF_STR5: String,
  EXT_UDF_STR6: String,
  EXT_UDF_STR7: String,
  EXT_UDF_STR8: String,
  EXT_UDF_STR9: String,
  EXT_UDF_STR10: String,
  
  // Sync metadata
  _syncDate: { type: Date, default: Date.now, index: true },
  _syncStatus: { type: String, default: 'synced', index: true },
  _syncBatch: { type: Number },
  _syncJobId: { type: String, index: true }
}, {
  // Enable timestamps
  timestamps: true,
  // Disable version key
  versionKey: false
});

// Create a compound unique index for efficient lookups and upserts
taskDetailSchema.index({ WHSEID: 1, TASKDETAILKEY: 1 }, { unique: true });

// Create a model from the schema
const TaskDetail = mongoose.models.TaskDetail || mongoose.model('TaskDetail', taskDetailSchema);

module.exports = TaskDetail;
