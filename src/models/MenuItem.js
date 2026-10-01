const mongoose = require('mongoose');
const { MENU_ITEM_STATUS } = require('../config/constants');

const menuItemSchema = new mongoose.Schema(
  {
    item_id: {
      type: String,
      unique: true,
      index: true
    },
    item_name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be positive']
    },
    available_quantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      default: 0,
      min: [0, 'Available quantity cannot be negative']
    },
    preparation_time: {
      type: Number,
      required: [true, 'Preparation time is required (in minutes)'],
      default: 5,
      min: [1, 'Preparation time must be at least 1 minute']
    },
    status: {
      type: String,
      enum: Object.values(MENU_ITEM_STATUS),
      default: MENU_ITEM_STATUS.AVAILABLE
    },
    image: {
      type: String,
      default: ''
    },
    total_orders_count: {
      type: Number,
      default: 0
    },
    total_quantity_sold: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Auto-generate item_id if not provided
menuItemSchema.pre('save', function () {
  if (!this.item_id) {
    this.item_id = 'ITEM-' + Math.floor(1000 + Math.random() * 9000);
  }

  // Automatic stock status enforcement (Requirement Page 5)
  if (this.available_quantity <= 0) {
    this.status = MENU_ITEM_STATUS.SOLD_OUT;
  } else if (this.available_quantity <= 5 && this.status !== MENU_ITEM_STATUS.TEMPORARILY_UNAVAILABLE) {
    this.status = MENU_ITEM_STATUS.LIMITED;
  } else if (this.status === MENU_ITEM_STATUS.SOLD_OUT && this.available_quantity > 0) {
    this.status = MENU_ITEM_STATUS.AVAILABLE;
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
