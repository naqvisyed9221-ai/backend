# Smart Canteen Backend API

Backend service for **Smart Canteen Pre-Order & Queue Management System**.

## Quick Start

### 1. Environment Configuration
Ensure `.env` in the root (or `backend/`) contains:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart_canteen
JWT_SECRET=smart_canteen_super_secret_jwt_key_2026
NODE_ENV=development
```

### 2. Start the Server
From the project root:
```bash
npm run dev
# or
npm start
```

Or from inside `backend/`:
```bash
node src/server.js
```

Health check endpoint: `http://localhost:5000/api/health`

## Core API Endpoints

### Auth (`/api/auth`)
- `POST /register`: Create account (`customer`, `staff`, `manager`, `admin`)
- `POST /login`: Log in and receive JWT token
- `GET /me`: Get authenticated user profile

### Menu (`/api/menu`)
- `GET /`: Browse & search menu items (filter by category, price, prep time, popularity)
- `GET /:id`: Get menu item details
- `PATCH /:id/availability`: Real-time stock & status update (`Staff`, `Manager`, `Admin`)
- `POST /`, `PUT /:id`, `DELETE /:id`: Menu item CRUD (`Manager`, `Admin`)

### Orders & Pre-Ordering (`/api/orders`)
- `GET /pickup-slots`: Available 15-minute pickup slots with remaining capacity
- `POST /`: Submit pre-order (with stock deduction, limit validation, token & QR generation)
- `GET /`: Order history (Customer sees own, Staff sees all)
- `GET /:id`: Order details
- `POST /:id/cancel`: Cancel order before preparation starts

### Kitchen Queue (`/api/queue`)
- `GET /live`: Live prioritized kitchen queue with delay detection
- `PATCH /:id/status`: Update status (`Placed` -> `Accepted` -> `Preparing` -> `Ready`)
- `PATCH /:id/delayed`: Mark order as delayed with custom reason

### Order Collection & Verification (`/api/collection`)
- `POST /verify`: Verify token (`C-023`), Order ID, or QR code
- `POST /confirm`: Confirm handover and mark Completed (prevents duplicate collection)
- `PATCH /:id/not-collected`: Mark uncollected orders

### Analytics & Dashboard (`/api/analytics`)
- `GET /dashboard`: Real-time KPI metrics for canteen screen
- `GET /reports`: Detailed managerial sales and queue reports

### AI & Intelligent Features (`/api/ai`)
- `GET /demand-prediction`: Food demand forecast by day/hour
- `GET /peak-time-prediction`: Busiest hours estimation
- `GET /prep-forecasting`: Portion preparation suggestions before rush hours
- `GET /recommendations`: Smart food recommendations for customers
- `GET /waste-prediction`: Food waste and slow-moving item analysis
- `GET /delay-prediction`: Active orders delay probability
- `GET /sales-insights`: Executive sales insights

### Administration (`/api/admin`)
- `GET /users`, `PATCH /users/:id/role-status`: User management
- `GET /settings`, `PUT /settings`: Operational limits (slot caps, customer limits)
- `GET /logs`: Staff activity and system audit logs
