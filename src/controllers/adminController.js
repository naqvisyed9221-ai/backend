const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const CanteenSetting = require('../models/CanteenSetting');
const asyncHandler = require('../utils/asyncHandler');
const { DEFAULT_SETTINGS } = require('../config/constants');

/**
 * Get all users with filtering by role or status
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, status } = req.query;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const users = InMemoryStore.getAllUsers({ role, status });
    return res.json({
      message: 'Users retrieved',
      count: users.length,
      data: users
    });
  }

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.account_status = status;

  const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
  return res.json({
    message: 'Users retrieved',
    count: users.length,
    data: users
  });
});

/**
 * Update user role or account status (Admin)
 */
const updateUserRoleAndStatus = asyncHandler(async (req, res) => {
  const { role, account_status } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      message: 'User not found',
      details: { id: req.params.id }
    });
  }

  if (role) user.role = role;
  if (account_status) user.account_status = account_status;

  await user.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'USER_PERMISSIONS_UPDATED',
    details: { targetUserId: user._id, targetEmail: user.email, newRole: user.role, status: user.account_status }
  });

  return res.json({
    message: 'User role and status updated',
    data: user
  });
});

/**
 * Get system logs & staff activity logs
 */
const getSystemLogs = asyncHandler(async (req, res) => {
  const { action, limit = 100 } = req.query;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const logs = InMemoryStore.getLogs();
    return res.json({
      message: 'System logs retrieved',
      count: logs.length,
      data: logs
    });
  }

  const filter = {};
  if (action) filter.action = action;

  const logs = await SystemLog.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
  return res.json({
    message: 'System logs retrieved',
    count: logs.length,
    data: logs
  });
});

/**
 * Get canteen operational settings and limits
 */
const getCanteenSettings = asyncHandler(async (req, res) => {
  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    return res.json({
      message: 'Canteen settings retrieved',
      data: InMemoryStore.getSettings()
    });
  }

  let settings = await CanteenSetting.findOne();
  if (!settings) {
    settings = await CanteenSetting.create(DEFAULT_SETTINGS);
  }
  return res.json({
    message: 'Canteen settings retrieved',
    data: settings
  });
});

/**
 * Update canteen operational limits and categories
 */
const updateCanteenSettings = asyncHandler(async (req, res) => {
  let settings = await CanteenSetting.findOne();
  if (!settings) {
    settings = new CanteenSetting(DEFAULT_SETTINGS);
  }

  const {
    max_orders_per_slot,
    max_items_per_customer,
    max_scheduled_pickups_per_slot,
    slot_interval_minutes,
    kitchen_capacity,
    opening_time,
    closing_time,
    categories
  } = req.body;

  if (max_orders_per_slot !== undefined) settings.max_orders_per_slot = Number(max_orders_per_slot);
  if (max_items_per_customer !== undefined) settings.max_items_per_customer = Number(max_items_per_customer);
  if (max_scheduled_pickups_per_slot !== undefined) settings.max_scheduled_pickups_per_slot = Number(max_scheduled_pickups_per_slot);
  if (slot_interval_minutes !== undefined) settings.slot_interval_minutes = Number(slot_interval_minutes);
  if (kitchen_capacity !== undefined) settings.kitchen_capacity = Number(kitchen_capacity);
  if (opening_time !== undefined) settings.opening_time = opening_time;
  if (closing_time !== undefined) settings.closing_time = closing_time;
  if (categories !== undefined && Array.isArray(categories)) settings.categories = categories;

  await settings.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'CANTEEN_SETTINGS_UPDATED',
    details: req.body
  });

  return res.json({
    message: 'Canteen settings updated successfully',
    data: settings
  });
});

module.exports = {
  getAllUsers,
  updateUserRoleAndStatus,
  getSystemLogs,
  getCanteenSettings,
  updateCanteenSettings
};
