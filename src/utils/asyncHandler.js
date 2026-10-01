/**
 * Async Handler Wrapper
 * Catches unhandled promise rejections and forwards them to next(error)
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
