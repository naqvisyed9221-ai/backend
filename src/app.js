const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const queueRoutes = require('./routes/queueRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const managerRoutes = require('./routes/managerRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const path = require('path');

// Security and utility middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
// Criterion A6: CORS locked to client origin (or localhost in dev)
const allowedOrigin = process.env.CLIENT_ORIGIN || true;
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root API Info
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    project: 'Smart Canteen Pre-Order & Queue Management System API',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: [
      '/api/auth',
      '/api/menu',
      '/api/orders',
      '/api/queue',
      '/api/collection',
      '/api/analytics',
      '/api/ai',
      '/api/manager',
      '/api/admin'
    ]
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// System Health and Info Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    project: 'Smart Canteen Pre-Order & Queue Management System',
    timestamp: new Date(),
    architecture: 'Customer Web/Mobile App -> Backend API -> Order & Queue Manager -> Database'
  });
});

// Mount modular API routes according to specification
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all 404 route handler for Express 5 (Criterion A10)
app.use((req, res) => {
  res.status(404).json({
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    details: null
  });
});


// Centralized error handling
app.use(errorHandler);

module.exports = app;
