const mongoose = require('mongoose');

const dailyCounterSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('DailyCounter', dailyCounterSchema);
