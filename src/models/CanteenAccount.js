const mongoose = require('mongoose');

const canteenAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Canteen name is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    opening_time: {
      type: String,
      default: '08:00'
    },
    closing_time: {
      type: String,
      default: '20:00'
    },
    is_active: {
      type: Boolean,
      default: true
    },
    contact_number: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CanteenAccount', canteenAccountSchema);
