const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
  try {
    // Simply pass the URI without the extra options object
    const db = await mongoose.connect(config.MONGO_URI);
    
    console.log('Successfully connected to MongoDB!');
    return db;
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(-1);
  }
};

module.exports = connectDB;