const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Favorite = require("../models/Favorite");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
}

// Get user profile
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");

    if (!user) {
      return res
        .status(404)
        .render("profile", { error: "User not found", user: null });
    }

    let isSelfProfile =
      req.session.userId && req.session.userId === req.params.userId;
    let reviews = [];
    let completedBookings = 0;

    if (user.role === "provider") {
      reviews = await Review.find({ provider: req.params.userId })
        .populate("user", "name avatar")
        .sort({ createdAt: -1 })
        .limit(10);

      completedBookings = await Booking.countDocuments({
        service: {
          $in: await require("../models/Service")
            .find({ provider: req.params.userId })
            .select("_id"),
        },
        status: "complete",
      });
    }

    res.render("profile", {
      profile: user,
      reviews,
      completedBookings,
      isSelfProfile,
      error: null,
      user: req.session.userId ? { id: req.session.userId } : null,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .render("profile", { error: "Error loading profile", user: null });
  }
});

// Update profile (for logged-in user)
router.post("/update", isLoggedIn, async (req, res) => {
  try {
    const { name, contact, bio, avatar } = req.body;

    await User.findByIdAndUpdate(req.session.userId, {
      name,
      contact,
      bio,
      avatar: avatar || "https://via.placeholder.com/150",
    });

    res.json({ message: "Profile updated successfully", success: true });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile", success: false });
  }
});

// Get provider dashboard
router.get("/dashboard/provider", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (user.role !== "provider") {
      return res
        .status(403)
        .json({ message: "Not authorized", success: false });
    }

    const Service = require("../models/Service");
    const services = await Service.find({ provider: req.session.userId });

    const totalBookings = await Booking.countDocuments({
      service: { $in: services.map((s) => s._id) },
    });

    const completedBookings = await Booking.countDocuments({
      service: { $in: services.map((s) => s._id) },
      status: "complete",
    });

    const totalReviews = await Review.countDocuments({
      provider: req.session.userId,
    });

    const averageRating = user.averageRating;

    res.json({
      dashboard: {
        totalServices: services.length,
        totalBookings,
        completedBookings,
        totalReviews,
        averageRating,
        totalEarnings: user.totalEarnings,
        completionRate:
          totalBookings > 0
            ? ((completedBookings / totalBookings) * 100).toFixed(2)
            : 0,
      },
      success: true,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error loading dashboard", success: false });
  }
});

// Get user's booking history
router.get("/bookings/history", isLoggedIn, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.session.userId })
      .populate("service", "title price thumbnail")
      .populate("user", "name")
      .sort({ date: -1 });

    res.json({ bookings, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching booking history", success: false });
  }
});

module.exports = router;
