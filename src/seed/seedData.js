const mongoose = require('mongoose');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const CanteenSetting = require('../models/CanteenSetting');
const { ROLES, DEFAULT_SETTINGS, MENU_ITEM_STATUS } = require('../config/constants');

const seedInitialData = async () => {
  try {
    // 1. Seed Canteen Settings if not present
    const existingSettings = await CanteenSetting.findOne();
    if (!existingSettings) {
      await CanteenSetting.create(DEFAULT_SETTINGS);
      console.log('[Seed] Canteen settings and limits initialized.');
    }

    // 2. Seed Default Accounts for each role
    const usersCount = await User.countDocuments();
    if (usersCount === 0) {
      const defaultUsers = [
        {
          name: 'System Administrator',
          email: 'admin@canteen.com',
          password: 'password123',
          role: ROLES.ADMIN,
          phone: '+1234567890'
        },
        {
          name: 'Canteen Manager',
          email: 'manager@canteen.com',
          password: 'password123',
          role: ROLES.MANAGER,
          phone: '+1234567891'
        },
        {
          name: 'Kitchen Chef / Staff',
          email: 'staff@canteen.com',
          password: 'password123',
          role: ROLES.STAFF,
          phone: '+1234567892'
        },
        {
          name: 'Student Customer',
          email: 'customer@canteen.com',
          password: 'password123',
          role: ROLES.CUSTOMER,
          phone: '+1234567893'
        }
      ];

      for (const u of defaultUsers) {
        await User.create(u);
      }
      console.log('[Seed] Sample users for all 4 roles created.');
    }

    // 3. Seed Menu Items matching PDF specifications
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      const initialItems = [
        {
          item_id: 'ITEM-1001',
          item_name: 'Chicken Burger',
          category: 'Fast Food',
          price: 450,
          available_quantity: 12,
          preparation_time: 8,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'
        },
        {
          item_id: 'ITEM-1002',
          item_name: 'French Fries',
          category: 'Fast Food',
          price: 200,
          available_quantity: 25,
          preparation_time: 5,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500'
        },
        {
          item_id: 'ITEM-1003',
          item_name: 'Cold Drink 500ml',
          category: 'Beverages',
          price: 100,
          available_quantity: 40,
          preparation_time: 2,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500'
        },
        {
          item_id: 'ITEM-1004',
          item_name: 'Club Sandwich',
          category: 'Fast Food',
          price: 380,
          available_quantity: 15,
          preparation_time: 7,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500'
        },
        {
          item_id: 'ITEM-1005',
          item_name: 'Chicken Shawarma Wrap',
          category: 'Fast Food',
          price: 320,
          available_quantity: 18,
          preparation_time: 6,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500'
        },
        {
          item_id: 'ITEM-1006',
          item_name: 'Fresh Garden Salad',
          category: 'Meals',
          price: 250,
          available_quantity: 10,
          preparation_time: 4,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500'
        },
        {
          item_id: 'ITEM-1007',
          item_name: 'Hot Cappuccino',
          category: 'Beverages',
          price: 180,
          available_quantity: 30,
          preparation_time: 3,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500'
        }
      ];

      for (const item of initialItems) {
        await MenuItem.create(item);
      }
      console.log('[Seed] Initial menu items populated according to specification.');
    }
  } catch (error) {
    console.error('[Seed Error] Failed to populate seed data:', error.message);
  }
};

module.exports = seedInitialData;
