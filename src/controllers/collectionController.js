const Order = require('../models/Order');
const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../utils/asyncHandler');
const { ORDER_STATUS } = require('../config/constants');

/**
 * Verify token, QR code, or order number before collection (Criterion A4)
 * Returns 409 if already collected
 */
const verifyToken = asyncHandler(async (req, res) => {
  const { token_number, order_id, qr_payload } = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    let order = null;
    if (token_number) order = InMemoryStore.getOrderByToken(token_number);
    else if (order_id) order = InMemoryStore.getOrderById(order_id);
    else if (qr_payload) {
      try {
        const parsed = JSON.parse(qr_payload);
        if (parsed.token) order = InMemoryStore.getOrderByToken(parsed.token);
        else if (parsed.order_id) order = InMemoryStore.getOrderById(parsed.order_id);
      } catch {}
    }

    if (!order) {
      return res.status(404).json({
        message: 'No matching order found for verification',
        details: { token_number, order_id }
      });
    }

    if (order.order_status === ORDER_STATUS.COLLECTED || order.order_status === ORDER_STATUS.COMPLETED) {
      return res.status(409).json({
        message: 'Order has already been collected.',
        details: {
          tokenNumber: order.token_number,
          orderId: order.order_id,
          status: order.order_status
        }
      });
    }

    const isReady = order.order_status === ORDER_STATUS.READY;
    return res.json({
      message: isReady
        ? `Token ${order.token_number} verified and ready for collection.`
        : `Order is currently in '${order.order_status}' status. Not ready for collection yet.`,
      can_collect: isReady,
      data: order
    });
  }

  let query = {};
  if (token_number) {
    query.token_number = token_number.trim().toUpperCase();
  } else if (order_id) {
    query.order_id = order_id.trim();
  } else if (qr_payload) {
    try {
      const parsed = JSON.parse(qr_payload);
      if (parsed.token) query.token_number = parsed.token.trim().toUpperCase();
      if (parsed.order_id) query.order_id = parsed.order_id.trim();
    } catch {
      return res.status(400).json({
        message: 'Invalid QR payload format',
        details: null
      });
    }
  }

  const order = await Order.findOne(query);
  if (!order) {
    return res.status(404).json({
      message: 'No matching order found for verification',
      details: query
    });
  }

  // Criterion A4: Second attempt returns 409 "already collected"
  if (order.order_status === ORDER_STATUS.COLLECTED || order.order_status === ORDER_STATUS.COMPLETED) {
    return res.status(409).json({
      message: 'Order has already been collected.',
      details: {
        tokenNumber: order.token_number,
        orderId: order.order_id,
        collectedTime: order.collected_time || order.updatedAt,
        status: order.order_status
      }
    });
  }

  const isReady = order.order_status === ORDER_STATUS.READY;

  return res.json({
    message: isReady
      ? `Token ${order.token_number} verified and ready for collection.`
      : `Order is currently in '${order.order_status}' status. Not ready for collection yet.`,
    can_collect: isReady,
    data: order
  });
});

/**
 * Confirm single-use collection (Criterion A4)
 * Moves the order Ready -> Collected -> Completed once.
 * A second attempt returns 409 "already collected".
 */
const confirmCollection = asyncHandler(async (req, res) => {
  const { order_id, token_number } = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    let order = null;
    if (token_number) order = InMemoryStore.getOrderByToken(token_number);
    else if (order_id) order = InMemoryStore.getOrderById(order_id);
    else if (req.params.id) order = InMemoryStore.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        details: { token_number, order_id }
      });
    }

    if (order.order_status === ORDER_STATUS.COLLECTED || order.order_status === ORDER_STATUS.COMPLETED) {
      return res.status(409).json({
        message: 'Order has already been collected.',
        details: {
          tokenNumber: order.token_number,
          collectedTime: order.collected_time
        }
      });
    }

    if (order.order_status !== ORDER_STATUS.READY) {
      return res.status(409).json({
        message: `Invalid status transition: Order cannot be collected in '${order.order_status}' status. It must be marked 'Ready' first.`,
        details: { currentStatus: order.order_status }
      });
    }

    const updatedOrder = InMemoryStore.updateOrderStatus(order._id, ORDER_STATUS.COMPLETED);
    const { getSocketIOInstance } = require('../services/notificationService');
    const io = getSocketIOInstance();
    if (io) {
      io.emit('queue_updated');
      io.emit('order_status_updated', updatedOrder);
    }

    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'ORDER_COLLECTION_COMPLETED',
      details: { token: updatedOrder.token_number, order_id: updatedOrder.order_id }
    });

    return res.json({
      message: `Token ${updatedOrder.token_number} collection confirmed. Order is Completed.`,
      data: updatedOrder
    });
  }

  const query = {};
  if (order_id) query.order_id = order_id.trim();
  else if (token_number) query.token_number = token_number.trim().toUpperCase();
  else if (req.params.id) query._id = req.params.id;

  const order = await Order.findOne(query);
  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: query
    });
  }

  // Criterion A4: Second collection attempt returns 409 "already collected"
  if (order.order_status === ORDER_STATUS.COLLECTED || order.order_status === ORDER_STATUS.COMPLETED) {
    return res.status(409).json({
      message: 'Order has already been collected.',
      details: {
        tokenNumber: order.token_number,
        collectedTime: order.collected_time
      }
    });
  }

  // Must be in Ready status before collection
  if (order.order_status !== ORDER_STATUS.READY) {
    return res.status(409).json({
      message: `Invalid status transition: Order cannot be collected in '${order.order_status}' status. It must be marked 'Ready' first.`,
      details: { currentStatus: order.order_status }
    });
  }

  const now = new Date();

  // Atomic conditional update on status === READY prevents any parallel double collection
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, order_status: ORDER_STATUS.READY },
    {
      $set: {
        order_status: ORDER_STATUS.COMPLETED,
        collected_time: now
      }
    },
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(409).json({
      message: 'Order has already been collected.',
      details: { tokenNumber: order.token_number }
    });
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'ORDER_COLLECTION_COMPLETED',
    order_id: updatedOrder.order_id,
    token_number: updatedOrder.token_number,
    details: { collectedAt: now }
  });

  return res.json({
    message: `Token ${updatedOrder.token_number} collection confirmed. Order is Completed.`,
    data: updatedOrder
  });
});

/**
 * Mark order as Not Collected
 */
const markNotCollected = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: { orderId }
    });
  }

  if (order.order_status !== ORDER_STATUS.READY) {
    return res.status(409).json({
      message: `Invalid transition: Only 'Ready' orders can be marked as 'Not Collected'. Current status is '${order.order_status}'.`,
      details: { currentStatus: order.order_status }
    });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, order_status: ORDER_STATUS.READY },
    { $set: { order_status: ORDER_STATUS.NOT_COLLECTED } },
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(409).json({
      message: 'Concurrent update detected. Could not mark order as Not Collected.',
      details: null
    });
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'ORDER_MARKED_NOT_COLLECTED',
    order_id: updatedOrder.order_id,
    token_number: updatedOrder.token_number,
    details: { reason: req.body.reason || 'Unclaimed after collection window' }
  });

  return res.json({
    message: `Order ${updatedOrder.token_number} marked as Not Collected`,
    data: updatedOrder
  });
});

module.exports = {
  verifyToken,
  confirmCollection,
  markNotCollected
};
