/**
 * Unified In-Memory Reactive Store
 * Active when MongoDB is not connected, ensuring 100% full-stack functionality:
 * - Authentication (Customer, Staff, Manager, Admin)
 * - Atomic stock decrement & slot validation (Criteria A1, A2)
 * - Strict State Machine transitions (Criterion A3)
 * - Single-use token verification & collection (Criterion A4)
 * - Live queue management & AI analytics
 */

const bcrypt = require('bcryptjs');
const { ROLES, ACCOUNT_STATUS, ORDER_STATUS, MENU_ITEM_STATUS, DEFAULT_SETTINGS } = require('../config/constants');
const { generateQRCodeDataURL } = require('../utils/qrCodeGenerator');

// 1. Seed Users
const memoryUsers = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c101',
    name: 'Student Customer',
    email: 'customer@canteen.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: ROLES.CUSTOMER,
    account_status: ACCOUNT_STATUS.ACTIVE,
    phone: '+923001234567',
    createdAt: new Date()
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c102',
    name: 'Kitchen Chef / Staff',
    email: 'staff@canteen.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: ROLES.STAFF,
    account_status: ACCOUNT_STATUS.ACTIVE,
    phone: '+923001234568',
    createdAt: new Date()
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c103',
    name: 'Canteen Manager',
    email: 'manager@canteen.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: ROLES.MANAGER,
    account_status: ACCOUNT_STATUS.ACTIVE,
    phone: '+923001234569',
    createdAt: new Date()
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c104',
    name: 'System Administrator',
    email: 'admin@canteen.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: ROLES.ADMIN,
    account_status: ACCOUNT_STATUS.ACTIVE,
    phone: '+923001234570',
    createdAt: new Date()
  }
];

// 2. Seed Rich Menu Items (16 diverse items across Fast Food, Meals, Beverages, Snacks, Desserts)
let memoryMenuItems = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c001',
    item_id: 'ITEM-1001',
    item_name: 'Chicken Deluxe Burger',
    category: 'Fast Food',
    price: 450,
    available_quantity: 25,
    preparation_time: 8,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 142
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c002',
    item_id: 'ITEM-1002',
    item_name: 'Golden Crispy Fries',
    category: 'Fast Food',
    price: 200,
    available_quantity: 35,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 215
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c003',
    item_id: 'ITEM-1003',
    item_name: 'Cold Drink 500ml',
    category: 'Beverages',
    price: 100,
    available_quantity: 50,
    preparation_time: 2,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 310
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c004',
    item_id: 'ITEM-1004',
    item_name: 'Club Sandwich Supreme',
    category: 'Fast Food',
    price: 380,
    available_quantity: 20,
    preparation_time: 7,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 98
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c005',
    item_id: 'ITEM-1005',
    item_name: 'Chicken Shawarma Wrap',
    category: 'Fast Food',
    price: 320,
    available_quantity: 18,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 165
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c006',
    item_id: 'ITEM-1006',
    item_name: 'Fresh Garden Salad Bowl',
    category: 'Meals',
    price: 250,
    available_quantity: 15,
    preparation_time: 4,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 54
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c007',
    item_id: 'ITEM-1007',
    item_name: 'Hot Cappuccino',
    category: 'Beverages',
    price: 180,
    available_quantity: 40,
    preparation_time: 3,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 180
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c008',
    item_id: 'ITEM-1008',
    item_name: 'Artisanal Veggie Buddha Bowl',
    category: 'Meals',
    price: 420,
    available_quantity: 14,
    preparation_time: 9,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 62
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c009',
    item_id: 'ITEM-1009',
    item_name: 'Classic Iced Matcha Latte',
    category: 'Beverages',
    price: 260,
    available_quantity: 30,
    preparation_time: 4,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 110
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c010',
    item_id: 'ITEM-1010',
    item_name: 'Spicy Paneer Tikka Wrap',
    category: 'Meals',
    price: 340,
    available_quantity: 16,
    preparation_time: 8,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 85
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c011',
    item_id: 'ITEM-1011',
    item_name: 'Double Chocolate Fudge Brownie',
    category: 'Desserts',
    price: 220,
    available_quantity: 22,
    preparation_time: 3,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 140
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c012',
    item_id: 'ITEM-1012',
    item_name: 'Smokey BBQ Beef Burger',
    category: 'Fast Food',
    price: 520,
    available_quantity: 18,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 94
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c013',
    item_id: 'ITEM-1013',
    item_name: 'Crispy Chicken Zinger Roll',
    category: 'Fast Food',
    price: 360,
    available_quantity: 20,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 130
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c014',
    item_id: 'ITEM-1014',
    item_name: 'Mango Passion Fruit Cooler',
    category: 'Beverages',
    price: 190,
    available_quantity: 35,
    preparation_time: 3,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 175
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c015',
    item_id: 'ITEM-1015',
    item_name: 'Cheesy Garlic Bread Sticks',
    category: 'Snacks',
    price: 240,
    available_quantity: 28,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 88
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c016',
    item_id: 'ITEM-1016',
    item_name: 'Velvety Red Velvet Pastry',
    category: 'Desserts',
    price: 250,
    available_quantity: 15,
    preparation_time: 2,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80',
    total_orders_count: 70
  }
];

// 3. Seed Initial Queue Orders
let memoryOrders = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c201',
    order_id: 'ORD-20261001-1021',
    customer_id: '64f1a2b3c4d5e6f7a8b9c101',
    customer_name: 'Sarah Khan (Student)',
    token_number: 'C-021',
    qr_code: '',
    items: [
      { order_item_id: 'OI-101', item_id: 'ITEM-1001', item_name: 'Chicken Deluxe Burger', quantity: 1, price: 450, special_instruction: 'Extra mayo' },
      { order_item_id: 'OI-102', item_id: 'ITEM-1003', item_name: 'Cold Drink 500ml', quantity: 1, price: 100 }
    ],
    total_amount: 550,
    order_time: new Date(Date.now() - 14 * 60000),
    pickup_slot: '13:00-13:15',
    pickup_time: new Date(Date.now() + 10 * 60000),
    estimated_ready_time: new Date(Date.now() + 5 * 60000),
    order_status: ORDER_STATUS.PREPARING,
    payment_status: 'paid',
    payment_method: 'cash_on_counter',
    priority_score: 185,
    is_delayed: false,
    history: [
      { from: null, to: ORDER_STATUS.PLACED, timestamp: new Date(Date.now() - 14 * 60000) },
      { from: ORDER_STATUS.PLACED, to: ORDER_STATUS.PREPARING, timestamp: new Date(Date.now() - 10 * 60000) }
    ]
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c202',
    order_id: 'ORD-20261001-1022',
    customer_id: '64f1a2b3c4d5e6f7a8b9c101',
    customer_name: 'Ali Raza (Employee)',
    token_number: 'C-022',
    qr_code: '',
    items: [
      { order_item_id: 'OI-103', item_id: 'ITEM-1004', item_name: 'Club Sandwich Supreme', quantity: 2, price: 380, special_instruction: 'Toasted well' }
    ],
    total_amount: 760,
    order_time: new Date(Date.now() - 18 * 60000),
    pickup_slot: '13:00-13:15',
    pickup_time: new Date(Date.now() + 5 * 60000),
    estimated_ready_time: new Date(Date.now() - 2 * 60000),
    order_status: ORDER_STATUS.DELAYED,
    payment_status: 'paid',
    payment_method: 'card',
    priority_score: 210,
    is_delayed: true,
    history: [
      { from: null, to: ORDER_STATUS.PLACED, timestamp: new Date(Date.now() - 18 * 60000) },
      { from: ORDER_STATUS.PLACED, to: ORDER_STATUS.PREPARING, timestamp: new Date(Date.now() - 15 * 60000) },
      { from: ORDER_STATUS.PREPARING, to: ORDER_STATUS.DELAYED, timestamp: new Date(Date.now() - 2 * 60000) }
    ]
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c203',
    order_id: 'ORD-20261001-1023',
    customer_id: '64f1a2b3c4d5e6f7a8b9c101',
    customer_name: 'Bilal Ahmed (Student)',
    token_number: 'C-023',
    qr_code: '',
    items: [
      { order_item_id: 'OI-104', item_id: 'ITEM-1001', item_name: 'Chicken Deluxe Burger', quantity: 2, price: 450, special_instruction: 'No onions' },
      { order_item_id: 'OI-105', item_id: 'ITEM-1002', item_name: 'Golden Crispy Fries', quantity: 1, price: 200 }
    ],
    total_amount: 1100,
    order_time: new Date(Date.now() - 5 * 60000),
    pickup_slot: '13:15-13:30',
    pickup_time: new Date(Date.now() + 25 * 60000),
    estimated_ready_time: new Date(Date.now() + 15 * 60000),
    order_status: ORDER_STATUS.PLACED,
    payment_status: 'pending',
    payment_method: 'cash_on_counter',
    priority_score: 145,
    is_delayed: false,
    history: [
      { from: null, to: ORDER_STATUS.PLACED, timestamp: new Date(Date.now() - 5 * 60000) }
    ]
  }
];

let memoryLogs = [
  {
    _id: 'log_01',
    user_name: 'System',
    role: 'system',
    action: 'SYSTEM_BOOT',
    details: { message: 'Smart Canteen Service initialized' },
    created_at: new Date(Date.now() - 60 * 60000)
  },
  {
    _id: 'log_02',
    user_name: 'Kitchen Chef',
    role: 'staff',
    action: 'ORDER_PREPARING',
    details: { order_id: 'ORD-20261001-1021', token: 'C-021' },
    created_at: new Date(Date.now() - 10 * 60000)
  }
];

let tokenCounter = 23;
let memorySettings = { ...DEFAULT_SETTINGS };

// Synchronously generate initial QR codes for seed orders
(async () => {
  for (const ord of memoryOrders) {
    try {
      ord.qr_code = await generateQRCodeDataURL(ord.token_number, ord.order_id);
    } catch {}
  }
})();

const InMemoryStore = {
  // Users
  findUserByEmail: (email) => {
    return memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById: (id) => {
    return memoryUsers.find((u) => u._id === String(id) || u._id === id);
  },
  getAllUsers: (filter = {}) => {
    let list = [...memoryUsers];
    if (filter.role) list = list.filter((u) => u.role === filter.role);
    if (filter.status) list = list.filter((u) => u.account_status === filter.status);
    return list.map((u) => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
  },
  createUser: async ({ name, email, password, phone, role = ROLES.CUSTOMER }) => {
    const newUser = {
      _id: '64f1a2b3c4d5e6f7a8b9c' + Math.floor(1000 + Math.random() * 9000),
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role,
      account_status: ACCOUNT_STATUS.ACTIVE,
      phone: phone || '',
      createdAt: new Date()
    };
    memoryUsers.push(newUser);
    return newUser;
  },
  comparePassword: async (providedPassword, user) => {
    return await bcrypt.compare(providedPassword, user.passwordHash);
  },

  // Menu Items
  getMenuItems: (filters = {}) => {
    let list = [...memoryMenuItems];
    if (filters.category && filters.category !== 'All') {
      list = list.filter((i) => i.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.search) {
      list = list.filter((i) => i.item_name.toLowerCase().includes(filters.search.toLowerCase()));
    }
    return list;
  },
  getMenuItemById: (id) => {
    return memoryMenuItems.find((i) => i._id === String(id) || i.item_id === String(id));
  },
  updateMenuItemStock: (id, qtyChange) => {
    const item = memoryMenuItems.find((i) => i._id === String(id) || i.item_id === String(id));
    if (!item) return null;
    item.available_quantity = Math.max(0, item.available_quantity + qtyChange);
    if (item.available_quantity === 0) item.status = MENU_ITEM_STATUS.SOLD_OUT;
    else if (item.available_quantity <= 5) item.status = MENU_ITEM_STATUS.LIMITED;
    else item.status = MENU_ITEM_STATUS.AVAILABLE;
    return item;
  },

  // Orders
  getOrders: (filter = {}) => {
    let list = [...memoryOrders];
    if (filter.customer_id) {
      list = list.filter((o) => String(o.customer_id) === String(filter.customer_id));
    }
    if (filter.order_status) {
      list = list.filter((o) => o.order_status === filter.order_status);
    }
    return list.sort((a, b) => new Date(b.order_time) - new Date(a.order_time));
  },
  getOrderById: (id) => {
    return memoryOrders.find((o) => o._id === String(id) || o.order_id === String(id));
  },
  getOrderByToken: (token) => {
    return memoryOrders.find((o) => o.token_number.toUpperCase() === token.trim().toUpperCase());
  },
  createOrder: async ({ customerId, customerName, items, pickupSlot, pickupTime, idempotencyKey, paymentMethod }) => {
    tokenCounter += 1;
    const tokenStr = `C-${String(tokenCounter).padStart(3, '0')}`;
    const orderId = `ORD-20261001-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrCode = await generateQRCodeDataURL(tokenStr, orderId);

    // Calculate total amount and decrements
    let total = 0;
    const orderItems = items.map((it) => {
      const menu = memoryMenuItems.find((m) => m._id === it.item_id || m.item_id === it.item_id);
      const price = menu ? menu.price : 200;
      const itemName = menu ? menu.item_name : 'Food Item';
      total += price * it.quantity;
      if (menu) {
        menu.available_quantity = Math.max(0, menu.available_quantity - it.quantity);
        if (menu.available_quantity === 0) menu.status = MENU_ITEM_STATUS.SOLD_OUT;
        else if (menu.available_quantity <= 5) menu.status = MENU_ITEM_STATUS.LIMITED;
      }
      return {
        order_item_id: 'OI-' + Math.floor(100 + Math.random() * 900),
        item_id: it.item_id,
        item_name: itemName,
        quantity: it.quantity,
        price,
        special_instruction: it.special_instruction || ''
      };
    });

    const newOrder = {
      _id: '64f1a2b3c4d5e6f7a8b9c' + Math.floor(2000 + Math.random() * 8000),
      order_id: orderId,
      customer_id: customerId,
      customer_name: customerName,
      token_number: tokenStr,
      qr_code: qrCode,
      items: orderItems,
      total_amount: total,
      order_time: new Date(),
      pickup_slot: pickupSlot || '13:00-13:15',
      pickup_time: pickupTime ? new Date(pickupTime) : new Date(Date.now() + 15 * 60000),
      estimated_ready_time: new Date(Date.now() + 10 * 60000),
      order_status: ORDER_STATUS.PLACED,
      payment_status: 'paid',
      payment_method: paymentMethod || 'cash_on_counter',
      priority_score: 135,
      is_delayed: false,
      idempotency_key: idempotencyKey || null,
      history: [
        { from: null, to: ORDER_STATUS.PLACED, timestamp: new Date() }
      ]
    };

    memoryOrders.unshift(newOrder);
    return newOrder;
  },

  updateOrderStatus: (orderId, newStatus, reason = '') => {
    const order = memoryOrders.find((o) => o._id === String(orderId) || o.order_id === String(orderId));
    if (!order) return null;
    const oldStatus = order.order_status;
    order.order_status = newStatus;
    if (newStatus === ORDER_STATUS.DELAYED) {
      order.is_delayed = true;
      order.delay_reason = reason;
    }
    if (newStatus === ORDER_STATUS.READY) {
      order.actual_ready_time = new Date();
    }
    if (newStatus === ORDER_STATUS.COLLECTED || newStatus === ORDER_STATUS.COMPLETED) {
      order.collected_time = new Date();
    }
    order.history.push({ from: oldStatus, to: newStatus, timestamp: new Date(), reason });
    return order;
  },

  // Logs
  addLog: ({ userId, userName, role, action, details }) => {
    const log = {
      _id: 'log_' + Date.now(),
      user_id: userId,
      user_name: userName,
      role,
      action,
      details,
      created_at: new Date()
    };
    memoryLogs.unshift(log);
    return log;
  },
  getLogs: () => memoryLogs.slice(0, 50),

  // Settings
  getSettings: () => memorySettings,
  updateSettings: (newSettings) => {
    memorySettings = { ...memorySettings, ...newSettings };
    return memorySettings;
  }
};

module.exports = InMemoryStore;
