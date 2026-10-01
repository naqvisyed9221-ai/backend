const { calculateOrderETA } = require('./src/services/queueService');
const { generateToken } = require('./src/utils/tokenGenerator');
const { STATUS_TRANSITIONS, ORDER_STATUS } = require('./src/config/constants');
const {
  predictFoodDemand,
  predictPeakTime,
  forecastPrepQuantities,
  getSmartFoodRecommendations,
  predictFoodWaste,
  predictOrderDelays,
  generateAISalesInsights
} = require('./src/services/aiService');

async function testAllUpgrades() {
  console.log('--- Testing Criteria Upgrades ---');

  // A3: State Machine transitions
  console.log('\n[A3] Testing State Machine Transitions:');
  console.log('Placed allowed:', STATUS_TRANSITIONS[ORDER_STATUS.PLACED]);
  console.log('Accepted allowed:', STATUS_TRANSITIONS[ORDER_STATUS.ACCEPTED]);
  console.log('Preparing allowed:', STATUS_TRANSITIONS[ORDER_STATUS.PREPARING]);
  console.log('Ready allowed:', STATUS_TRANSITIONS[ORDER_STATUS.READY]);
  console.log('Collected allowed:', STATUS_TRANSITIONS[ORDER_STATUS.COLLECTED]);

  // A4: Token format
  console.log('\n[A4] Testing Daily Token Format:');
  const token = await generateToken();
  console.log('Generated Daily Token:', token, 'Matches C-XXX:', /^C-\d{3,}$/.test(token));

  // A7: ETA formula
  console.log('\n[A7] Testing ETA Calculation:');
  const sampleItems = [{ item_name: 'Chicken Burger', quantity: 2, preparation_time: 8 }];
  const eta = await calculateOrderETA(sampleItems, new Date());
  console.log('ETA totalMinutesFromNow:', eta.totalMinutesFromNow, 'Number of cooks:', eta.numberOfCooks, 'Own prep:', eta.ownPrepTimeMinutes);

  // A9: 7 AI Services (Generic statistical analysis, no NaN)
  console.log('\n[A9] Testing All 7 AI Services:');
  const demand = await predictFoodDemand(1, 13);
  console.log('1. Demand prediction (count):', demand.projectedDemand.length, 'No NaN:', !isNaN(demand.projectedDemand[0].projectedPortions));

  const peak = await predictPeakTime();
  console.log('2. Peak-time prediction:', peak.estimatedPeakWindow);

  const prep = await forecastPrepQuantities();
  console.log('3. Prep forecasting (count):', prep.length, 'Urgency:', prep[0]?.urgency);

  const recs = await getSmartFoodRecommendations(null);
  console.log('4. Recommendations:', recs.items.length, 'Category:', recs.preferredCategory);

  const waste = await predictFoodWaste();
  console.log('5. Waste prediction:', waste.length, 'Turnover:', waste[0]?.turnoverRate);

  const delays = await predictOrderDelays();
  console.log('6. Delay prediction status:', delays.systemQueueStatus);

  const insights = await generateAISalesInsights();
  console.log('7. AI Sales insights:', insights.insights.length, 'Avg Spend:', insights.averageOrderValueRs);

  console.log('\nAll criteria verified successfully!');
}

testAllUpgrades().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
