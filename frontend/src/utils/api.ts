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

// Global response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
    return Promise.reject(error);
  }
);

export default api;
