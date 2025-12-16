/**
 * Frontend Environment Configuration
 * Centralizes all environment variables for easy access
 */

export const config = {
  // API Configuration  
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  
  // Application Info
  appName: import.meta.env.VITE_APP_NAME || 'Finan',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
};

// Freeze config to prevent accidental modifications
Object.freeze(config);

export default config;
