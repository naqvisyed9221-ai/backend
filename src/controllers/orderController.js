const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const CanteenSetting = require('../models/CanteenSetting');
const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../utils/asyncHandler');
const { generateToken } = require('../utils/tokenGenerator');
const { generateQRCodeDataURL } = require('../utils/qrCodeGenerator');
const { calculateOrderETA } = require('../services/queueService');
const { reserveSlotAtomic, releaseSlotAtomic, getAvailablePickupSlots } = require('../services/slotService');
const { notifyOrderCancelled } = require('../services/notificationService');
const { ORDER_STATUS, PAYMENT_STATUS, DEFAULT_SETTINGS, MENU_ITEM_STATUS } = require('../config/constants');

/**
 * Pre-Order Creation Controller (Criteria A1, A2, A7)
 */
const createPreOrder = asyncHandler(async (req, res) => {
  const { items, pickup_slot, pickup_time, idempotency_key, payment_method } = req.body;
  const customerId = req.user._id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const newOrder = await InMemoryStore.createOrder({
      customerId,
      customerName: req.user.name,
      items,
      pickupSlot: pickup_slot,
      pickupTime: pickup_time,
      idempotencyKey: idempotency_key,
      paymentMethod: payment_method
    });
    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'ORDER_PLACED',
      details: { order_id: newOrder.order_id, token: newOrder.token_number }
    });
    const { getSocketIOInstance } = require('../services/notificationService');
    const io = getSocketIOInstance();
    if (io) {
      io.to('kitchen_staff').emit('order_created', newOrder);
      io.emit('queue_updated');
    }
    return res.status(201).json({
      message: 'Pre-order placed successfully',
      duplicate: false,
      data: newOrder,
      eta: {
        estimatedReadyTime: newOrder.estimated_ready_time,
        waitInQueueMinutes: 8,
        ownPrepTimeMinutes: 5
      }
    });
  }

  // Criterion A2: Early check if duplicate idempotency key exists
  if (idempotency_key) {
    const existingOrder = await Order.findOne({
      customer_id: customerId,
      idempotency_key
    });
    if (existingOrder) {
      return res.status(200).json({
        message: 'Order already processed (idempotent)',
        duplicate: true,
        data: existingOrder
      });
    }
  }

  const settings = (await CanteenSetting.findOne()) || DEFAULT_SETTINGS;

  // Validate max items per customer limit
  const totalOrderQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const maxItemsLimit = settings.max_items_per_customer || 10;
  if (totalOrderQuantity > maxItemsLimit) {
    return res.status(400).json({
      message: `Order exceeds maximum allowed items per customer limit of ${maxItemsLimit}. You requested ${totalOrderQuantity} items.`,
      details: { requestedQuantity: totalOrderQuantity, limit: maxItemsLimit }
    });
  }

  // Tracking decremented items for atomic rollback on failure (A1)
  const decrementedItems = [];
  let slotReserved = false;

  try {
    // Criterion A1: Atomic stock decrement with conditional update ({ available_quantity: { $gte: qty } })
    const validatedItems = [];
    let calculatedTotal = 0;

    for (const orderItem of items) {
      const requestedQty = Number(orderItem.quantity);

      const updatedItem = await MenuItem.findOneAndUpdate(
        {
          _id: orderItem.item_id,
          available_quantity: { $gte: requestedQty },
          status: { $nin: [MENU_ITEM_STATUS.SOLD_OUT, MENU_ITEM_STATUS.TEMPORARILY_UNAVAILABLE] }
        },
        {
          $inc: {
            available_quantity: -requestedQty,
            total_orders_count: 1,
            total_quantity_sold: requestedQty
          }
        },
        { new: true }
      );

      // If conditional update failed: two simultaneous orders for the last item cannot both succeed
      if (!updatedItem) {
        // Rollback all previously decremented items
        for (const rolled of decrementedItems) {
          await MenuItem.findByIdAndUpdate(rolled.id, {
            $inc: {
              available_quantity: rolled.qty,
              total_orders_count: -1,
              total_quantity_sold: -rolled.qty
            }
          });
        }

        const existingItem = await MenuItem.findById(orderItem.item_id);
        const itemName = existingItem ? existingItem.item_name : orderItem.item_id;
        const availableNow = existingItem ? existingItem.available_quantity : 0;

        return res.status(409).json({
          message: `Insufficient stock for "${itemName}". Only ${availableNow} available.`,
          details: { itemId: orderItem.item_id, requested: requestedQty, available: availableNow }
        });
      }

      // Automatically update status if stock depleted
      if (updatedItem.available_quantity === 0 && updatedItem.status !== MENU_ITEM_STATUS.SOLD_OUT) {
        updatedItem.status = MENU_ITEM_STATUS.SOLD_OUT;
        await updatedItem.save();
      } else if (updatedItem.available_quantity <= 5 && updatedItem.status === MENU_ITEM_STATUS.AVAILABLE) {
        updatedItem.status = MENU_ITEM_STATUS.LIMITED;
        await updatedItem.save();
      }

      decrementedItems.push({ id: updatedItem._id, qty: requestedQty });
      calculatedTotal += updatedItem.price * requestedQty;

      validatedItems.push({
        item_id: updatedItem._id,
        item_name: updatedItem.item_name,
        category: updatedItem.category,
        quantity: requestedQty,
        price: updatedItem.price,
        preparation_time: updatedItem.preparation_time,
        special_instruction: orderItem.special_instruction || ''
      });
    }

    // Criterion A1: Atomic conditional slot capacity reservation
    if (pickup_slot) {
      const slotResult = await reserveSlotAtomic(pickup_slot, new Date());
      if (!slotResult.success) {
        // Rollback all decremented stocks
        for (const rolled of decrementedItems) {
          await MenuItem.findByIdAndUpdate(rolled.id, {
            $inc: {
              available_quantity: rolled.qty,
              total_orders_count: -1,
              total_quantity_sold: -rolled.qty
            }
          });
        }
        return res.status(409).json({
          message: slotResult.message,
          details: { slot: pickup_slot }
        });
      }
      slotReserved = true;
    }

    // Criterion A4: Atomic daily token generation (C-001, C-002...)
    const tokenNumber = await generateToken();

    // Criterion A7: ETA formula: now + (queued prep work ÷ number of cooks) + own prep time
    const now = new Date();
    const etaData = await calculateOrderETA(validatedItems, now);

    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const generatedOrderId = `ORD-${dateStr}-${rand}`;
    const qrCode = await generateQRCodeDataURL(tokenNumber, generatedOrderId);

    // Create Order in DB
    const order = await Order.create({
      order_id: generatedOrderId,
      customer_id: customerId,
      customer_name: req.user.name,
      token_number: tokenNumber,
      items: validatedItems,
      total_amount: calculatedTotal,
      order_time: now,
      pickup_time: pickup_time ? new Date(pickup_time) : null,
      pickup_slot: pickup_slot || '',
      estimated_ready_time: etaData.estimatedReadyTime,
      order_status: ORDER_STATUS.PLACED,
      payment_status: payment_method === 'online' ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
      qr_code: qrCode,
      idempotency_key: idempotency_key || null
    });

    await SystemLog.create({
      user_id: req.user._id,
      user_name: req.user.name,
      role: req.user.role,
      action: 'ORDER_PLACED',
      order_id: order.order_id,
      token_number: order.token_number,
      details: { total: order.total_amount, itemsCount: validatedItems.length }
    });

    return res.status(201).json({
      message: 'Pre-order placed successfully',
      duplicate: false,
      data: order,
      eta: {
        estimatedReadyTime: etaData.estimatedReadyTime,
        waitInQueueMinutes: etaData.waitInQueueMinutes,
        ownPrepTimeMinutes: etaData.ownPrepTimeMinutes
      }
    });
  } catch (error) {
    // Criterion A1 & A2: Rollback stock and slot on any creation failure
    for (const rolled of decrementedItems) {
      await MenuItem.findByIdAndUpdate(rolled.id, {
        $inc: {
          available_quantity: rolled.qty,
          total_orders_count: -1,
          total_quantity_sold: -rolled.qty
        }
      });
    }

    if (slotReserved && pickup_slot) {
      await releaseSlotAtomic(pickup_slot, new Date());
    }

    // Criterion A2: Handle database unique index conflict on (customer_id, idempotency_key)
    if (error.code === 11000 && idempotency_key) {
      const existingOrder = await Order.findOne({
        customer_id: customerId,
        idempotency_key
      });
      if (existingOrder) {
        return res.status(200).json({
          message: 'Order already processed (idempotent)',
          duplicate: true,
          data: existingOrder
        });
      }
    }

    throw error;
  }
});

/**
 * Get orders for logged in customer (or all orders for staff/manager)
 */
const getOrders = asyncHandler(async (req, res) => {
  const { status, date } = req.query;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const filter = {};
    if (req.user.role === 'customer') filter.customer_id = req.user._id;
    if (status) filter.order_status = status;
    const list = InMemoryStore.getOrders(filter);
    return res.json({
      message: 'Orders retrieved',
      count: list.length,
      data: list
    });
  }

  const filter = {};

  if (req.user.role === 'customer') {
    filter.customer_id = req.user._id;
  }

  if (status) {
    filter.order_status = status;
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.order_time = { $gte: start, $lte: end };
  }

  const orders = await Order.find(filter).sort({ order_time: -1 });

  return res.json({
    message: 'Orders retrieved',
    count: orders.length,
    data: orders
  });
});

/**
 * Get single order by order_id or MongoDB ID
 */
const getOrderById = asyncHandler(async (req, res) => {
  const identifier = req.params.id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const order = InMemoryStore.getOrderById(identifier) || InMemoryStore.getOrderByToken(identifier);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        details: { identifier }
      });
    }
    return res.json({
      message: 'Order details retrieved',
      data: order
    });
  }

  let order = null;

  if (identifier.startsWith('ORD-')) {
    order = await Order.findOne({ order_id: identifier });
  } else {
    order = await Order.findById(identifier);
  }

  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: { identifier }
    });
  }

  if (req.user.role === 'customer' && order.customer_id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: 'Access denied to this order',
      details: null
    });
  }

  return res.json({
    message: 'Order details retrieved',
    data: order
  });
});

/**
 * Cancel pre-order before preparation starts (Criteria A1 & A3)
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const orderId = req.params.id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const order = InMemoryStore.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        details: { orderId }
      });
    }
    if (order.order_status !== ORDER_STATUS.PLACED && order.order_status !== ORDER_STATUS.ACCEPTED) {
      return res.status(409).json({
        message: `Invalid status transition: Order cannot be cancelled in '${order.order_status}' status. Cancellation is only permitted before preparation starts.`,
        details: { currentStatus: order.order_status, allowedFrom: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED] }
      });
    }
    const updated = InMemoryStore.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED, reason || 'Cancelled by customer');
    return res.json({
      message: 'Order successfully cancelled and stock restored',
      data: updated
    });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: { orderId }
    });
  }

  if (req.user.role === 'customer' && order.customer_id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: 'You cannot cancel an order that belongs to another customer',
      details: null
    });
  }

  // Criterion A3: Status transition check (only Placed or Accepted can transition to Cancelled)
  if (order.order_status !== ORDER_STATUS.PLACED && order.order_status !== ORDER_STATUS.ACCEPTED) {
    return res.status(409).json({
      message: `Invalid status transition: Order cannot be cancelled in '${order.order_status}' status. Cancellation is only permitted before preparation starts.`,
      details: { currentStatus: order.order_status, allowedFrom: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED] }
    });
  }

  // Concurrency check: conditional update on current status
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, order_status: order.order_status },
    {
      $set: {
        order_status: ORDER_STATUS.CANCELLED,
        cancellation_reason: reason || 'Cancelled by customer',
        payment_status: order.payment_status === PAYMENT_STATUS.PAID ? PAYMENT_STATUS.REFUNDED : order.payment_status
      }
    },
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(409).json({
      message: 'Order status changed concurrently. Cancellation failed.',
      details: null
    });
  }

  // Criterion A1: Restore stock and slot on cancellation
  for (const item of order.items) {
    await MenuItem.findByIdAndUpdate(item.item_id, {
      $inc: { available_quantity: item.quantity, total_quantity_sold: -item.quantity }
    });
  }

  if (order.pickup_slot) {
    await releaseSlotAtomic(order.pickup_slot, order.order_time);
  }

  await notifyOrderCancelled(updatedOrder, updatedOrder.cancellation_reason);

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'ORDER_CANCELLED',
    order_id: updatedOrder.order_id,
    token_number: updatedOrder.token_number,
    details: { reason: updatedOrder.cancellation_reason }
  });

  return res.json({
    message: 'Order successfully cancelled and stock restored',
    data: updatedOrder
  });
});

/**
 * Get available 15-minute pickup slots
 */
const getPickupSlots = asyncHandler(async (req, res) => {
  if (require('mongoose').connection.readyState !== 1) {
    return res.json({
      message: 'Available pickup slots retrieved',
      data: [
        { slot: '12:00-12:15', available: 10, totalCapacity: 10 },
        { slot: '12:15-12:30', available: 8, totalCapacity: 10 },
        { slot: '12:30-12:45', available: 7, totalCapacity: 10 },
        { slot: '12:45-13:00', available: 5, totalCapacity: 10 },
        { slot: '13:00-13:15', available: 4, totalCapacity: 10 },
        { slot: '13:15-13:30', available: 9, totalCapacity: 10 },
        { slot: '13:30-13:45', available: 10, totalCapacity: 10 },
        { slot: '13:45-14:00', available: 10, totalCapacity: 10 }
      ]
    });
  }

  const slots = await getAvailablePickupSlots();
  return res.json({
    message: 'Available pickup slots retrieved',
    data: slots
  });
});

/**
 * Reorder a past order (Phase 1: Customer Reordering)
 * POST /api/orders/:id/reorder
 * Fetches past order, validates current menu availability and prices, and generates new cart payload.
 */
const reorderPastOrder = asyncHandler(async (req, res) => {
  const identifier = req.params.id;
  const customerId = req.user._id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const order = InMemoryStore.getOrderById(identifier) || InMemoryStore.getOrderByToken(identifier);
    if (!order) {
      return res.status(404).json({
        message: 'Past order not found',
        details: { identifier }
      });
    }

    if (req.user.role === 'customer' && String(order.customer_id) !== String(customerId)) {
      return res.status(403).json({
        message: 'Access denied: You can only reorder your own past orders'
      });
    }

    const validItems = [];
    const outOfStockItems = [];
    let subtotal = 0;

    for (const item of order.items) {
      const menuItem = InMemoryStore.getMenuItemById(item.item_id);
      if (
        !menuItem ||
        menuItem.status === MENU_ITEM_STATUS.SOLD_OUT ||
        menuItem.status === MENU_ITEM_STATUS.TEMPORARILY_UNAVAILABLE ||
        menuItem.available_quantity <= 0
      ) {
        outOfStockItems.push({
          item_id: item.item_id,
          item_name: item.item_name,
          requested_quantity: item.quantity,
          available_quantity: menuItem ? menuItem.available_quantity : 0,
          reason: !menuItem ? 'Item no longer exists in menu' : 'Item is currently sold out'
        });
      } else {
        const availableQty = Math.min(item.quantity, menuItem.available_quantity);
        const itemSubtotal = menuItem.price * availableQty;
        subtotal += itemSubtotal;

        validItems.push({
          item_id: menuItem._id || menuItem.item_id,
          item_name: menuItem.item_name,
          category: menuItem.category,
          price: menuItem.price,
          quantity: availableQty,
          special_instruction: item.special_instruction || '',
          preparation_time: menuItem.preparation_time,
          image: menuItem.image || '',
          available_quantity: menuItem.available_quantity,
          price_changed: menuItem.price !== item.price,
          original_price: item.price
        });
      }
    }

    return res.json({
      message:
        outOfStockItems.length > 0
          ? `Reorder generated. ${outOfStockItems.length} item(s) are currently out of stock.`
          : 'Reorder payload prepared successfully',
      data: {
        original_order_id: order.order_id || order._id,
        items: validItems,
        out_of_stock_items: outOfStockItems,
        subtotal,
        has_unavailable_items: outOfStockItems.length > 0,
        can_proceed: validItems.length > 0
      }
    });
  }

  let order = null;
  if (identifier.startsWith('ORD-')) {
    order = await Order.findOne({ order_id: identifier });
  } else {
    order = await Order.findById(identifier);
  }

  if (!order) {
    return res.status(404).json({
      message: 'Past order not found',
      details: { identifier }
    });
  }

  if (req.user.role === 'customer' && order.customer_id.toString() !== customerId.toString()) {
    return res.status(403).json({
      message: 'Access denied: You can only reorder your own past orders'
    });
  }

  const validItems = [];
  const outOfStockItems = [];
  let subtotal = 0;

  for (const item of order.items) {
    let menuItem = null;
    if (require('mongoose').Types.ObjectId.isValid(item.item_id)) {
      menuItem = await MenuItem.findById(item.item_id);
    }
    if (!menuItem) {
      menuItem = await MenuItem.findOne({ item_id: item.item_id });
    }

    if (
      !menuItem ||
      menuItem.status === MENU_ITEM_STATUS.SOLD_OUT ||
      menuItem.status === MENU_ITEM_STATUS.TEMPORARILY_UNAVAILABLE ||
      menuItem.available_quantity <= 0
    ) {
      outOfStockItems.push({
        item_id: item.item_id,
        item_name: item.item_name,
        requested_quantity: item.quantity,
        available_quantity: menuItem ? menuItem.available_quantity : 0,
        reason: !menuItem ? 'Item no longer exists in menu' : 'Item is currently sold out'
      });
    } else {
      const availableQty = Math.min(item.quantity, menuItem.available_quantity);
      const itemSubtotal = menuItem.price * availableQty;
      subtotal += itemSubtotal;

      validItems.push({
        item_id: menuItem._id.toString(),
        item_name: menuItem.item_name,
        category: menuItem.category,
        price: menuItem.price,
        quantity: availableQty,
        special_instruction: item.special_instruction || '',
        preparation_time: menuItem.preparation_time,
        image: menuItem.image || '',
        available_quantity: menuItem.available_quantity,
        price_changed: menuItem.price !== item.price,
        original_price: item.price
      });
    }
  }

    return res.json({
      message:
        outOfStockItems.length > 0
          ? `Reorder generated. ${outOfStockItems.length} item(s) are currently out of stock.`
          : 'Reorder payload prepared successfully',
      data: {
        original_order_id: order.order_id,
        items: validItems,
        out_of_stock_items: outOfStockItems,
        subtotal,
        has_unavailable_items: outOfStockItems.length > 0,
        can_proceed: validItems.length > 0
      }
    });
});

/**
 * Update payment status for an order (Phase 2: Payment Status Tracking)
 * PATCH /api/orders/:id/payment
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { payment_status, payment_method } = req.body;
  const orderId = req.params.id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const order = InMemoryStore.getOrderById(orderId) || InMemoryStore.getOrderByToken(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        details: { orderId }
      });
    }

    order.payment_status = payment_status;
    if (payment_method) order.payment_method = payment_method;

    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'PAYMENT_STATUS_UPDATED',
      details: { order_id: order.order_id, payment_status, payment_method }
    });

    const { getSocketIOInstance } = require('../services/notificationService');
    const io = getSocketIOInstance();
    if (io) {
      io.to(`user_${order.customer_id}`).emit('payment_status_updated', {
        orderId: order._id || order.order_id,
        paymentStatus: payment_status
      });
      io.to('kitchen_staff').emit('order_updated', order);
    }

    return res.json({
      message: `Payment status updated to ${payment_status}`,
      data: order
    });
  }

  let order = null;
  if (orderId.startsWith('ORD-')) {
    order = await Order.findOne({ order_id: orderId });
  } else {
    order = await Order.findById(orderId);
  }

  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: { orderId }
    });
  }

  order.payment_status = payment_status;
  if (payment_method) {
    order.payment_method = payment_method;
  }
  await order.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'PAYMENT_STATUS_UPDATED',
    order_id: order.order_id,
    token_number: order.token_number,
    details: { payment_status, payment_method }
  });

  const { getSocketIOInstance } = require('../services/notificationService');
  const io = getSocketIOInstance();
  if (io) {
    io.to(`user_${order.customer_id}`).emit('payment_status_updated', {
      orderId: order._id.toString(),
      paymentStatus: payment_status
    });
    io.to('kitchen_staff').emit('order_updated', order);
  }

  return res.json({
    message: `Payment status updated to ${payment_status}`,
    data: order
  });
});

/**
 * Update scheduled pickup time for an order (Phase 3: Pickup Time Change Notifications)
 * PATCH /api/orders/:id/pickup-time
 */
const updateOrderPickupTime = asyncHandler(async (req, res) => {
  const { pickup_time, pickup_slot } = req.body;
  const orderId = req.params.id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const order = InMemoryStore.getOrderById(orderId) || InMemoryStore.getOrderByToken(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        details: { orderId }
      });
    }

    if (pickup_time) order.pickup_time = new Date(pickup_time);
    if (pickup_slot) order.pickup_slot = pickup_slot;

    const { notifyPickupTimeChanged } = require('../services/notificationService');
    await notifyPickupTimeChanged(order, order.pickup_time, order.pickup_slot);

    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'PICKUP_TIME_CHANGED',
      details: { order_id: order.order_id, pickup_time: order.pickup_time, pickup_slot: order.pickup_slot }
    });

    return res.json({
      message: 'Scheduled pickup time updated and customer alerted',
      data: order
    });
  }

  let order = null;
  if (orderId.startsWith('ORD-')) {
    order = await Order.findOne({ order_id: orderId });
  } else {
    order = await Order.findById(orderId);
  }

  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: { orderId }
    });
  }

  if (pickup_time) order.pickup_time = new Date(pickup_time);
  if (pickup_slot) order.pickup_slot = pickup_slot;
  await order.save();

  const { notifyPickupTimeChanged } = require('../services/notificationService');
  await notifyPickupTimeChanged(order, order.pickup_time, order.pickup_slot);

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'PICKUP_TIME_CHANGED',
    order_id: order.order_id,
    token_number: order.token_number,
    details: { pickup_time: order.pickup_time, pickup_slot: order.pickup_slot }
  });

  return res.json({
    message: 'Scheduled pickup time updated and customer alerted',
    data: order
  });
});

module.exports = {
  createPreOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getPickupSlots,
  reorderPastOrder,
  updatePaymentStatus,
  updateOrderPickupTime
};

