module.exports = {
  apps: [
    {
      name: 'tripflow',
      script: './server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production',
        NODE_NO_WARNINGS: '1',
        PORT: '3013',
        HOST: '127.0.0.1',
        BASE_PATH: '/viajes',
        SEED_CHINA: 'true'
      }
    }
  ]
};
