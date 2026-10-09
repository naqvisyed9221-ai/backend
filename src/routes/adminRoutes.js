const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const {
  validate,
  validateObjectId,
  canteenSettingsSchema,
  categorySchema,
  updateCategorySchema,
  canteenAccountSchema,
  updateCanteenAccountSchema
} = require('../middleware/validate');

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

// Category Management Routes (Phase 5)
router.get(
  '/categories',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getAllCategories
);

router.post(
  '/categories',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(categorySchema),
  createCategory
);

router.patch(
  '/categories/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validateObjectId('id'),
  validate(updateCategorySchema),
  updateCategory
);

router.delete(
  '/categories/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validateObjectId('id'),
  deleteCategory
);

// Canteen Hubs & Accounts Management Routes (Phase 5)
router.get(
  '/canteens',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getAllCanteens
);

router.post(
  '/canteens',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(canteenAccountSchema),
  createCanteen
);

router.patch(
  '/canteens/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validateObjectId('id'),
  validate(updateCanteenAccountSchema),
  updateCanteen
);

router.delete(
  '/canteens/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validateObjectId('id'),
  deleteCanteen
);

module.exports = router;
