const express = require('express');
const router = express.Router();
const {
  getDemandPrediction,
  getPeakTimePrediction,
  getPrepForecast,
  getFoodRecommendations,
  getWastePrediction,
  getDelayPrediction,
  getSalesInsights
} = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

// 1. Food Demand Prediction
router.get(
  '/demand-prediction',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  getDemandPrediction
);

// 2. Peak-Time Prediction
router.get(
  '/peak-time-prediction',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  getPeakTimePrediction
);

// 3. Food Preparation Forecasting
router.get(
  '/prep-forecasting',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  getPrepForecast
);

// 4. Smart Food Recommendation (Available to customers for personalized suggestions)
router.get(
  '/recommendations',
  authenticate,
  getFoodRecommendations
);

// 5. Food Waste Prediction
router.get(
  '/waste-prediction',
  authenticate,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  getWastePrediction
);

// 6. Order Delay Prediction
router.get(
  '/delay-prediction',
  authenticate,
  authorize(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
  getDelayPrediction
);

// 7. AI Sales Insights
router.get(
  '/sales-insights',
  authenticate,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  getSalesInsights
);

module.exports = router;
