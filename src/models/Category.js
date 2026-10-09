const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    icon: {
      type: String,
      default: 'restaurant'
    },
    image: {
      type: String,
      default: ''
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Category', categorySchema);
