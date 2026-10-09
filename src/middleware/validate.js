const { z } = require('zod');
const mongoose = require('mongoose');
const { ORDER_STATUS, MENU_ITEM_STATUS, PAYMENT_STATUS, ACCOUNT_STATUS, ROLES } = require('../config/constants');

/**
 * Zod validation middleware factory (A5)
 * @param {z.ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError || (err.issues && Array.isArray(err.issues))) {
        const issues = err.issues || [];
        return res.status(400).json({
          message: 'Input validation failed',
          details: issues.map((e) => ({
            field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
            message: e.message
          }))
        });
      }
      next(err);
    }
  };
};

/**
 * Validates that a route param is a valid MongoDB ObjectId (A5)
 * Returns 400 Bad Request, never 500
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const val = req.params[paramName];
    // Allow order IDs like ORD-20261001-XXXX if specified
    if (val && val.startsWith('ORD-')) {
      return next();
    }
    if (!val || !mongoose.Types.ObjectId.isValid(val)) {
      return res.status(400).json({
        message: `Invalid ID format for parameter '${paramName}': '${val}'`,
        details: {
          parameter: paramName,
          received: val,
          expected: '24-character hexadecimal ObjectId'
        }
      });
    }
    next();
  };
};

// ==========================================
// SCHEMAS (A5)
// ==========================================

// Registration: role cannot be set by client (forced to customer)
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional()
  // role is intentionally excluded so client can NEVER set their own role
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

const orderItemInputSchema = z.object({
  item_id: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Item quantity cannot exceed 20'),
  special_instruction: z.string().max(200, 'Special instruction cannot exceed 200 chars').optional().default('')
});

const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
  pickup_slot: z.string().optional(),
  pickup_time: z.string().datetime().optional().or(z.string().optional()),
  idempotency_key: z.string().max(100).optional(),
  payment_method: z.string().optional().default('cash_on_counter')
});

const cancelOrderSchema = z.object({
  reason: z.string().max(300).optional().default('Cancelled by customer')
});

const updateOrderStatusSchema = z.object({
  status: z.enum(Object.values(ORDER_STATUS), {
    errorMap: () => ({ message: `Invalid status. Must be one of: ${Object.values(ORDER_STATUS).join(', ')}` })
  }),
  delay_reason: z.string().max(300).optional()
});

const updatePaymentStatusSchema = z.object({
  payment_status: z.enum(Object.values(PAYMENT_STATUS), {
    errorMap: () => ({ message: `Invalid payment status. Must be one of: ${Object.values(PAYMENT_STATUS).join(', ')}` })
  }),
  payment_method: z.string().optional()
});

const updatePickupTimeSchema = z.object({
  pickup_time: z.string().optional(),
  pickup_slot: z.string().optional()
}).refine((data) => data.pickup_time || data.pickup_slot, {
  message: 'Must provide pickup_time or pickup_slot'
});

const verifyTokenSchema = z.object({
  token_number: z.string().trim().optional(),
  order_id: z.string().trim().optional(),
  qr_payload: z.string().optional()
}).refine((data) => data.token_number || data.order_id || data.qr_payload, {
  message: 'Must provide token_number, order_id, or qr_payload'
});

const menuItemSchema = z.object({
  item_name: z.string().trim().min(1, 'Item name is required'),
  category: z.string().trim().min(1, 'Category is required'),
  price: z.number().positive('Price must be greater than zero'),
  available_quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  preparation_time: z.number().int().min(1, 'Preparation time must be at least 1 minute'),
  status: z.enum(Object.values(MENU_ITEM_STATUS)).optional(),
  image: z.string().optional().default('')
});

const updateStockAvailabilitySchema = z.object({
  available_quantity: z.number().int().min(0).optional(),
  status: z.enum(Object.values(MENU_ITEM_STATUS)).optional()
});

const canteenSettingsSchema = z.object({
  max_orders_per_slot: z.number().int().min(1).max(200).optional(),
  max_items_per_customer: z.number().int().min(1).max(50).optional(),
  kitchen_capacity: z.number().int().min(1).max(100).optional(),
  slot_interval_minutes: z.number().int().min(5).max(60).optional(),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
  categories: z.array(z.string()).optional()
});

const createStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  account_status: z.enum(Object.values(ACCOUNT_STATUS)).optional()
});

const updateStaffSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional(),
  account_status: z.enum(Object.values(ACCOUNT_STATUS)).optional()
});

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  description: z.string().optional().default(''),
  icon: z.string().optional().default('restaurant'),
  image: z.string().optional().default(''),
  is_active: z.boolean().optional().default(true)
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  is_active: z.boolean().optional()
});

const canteenAccountSchema = z.object({
  name: z.string().trim().min(1, 'Canteen name is required'),
  location: z.string().trim().min(1, 'Location is required'),
  opening_time: z.string().optional().default('08:00'),
  closing_time: z.string().optional().default('20:00'),
  is_active: z.boolean().optional().default(true),
  contact_number: z.string().optional().default('')
});

const updateCanteenAccountSchema = z.object({
  name: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
  is_active: z.boolean().optional(),
  contact_number: z.string().optional()
});

module.exports = {
  validate,
  validateObjectId,
  registerSchema,
  loginSchema,
  createOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  updatePickupTimeSchema,
  verifyTokenSchema,
  menuItemSchema,
  updateStockAvailabilitySchema,
  canteenSettingsSchema,
  createStaffSchema,
  updateStaffSchema,
  categorySchema,
  updateCategorySchema,
  canteenAccountSchema,
  updateCanteenAccountSchema
};

