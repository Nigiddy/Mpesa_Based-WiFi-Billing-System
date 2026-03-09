const pino = require('pino');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');

// Ensure log directory exists synchronously on startup
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR);
  } catch (error) {
    console.error('Failed to create log directory:', error);
    // In this critical case, we can't log to file, so we exit or log to console
  }
}

// Define targets for logging
const targets = [
  {
    level: 'info',
    target: 'pino/file', // Use pino's built-in file transport
    options: { destination: LOG_FILE, mkdir: true } // mkdir ensures path exists
  }
];

// Add console logging only if not in production for cleaner production logs
if (process.env.NODE_ENV !== 'production') {
  targets.push({
    level: 'info',
    target: 'pino-pretty', // Makes logs human-readable
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  });
}

const transport = pino.transport({ targets });
const logger = pino(transport);

/**
 * Audit logger for critical actions, powered by Pino.
 *
 * @param {string} action - The action being logged (e.g., 'payment_success').
 * @param {object} details - A JSON object with context about the event.
 * @param {string | object} [user=null] - Optional user identifier.
 */
function logAudit(action, details = {}, user = null) {
  // The first object passed to a pino logger function is merged into the JSON log line.
  logger.info({ action, user, details }, `Audit: ${action}`);
}

module.exports = { logAudit, logger };

