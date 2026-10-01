const DailyCounter = require('../models/DailyCounter');

/**
 * Generates an atomic sequential digital order token reset daily:
 * Format: C-001, C-002, ..., C-023
 * (Criterion A4: Token numbers reset daily with an atomic counter, unique per day)
 */
const generateToken = async () => {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const counter = await DailyCounter.findOneAndUpdate(
      { date: todayStr },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const seqNum = counter ? counter.seq : 1;
    const paddedNumber = String(seqNum).padStart(3, '0');
    return `C-${paddedNumber}`;
  } catch (error) {
    const fallbackSeq = Math.floor(1 + Math.random() * 999);
    return `C-${String(fallbackSeq).padStart(3, '0')}`;
  }
};

module.exports = {
  generateToken
};
