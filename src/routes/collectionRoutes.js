const express = require('express');
const router = express.Router();
const {
  verifyToken,
  confirmCollection,
  markNotCollected
} = require('../controllers/collectionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const { validate, validateObjectId, verifyTokenSchema } = require('../middleware/validate');

// Staff: Verify token / QR code (A4 & A5)
router.post(
  '/verify',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  validate(verifyTokenSchema),
  verifyToken
);

// Staff: Confirm collection
router.post(
  '/confirm',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  confirmCollection
);

// Staff: Mark uncollected
router.patch(
  '/:id/not-collected',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  validateObjectId('id'),
  markNotCollected
);

module.exports = router;
