// Script to check if MongoDB collections exist
const mongoose = require('mongoose');

// MongoDB connection string from environment variable or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10
};

async function checkCollections() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, options);
    console.log('Connected to MongoDB Atlas successfully');
    
    // Get the database instance
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nExisting collections in MongoDB:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Check for specific collections
    const requiredCollections = [
      'taskdetails', 
      'orders', 
      'orderdetails', 
      'receipts', 
      'receiptdetails',
      'syncconfigs',
      'syncjobs',
      'synchistories'
    ];
    
    console.log('\nChecking for required collections:');
    for (const collName of requiredCollections) {
      const exists = collections.some(col => 
        col.name.toLowerCase() === collName.toLowerCase() || 
        col.name.toLowerCase() === collName.toLowerCase().replace(/s$/, '')
      );
      console.log(`- ${collName}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    if (mongoose.connection) {
      await mongoose.disconnect();
    }
  }
}

// Run the function
checkCollections();
