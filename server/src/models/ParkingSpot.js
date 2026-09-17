const mongoose = require('mongoose');

const parkingSpotSchema = new mongoose.Schema(
  {
    spotNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    level: {
      type: Number,
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: ['Compact', 'Standard', 'EV'],
      index: true
    },
    isOccupied: {
      type: Boolean,
      default: false,
      index: true
    },
    currentTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ParkingSpot', parkingSpotSchema);
