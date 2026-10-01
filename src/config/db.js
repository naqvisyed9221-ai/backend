const mongoose = require('mongoose');

// Criterion A10: Prevent operations from hanging for 10 seconds if MongoDB is offline
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(`[Database Warning] MONGO_URI is not set in .env.`);
    console.warn(`[Database Warning] Running in in-memory mode until MONGO_URI is configured.`);
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000 // 2 seconds fast timeout
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[Database Warning] Unable to connect to MongoDB: ${error.message}`);
    console.warn(`[Database Info] Backend is running smoothly using responsive In-Memory Data Store.`);
    return false;
  }
};

module.exports = connectDB;

