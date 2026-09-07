module.exports = {
  apps: [
    {
      name: 'kibaruani-backend',
      script: 'index.js',
      instances: 1, // Single instance ensures WebSocket connections & BullMQ workers stay coordinated
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      listen_timeout: 8000,
      // BOOT-14 FIX: kill_timeout must be > the forced-exit setTimeout in index.js
      // (12 000 ms). Previously 5 000 ms meant PM2 sent SIGKILL before Node's own
      // graceful-shutdown handler had time to close workers, Redis, and Prisma.
      kill_timeout: 14000,
    },
  ],
};
