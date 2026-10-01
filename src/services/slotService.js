const mongoose = require('mongoose');
const Order = require('../models/Order');
const CanteenSetting = require('../models/CanteenSetting');
const PickupSlotBooking = require('../models/PickupSlotBooking');
const { DEFAULT_SETTINGS, ORDER_STATUS } = require('../config/constants');

const formatTimeHHMM = (date) => {
  const d = new Date(date);
  return d.toTimeString().substring(0, 5);
};

/**
 * Generates available 15-minute pickup slots for the rest of today
 */
const getAvailablePickupSlots = async (targetDate = new Date()) => {
  let settings = DEFAULT_SETTINGS;
  const bookingMap = {};
  const now = new Date(targetDate);
  const todayStr = now.toISOString().slice(0, 10);

  if (mongoose.connection.readyState === 1) {
    try {
      const dbSettings = await CanteenSetting.findOne();
      if (dbSettings) settings = dbSettings;
      const existingBookings = await PickupSlotBooking.find({ date: todayStr });
      existingBookings.forEach((b) => {
        bookingMap[b.slot] = b.booked_count;
      });
    } catch {}
  }

  const slotInterval = settings.slot_interval_minutes || 15;
  const maxPerSlot = settings.max_orders_per_slot || 20;

  const [openHour, openMin] = (settings.opening_time || '08:00').split(':').map(Number);
  const [closeHour, closeMin] = (settings.closing_time || '20:00').split(':').map(Number);

  const slotStartTime = new Date(now);
  slotStartTime.setHours(openHour, openMin, 0, 0);

  const slotEndTime = new Date(now);
  slotEndTime.setHours(closeHour, closeMin, 0, 0);

  const slots = [];
  let currentCursor = new Date(slotStartTime);

  while (currentCursor < slotEndTime) {
    const slotStartStr = formatTimeHHMM(currentCursor);
    const nextCursor = new Date(currentCursor.getTime() + slotInterval * 60 * 1000);
    const slotEndStr = formatTimeHHMM(nextCursor);
    const slotLabel = `${slotStartStr}-${slotEndStr}`;

    const bookedCount = bookingMap[slotLabel] || 0;
    const isPast = nextCursor <= now;
    const isFull = bookedCount >= maxPerSlot;

    slots.push({
      slot: slotLabel,
      startTime: new Date(currentCursor),
      endTime: new Date(nextCursor),
      capacity: maxPerSlot,
      booked: bookedCount,
      remaining: Math.max(0, maxPerSlot - bookedCount),
      status: isPast ? 'Past' : isFull ? 'Full' : 'Available',
      selectable: !isPast && !isFull
    });

    currentCursor = nextCursor;
  }

  return slots;
};

/**
 * Criterion A1: Atomic conditional slot capacity reservation
 * Conditional update: { booked_count: { $lt: max_capacity } }
 */
const reserveSlotAtomic = async (pickupSlot, orderTime = new Date()) => {
  let settings = await CanteenSetting.findOne();
  if (!settings) settings = DEFAULT_SETTINGS;

  const maxOrders = settings.max_orders_per_slot || 20;
  const dateStr = new Date(orderTime).toISOString().slice(0, 10);

  // Ensure record exists before conditional atomic check
  await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: pickupSlot },
    { $setOnInsert: { booked_count: 0, max_capacity: maxOrders } },
    { upsert: true, new: true }
  );

  const updatedBooking = await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: pickupSlot, booked_count: { $lt: maxOrders } },
    { $inc: { booked_count: 1 } },
    { new: true }
  );

  if (!updatedBooking) {
    return {
      success: false,
      message: `Pickup slot '${pickupSlot}' is completely full (capacity ${maxOrders}). Please select another slot.`
    };
  }

  return {
    success: true,
    booking: updatedBooking
  };
};

/**
 * Criterion A1: Atomic rollback of reserved slot capacity on failed order
 */
const releaseSlotAtomic = async (pickupSlot, orderTime = new Date()) => {
  if (!pickupSlot) return;
  const dateStr = new Date(orderTime).toISOString().slice(0, 10);

  await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: pickupSlot, booked_count: { $gt: 0 } },
    { $inc: { booked_count: -1 } }
  );
};

module.exports = {
  getAvailablePickupSlots,
  reserveSlotAtomic,
  releaseSlotAtomic
};
