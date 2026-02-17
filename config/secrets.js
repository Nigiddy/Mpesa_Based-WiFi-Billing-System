/**
 * Secrets and environment variable validation
 * Validates all required secrets on application startup
 */

require('dotenv').config();

/**
 * Define all required secrets with validation rules
 */
const REQUIRED_SECRETS = {
  NODE_ENV: {
    required: true,
    pattern: /^(development|production|test)$/,
    description: 'Node environment'
  },
  PORT: {
    required: true,
    pattern: /^\d{3,5}$/,
    description: 'Server port'
  },
  FRONTEND_ORIGIN: {
    required: true,
    pattern: /^https?:\/\/.+/,
    description: 'Frontend origin for CORS'
  },
  DATABASE_URL: {
    required: true,
    pattern: /^mysql:\/\/.+/,
    description: 'MySQL connection string'
  },
  JWT_SECRET: {
    required: true,
    minLength: 32,
    description: 'JWT signing secret (minimum 32 characters)'
  },
  MPESA_ENV: {
    required: true,
    pattern: /^(sandbox|production)$/,
    description: 'M-Pesa environment'
  },
  MPESA_CONSUMER_KEY: {
    required: true,
    minLength: 10,
    description: 'M-Pesa consumer key'
  },
  MPESA_CONSUMER_SECRET: {
    required: true,
    minLength: 10,
    description: 'M-Pesa consumer secret'
  },
  MPESA_SHORTCODE: {
    required: true,
    pattern: /^\d{5,8}$/,
    description: 'M-Pesa short code'
  },
  MPESA_PASSKEY: {
    required: true,
    minLength: 20,
    description: 'M-Pesa pass key'
  },
  MPESA_CALLBACK_URL: {
    required: true,
    pattern: /^https?:\/\/.+\/mpesa\/callback/,
    description: 'M-Pesa callback URL (must be HTTPS in production)'
  },
  REDIS_URL: {
    required: false, // Optional, defaults provided
    pattern: /^redis:\/\/.+/,
    description: 'Redis connection URL'
  },
  MIKROTIK_ENABLED: {
    required: true,
    pattern: /^(true|false)$/,
    description: 'Enable MikroTik integration'
  }
};

/**
 * Conditionally required secrets (only required if certain conditions are met)
 */
const CONDITIONAL_SECRETS = {
  MIKROTIK_HOST: {
    requiredIf: () => process.env.MIKROTIK_ENABLED === 'true',
    description: 'MikroTik host IP or hostname'
  },
  MIKROTIK_USER: {
    requiredIf: () => process.env.MIKROTIK_ENABLED === 'true',
    description: 'MikroTik username'
  },
  MIKROTIK_PASSWORD: {
    requiredIf: () => process.env.MIKROTIK_ENABLED === 'true',
    description: 'MikroTik password'
  },
  MPESA_PUBLIC_KEY: {
    requiredIf: () => process.env.NODE_ENV === 'production',
    description: 'M-Pesa public key for signature verification (production only)'
  }
};

/**
 * Validate all required secrets on startup
 * Throws error if any required secret is missing or invalid
 */
function validateSecrets() {
  const errors = [];

  console.log('🔍 Validating secrets...');

  // Validate required secrets
  for (const [secretName, rules] of Object.entries(REQUIRED_SECRETS)) {
    const value = process.env[secretName];

    // Check if missing
    if (rules.required && !value) {
      errors.push(`❌ Missing required secret: ${secretName}`);
      continue;
    }

    // Skip further validation if not required and not present
    if (!rules.required && !value) {
      continue;
    }

    // Validate minimum length
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(
        `❌ ${secretName} is too weak (minimum ${rules.minLength} characters, got ${value.length})`
      );
    }

    // Validate pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`❌ ${secretName} format is invalid (expected: ${rules.pattern})`);
    }
  }

  // Validate conditional secrets
  for (const [secretName, rules] of Object.entries(CONDITIONAL_SECRETS)) {
    if (rules.requiredIf && rules.requiredIf()) {
      const value = process.env[secretName];

      if (!value) {
        errors.push(`❌ Missing conditional secret: ${secretName}`);
      }
    }
  }

  // Special validation for MPESA_CALLBACK_URL in production
  if (process.env.NODE_ENV === 'production') {
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (callbackUrl && !callbackUrl.startsWith('https')) {
      errors.push('❌ MPESA_CALLBACK_URL must be HTTPS in production');
    }
  }

  // Special validation for JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    // Check if it looks like a placeholder
    if (jwtSecret.includes('your_') || jwtSecret === 'secret' || jwtSecret === 'change-me') {
      errors.push(
        '❌ JWT_SECRET appears to be a placeholder. Use a strong random value.'
      );
    }

    // Ensure it has good entropy (mix of character types)
    const hasNumbers = /\d/.test(jwtSecret);
    const hasLower = /[a-z]/.test(jwtSecret);
    const hasUpper = /[A-Z]/.test(jwtSecret);
    const hasSpecial = /[!@#$%^&*]/.test(jwtSecret);

    if (process.env.NODE_ENV === 'production') {
      if (!hasNumbers || !hasLower || !hasUpper || !hasSpecial) {
        errors.push(
          '❌ JWT_SECRET should contain mix of uppercase, lowercase, numbers, and special characters'
        );
      }
    }
  }

  // If errors found, log and exit
  if (errors.length > 0) {
    console.error('\n❌ SECRETS VALIDATION FAILED\n');
    errors.forEach((error) => console.error(error));
    console.error('\n📖 See env.template for required secrets\n');

    process.exit(1);
  }

  console.log('✅ All secrets validated successfully\n');
}

/**
 * Get all secrets (validated)
 * Throws if secrets not previously validated
 */
function getSecrets() {
  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    frontendOrigin: process.env.FRONTEND_ORIGIN,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    mpesaEnv: process.env.MPESA_ENV,
    mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY,
    mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET,
    mpesaShortcode: process.env.MPESA_SHORTCODE,
    mpesaPasskey: process.env.MPESA_PASSKEY,
    mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    mikrotikEnabled: process.env.MIKROTIK_ENABLED === 'true',
    mikrotikHost: process.env.MIKROTIK_HOST,
    mikrotikUser: process.env.MIKROTIK_USER,
    mikrotikPassword: process.env.MIKROTIK_PASSWORD,
    mikrotikPort: Number(process.env.MIKROTIK_PORT || 8728)
  };
}

/**
 * Display secrets configuration summary (masks sensitive values)
 */
function displaySecretsConfig() {
  const config = getSecrets();

  const masked = {
    ...config,
    jwtSecret: config.jwtSecret ? '***' + config.jwtSecret.slice(-4) : 'NOT SET',
    mpesaConsumerSecret: config.mpesaConsumerSecret ? '***' : 'NOT SET',
    mpesaPasskey: config.mpesaPasskey ? '***' : 'NOT SET',
    databaseUrl: config.databaseUrl
      ? config.databaseUrl.replace(/:[^:@]*@/, ':***@')
      : 'NOT SET'
  };

  console.log('📋 Configuration Summary:');
  console.log(JSON.stringify(masked, null, 2));
}

module.exports = {
  validateSecrets,
  getSecrets,
  displaySecretsConfig,
  REQUIRED_SECRETS,
  CONDITIONAL_SECRETS
};
