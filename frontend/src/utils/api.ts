import axios from 'axios';
import logger from './logger';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds - prevent hanging requests
  timeoutErrorMessage: 'Request timeout - please try again',
});

// Helper function to detect if a token is a JWT (legacy format)
const isJWT = (token: string): boolean => {
  // JWTs start with "eyJ" (base64 encoded JSON) and contain dots (3 parts: header.payload.signature)
  return token.startsWith('eyJ') || (token.includes('.') && token.split('.').length === 3);
};

// Request interceptor - Token management for both admin and pick JWTs
api.interceptors.request.use((config) => {
  // Check for admin token first
  const adminToken = localStorage.getItem('adminToken');
  
  // Check for pick token (stored separately)
  const pickToken = localStorage.getItem('pickToken');
  
  logger.debug('API Request', {
    url: config.url,
    method: config.method,
    hasAdminToken: !!adminToken,
    hasPickToken: !!pickToken
  });
  
  // Add admin token to admin, auth, and docs routes (docs require auth in production)
  if (adminToken && (config.url?.startsWith('/admin/') || config.url?.startsWith('/auth/') || config.url?.startsWith('/docs/'))) {
    config.headers.Authorization = `Bearer ${adminToken}`;
    return config;
  }
  
  // Add pick token (magic link token) to pick routes (submit and current endpoints)
  if (pickToken && (config.url?.startsWith('/picks/submit') || config.url?.startsWith('/picks/current'))) {
    // Detect and reject old JWTs
    if (isJWT(pickToken)) {
      logger.warn('Old JWT detected in pickToken during API request, clearing', {
        url: config.url,
        tokenLength: pickToken.length
      });
      localStorage.removeItem('pickToken');
      // Don't add the JWT to the request - let it fail naturally
      return config;
    }
    config.headers.Authorization = `Bearer ${pickToken}`;
    return config;
  }
  
  return config;
});

// Global response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    logger.debug('API Response', {
      url: response.config.url,
      method: response.config.method,
      status: response.status
    });
    return response;
  },
  (error) => {
    // Log all errors with appropriate levels
    const errorData = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    };

    if (error.response?.status >= 500) {
      logger.error('API Server Error', errorData);
    } else if (error.response?.status >= 400) {
      logger.warn('API Client Error', errorData);
    } else {
      logger.error('API Network Error', errorData);
    }

    // Log error details for debugging
    logger.error('API Error:', errorData);

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      const isPickEndpoint = error.config?.url?.includes('/picks/');
      const currentPath = window.location.pathname;
      
      // Don't auto-logout on auth endpoints (login, password reset, etc.)
      // Let the component handle those errors
      if (!isAuthEndpoint) {
        if (isPickEndpoint) {
          // Clear pick token on 401 for pick endpoints
          localStorage.removeItem('pickToken');
        } else {
          // Clear admin tokens on any other 401 error
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          
          // Redirect to login if we're in the admin section
          if (currentPath.startsWith('/admin') && currentPath !== '/admin/login') {
            window.location.href = '/admin/login';
          }
        }
      }
    }
    
    // Handle timeout errors
    else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      logger.error('Request timeout - server may be overloaded or unreachable');
      // Enhance error message for components
      error.userMessage = 'Request timeout. Please check your connection and try again.';
    }
    
    // Handle network errors
    else if (!error.response) {
      logger.error('Network error - unable to reach server');
      error.userMessage = 'Unable to connect to server. Please check your internet connection.';
    }
    
    // Handle 5xx server errors
    else if (error.response?.status >= 500) {
      logger.error('Server error:', { status: error.response.status, data: error.response.data });
      error.userMessage = 'Server error occurred. Please try again later.';
    }
    
    // Handle 403 Forbidden errors
    else if (error.response?.status === 403) {
      logger.error('Forbidden - insufficient permissions');
      error.userMessage = error.response.data?.error || 'You do not have permission to perform this action.';
    }
    
    // Handle 404 Not Found errors
    else if (error.response?.status === 404) {
      logger.error('Resource not found');
      error.userMessage = error.response.data?.error || 'Resource not found.';
    }
    
    return Promise.reject(error);
  }
);

export default api;
