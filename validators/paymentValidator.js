/**
 * Payment validation schema and utilities
 * Ensures all payment inputs are validated before processing
 */

const VALID_PACKAGES = {
  '1Hr': { amount: 10, duration: 1 * 60 * 60 * 1000, label: '1 Hour', speed: '2 Mbps' },
  '4Hrs': { amount: 15, duration: 4 * 60 * 60 * 1000, label: '4 Hours', speed: '3 Mbps' },
  '12Hrs': { amount: 20, duration: 12 * 60 * 60 * 1000, label: '12 Hours', speed: '4 Mbps' },
  '24Hrs': { amount: 30, duration: 24 * 60 * 60 * 1000, label: '24 Hours', speed: '5 Mbps' }
};

/**
 * Validate phone number format
 * Accepts: 2547XXXXXXXX, 254712345678, +254712345678
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone must be a string' };
  }

  // Normalize: remove + and leading 0
  let normalized = phone.replace(/^\+/, '');
  if (normalized.startsWith('0')) {
    normalized = '254' + normalized.substring(1);
  }

  // Validate format: 254 7 XXXXXXXX (12 digits)
  if (!/^2547\d{8}$/.test(normalized)) {
    return {
      valid: false,
      error: 'Invalid phone format. Use 2547XXXXXXXX or 07XXXXXXXX',
      normalized: null
    };
  }

  return { valid: true, normalized };
}

/**
 * Validate MAC address format
 * Accepts: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
 */
function validateMAC(mac) {
  if (!mac || typeof mac !== 'string') {
    return { valid: false, error: 'MAC address must be a string' };
  }

  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  if (!macRegex.test(mac)) {
    return { valid: false, error: 'Invalid MAC address format (use AA:BB:CC:DD:EE:FF)' };
  }

  return { valid: true, normalized: mac.toUpperCase() };
}

/**
 * Validate payment amount matches package
 */
function validateAmount(amount, packageKey) {
  const pkg = VALID_PACKAGES[packageKey];

  if (!pkg) {
    return { valid: false, error: `Invalid package: ${packageKey}` };
  }

  const parsedAmount = Number(amount);
  if (parsedAmount !== pkg.amount) {
    return {
      valid: false,
      error: `Amount mismatch: ${packageKey} costs ${pkg.amount}, got ${parsedAmount}`
    };
  }

  return { valid: true, package: pkg };
}

/**
 * Comprehensive payment initiation validation
 */
function validatePaymentInitiation(data) {
  const errors = [];

  // Phone validation
  const phoneValidation = validatePhone(data.phone);
  if (!phoneValidation.valid) {
    errors.push(phoneValidation.error);
  }

  // MAC validation
  const macValidation = validateMAC(data.macAddress);
  if (!macValidation.valid) {
    errors.push(macValidation.error);
  }

  // Amount validation
  const amountValidation = validateAmount(data.amount, data.package);
  if (!amountValidation.valid) {
    errors.push(amountValidation.error);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    phone: phoneValidation.normalized,
    mac: macValidation.normalized,
    amount: amountValidation.package.amount,
    package: amountValidation.package
  };
}

/**
 * Validate M-Pesa callback data structure
 */
function validateCallbackStructure(body) {
  const errors = [];

  if (!body?.Body?.stkCallback) {
    errors.push('Invalid callback structure: missing Body.stkCallback');
  }

  const callback = body?.Body?.stkCallback;

  if (!callback?.CheckoutRequestID) {
    errors.push('Missing CheckoutRequestID');
  }

  if (callback?.ResultCode === undefined && callback?.ResultCode === null) {
    errors.push('Missing ResultCode');
  }

  if (callback?.ResultCode === 0) {
    // Success - validate metadata
    if (!callback?.CallbackMetadata?.Item || !Array.isArray(callback.CallbackMetadata.Item)) {
      errors.push('Invalid CallbackMetadata structure');
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

module.exports = {
  VALID_PACKAGES,
  validatePhone,
  validateMAC,
  validateAmount,
  validatePaymentInitiation,
  validateCallbackStructure
};
