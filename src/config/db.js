const dns = require('dns');
const mongoose = require('mongoose');

// Configure reliable DNS servers to ensure Atlas SRV record resolution across all Windows network adapters
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Use system default DNS if setServers is unavailable
}

/**
 * Robust MongoDB Connection Manager
 * Features:
 * - Public DNS fallback for Windows SRV queries
 * - TLS/SSL compatibility settings
 * - Connection pooling (maxPoolSize, minPoolSize)
 * - Auto-reconnect listeners with logging
 * - Graceful shutdown handling
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen';

  const mongooseOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,
    minPoolSize: 5,
    family: 4, // Force IPv4
    tls: uri.includes('mongodb+srv') || uri.includes('ssl=true'),
    tlsAllowInvalidCertificates: true
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
