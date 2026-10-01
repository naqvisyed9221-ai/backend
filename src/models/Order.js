const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../config/constants');

const orderItemSchema = new mongoose.Schema(
  {
    order_item_id: {
      type: String,
      default: () => 'OI-' + Math.random().toString(36).substring(2, 9)
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    item_name: {
      type: String,
      required: true
    },
    category: {
      type: String
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be positive']
    },
    preparation_time: {
      type: Number,
      default: 5
    },
    special_instruction: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      unique: true,
      index: true
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customer_name: {
      type: String,
      required: true
    },
    token_number: {
      type: String,
      required: true,
      index: true
    },
    items: [orderItemSchema],
    total_amount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative']
    },
    order_time: {
      type: Date,
      default: Date.now,
      index: true
    },
    pickup_time: {
      type: Date,
      index: true
    },
    pickup_slot: {
      type: String // e.g. "13:00-13:15"
    },
    estimated_ready_time: {
      type: Date
    },
    actual_ready_time: {
      type: Date
    },
    collected_time: {
      type: Date
    },
    order_status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
      index: true
    },
    payment_status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING
    },
    cancellation_reason: {
      type: String,
      default: ''
    },
    qr_code: {
      type: String,
      default: ''
    },
    idempotency_key: {
      type: String,
      index: true,
      sparse: true
    },
    priority_score: {
      type: Number,
      default: 0,
      index: true
    },
    is_delayed: {
      type: Boolean,
      default: false
    },
    pickup_approaching_notified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Criterion A2: Database-enforced unique partial index on (customer_id, idempotency_key)
orderSchema.index(
  { customer_id: 1, idempotency_key: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotency_key: { $type: 'string', $gt: '' }
    }
  }
);

// Auto-assign order_id if not present
orderSchema.pre('save', function (next) {
  if (!this.order_id) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.order_id = `ORD-${dateStr}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
