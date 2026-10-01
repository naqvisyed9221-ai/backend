const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../config/constants');

let ioInstance = null;

const setSocketIOInstance = (io) => {
  ioInstance = io;
};

/**
 * Creates and dispatches a notification for an order event
 */
const notifyUser = async ({ userId, orderId, tokenNumber, type, title, message }) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      order_id: orderId,
      token_number: tokenNumber,
      type,
      title,
      message,
      is_read: false
    });

    // Real-time broadcast if socket.io is active
    if (ioInstance) {
      // Room for specific user or order
      ioInstance.to(`user_${userId}`).emit('notification', notification);
      ioInstance.emit('order_update', { orderId, tokenNumber, type, message });
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

const notifyOrderAccepted = async (order) => {
  return notifyUser({
    userId: order.customer_id,
    orderId: order._id,
    tokenNumber: order.token_number,
    type: NOTIFICATION_TYPES.ORDER_ACCEPTED,
    title: 'Order Accepted',
    message: `Your order ${order.token_number} has been accepted by the canteen staff.`
  });
};

const notifyOrderPreparing = async (order) => {
  return notifyUser({
    userId: order.customer_id,
    orderId: order._id,
    tokenNumber: order.token_number,
    type: NOTIFICATION_TYPES.ORDER_PREPARING,
    title: 'Kitchen Preparation Started',
    message: `Kitchen has started preparing your order ${order.token_number}.`
  });
};

const notifyOrderDelayed = async (order, reason = '') => {
  return notifyUser({
    userId: order.customer_id,
    orderId: order._id,
    tokenNumber: order.token_number,
    type: NOTIFICATION_TYPES.ORDER_DELAYED,
    title: 'Order Delayed',
    message: `Token ${order.token_number} is experiencing a slight delay. ${reason ? 'Reason: ' + reason : 'Our kitchen is expediting it.'}`
  });
};

const notifyOrderReady = async (order) => {
  return notifyUser({
    userId: order.customer_id,
    orderId: order._id,
    tokenNumber: order.token_number,
    type: NOTIFICATION_TYPES.ORDER_READY,
    title: 'Order Ready for Collection!',
    message: `Token ${order.token_number} — Your order is ready! Please proceed to the collection counter with your token/QR code.`
  });
};

const notifyPickupApproaching = async (order, minutesLeft = 10) => {
  return notifyUser({
    userId: order.customer_id,
    orderId: order._id,
    tokenNumber: order.token_number,
    type: NOTIFICATION_TYPES.PICKUP_APPROACHING,
    title: 'Pickup Time Approaching',
    message: `Reminder: Your scheduled pickup for token ${order.token_number} is in ~${minutesLeft} minutes.`
  });
};

const notifyOrderCancelled = async (order, reason = '') => {
  return notifyUser({
    userId: order.customer_id,
    orderId: order._id,
    tokenNumber: order.token_number,
    type: NOTIFICATION_TYPES.ORDER_CANCELLED,
    title: 'Order Cancelled',
    message: `Order ${order.token_number} has been cancelled. ${reason ? 'Reason: ' + reason : ''}`
  });
};

module.exports = {
  setSocketIOInstance,
  notifyUser,
  notifyOrderAccepted,
  notifyOrderPreparing,
  notifyOrderDelayed,
  notifyOrderReady,
  notifyPickupApproaching,
  notifyOrderCancelled
};
