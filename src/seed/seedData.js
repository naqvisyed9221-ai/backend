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
          phone: '+923001234570'
        },
        {
          name: 'Canteen Manager',
          email: 'manager@canteen.com',
          password: 'password123',
          role: ROLES.MANAGER,
          phone: '+923001234569'
        },
        {
          name: 'Kitchen Chef / Staff',
          email: 'staff@canteen.com',
          password: 'password123',
          role: ROLES.STAFF,
          phone: '+923001234568'
        },
        {
          name: 'Student Customer',
          email: 'customer@canteen.com',
          password: 'password123',
          role: ROLES.CUSTOMER,
          phone: '+923001234567'
        }
      ];

      for (const u of defaultUsers) {
        await User.create(u);
      }
      console.log('[Seed] Sample users for all 4 roles created.');
    }

    // 3. Seed Extended Menu Items with high quality images and pricing
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      const initialItems = [
        {
          item_id: 'ITEM-1001',
          item_name: 'Chicken Deluxe Burger',
          category: 'Fast Food',
          price: 450,
          available_quantity: 25,
          preparation_time: 8,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1002',
          item_name: 'Golden Crispy Fries',
          category: 'Fast Food',
          price: 200,
          available_quantity: 35,
          preparation_time: 5,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1003',
          item_name: 'Cold Drink 500ml',
          category: 'Beverages',
          price: 100,
          available_quantity: 50,
          preparation_time: 2,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1004',
          item_name: 'Club Sandwich Supreme',
          category: 'Fast Food',
          price: 380,
          available_quantity: 20,
          preparation_time: 7,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1005',
          item_name: 'Chicken Shawarma Wrap',
          category: 'Fast Food',
          price: 320,
          available_quantity: 18,
          preparation_time: 6,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1006',
          item_name: 'Fresh Garden Salad Bowl',
          category: 'Meals',
          price: 250,
          available_quantity: 15,
          preparation_time: 4,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1007',
          item_name: 'Hot Cappuccino',
          category: 'Beverages',
          price: 180,
          available_quantity: 40,
          preparation_time: 3,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1008',
          item_name: 'Artisanal Veggie Buddha Bowl',
          category: 'Meals',
          price: 420,
          available_quantity: 14,
          preparation_time: 9,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1009',
          item_name: 'Classic Iced Matcha Latte',
          category: 'Beverages',
          price: 260,
          available_quantity: 30,
          preparation_time: 4,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1010',
          item_name: 'Spicy Paneer Tikka Wrap',
          category: 'Meals',
          price: 340,
          available_quantity: 16,
          preparation_time: 8,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1011',
          item_name: 'Double Chocolate Fudge Brownie',
          category: 'Desserts',
          price: 220,
          available_quantity: 22,
          preparation_time: 3,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1012',
          item_name: 'Smokey BBQ Beef Burger',
          category: 'Fast Food',
          price: 520,
          available_quantity: 18,
          preparation_time: 10,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1013',
          item_name: 'Crispy Chicken Zinger Roll',
          category: 'Fast Food',
          price: 360,
          available_quantity: 20,
          preparation_time: 6,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1014',
          item_name: 'Mango Passion Fruit Cooler',
          category: 'Beverages',
          price: 190,
          available_quantity: 35,
          preparation_time: 3,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1015',
          item_name: 'Cheesy Garlic Bread Sticks',
          category: 'Snacks',
          price: 240,
          available_quantity: 28,
          preparation_time: 6,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1016',
          item_name: 'Velvety Red Velvet Pastry',
          category: 'Desserts',
          price: 250,
          available_quantity: 15,
          preparation_time: 2,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80'
        }
      ];

      for (const item of initialItems) {
        await MenuItem.create(item);
      }
      console.log(`[Seed] Initial ${initialItems.length} menu items populated according to specification.`);
    }
  } catch (error) {
    console.error('[Seed Error] Failed to populate seed data:', error.message);
  }
};

module.exports = seedInitialData;
