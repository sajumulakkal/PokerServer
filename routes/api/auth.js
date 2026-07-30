const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const validateToken = require('../../middleware/auth');
const { getCurrentUser, login, setApiKey, verify } = require('../../controllers/auth');

// @route   GET api/auth
// @desc    Get user by token
router.get('/', validateToken, getCurrentUser);

// @route   POST api/auth
// @desc    Authenticate user & get token
router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  login
);

module.exports = router;