// Dynamic model factory for MongoDB
const mongoose = require('mongoose');
const { generateMongoDBSchema } = require('./table-utils');

// Cache for created models to avoid recreating them
const modelCache = {};

/**
 * Get or create a Mongoose model for a table
 * @param {string} tableName - Name of the table
 * @param {Array} columns - Column definitions from job status API
 * @returns {Object} - Mongoose model
 */
function getOrCreateModel(tableName, columns) {
  // Normalize table name for MongoDB collection
  const normalizedTableName = tableName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // Check if model already exists in cache
  if (modelCache[normalizedTableName]) {
    console.log(`Using cached model for ${normalizedTableName}`);
    return modelCache[normalizedTableName];
  }
  
  try {
    // Check if model already exists in Mongoose
    if (mongoose.models[normalizedTableName]) {
      console.log(`Using existing Mongoose model for ${normalizedTableName}`);
      modelCache[normalizedTableName] = mongoose.models[normalizedTableName];
      return modelCache[normalizedTableName];
    }
    
    // Generate schema from columns
    const schemaDefinition = generateMongoDBSchema(columns);
    
    // Add metadata fields
    schemaDefinition._created_at = { 
      type: Date, 
      default: Date.now 
    };
    
    schemaDefinition._updated_at = { 
      type: Date, 
      default: Date.now 
    };
    
    schemaDefinition._source_table = { 
      type: String, 
      default: tableName 
    };
    
    // Create schema with options
    const schema = new mongoose.Schema(schemaDefinition, {
      // Allow fields not specified in schema
      strict: false,
      
      // Automatically add timestamps
      timestamps: {
        createdAt: '_created_at',
        updatedAt: '_updated_at'
      },
      
      // Use optimistic concurrency control
      
      // Collection naming strategy
      collection: normalizedTableName
    });
    
    // Add indexes for common fields
    schema.index({ _created_at: 1 });
    schema.index({ _updated_at: 1 });
    
    // Create and cache the model
    const model = mongoose.model(normalizedTableName, schema);
    modelCache[normalizedTableName] = model;
    
    console.log(`Created new model for ${normalizedTableName} with ${Object.keys(schemaDefinition).length} fields`);
    return model;
  } catch (error) {
    console.error(`Error creating model for ${normalizedTableName}:`, error);
    
    // If model creation fails, create a generic model
    const genericSchema = new mongoose.Schema({}, { 
      strict: false,
      collection: normalizedTableName
    });
    
    const genericModel = mongoose.model(`${normalizedTableName}_generic`, genericSchema);
    modelCache[normalizedTableName] = genericModel;
    
    return genericModel;
  }
}

module.exports = {
  getOrCreateModel
};
