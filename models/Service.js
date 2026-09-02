const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  contact: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  viewCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,

    
    default: true,
  },
  thumbnail: {
    type: String,
    default: "https://via.placeholder.com/400x300",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
serviceSchema.index({
  title: "text",
  description: "text",
  location: "text",
  category: "text",
});
module.exports = mongoose.model("Service", serviceSchema);
