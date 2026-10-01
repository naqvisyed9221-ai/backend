const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../utils/asyncHandler');
const { MENU_ITEM_STATUS } = require('../config/constants');

// Seed items fallback if MongoDB is in offline mode
const FALLBACK_MENU_ITEMS = [
  { _id: '64f1a2b3c4d5e6f7a8b9c001', item_id: 'ITEM-1001', item_name: 'Chicken Burger', category: 'Fast Food', price: 450, available_quantity: 12, preparation_time: 8, status: 'Available', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600' },
  { _id: '64f1a2b3c4d5e6f7a8b9c002', item_id: 'ITEM-1002', item_name: 'French Fries', category: 'Fast Food', price: 200, available_quantity: 25, preparation_time: 5, status: 'Available', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600' },
  { _id: '64f1a2b3c4d5e6f7a8b9c003', item_id: 'ITEM-1003', item_name: 'Cold Drink 500ml', category: 'Beverages', price: 100, available_quantity: 40, preparation_time: 2, status: 'Available', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600' },
  { _id: '64f1a2b3c4d5e6f7a8b9c004', item_id: 'ITEM-1004', item_name: 'Club Sandwich', category: 'Fast Food', price: 380, available_quantity: 15, preparation_time: 7, status: 'Available', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600' },
  { _id: '64f1a2b3c4d5e6f7a8b9c005', item_id: 'ITEM-1005', item_name: 'Chicken Shawarma Wrap', category: 'Fast Food', price: 320, available_quantity: 4, preparation_time: 6, status: 'Limited', image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600' },
  { _id: '64f1a2b3c4d5e6f7a8b9c006', item_id: 'ITEM-1006', item_name: 'Fresh Garden Salad', category: 'Meals', price: 250, available_quantity: 8, preparation_time: 4, status: 'Available', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
  { _id: '64f1a2b3c4d5e6f7a8b9c007', item_id: 'ITEM-1007', item_name: 'Hot Cappuccino', category: 'Beverages', price: 180, available_quantity: 30, preparation_time: 3, status: 'Available', image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600' }
];

/**
 * Get all menu items with search and filters (A10: asyncHandler)
 */
const getMenuItems = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, availability, maxPrepTime, sortBy } = req.query;

  if (mongoose.connection.readyState !== 1) {
    let items = [...FALLBACK_MENU_ITEMS];
    if (category && category !== 'All') {
      items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      items = items.filter((i) => i.item_name.toLowerCase().includes(search.toLowerCase()));
    }
    return res.json({
      message: 'Menu items retrieved',
      count: items.length,
      data: items
    });
  }

  const query = {};

  if (category && category !== 'All') {
    query.category = new RegExp(category, 'i');
  }

  if (search) {
    query.item_name = new RegExp(search, 'i');
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (availability) {
    query.status = availability;
  }

  if (maxPrepTime) {
    query.preparation_time = { $lte: Number(maxPrepTime) };
  }

  let sortOptions = { createdAt: -1 };
  if (sortBy === 'popular') {
    sortOptions = { total_orders_count: -1 };
  } else if (sortBy === 'price_asc') {
    sortOptions = { price: 1 };
  } else if (sortBy === 'price_desc') {
    sortOptions = { price: -1 };
  } else if (sortBy === 'prep_time') {
    sortOptions = { preparation_time: 1 };
  }

  const items = await MenuItem.find(query).sort(sortOptions);

  return res.json({
    message: 'Menu items retrieved',
    count: items.length,
    data: items
  });
});

/**
 * Get single menu item by ID
 */
const getMenuItemById = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({
      message: 'Menu item not found',
      details: { id: req.params.id }
    });
  }

  return res.json({
    message: 'Menu item retrieved',
    data: item
  });
});

/**
 * Create a new menu item (Manager / Admin)
 */
const createMenuItem = asyncHandler(async (req, res) => {
  const { item_name, category, price, available_quantity, preparation_time, status, image } = req.body;

  const item = await MenuItem.create({
    item_name,
    category,
    price: Number(price),
    available_quantity: Number(available_quantity || 0),
    preparation_time: Number(preparation_time || 5),
    status: status || MENU_ITEM_STATUS.AVAILABLE,
    image: image || ''
  });

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'MENU_ITEM_CREATED',
    details: { itemId: item.item_id, name: item.item_name, price: item.price }
  });

  return res.status(201).json({
    message: 'Menu item created successfully',
    data: item
  });
});

/**
 * Update menu item details (Manager / Admin)
 */
const updateMenuItem = asyncHandler(async (req, res) => {
  const { item_name, category, price, available_quantity, preparation_time, status, image } = req.body;

  const item = await MenuItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({
      message: 'Menu item not found',
      details: { id: req.params.id }
    });
  }

  if (item_name !== undefined) item.item_name = item_name;
  if (category !== undefined) item.category = category;
  if (price !== undefined) item.price = Number(price);
  if (available_quantity !== undefined) item.available_quantity = Number(available_quantity);
  if (preparation_time !== undefined) item.preparation_time = Number(preparation_time);
  if (status !== undefined) item.status = status;
  if (image !== undefined) item.image = image;

  await item.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'MENU_ITEM_UPDATED',
    details: { itemId: item.item_id, name: item.item_name }
  });

  return res.json({
    message: 'Menu item updated successfully',
    data: item
  });
});

/**
 * Update stock and availability in real-time (Staff / Manager / Admin)
 */
const updateStockAndAvailability = asyncHandler(async (req, res) => {
  const { available_quantity, status } = req.body;

  const item = await MenuItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({
      message: 'Menu item not found',
      details: { id: req.params.id }
    });
  }

  if (available_quantity !== undefined) {
    item.available_quantity = Math.max(0, Number(available_quantity));
  }

  if (status !== undefined) {
    item.status = status;
  }

  await item.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'STOCK_AVAILABILITY_UPDATED',
    details: { itemId: item.item_id, quantity: item.available_quantity, status: item.status }
  });

  return res.json({
    message: 'Stock and availability status updated',
    data: item
  });
});

/**
 * Delete menu item (Manager / Admin)
 */
const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) {
    return res.status(404).json({
      message: 'Menu item not found',
      details: { id: req.params.id }
    });
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'MENU_ITEM_DELETED',
    details: { itemId: item.item_id, name: item.item_name }
  });

  return res.json({
    message: 'Menu item removed successfully'
  });
});

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  updateStockAndAvailability,
  deleteMenuItem
};
