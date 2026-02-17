/**
 * Validation middleware for express
 * Provides standardized request validation with consistent error responses
 */

const { validatePaymentInitiation, validateCallbackStructure } = require('../validators/paymentValidator');

/**
 * Middleware to validate payment initiation requests
 */
const validatePaymentInitiationMiddleware = (req, res, next) => {
  try {
    const { phone, amount, macAddress, package: pkg } = req.body;

    if (!phone || !amount || !macAddress || !pkg) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phone, amount, macAddress, package'
      });
    }

    const validation = validatePaymentInitiation({
      phone,
      amount,
      macAddress,
      package: pkg
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Attach validated data to request for use in route handler
    req.validatedPayment = validation;
    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
};

/**
 * Middleware to validate M-Pesa callback structure
 */
const validateCallbackMiddleware = (req, res, next) => {
  try {
    const validation = validateCallbackStructure(req.body);

    if (!validation.valid) {
      console.error('❌ Invalid callback structure:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid callback format',
        details: validation.errors
      });
    }

    next();
  } catch (error) {
    console.error('Callback validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
};

/**
 * Generic validation middleware for request body validation
 * Usage: app.use(bodyValidationMiddleware((req) => validateSomething(req.body)))
 */
const bodyValidationMiddleware = (validator) => {
  return (req, res, next) => {
    try {
      const validation = validator(req.body);

      if (validation.valid === false) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors || [validation.error]
        });
      }

      req.validated = validation;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
};

module.exports = {
  validatePaymentInitiationMiddleware,
  validateCallbackMiddleware,
  bodyValidationMiddleware
};
