const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const seedInitialData = require('./seed/seedData');
const { setSocketIOInstance } = require('./services/notificationService');
const { startBackgroundMonitor } = require('./services/cronService');

const PORT = process.env.PORT || 5000;

// Catch unexpected exceptions and unhandled promise rejections so nodemon does not crash
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason?.message || reason);
});

const startServer = async () => {
  const server = http.createServer(app);

  // Initialize Socket.io for real-time live kitchen queue updates and notifications (Page 4 & 7)
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
  });

  setSocketIOInstance(io);

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join room for individual customer order notifications
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`[Socket.io] User joined personal room: user_${userId}`);
    });

    // Kitchen staff room for real-time queue synchronization
    socket.on('join_kitchen_room', () => {
      socket.join('kitchen_staff');
      console.log(`[Socket.io] Kitchen staff joined live queue room`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  // Handle server-level errors gracefully
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server Error] Port ${PORT} is already in use by another running process.`);
      console.info(`[Action Required] Terminate the old process or restart the terminal.`);
    } else {
      console.error('[Server Error]', err.message);
    }
  });

  // Start HTTP & WebSocket server
  server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(` Smart Canteen Backend Server running on port ${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(`================================================================`);

    // Criterion A8: Background job every minute (marks delayed, timeout not-collected, pickup approaching notifications)
    startBackgroundMonitor(60000);
  });

  // Attempt database connection asynchronously
  connectDB().then((isConnected) => {
    if (isConnected) {
      seedInitialData();
    }
  }).catch((dbErr) => {
    console.warn(`[Database Handled Error]: ${dbErr.message}`);
  });
};

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
});
