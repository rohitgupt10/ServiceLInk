const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const bookingRoutes = require('./routes/bookings');
const usersRoutes = require('./routes/users');
const ejsLayouts = require('express-ejs-layouts');
const Service = require('./models/Service'); 

dotenv.config();
const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/main.ejs');

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

// Middleware to fetch categories and make them available to all views
app.use(async (req, res, next) => {
    try {
      // Fetch distinct categories from the Service collection
      const categories = await Service.distinct('category');
      // Make categories available in res.locals so all EJS templates can access it
      res.locals.navCategories = categories;
      next();
    } catch (err) {
      console.error('Error fetching categories for navigation:', err);
      res.locals.navCategories = []; // Set to empty array on error
      next();
    }
  });

// Routes
app.use('/auth', authRoutes);
app.use('/services', serviceRoutes);
app.use('/bookings', bookingRoutes);
app.use('/', usersRoutes);


app.get('/', async (req, res) => {
  try {
    // Fetch top 3 services sorted by averageRating descending for recommendations
    const featuredServices = await Service.find()
      .sort({ averageRating: -1 })
      .limit(3)
      .populate('provider');
    res.render('index', { user: req.session.user, featuredServices });
  } catch (err) {
    console.error('Error fetching featured services:', err);
    res.render('index', { user: req.session.user, featuredServices: [] });
  }
});
// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));