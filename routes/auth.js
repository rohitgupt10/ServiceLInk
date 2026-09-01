const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
// Get login page
router.get('/login', (req, res) => {
  res.render('login', { user: req.session.user, error: null });
});
// Handle login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', { user: req.session.user, error: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { user: req.session.user, error: 'Invalid email or password' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { user: req.session.user, error: 'Invalid email or password' });
    }
    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      contact: user.contact
    };
    res.redirect('/');
  } catch (err) {
    console.error('Error during login:', err);
    res.render('login', { user: req.session.user, error: 'Failed to login' });
  }
});
// Get register page
router.get('/register', (req, res) => {
  res.render('register', { user: req.session.user, error: null });
});
// Handle registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, contact, password, role } = req.body;
    if (!name || !email || !contact || !password || !role) {
      return res.render('register', { user: req.session.user, error: 'All fields are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', { user: req.session.user, error: 'Email already exists' });
    }
    const user = new User({ name, email, contact, password, role });
    await user.save();
    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      contact: user.contact
    };
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error during registration:', err);
    res.render('register', { user: req.session.user, error: 'Failed to register' });
  }
});
// Handle logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
    }
    res.redirect('/auth/login');
  });
});
module.exports = router;