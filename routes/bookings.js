const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Service = require('../models/Service');

// Middleware: check if logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user && req.session.user.id) return next();
  res.redirect('/auth/login');
};

// Middleware: provider check
const isProvider = (req, res, next) => {
  if (req.session.user && req.session.user.id && req.session.user.role === 'provider') return next();
  res.redirect('/auth/login');
};

// GET all bookings
router.get('/', isAuthenticated, async (req, res) => {
  try {
    let bookings;
    if (req.session.user.role === 'provider') {
      const providerServices = await Service.find({ provider: req.session.user.id }).select('_id');
      const serviceIds = providerServices.map(s => s._id);
      bookings = await Booking.find({ service: { $in: serviceIds } })
        .populate({ path: 'service', populate: { path: 'provider' } })
        .populate('user');
    } else {
      bookings = await Booking.find({ user: req.session.user.id })
        .populate({ path: 'service', populate: { path: 'provider' } })
        .populate('user');
    }
    res.render('bookings', { bookings, user: req.session.user, error: null });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.render('bookings', { bookings: [], user: req.session.user, error: 'Failed to load bookings' });
  }
});

// GET booking form (legacy, not used with popup but kept safe)
router.get('/new/:serviceId', isAuthenticated, async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) return res.redirect('/services');
    res.render('booking', { service, user: req.session.user, error: null });
  } catch (err) {
    console.error('Error fetching service:', err);
    res.redirect('/services');
  }
});

// CREATE booking
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { serviceId, date, hours } = req.body;
    if (!serviceId || !date || !hours) {
      return res.render('booking', {
        service: await Service.findById(serviceId),
        user: req.session.user,
        error: 'Service, date, and hours are required'
      });
    }
    const service = await Service.findById(serviceId);
    if (!service) return res.redirect('/services');

    const booking = new Booking({
      user: req.session.user.id,
      service: service._id,
      date: new Date(date),
      hours: Math.max(1, Math.min(parseInt(hours), 8)),
      userCompleted: false,
      providerCompleted: false
    });

    await booking.save();
    res.redirect('/bookings');
  } catch (err) {
    console.error('Error creating booking:', err);
    res.render('booking', {
      service: await Service.findById(req.body.serviceId),
      user: req.session.user,
      error: 'Failed to create booking'
    });
  }
});

// CANCEL booking (user only, before confirmed)
router.post('/:id/cancel', isAuthenticated, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('service');
    if (!booking) return res.redirect('/bookings');

    if (booking.user.toString() !== req.session.user.id) return res.redirect('/bookings');
    if (booking.status === 'confirmed' || booking.status === 'complete') return res.redirect('/bookings');

    booking.status = 'cancelled';
    await booking.save();
    res.redirect('/bookings');
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.redirect('/bookings');
  }
});

// CONFIRM booking (provider only)
router.post('/:id/confirm', isProvider, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('service');
    if (!booking) return res.redirect('/bookings');
    if (booking.service.provider.toString() !== req.session.user.id) return res.redirect('/bookings');

    booking.status = 'confirmed';
    await booking.save();
    res.redirect('/bookings');
  } catch (err) {
    console.error('Error confirming booking:', err);
    res.redirect('/bookings');
  }
});

// COMPLETE booking (requires both user & provider)
router.post('/:id/complete', isAuthenticated, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('service');
    if (!booking) return res.redirect('/bookings');

    const isUser = booking.user.toString() === req.session.user.id;
    const isProviderUser = booking.service.provider.toString() === req.session.user.id;

    if (!isUser && !isProviderUser) return res.redirect('/bookings');
    if (booking.status !== 'confirmed' && booking.status !== 'complete') return res.redirect('/bookings');

    if (isUser) booking.userCompleted = true;
    if (isProviderUser) booking.providerCompleted = true;

    if (booking.userCompleted && booking.providerCompleted) {
      booking.status = 'complete';
    } else {
      booking.status = 'confirmed'; // keep confirmed until both complete
    }

    await booking.save();
    res.redirect('/bookings');
  } catch (err) {
    console.error('Error completing booking:', err);
    res.redirect('/bookings');
  }
});

module.exports = router;
