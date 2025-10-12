import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds - prevent hanging requests
  timeoutErrorMessage: 'Request timeout - please try again',
});

// Request interceptor - Simple prefix-based token management
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    return config;
  }
  
  // Add token to admin and auth routes only
  // Public routes (/public/*) and magic link picks (/picks/*) don't get admin token
  if (config.url?.startsWith('/admin/') || config.url?.startsWith('/auth/')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Global response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log all errors for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      const currentPath = window.location.pathname;
      
      // Don't auto-logout on auth endpoints (login, password reset, etc.)
      // Let the component handle those errors
      if (!isAuthEndpoint) {
        // Clear tokens on any other 401 error
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        
        // Redirect to login if we're in the admin section
        if (currentPath.startsWith('/admin') && currentPath !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      }
    }
    
    // Handle timeout errors
    else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('Request timeout - server may be overloaded or unreachable');
      // Enhance error message for components
      error.userMessage = 'Request timeout. Please check your connection and try again.';
    }
    
    // Handle network errors
    else if (!error.response) {
      console.error('Network error - unable to reach server');
      error.userMessage = 'Unable to connect to server. Please check your internet connection.';
    }
    
    // Handle 5xx server errors
    else if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.response.data);
      error.userMessage = 'Server error occurred. Please try again later.';
    }
    
    // Handle 403 Forbidden errors
    else if (error.response?.status === 403) {
      console.error('Forbidden - insufficient permissions');
      error.userMessage = error.response.data?.error || 'You do not have permission to perform this action.';
    }
    
    // Handle 404 Not Found errors
    else if (error.response?.status === 404) {
      console.error('Resource not found');
      error.userMessage = error.response.data?.error || 'Resource not found.';
    }
    
    return Promise.reject(error);
  }
);

export default api;
