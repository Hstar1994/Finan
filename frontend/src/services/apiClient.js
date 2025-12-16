import axios from 'axios';
import { config } from '../config/env';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (requestConfig) => {
    // Add authentication token to requests
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (config.isDevelopment) {
      console.log('🚀 Request:', requestConfig.method.toUpperCase(), requestConfig.url);
      if (requestConfig.data) {
        console.log('📤 Data:', requestConfig.data);
      }
    }

    return requestConfig;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (config.isDevelopment) {
      console.log('✅ Response:', response.config.url, response.status);
    }

    // Return data directly (standardized response format)
    return response.data;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      // Log error in development
      if (config.isDevelopment) {
        console.error('❌ Response Error:', error.config?.url, status, data?.message);
      }

      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.warn('🔒 Unauthorized: Redirecting to login...');
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login';
          break;

        case 403:
          // Forbidden - insufficient permissions
          console.warn('⛔ Forbidden: Insufficient permissions');
          break;

        case 404:
          // Not found
          console.warn('🔍 Not Found:', error.config?.url);
          break;

        case 429:
          // Rate limited
          const retryAfter = error.response.headers['retry-after'] || 60;
          console.warn(`⏱️ Rate Limited: Retry after ${retryAfter} seconds`);
          error.retryAfter = retryAfter;
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('🔥 Server Error:', status);
          break;

        default:
          console.error('❌ Error:', status, data?.message);
      }

      // Return standardized error object
      return Promise.reject({
        message: data?.message || 'An error occurred',
        errors: data?.errors || null,
        status,
        retryAfter: error.retryAfter,
      });
    } else if (error.request) {
      // Request made but no response received (network error)
      console.error('🌐 Network Error: No response from server');
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        status: 0,
      });
    } else {
      // Something happened in setting up the request
      console.error('⚠️ Request Setup Error:', error.message);
      return Promise.reject({
        message: error.message || 'Request failed',
        status: 0,
      });
    }
  }
);

// Helper methods for common HTTP operations
export const api = {
  // GET request
  get: (url, config) => apiClient.get(url, config),

  // POST request
  post: (url, data, config) => apiClient.post(url, data, config),

  // PUT request
  put: (url, data, config) => apiClient.put(url, data, config),

  // DELETE request
  delete: (url, config) => apiClient.delete(url, config),

  // PATCH request
  patch: (url, data, config) => apiClient.patch(url, data, config),
};

export default apiClient;
