require('dotenv').config();

module.exports = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'finan_db',
    username: process.env.DB_USER || 'finan',
    password: process.env.DB_PASSWORD || 'finan123',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      // Max connections: Higher in production for better concurrency
      max: parseInt(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === 'production' ? 20 : 5),
      // Min connections: Maintain warm connections to avoid cold starts
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      // Time to wait for connection before throwing error
      acquire: 30000,
      // Time a connection can be idle before being released
      idle: 10000,
      // Check for idle connections every second
      evict: 1000
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};
