// test-read.js
const mongoose = require('mongoose');
const config = require('./config');
const User = require('./models/User');

async function testRead() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected for reading...");

    // Find the user we just inserted (or any user)
    const user = await User.findOne({ email: "test@example.com" });

    if (user) {
      console.log("SUCCESS: Data retrieved from MongoDB!");
      console.log("User details:", {
        name: user.name,
        username: user.username,
        email: user.email,
        createdAt: user._id.getTimestamp() // MongoDB IDs contain the timestamp
      });
    } else {
      console.log("No user found with that email.");
    }

    process.exit(0);
  } catch (err) {
    console.error("FAILED: Could not read data.", err);
    process.exit(1);
  }
}

testRead();