// test-insert.js
const mongoose = require('mongoose');
const config = require('./config');
const User = require('./models/User');

async function testInsert() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected for testing...");

    const testUser = new User({
      name: "Test User", // Added this missing field
      username: "test_user_" + Date.now(),
      email: "test@example.com",
      password: "temporary_password"
    });

    await testUser.save();
    console.log("SUCCESS: Data inserted into MongoDB!");
    process.exit(0);
  } catch (err) {
    console.error("FAILED: Could not insert data.", err);
    process.exit(1);
  }
}

testInsert();