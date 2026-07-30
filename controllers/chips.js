const { INITIAL_CHIPS_AMOUNT } = require('../config');
const User = require('../models/User');

// @route   POST api/chips/free
// @desc    Add free chips if user has none
// @access  Private
exports.handleFreeChipsRequest = async (req, res) => {
  try {
    // We use findOneAndUpdate to perform an atomic operation.
    // This ensures that even if two requests come in at the exact same millisecond,
    // the logic is handled safely by MongoDB.
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, chipsAmount: { $lte: 0 } }, // Only update if chips are 0 or less
      { $inc: { chipsAmount: INITIAL_CHIPS_AMOUNT } }, // Atomically increment the chips
      { new: true } // Return the updated user object
    ).select('-password');

    if (!user) {
      // If no user was found, it means they either don't exist 
      // or they already had chips (> 0).
      return res.status(400).json({ 
        errors: [{ msg: 'Invalid request: You already have chips or account not found.' }] 
      });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error('Error in handleFreeChipsRequest:', err.message);
    return res.status(500).send('Internal server error');
  }
};