const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: "Please log in first" });
  }
}

// Get all notifications for user
router.get("/all", isLoggedIn, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.session.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      user: req.session.userId,
      read: false,
    });

    res.json({ notifications, unreadCount, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching notifications", success: false });
  }
});

// Get unread notifications
router.get("/unread", isLoggedIn, async (req, res) => {
  try {
    const unreadNotifications = await Notification.find({
      user: req.session.userId,
      read: false,
    }).sort({ createdAt: -1 });

    res.json({ notifications: unreadNotifications, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching unread notifications", success: false });
  }
});

// Mark notification as read
router.put("/:notificationId/read", isLoggedIn, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.notificationId, {
      read: true,
    });
    res.json({ message: "Notification marked as read", success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating notification", success: false });
  }
});

// Mark all notifications as read
router.put("/mark-all-read", isLoggedIn, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.session.userId, read: false },
      { read: true },
    );
    res.json({ message: "All notifications marked as read", success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating notifications", success: false });
  }
});

// Delete notification
router.delete("/:notificationId", isLoggedIn, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.notificationId);
    res.json({ message: "Notification deleted", success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting notification", success: false });
  }
});

// Create notification (for internal use)
router.post("/create", async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.json({ notification, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating notification", success: false });
  }
});

module.exports = router;
