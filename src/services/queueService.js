const mongoose = require('mongoose');
const Order = require('../models/Order');
const CanteenSetting = require('../models/CanteenSetting');
const { ORDER_STATUS, DEFAULT_SETTINGS } = require('../config/constants');

/**
 * Calculates Estimated Ready Time (Criterion A7)
 * Formula: Estimated ready time = now + (queued prep work ÷ number of cooks) + own prep time
 */
const calculateOrderETA = async (items = [], now = new Date()) => {
  let settings = DEFAULT_SETTINGS;

  if (mongoose.connection.readyState === 1) {
    try {
      const dbSettings = await CanteenSetting.findOne();
      if (dbSettings) settings = dbSettings;
    } catch {}
  }

  const numberOfCooks = Math.max(2, Math.round((settings.kitchen_capacity || 15) / 5));

  // 1. Calculate own order preparation time
  let maxItemTime = 3;
  let totalQuantity = 0;

  items.forEach((item) => {
    const time = Number(item.preparation_time) || 5;
    const qty = Number(item.quantity) || 1;
    totalQuantity += qty;
    if (time > maxItemTime) {
      maxItemTime = time;
    }
  });

  const ownPrepTimeMinutes = Math.round(maxItemTime + Math.max(0, (totalQuantity - 1) * 1.5));

  // 2. Calculate queued prep work
  let queuedPrepWorkMinutes = 0;

  if (mongoose.connection.readyState === 1) {
    try {
      const activeOrders = await Order.find({
        order_status: { $in: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING] }
      }).select('items order_status');

      activeOrders.forEach((ord) => {
        let orderPrep = 5;
        if (ord.items && ord.items.length > 0) {
          const maxTime = Math.max(...ord.items.map((i) => i.preparation_time || 5));
          const count = ord.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
          orderPrep = maxTime + Math.max(0, (count - 1) * 1.5);
        }
        if (ord.order_status === ORDER_STATUS.PREPARING) {
          orderPrep = Math.round(orderPrep * 0.5);
        }
        queuedPrepWorkMinutes += orderPrep;
      });
    } catch {}
  }

  // 3. Formula: now + (queued prep work ÷ number of cooks) + own prep time
  const waitInQueueMinutes = Math.round(queuedPrepWorkMinutes / numberOfCooks);
  const totalMinutesFromNow = waitInQueueMinutes + ownPrepTimeMinutes;
  const estimatedReadyTime = new Date(now.getTime() + totalMinutesFromNow * 60 * 1000);

  return {
    ownPrepTimeMinutes,
    queuedPrepWorkMinutes,
    numberOfCooks,
    waitInQueueMinutes,
    totalMinutesFromNow,
    estimatedReadyTime
  };
};

/**
 * Fetches Live Kitchen Queue (Criterion A7)
 */
const getLiveKitchenQueue = async () => {
  if (mongoose.connection.readyState !== 1) {
    const InMemoryStore = require('./inMemoryStore');
    const all = InMemoryStore.getOrders();
    const active = all.filter((o) => [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING].includes(o.order_status));
    return {
      queueLength: active.length,
      preparingCount: active.filter((o) => o.order_status === ORDER_STATUS.PREPARING).length,
      waitingCount: active.filter((o) => [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED].includes(o.order_status)).length,
      delayedCount: active.filter((o) => o.is_delayed).length,
      orders: active
    };
  }

  const activeStatuses = [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING];

  const orders = await Order.find({
    order_status: { $in: activeStatuses }
  }).sort({
    is_delayed: -1,   // Delayed orders boosted to top (A7)
    pickup_time: 1,   // Earliest scheduled pickup first (A7)
    order_time: 1     // Arrival time FIFO (A7)
  });

  const now = new Date();

  const annotatedOrders = orders.map((order) => {
    const isApproachingPickup =
      order.pickup_time &&
      (new Date(order.pickup_time).getTime() - now.getTime()) / 60000 <= 10 &&
      (new Date(order.pickup_time).getTime() - now.getTime()) / 60000 > 0;

    const isPastETA = order.estimated_ready_time && new Date(order.estimated_ready_time) < now;

    return {
      ...order.toObject(),
      is_approaching_pickup: Boolean(isApproachingPickup),
      is_delayed_risk: Boolean(order.is_delayed || isPastETA)
    };
  });

  return {
    queueLength: annotatedOrders.length,
    preparingCount: annotatedOrders.filter((o) => o.order_status === ORDER_STATUS.PREPARING).length,
    waitingCount: annotatedOrders.filter((o) => [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED].includes(o.order_status)).length,
    delayedCount: annotatedOrders.filter((o) => o.is_delayed_risk).length,
    orders: annotatedOrders
  };
};

module.exports = {
  calculateOrderETA,
  getLiveKitchenQueue
};
