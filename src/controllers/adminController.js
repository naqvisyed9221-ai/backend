const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const CanteenSetting = require('../models/CanteenSetting');
const Category = require('../models/Category');
const CanteenAccount = require('../models/CanteenAccount');
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

/**
 * Category Management (Phase 5)
 */
const getAllCategories = asyncHandler(async (req, res) => {
  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const categories = InMemoryStore.getCategories();
    return res.json({
      message: 'Categories retrieved successfully',
      count: categories.length,
      data: categories
    });
  }

  const categories = await Category.find().sort({ name: 1 });
  return res.json({
    message: 'Categories retrieved successfully',
    count: categories.length,
    data: categories
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon, image, is_active } = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const existing = InMemoryStore.getCategories().find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ message: `Category "${name}" already exists.` });
    }
    const created = InMemoryStore.createCategory({ name: name.trim(), description, icon, image, is_active });
    return res.status(201).json({
      message: 'Category created successfully',
      data: created
    });
  }

  const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (existing) {
    return res.status(400).json({ message: `Category "${name}" already exists.` });
  }

  const category = await Category.create({
    name: name.trim(),
    description: description || '',
    icon: icon || 'restaurant',
    image: image || '',
    is_active: is_active !== undefined ? is_active : true
  });

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'CATEGORY_CREATED',
    details: { categoryId: category._id, name: category.name }
  });

  return res.status(201).json({
    message: 'Category created successfully',
    data: category
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const updated = InMemoryStore.updateCategory(id, updateData);
    if (!updated) {
      return res.status(404).json({ message: 'Category not found', details: { id } });
    }
    return res.json({
      message: 'Category updated successfully',
      data: updated
    });
  }

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: 'Category not found', details: { id } });
  }

  if (updateData.name) category.name = updateData.name.trim();
  if (updateData.description !== undefined) category.description = updateData.description;
  if (updateData.icon !== undefined) category.icon = updateData.icon;
  if (updateData.image !== undefined) category.image = updateData.image;
  if (updateData.is_active !== undefined) category.is_active = updateData.is_active;

  await category.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'CATEGORY_UPDATED',
    details: { categoryId: category._id, updates: updateData }
  });

  return res.json({
    message: 'Category updated successfully',
    data: category
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const deleted = InMemoryStore.deleteCategory(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found', details: { id } });
    }
    return res.json({
      message: 'Category deleted successfully',
      data: deleted
    });
  }

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return res.status(404).json({ message: 'Category not found', details: { id } });
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'CATEGORY_DELETED',
    details: { categoryId: id, name: category.name }
  });

  return res.json({
    message: 'Category deleted successfully',
    data: category
  });
});

/**
 * Canteen Accounts Management (Phase 5)
 */
const getAllCanteens = asyncHandler(async (req, res) => {
  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const canteens = InMemoryStore.getCanteens();
    return res.json({
      message: 'Canteen hubs retrieved successfully',
      count: canteens.length,
      data: canteens
    });
  }

  const canteens = await CanteenAccount.find().sort({ name: 1 });
  return res.json({
    message: 'Canteen hubs retrieved successfully',
    count: canteens.length,
    data: canteens
  });
});

const createCanteen = asyncHandler(async (req, res) => {
  const { name, location, opening_time, closing_time, is_active, contact_number } = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const created = InMemoryStore.createCanteen({ name, location, opening_time, closing_time, is_active, contact_number });
    return res.status(201).json({
      message: 'Canteen hub created successfully',
      data: created
    });
  }

  const canteen = await CanteenAccount.create({
    name: name.trim(),
    location: location.trim(),
    opening_time: opening_time || '08:00',
    closing_time: closing_time || '20:00',
    is_active: is_active !== undefined ? is_active : true,
    contact_number: contact_number || ''
  });

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'CANTEEN_ACCOUNT_CREATED',
    details: { canteenId: canteen._id, name: canteen.name, location: canteen.location }
  });

  return res.status(201).json({
    message: 'Canteen hub created successfully',
    data: canteen
  });
});

const updateCanteen = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const updated = InMemoryStore.updateCanteen(id, updateData);
    if (!updated) {
      return res.status(404).json({ message: 'Canteen hub not found', details: { id } });
    }
    return res.json({
      message: 'Canteen hub updated successfully',
      data: updated
    });
  }

  const canteen = await CanteenAccount.findById(id);
  if (!canteen) {
    return res.status(404).json({ message: 'Canteen hub not found', details: { id } });
  }

  if (updateData.name) canteen.name = updateData.name.trim();
  if (updateData.location) canteen.location = updateData.location.trim();
  if (updateData.opening_time !== undefined) canteen.opening_time = updateData.opening_time;
  if (updateData.closing_time !== undefined) canteen.closing_time = updateData.closing_time;
  if (updateData.is_active !== undefined) canteen.is_active = updateData.is_active;
  if (updateData.contact_number !== undefined) canteen.contact_number = updateData.contact_number;

  await canteen.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'CANTEEN_ACCOUNT_UPDATED',
    details: { canteenId: canteen._id, updates: updateData }
  });

  return res.json({
    message: 'Canteen hub updated successfully',
    data: canteen
  });
});

const deleteCanteen = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const deleted = InMemoryStore.deleteCanteen(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Canteen hub not found', details: { id } });
    }
    return res.json({
      message: 'Canteen hub deleted successfully',
      data: deleted
    });
  }

  const canteen = await CanteenAccount.findByIdAndDelete(id);
  if (!canteen) {
    return res.status(404).json({ message: 'Canteen hub not found', details: { id } });
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'CANTEEN_ACCOUNT_DELETED',
    details: { canteenId: id, name: canteen.name }
  });

  return res.json({
    message: 'Canteen hub deleted successfully',
    data: canteen
  });
});

module.exports = {
  getAllUsers,
  updateUserRoleAndStatus,
  getSystemLogs,
  getCanteenSettings,
  updateCanteenSettings,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCanteens,
  createCanteen,
  updateCanteen,
  deleteCanteen
};
