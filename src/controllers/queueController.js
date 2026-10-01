const Order = require('../models/Order');
const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../utils/asyncHandler');
const { getLiveKitchenQueue } = require('../services/queueService');
const {
  notifyOrderAccepted,
  notifyOrderPreparing,
  notifyOrderDelayed,
  notifyOrderReady
} = require('../services/notificationService');
const { ORDER_STATUS, STATUS_TRANSITIONS } = require('../config/constants');

/**
 * Get live kitchen queue (Criterion A7)
 */
const getKitchenQueue = asyncHandler(async (req, res) => {
  const queueData = await getLiveKitchenQueue();
  return res.json({
    message: 'Live kitchen queue retrieved',
    data: queueData
  });
});

/**
 * Update order preparation status (Criterion A3: Strict status state machine)
 * Transition map:
 * - Placed -> Accepted, Rejected, Cancelled
 * - Accepted -> Preparing, Cancelled, Delayed
 * - Preparing -> Ready, Delayed
 * - Delayed -> Preparing, Ready
 * - Ready -> Collected, Not Collected
 * - Collected -> Completed
 * Invalid jumps return 409. Updates filter on old status so double-clicks cannot apply twice.
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, delay_reason } = req.body;
  const orderId = req.params.id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const order = InMemoryStore.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        details: { orderId }
      });
    }

    const currentStatus = order.order_status;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return res.status(409).json({
        message: `Invalid status transition from '${currentStatus}' to '${status}'.`,
        details: {
          currentStatus,
          requestedStatus: status,
          allowedTransitions
        }
      });
    }

    const updatedOrder = InMemoryStore.updateOrderStatus(orderId, status, delay_reason || '');
    if (status === ORDER_STATUS.READY) await notifyOrderReady(updatedOrder);
    else if (status === ORDER_STATUS.PREPARING) await notifyOrderPreparing(updatedOrder);
    else if (status === ORDER_STATUS.ACCEPTED) await notifyOrderAccepted(updatedOrder);
    else if (status === ORDER_STATUS.DELAYED) await notifyOrderDelayed(updatedOrder, delay_reason || 'Kitchen bottleneck');

    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'ORDER_STATUS_TRANSITION',
      details: { order_id: updatedOrder.order_id, from: currentStatus, to: status }
    });

    const { getSocketIOInstance } = require('../services/notificationService');
    const io = getSocketIOInstance();
    if (io) {
      io.emit('queue_updated');
      io.emit('order_status_updated', updatedOrder);
    }

    return res.json({
      message: `Order ${updatedOrder.token_number} transitioned to '${status}' successfully`,
      data: updatedOrder
    });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: { orderId }
    });
  }

  const currentStatus = order.order_status;
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  // Criterion A3: State machine transition check
  if (!allowedTransitions.includes(status)) {
    return res.status(409).json({
      message: `Invalid status transition from '${currentStatus}' to '${status}'.`,
      details: {
        currentStatus,
        requestedStatus: status,
        allowedTransitions
      }
    });
  }

  // Build update fields based on target status
  const updateFields = {
    order_status: status
  };

  if (status === ORDER_STATUS.READY) {
    updateFields.actual_ready_time = new Date();
  } else if (status === ORDER_STATUS.DELAYED) {
    updateFields.is_delayed = true;
  } else if (status === ORDER_STATUS.PREPARING) {
    updateFields.is_delayed = false; // Reset delay flag if back to cooking
  }

  // Criterion A3: Conditional update on old status ensures atomic concurrency protection
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, order_status: currentStatus },
    { $set: updateFields },
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(409).json({
      message: 'Concurrent update detected. The order status was modified by another request.',
      details: { expectedPreviousStatus: currentStatus }
    });
  }

  // Trigger notifications
  if (status === ORDER_STATUS.READY) {
    await notifyOrderReady(updatedOrder);
  } else if (status === ORDER_STATUS.PREPARING) {
    await notifyOrderPreparing(updatedOrder);
  } else if (status === ORDER_STATUS.ACCEPTED) {
    await notifyOrderAccepted(updatedOrder);
  } else if (status === ORDER_STATUS.DELAYED) {
    await notifyOrderDelayed(updatedOrder, delay_reason || 'Kitchen preparation bottleneck');
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'ORDER_STATUS_TRANSITION',
    order_id: updatedOrder.order_id,
    token_number: updatedOrder.token_number,
    details: { from: currentStatus, to: status, reason: delay_reason || '' }
  });

  return res.json({
    message: `Order ${updatedOrder.token_number} transitioned to '${status}' successfully`,
    data: updatedOrder
  });
});

/**
 * Flag order as delayed with reason (Criterion A3)
 */
const markOrderDelayed = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const orderId = req.params.id;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: { orderId }
    });
  }

  const currentStatus = order.order_status;
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(ORDER_STATUS.DELAYED)) {
    return res.status(409).json({
      message: `Invalid status transition: Cannot mark order as Delayed from '${currentStatus}' status.`,
      details: { currentStatus, allowedTransitions }
    });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, order_status: currentStatus },
    { $set: { order_status: ORDER_STATUS.DELAYED, is_delayed: true } },
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(409).json({
      message: 'Concurrent update detected. Could not mark order as delayed.',
      details: null
    });
  }

  await notifyOrderDelayed(updatedOrder, reason || 'Kitchen delay reported');

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'ORDER_FLAGGED_DELAYED',
    order_id: updatedOrder.order_id,
    token_number: updatedOrder.token_number,
    details: { reason }
  });

  return res.json({
    message: `Order ${updatedOrder.token_number} marked as Delayed`,
    data: updatedOrder
  });
});

module.exports = {
  getKitchenQueue,
  updateOrderStatus,
  markOrderDelayed
};
