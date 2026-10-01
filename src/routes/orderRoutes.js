const express = require('express');
const router = express.Router();
const {
  createPreOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getPickupSlots
} = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const { validate, validateObjectId, createOrderSchema, cancelOrderSchema } = require('../middleware/validate');

// Pickup slots inquiry
router.get('/pickup-slots', getPickupSlots);

// Place Pre-Order (Criterion A5: Zod validation)
router.post(
  '/',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  validate(createOrderSchema),
  createPreOrder
);

// Get order history
router.get(
  '/',
  authenticate,
  getOrders
);

// Get specific order details (Criterion A5: ObjectId validation returns 400)
router.get(
  '/:id',
  authenticate,
  validateObjectId('id'),
  getOrderById
);

// Cancel order before preparation starts
router.post(
  '/:id/cancel',
  authenticate,
  validateObjectId('id'),
  validate(cancelOrderSchema),
  cancelOrder
);

module.exports = router;
