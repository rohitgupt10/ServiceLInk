const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
// Middleware to check if user is authenticated and a provider
const isProvider = (req, res, next) => {
  if (req.session.user && req.session.user.id && req.session.user.role === 'provider') {
    return next();
  }
  res.redirect('/auth/login');
};
// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user && req.session.user.id) {
    return next();
  }
  res.redirect('/auth/login');
};
// Get all services with search and category functionality
router.get('/', async (req, res) => {
    try {
      const query = req.query.q || '';
      const category = req.query.category || '';

      let searchCriteria = {};
      if (query) {
        searchCriteria.$or = [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } }
        ];
      }
      if (category) {
        searchCriteria.category = category;
      }
  
      let services;
      if (req.session.user && req.session.user.role === 'provider') {
        services = await Service.find({
          ...searchCriteria,
          provider: req.session.user.id
        })
          .sort({ averageRating: -1 })
          .populate('provider');
      } else {
        services = await Service.find(searchCriteria)
          .sort({ averageRating: -1 })
          .populate('provider');
      }
  
      const categories = await Service.distinct('category');
  
      res.render('services', { services, user: req.session.user, error: null, query, categories, selectedCategory: category });
    } catch (err) {
      console.error('Error fetching services:', err);
      res.render('services', { services: [], user: req.session.user, error: 'Failed to load services', query: '', categories: [], selectedCategory: '' });
    }
  });

// Get add service form
router.get('/add', isProvider, async (req, res) => {
  try {
    const categories = [
        'Cleaning', 'Handyman', 'Mounting', 'Moving', 'Gardening', 
        'Furniture Assembly', 'Personal Assistant', 'Event Staffing', 
        'Pet Care', 'Tutoring', 'Tech Support', 'Beauty & Wellness', 'Delivery'
      ];
    res.render('addservice', { user: req.session.user, error: null, categories });
  } catch (err) {
    console.error('Error rendering add service form:', err);
    res.render('addservice', { user: req.session.user, error: 'Failed to load form', categories: [] });
  }
});

// Get service details with reviews
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('provider');
    if (!service || !service.provider) {
      return res.redirect('/services');
    }
    const reviews = await Review.find({ service: req.params.id })
      .populate('user')
      .sort({ createdAt: -1 });
    res.render('service', { service, reviews, user: req.session.user });
  } catch (err) {
    console.error('Error fetching service:', err);
    res.redirect('/services');
  }
});

// Post a review
router.post('/:id/reviews', isAuthenticated, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const service = await Service.findById(req.params.id).populate('provider');
    if (!service || !service.provider) {
      return res.redirect('/services');
    }
    const review = new Review({
      user: req.session.user.id,
      provider: service.provider._id,
      service: service._id,
      rating,
      comment
    });

    await review.save();

    // Update service average rating
    const reviews = await Review.find({ service: service._id });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0;
    service.averageRating = avgRating;
    await service.save();

    res.redirect(`/services/${req.params.id}`);
  } catch (err) {
    console.error('Error posting review:', err);
    res.redirect(`/services/${req.params.id}`);
  }
});

// Add a new service
router.post('/', isProvider, async (req, res) => {
    const categories = [
        'Cleaning', 'Handyman', 'Mounting', 'Moving', 'Gardening', 
        'Furniture Assembly', 'Personal Assistant', 'Event Staffing', 
        'Pet Care', 'Tutoring', 'Tech Support', 'Beauty & Wellness', 'Delivery'
    ];
  try {
    const { title, description, price, location, contact, category } = req.body;

    // Validate inputs
    if (!title || !description || !price || !location || !contact || !category) {
      return res.render('addservice', {
        user: req.session.user,
        error: 'All fields are required',
        categories
      });
    }
    const service = new Service({
      title,
      description,
      price: parseFloat(price),
      location,
      contact,
      category,
      provider: req.session.user.id
    });
    await service.save();

    res.redirect('/services');
  } catch (err) {
    console.error('Error adding service:', err);
    res.render('addservice', {
      user: req.session.user,
      error: 'Failed to add service',
      categories
    });
  }
});
// Delete a service
router.post('/:id/delete', isProvider, async (req, res) => {
  try {
    console.log(`Received POST request to /services/${req.params.id}/delete`);
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.render('services', {
        services: await Service.find({ provider: req.session.user.id }).populate('provider'),
        user: req.session.user,
        error: 'Service not found'
      });
    }
    // Ensure only the provider can delete their own service
    if (service.provider.toString() !== req.session.user.id) {
      return res.render('services', {
        services: await Service.find({ provider: req.session.user.id }).populate('provider'),
        user: req.session.user,
        error: 'Unauthorized to delete this service'
      });
    }
    // Delete associated bookings and reviews
    await Booking.deleteMany({ service: service._id });
    await Review.deleteMany({ service: service._id });

    // Delete the service
    await Service.deleteOne({ _id: service._id });

    res.redirect('/services');
  } catch (err) {
    console.error('Error deleting service:', err);
    res.render('services', {
      services: await Service.find({ provider: req.session.user.id }).populate('provider'),
      user: req.session.user,
      error: 'Failed to delete service'
    });
  }
});
module.exports = router;