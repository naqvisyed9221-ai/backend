const asyncHandler = require('../utils/asyncHandler');
const {
  predictFoodDemand,
  predictPeakTime,
  forecastPrepQuantities,
  getSmartFoodRecommendations,
  predictFoodWaste,
  predictOrderDelays,
  generateAISalesInsights
} = require('../services/aiService');

const getDemandPrediction = asyncHandler(async (req, res) => {
  const { day, hour } = req.query;
  const result = await predictFoodDemand(day, hour);
  return res.json({ message: 'Demand prediction calculated', data: result });
});

const getPeakTimePrediction = asyncHandler(async (req, res) => {
  const result = await predictPeakTime();
  return res.json({ message: 'Peak-time prediction calculated', data: result });
});

const getPrepForecast = asyncHandler(async (req, res) => {
  const result = await forecastPrepQuantities();
  return res.json({ message: 'Food preparation forecasting calculated', data: result });
});

const getFoodRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user._id : null;
  const result = await getSmartFoodRecommendations(userId);
  return res.json({ message: 'Food recommendations retrieved', data: result });
});

const getWastePrediction = asyncHandler(async (req, res) => {
  const result = await predictFoodWaste();
  return res.json({ message: 'Food waste prediction calculated', data: result });
});

const getDelayPrediction = asyncHandler(async (req, res) => {
  const result = await predictOrderDelays();
  return res.json({ message: 'Order delay prediction calculated', data: result });
});

const getSalesInsights = asyncHandler(async (req, res) => {
  const result = await generateAISalesInsights();
  return res.json({ message: 'Executive sales insights generated', data: result });
});

module.exports = {
  getDemandPrediction,
  getPeakTimePrediction,
  getPrepForecast,
  getFoodRecommendations,
  getWastePrediction,
  getDelayPrediction,
  getSalesInsights
};
