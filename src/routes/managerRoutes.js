const express = require('express');
const router = express.Router();
const {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff
} = require('../controllers/managerController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const {
  validate,
  validateObjectId,
  createStaffSchema,
  updateStaffSchema
} = require('../middleware/validate');

// Protect all manager staff routes strictly to MANAGER and ADMIN roles
router.use(authenticate, authorize(ROLES.MANAGER, ROLES.ADMIN));

// Staff Management Routes (Phase 4: Manager Permissions)
router.get('/staff', getStaff);
router.post('/staff', validate(createStaffSchema), createStaff);
router.patch('/staff/:id', validateObjectId('id'), validate(updateStaffSchema), updateStaff);
router.delete('/staff/:id', validateObjectId('id'), deleteStaff);

module.exports = router;
