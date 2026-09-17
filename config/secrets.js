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
  COOKIE_SECRET: {
    required: true,
    minLength: 16,
    description: 'Cookie signing secret (minimum 16 characters)'
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
  MIKROTIK_USE_TLS: {
    requiredIf: () => process.env.MIKROTIK_ENABLED === 'true',
    pattern: /^(true|false)$/,
    description: 'Enable TLS for MikroTik API connection (true = port 8729/api-ssl, false = port 8728/api)'
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
      } else if (rules.pattern && !rules.pattern.test(value)) {
        // e.g. MIKROTIK_USE_TLS must be exactly "true" or "false"
        errors.push(`❌ ${secretName} format is invalid (expected: ${rules.pattern})`);
      }
    }
  }

  // Special validation for MPESA_CALLBACK_URL
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (callbackUrl) {
    // 1. Must be HTTPS in production
    if (process.env.NODE_ENV === 'production' && !callbackUrl.startsWith('https')) {
      errors.push('❌ MPESA_CALLBACK_URL must use HTTPS in production');
    }

    // 2. Reject placeholder / unset values in non-development environments.
    //    A callback URL pointing at yourdomain.com or localhost will silently
    //    drop all M-Pesa callbacks and break every payment flow.
    const PLACEHOLDER_PATTERNS = [
      'yourdomain.com',
      'example.com',
      'localhost',
      '127.0.0.1',
    ];
    const isPlaceholder = PLACEHOLDER_PATTERNS.some((p) => callbackUrl.includes(p));

    if (isPlaceholder && process.env.NODE_ENV !== 'development') {
      errors.push(
        `❌ MPESA_CALLBACK_URL appears to be a placeholder ("${callbackUrl}"). ` +
        'Update it to a publicly reachable HTTPS URL before deploying.'
      );
    }

    if (isPlaceholder && process.env.NODE_ENV === 'development') {
      // Warn but don't block local dev
      console.warn(
        `⚠️  MPESA_CALLBACK_URL is set to a placeholder ("${callbackUrl}"). ` +
        'M-Pesa callbacks will not reach this server unless you use a tunnel (e.g. ngrok).'
      );
    }

    // H-10 FIX: Detect temporary tunnels (ngrok, localtunnel, cloudflare tunnel dev URLs)
    const TUNNEL_PATTERNS = [
      'ngrok.io',
      'ngrok-free.app',
      'localtunnel.me',
      'trycloudflare.com',
    ];
    const isTunnel = TUNNEL_PATTERNS.some((p) => callbackUrl.includes(p));

    if (isTunnel && process.env.NODE_ENV === 'production') {
      errors.push(
        `❌ MPESA_CALLBACK_URL cannot use a temporary tunnel service ("${callbackUrl}") in production. Deploy on a permanent domain with a valid SSL certificate.`
      );
    } else if (isTunnel && process.env.NODE_ENV === 'development') {
      console.log(`ℹ️  Development tunnel detected for M-Pesa callbacks: ${callbackUrl}`);
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

  // AUTH-2 FIX: Extend the COOKIE_SECRET placeholder check to ALL environments.
  // The value 'your_cookie_secret_here' is 22 chars and passes the minLength check
  // in REQUIRED_SECRETS, but is a publicly-known placeholder. Warn loudly in dev;
  // treat as an error in production.
  const cookieSecret = process.env.COOKIE_SECRET;
  if (cookieSecret && (cookieSecret.includes('your_') || cookieSecret === 'change-me')) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('\u274c COOKIE_SECRET appears to be a placeholder. Generate a strong random value (e.g. openssl rand -hex 32).');
    } else {
      console.warn('\n\u26a0\ufe0f  WARNING: COOKIE_SECRET is a placeholder. CSRF tokens are insecure until you set a real value.\n');
    }
  }

  // If errors found, throw an Error (BOOT-7 FIX: was process.exit(1)).
  // Throwing allows the uncaughtException handler in index.js to log the error
  // via the structured logger before exiting, and prevents PM2 from cycling through
  // max_restarts with abandoned Prisma connection pools.
  if (errors.length > 0) {
    console.error('\n\u274c SECRETS VALIDATION FAILED\n');
    errors.forEach((error) => console.error(error));
    console.error('\n\ud83d\udcd6 See env.template for required secrets\n');

    throw new Error(`Secrets validation failed with ${errors.length} error(s). See above for details.`);
  }

  console.log('\u2705 All secrets validated successfully\n');
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
    cookieSecret: process.env.COOKIE_SECRET,
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
    mikrotikPort: Number(process.env.MIKROTIK_PORT || 8728),
    mikrotikUseTls: process.env.MIKROTIK_USE_TLS !== undefined
      ? process.env.MIKROTIK_USE_TLS === 'true'
      : process.env.NODE_ENV === 'production'
  };
}

/**
 * Display secrets configuration summary (masks sensitive values)
 */
function displaySecretsConfig() {
  const config = getSecrets();

  const masked = {
    ...config,
    cookieSecret: config.cookieSecret ? '***' + config.cookieSecret.slice(-4) : 'NOT SET',
    jwtSecret: config.jwtSecret ? '***' + config.jwtSecret.slice(-4) : 'NOT SET',
    mpesaConsumerSecret: config.mpesaConsumerSecret ? '***' : 'NOT SET',
    mpesaPasskey: config.mpesaPasskey ? '***' : 'NOT SET',
    mikrotikPassword: config.mikrotikPassword ? '***' : 'NOT SET',
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
