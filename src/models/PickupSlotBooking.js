const mongoose = require('mongoose');

const pickupSlotBookingSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    slot: {
      type: String, // e.g. "13:00-13:15"
      required: true,
      index: true
    },
    booked_count: {
      type: Number,
      default: 0,
      min: [0, 'Booked count cannot be negative']
    },
    max_capacity: {
      type: Number,
      default: 20
    }
  },
  {
    timestamps: true
  }
);

pickupSlotBookingSchema.index({ date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('PickupSlotBooking', pickupSlotBookingSchema);
