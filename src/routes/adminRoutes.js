const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserRoleAndStatus,
  getSystemLogs,
  getCanteenSettings,
  updateCanteenSettings
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const { validate, validateObjectId, canteenSettingsSchema } = require('../middleware/validate');

// Settings management
router.get(
  '/settings',
  authenticate,
  getCanteenSettings
);

router.put(
  '/settings',
  authenticate,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  validate(canteenSettingsSchema),
  updateCanteenSettings
);

// Admin-only user management (Criterion A5: ObjectId validation)
router.get(
  '/users',
  authenticate,
  authorize(ROLES.ADMIN),
  getAllUsers
);

router.patch(
  '/users/:id/role-status',
  authenticate,
  authorize(ROLES.ADMIN),
  validateObjectId('id'),
  updateUserRoleAndStatus
);

router.get(
  '/logs',
  authenticate,
  authorize(ROLES.ADMIN),
  getSystemLogs
);

module.exports = router;
