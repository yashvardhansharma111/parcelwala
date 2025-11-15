/**
 * PM2 Ecosystem Configuration
 * For deploying on VPS servers
 */

module.exports = {
  apps: [
    {
      name: "parcel-booking-api",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      // Auto-restart settings
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      // Logging
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Advanced settings
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};

