const mongoose = require('mongoose');

const transferLogSchema = new mongoose.Schema(
  {
    fromPlate: { type: String, required: true },
    toPlate: { type: String, required: true },
    transferredAt: { type: Date, default: Date.now },
    notes: { type: String, default: 'Valet hand-off' }
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    licensePlate: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ['Compact', 'Standard', 'EV']
    },
    spotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpot',
      required: true
    },
    spotNumber: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      required: true
    },
    entryTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    exitTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
      index: true
    },
    durationHours: {
      type: Number,
      default: null
    },
    actualDuration: {
      type: String,
      default: null
    },
    totalFee: {
      type: Number,
      default: null
    },
    feeBreakdown: {
      firstHourFee: Number,
      additionalHoursFee: Number,
      dailyCapApplied: Boolean,
      billedHours: Number,
      actualDurationFormatted: String,
      rateSnapshot: {
        firstHourRate: Number,
        additionalHourRate: Number,
        dailyCap: Number
      }
    },
    // Automation fields (Level 2)
    autoClosed: {
      type: Boolean,
      default: false
    },
    autoCloseReason: {
      type: String,
      default: null
    },
    // Valet hand-off transfer history (Level 3)
    transferHistory: [transferLogSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Ticket', ticketSchema);
