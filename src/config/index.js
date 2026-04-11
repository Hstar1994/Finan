require('dotenv').config();

module.exports = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'finan_db',
    username: process.env.DB_USER || 'finan',
    password: process.env.DB_PASSWORD || 'finan123',
    dialect: 'postgres',
    url: process.env.DATABASE_URL || 
      `postgres://${process.env.DB_USER || 'finan'}:${process.env.DB_PASSWORD || 'finan123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'finan_db'}`,
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
  // Keep backward compatibility with 'db' alias
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'finan_db',
    username: process.env.DB_USER || 'finan',
    password: process.env.DB_PASSWORD || 'finan123',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === 'production' ? 20 : 5),
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: 30000,
      idle: 10000,
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
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5173', // Vite default port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000'
    ]
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:8080'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
