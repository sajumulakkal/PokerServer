const express = require('express');
const router = express.Router();
const User = require('../../models/User'); // Uses your existing User model

// POST /api/players
router.post('/', async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: 'Name and address are required' });
    }

    // Check if user already exists by address or name
    let user = await User.findOne({ $or: [{ address }, { name }] });

    if (user) {
      user.name = name;
      user.address = address;
      await user.save();
      return res.status(200).json({ message: 'Player updated successfully', user });
    }

    // Generate safe, unique dummy email/password to satisfy Mongoose schema and unique constraints
    const cleanAddress = address.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dummyEmail = `${cleanAddress}_${Date.now()}@local.test`;
    const dummyPassword = 'local_dummy_password_123';

    // Create new user record fulfilling schema constraints
    user = new User({
      name,
      address,
      email: dummyEmail,
      password: dummyPassword
    });

    await user.save();

    res.status(201).json({ message: 'Player saved successfully', user });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ message: error.message || 'Server error saving player' });
  }
});

module.exports = router;