const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    user_name: {
      type: String
    },
    role: {
      type: String,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    order_id: {
      type: String
    },
    token_number: {
      type: String
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    ip_address: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SystemLog', systemLogSchema);
