const express = require("express");
const router = express.Router();
const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: "Please log in first" });
  }
}

// Create a dispute
router.post("/create", isLoggedIn, async (req, res) => {
  try {
    const { bookingId, title, description } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ message: "Booking not found", success: false });
    }

    const dispute = new Dispute({
      booking: bookingId,
      initiatedBy: req.session.userId,
      title,
      description,
    });

    await dispute.save();

    // Create notification for provider
    const Service = require("../models/Service");
    const service = await Service.findById(booking.service);

    await Notification.create({
      user: service.provider,
      type: "message",
      title: "Dispute Raised",
      message: `A dispute has been raised for booking: ${title}`,
      relatedBooking: bookingId,
    });

    res.json({
      message: "Dispute created successfully",
      dispute,
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating dispute", success: false });
  }
});

// Get disputes for user
router.get("/my-disputes", isLoggedIn, async (req, res) => {
  try {
    const disputes = await Dispute.find({ initiatedBy: req.session.userId })
      .populate("booking")
      .sort({ createdAt: -1 });

    res.json({ disputes, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching disputes", success: false });
  }
});

// Get disputes for provider (disputes they're involved in)
router.get("/provider-disputes", isLoggedIn, async (req, res) => {
  try {
    const Service = require("../models/Service");

    // Get all services by this provider
    const services = await Service.find({
      provider: req.session.userId,
    }).select("_id");
    const serviceIds = services.map((s) => s._id);

    // Find bookings for these services
    const bookings = await Booking.find({
      service: { $in: serviceIds },
    }).select("_id");
    const bookingIds = bookings.map((b) => b._id);

    // Find disputes related to these bookings
    const disputes = await Dispute.find({ booking: { $in: bookingIds } })
      .populate("booking")
      .populate("initiatedBy", "name email contact")
      .sort({ createdAt: -1 });

    res.json({ disputes, success: true });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error fetching disputes", success: false });
  }
});

// Resolve dispute
router.put("/:disputeId/resolve", isLoggedIn, async (req, res) => {
  try {
    const { resolution, resolutionDetails } = req.body;

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.disputeId,
      {
        status: "resolved",
        resolution,
        resolutionDetails,
        resolvedAt: new Date(),
      },
      { new: true },
    );

    // Create notification
    await Notification.create({
      user: dispute.initiatedBy,
      type: "message",
      title: "Dispute Resolved",
      message: `Your dispute has been resolved: ${resolutionDetails}`,
      relatedBooking: dispute.booking,
    });

    res.json({ message: "Dispute resolved", dispute, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error resolving dispute", success: false });
  }
});

// Close dispute
router.put("/:disputeId/close", isLoggedIn, async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(
      req.params.disputeId,
      { status: "closed" },
      { new: true },
    );

    res.json({ message: "Dispute closed", dispute, success: true });
  } catch (err) {
    res.status(500).json({ message: "Error closing dispute", success: false });
  }
});

module.exports = router;
