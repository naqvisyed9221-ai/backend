const express = require('express');
const router = express.Router();
const {
  getKitchenQueue,
  updateOrderStatus,
  markOrderDelayed
} = require('../controllers/queueController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const { validate, validateObjectId, updateOrderStatusSchema } = require('../middleware/validate');

// Kitchen / Staff: View live prioritized queue
router.get(
  '/live',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  getKitchenQueue
);

// Update status with strict transition map (A3 & A5)
router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  validateObjectId('id'),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

// Flag order as delayed
router.patch(
  '/:id/delayed',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  validateObjectId('id'),
  markOrderDelayed
);

module.exports = router;
