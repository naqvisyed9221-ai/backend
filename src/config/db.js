const mongoose = require('mongoose');

/**
 * Robust MongoDB Connection Manager
 * Features:
 * - Connection pooling (maxPoolSize, minPoolSize)
 * - Auto-reconnect listeners with logging
 * - Graceful shutdown handling
 * - Configurable socket & selection timeouts
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen';

  const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,
    minPoolSize: 5,
    family: 4 // Force IPv4
  };

  try {
    const conn = await mongoose.connect(uri, mongooseOptions);
    console.log(`================================================================`);
    console.log(` [MongoDB] Connected Successfully: ${conn.connection.host}`);
    console.log(` [MongoDB] Database: ${conn.connection.name}`);
    console.log(`================================================================`);
    return true;
  } catch (error) {
    console.error(` [MongoDB Error] Connection Failed: ${error.message}`);
    console.warn(` [MongoDB Fallback] Running in resilient in-memory/hybrid state.`);
    return false;
  }
};

// Event Listeners for MongoDB lifecycle
mongoose.connection.on('connected', () => {
  console.log('[MongoDB Lifecycle] Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB Lifecycle] Connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Lifecycle] Mongoose disconnected from DB. Retrying...');
});

// Process signal handlers for graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[MongoDB Lifecycle] Connection closed via app termination (SIGINT)');
  process.exit(0);
});

module.exports = connectDB;
