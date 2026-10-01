/**
 * Smart Canteen Pre-Order & Queue Management System
 * System Constants according to Hackathon Specifications
 */

const ROLES = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
  MANAGER: 'manager',
  ADMIN: 'admin'
};

const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

const MENU_ITEM_STATUS = {
  AVAILABLE: 'Available',
  LIMITED: 'Limited',
  SOLD_OUT: 'Sold Out',
  TEMPORARILY_UNAVAILABLE: 'Temporarily Unavailable'
};

const ORDER_STATUS = {
  PLACED: 'Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COLLECTED: 'Collected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  DELAYED: 'Delayed',
  NOT_COLLECTED: 'Not Collected'
};

const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded'
};

const NOTIFICATION_TYPES = {
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
  ORDER_PREPARING: 'ORDER_PREPARING',
  ORDER_DELAYED: 'ORDER_DELAYED',
  ORDER_READY: 'ORDER_READY',
  PICKUP_APPROACHING: 'PICKUP_APPROACHING',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  PICKUP_TIME_CHANGED: 'PICKUP_TIME_CHANGED',
  SYSTEM_ALERT: 'SYSTEM_ALERT'
};

const DEFAULT_SETTINGS = {
  maxOrdersPerSlot: 20,           // Maximum orders per 15-minute period
  maxItemsPerCustomer: 10,        // Maximum items per single customer order
  maxScheduledPickupsPerSlot: 15, // Maximum number of scheduled pickups per slot
  slotIntervalMinutes: 15,        // 15-minute slot intervals
  kitchenCapacity: 15,            // Average active orders kitchen can handle at once
  uncollectedTimeoutMinutes: 60   // Mark as Not Collected after 60 mins from Ready
};

// Criterion A3: Strict status state machine transition map
const STATUS_TRANSITIONS = {
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED, ORDER_STATUS.DELAYED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.DELAYED],
  [ORDER_STATUS.DELAYED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.READY],
  [ORDER_STATUS.READY]: [ORDER_STATUS.COLLECTED, ORDER_STATUS.NOT_COLLECTED],
  [ORDER_STATUS.COLLECTED]: [ORDER_STATUS.COMPLETED]
};

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  MENU_ITEM_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_TYPES,
  DEFAULT_SETTINGS,
  STATUS_TRANSITIONS
};
