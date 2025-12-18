module.exports = {
  apps: [
    {
      name: 'autocab365connect-server',
      script: './server.js',
      instances: 'max', // Cluster mode: use all CPU cores
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      max_memory_restart: '300M', // Restart if memory exceeds 300MB
    }
  ]
};
