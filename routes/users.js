const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user && req.session.user.id) {
    return next();
  }
  res.redirect('/auth/login');
};
// Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/uploads');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, 'user-' + req.session.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const upload = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     const filetypes = /jpeg|jpg|png/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
//     if (extname && mimetype) {
//       return cb(null, true);
//     }
//     cb(new Error('Only .png, .jpg, and .jpeg files are allowed!'));
//   },
//   limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
// });
// Get user dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('name email contact role profilePicture');
    if (!user) {
      return res.render('dashboard', {
        user: req.session.user,
        error: 'User not found'
      });
    }
    // Update session with latest user data
    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      contact: user.contact,
      profilePicture: user.profilePicture || null
    };
    res.render('dashboard', {
      user: req.session.user,
      error: null,
      success: null
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.render('dashboard', {
      user: req.session.user,
      error: 'Failed to load profile',
      success: null
    });
  }
});
// Upload profile picture
// router.post('/dashboard/upload', isAuthenticated, async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.render('dashboard', {
//         user: req.session.user,
//         profilePicture: req.session.user.profilePicture,
//         error: 'No file uploaded',
//         success: null
//       });
//     }
//     const user = await User.findById(req.session.user.id);
//     user.profilePicture = '/uploads/' + req.file.filename;
//     await user.save();

//     // Update session
//     req.session.user.profilePicture = user.profilePicture;

//     res.render('dashboard', {
//       user: req.session.user,
//       profilePicture: user.profilePicture,
//       error: null,
//       success: 'Profile picture uploaded successfully'
//     });
//   } catch (err) {
//     console.error('Error uploading profile picture:', err);
//     res.render('dashboard', {
//       user: req.session.user,
//       profilePicture: req.session.user.profilePicture,
//       error: err.message || 'Failed to upload profile picture',
//       success: null
//     });
//   }
// });

module.exports = router;