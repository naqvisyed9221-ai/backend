const mongoose = require('mongoose');
const Order = require('../models/Order');
const CanteenSetting = require('../models/CanteenSetting');
const { ORDER_STATUS, DEFAULT_SETTINGS } = require('../config/constants');
const { notifyOrderDelayed, notifyPickupApproaching } = require('./notificationService');

let cronTimer = null;

/**
 * Criterion A8: Background job running every minute
 * - Marks orders Delayed when past estimate plus grace
 * - Marks Ready orders Not Collected after timeout
 * - Sends "pickup approaching" notification once per order
 */
const runBackgroundChecks = async () => {
  // Only query database if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    const now = new Date();
    const settings = (await CanteenSetting.findOne()) || DEFAULT_SETTINGS;

    const gracePeriodMinutes = 5; // 5 minutes grace past estimated ready time
    const uncollectedTimeoutMinutes = settings.uncollectedTimeoutMinutes || 60;

    // 1. Mark orders Delayed when past estimated ready time plus grace
    const graceThreshold = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000);
    const overdueOrders = await Order.find({
      order_status: { $in: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING] },
      is_delayed: { $ne: true },
      estimated_ready_time: { $lt: graceThreshold }
    });

    for (const order of overdueOrders) {
      order.order_status = ORDER_STATUS.DELAYED;
      order.is_delayed = true;
      await order.save();
      await notifyOrderDelayed(order, 'Kitchen preparation has exceeded initial estimate');
      console.log(`[Cron] Marked order ${order.token_number} (${order.order_id}) as Delayed.`);
    }

    // 2. Mark Ready orders Not Collected after timeout
    const uncollectedThreshold = new Date(now.getTime() - uncollectedTimeoutMinutes * 60 * 1000);
    const staleReadyOrders = await Order.find({
      order_status: ORDER_STATUS.READY,
      actual_ready_time: { $lt: uncollectedThreshold }
    });

    for (const order of staleReadyOrders) {
      order.order_status = ORDER_STATUS.NOT_COLLECTED;
      await order.save();
      console.log(`[Cron] Marked order ${order.token_number} as Not Collected (exceeded ${uncollectedTimeoutMinutes} mins).`);
    }

    // 3. Send "pickup approaching" notification once per order (within next 10 mins)
    const upcomingThreshold = new Date(now.getTime() + 10 * 60 * 1000);
    const approachingOrders = await Order.find({
      pickup_time: { $gte: now, $lte: upcomingThreshold },
      pickup_approaching_notified: { $ne: true },
      order_status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.COLLECTED, ORDER_STATUS.COMPLETED] }
    });

    for (const order of approachingOrders) {
      order.pickup_approaching_notified = true;
      await order.save();

      const minutesLeft = Math.max(1, Math.round((new Date(order.pickup_time).getTime() - now.getTime()) / 60000));
      await notifyPickupApproaching(order, minutesLeft);
      console.log(`[Cron] Sent pickup approaching notification for token ${order.token_number}.`);
    }
  } catch (error) {
    console.error('[Cron Error] Failure in background order monitor:', error.message);
  }
};

const startBackgroundMonitor = (intervalMs = 60000) => {
  if (cronTimer) clearInterval(cronTimer);
  cronTimer = setInterval(runBackgroundChecks, intervalMs);
  console.log(`[Cron] Background order monitor started (every ${intervalMs / 1000}s).`);
  // Run once immediately on start
  runBackgroundChecks().catch(() => {});
};

const stopBackgroundMonitor = () => {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
};

module.exports = {
  startBackgroundMonitor,
  stopBackgroundMonitor,
  runBackgroundChecks
};
