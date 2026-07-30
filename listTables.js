// list-tables.js
const mongoose = require('mongoose');
const config = require('./config');

async function listTables() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected to MongoDB for listing tables...");

    // Get the native MongoDB database instance
    const db = mongoose.connection.db;

    // List all collections in the database
    const collections = await db.listCollections().toArray();
    console.log("\n📂 Available Collections in Database:");
    collections.forEach(col => console.log(` - ${col.name}`));

    // Check if the 'tables' collection exists and list its contents
    const tablesCollection = db.collection('tables');
    const allTables = await tablesCollection.find({}).toArray();

    console.log("\n📋 Table Documents Found:");
    if (allTables.length > 0) {
      console.log(JSON.stringify(allTables, null, 2));
    } else {
      console.log("⚠️ The 'tables' collection is currently empty or does not exist.");
    }

    process.exit(0);
  } catch (err) {
    console.error("FAILED: Could not retrieve tables.", err);
    process.exit(1);
  }
}

listTables();