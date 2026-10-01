const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  updateStockAndAvailability,
  deleteMenuItem
} = require('../controllers/menuController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const {
  validate,
  validateObjectId,
  menuItemSchema,
  updateStockAvailabilitySchema
} = require('../middleware/validate');

// Browse & search menu items
router.get('/', getMenuItems);
router.get('/:id', validateObjectId('id'), getMenuItemById);

// Staff / Manager / Admin: Update real-time availability and stock count
router.patch(
  '/:id/availability',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  validateObjectId('id'),
  validate(updateStockAvailabilitySchema),
  updateStockAndAvailability
);

// Manager / Admin: CRUD operations
router.post(
  '/',
  authenticate,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  validate(menuItemSchema),
  createMenuItem
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  validateObjectId('id'),
  validate(menuItemSchema),
  updateMenuItem
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  validateObjectId('id'),
  deleteMenuItem
);

module.exports = router;
