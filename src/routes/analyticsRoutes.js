const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getManagementAnalytics
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

// Canteen Dashboard stats (Staff, Manager, Admin)
router.get(
  '/dashboard',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  getDashboardMetrics
);

// Advanced sales & operational reports (Manager, Admin)
router.get(
  '/reports',
  authenticate,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  getManagementAnalytics
);

module.exports = router;
