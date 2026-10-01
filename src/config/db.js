const dns = require('dns');
const mongoose = require('mongoose');

// Configure public DNS servers to resolve MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Fallback to system default DNS
}

/**
 * Robust MongoDB Connection Manager
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen';

  const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 2
  };

  try {
    const conn = await mongoose.connect(uri, mongooseOptions);
    console.log(`================================================================`);
    console.log(` [MongoDB] Connected Successfully: ${conn.connection.host}`);
    console.log(` [MongoDB] Database: ${conn.connection.name}`);
    console.log(`================================================================`);
    return true;
  } catch (error) {
    console.error(` [MongoDB Connection Alert] Atlas Connection: ${error.message}`);
    console.info(` [MongoDB Note] Ensure your IP address is whitelisted in MongoDB Atlas (Network Access -> Add 0.0.0.0/0).`);
    console.warn(` [MongoDB Resilient Mode] Backend active with responsive fallback data store.`);
    return false;
  }
};

// Event Listeners for MongoDB lifecycle (Silenced repetitive retry logs on disconnect)
mongoose.connection.on('connected', () => {
  console.log('[MongoDB Lifecycle] Mongoose connected to DB');
});

// Process signal handlers for graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[MongoDB Lifecycle] Connection closed via app termination (SIGINT)');
  process.exit(0);
});

module.exports = connectDB;
