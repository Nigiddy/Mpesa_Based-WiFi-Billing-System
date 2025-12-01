// Simple audit logger for critical actions
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../logs/audit.log');

function logAudit(action, details = {}, user = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    user,
    details,
  };
  fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', err => {
    if (err) console.error('Audit log error:', err);
  });
}

module.exports = { logAudit };
