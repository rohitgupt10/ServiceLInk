const express = require("express");
const router = express.Router();
const Favorite = require("../models/Favorite");
const Service = require("../models/Service");

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: "Please log in first" });
  }
}

// Add to favorites
router.post("/add", isLoggedIn, async (req, res) => {
  try {
    const { serviceId } = req.body;

    const favorite = new Favorite({
      user: req.session.userId,
      service: serviceId,
    });

    await favorite.save();
    res.json({ message: "Added to favorites", success: true });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: "Already in favorites", success: false });
    } else {
      res
        .status(500)
        .json({ message: "Error adding to favorites", success: false });
    }
  }
});

// Remove from favorites
router.post("/remove", isLoggedIn, async (req, res) => {
  try {
    const { serviceId } = req.body;

    await Favorite.findOneAndDelete({
      user: req.session.userId,
      service: serviceId,
    });

    res.json({ message: "Removed from favorites", success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error removing from favorites", success: false });
  }
});

// Get user's favorite services
router.get("/my-favorites", isLoggedIn, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.session.userId })
      .populate({
        path: "service",
        populate: { path: "provider", select: "name avatar averageRating" },
      })
      .sort({ createdAt: -1 });

    res.json({ favorites, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching favorites", success: false });
  }
});

// Check if service is favorited
router.get("/is-favorited/:serviceId", isLoggedIn, async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      user: req.session.userId,
      service: req.params.serviceId,
    });

    res.json({ isFavorited: !!favorite });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error checking favorite status", success: false });
  }
});

module.exports = router;
