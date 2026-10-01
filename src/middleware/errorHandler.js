/**
 * Centralized Error Handling Middleware (A10 & A5)
 * Consistent { message, details } JSON, no stack traces in responses
 */
const errorHandler = (err, req, res, next) => {
  // Zod validation errors (Criterion A5)
  if (err.name === 'ZodError' || (err.issues && Array.isArray(err.issues))) {
    const issues = err.issues || err.errors || [];
    const details = issues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
      message: e.message
    }));
    return res.status(400).json({
      message: 'Input validation failed',
      details
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      message: 'Validation Error',
      details
    });
  }

  // CastError (e.g. invalid MongoDB ObjectId - A5 requirement)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid identifier format: '${err.value}'`,
      details: {
        field: err.path,
        expectedType: 'ObjectId'
      }
    });
  }

  // Mongoose duplicate key error (code 11000 - A2)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      message: `A record with this ${field} already exists.`,
      details: err.keyValue
    });
  }

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  return res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    details: err.details || null
  });
};

module.exports = errorHandler;
