// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { useState, useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import api from '../../utils/api';
import { headingClasses } from '../../styles/commonClasses';
import logger from '../../utils/logger';

export default function ApiDocs() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        setLoading(true);
        const response = await api.get('/docs/json');
        setSpec(response.data);
        setError(null);
      } catch (err: any) {
        logger.error('Failed to load OpenAPI spec', err);
        setError('Failed to load API documentation. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  // Apply light mode styles when Swagger UI renders
  useEffect(() => {
    if (!spec) return;

    // Remove any existing style tags
    const existingStyle = document.getElementById('swagger-ui-light-mode');
    if (existingStyle) existingStyle.remove();

    // Apply light mode styles (always use light mode regardless of theme)
    const style = document.createElement('style');
    style.id = 'swagger-ui-light-mode';
    style.textContent = `
      .swagger-ui { background: #ffffff !important; }
      .swagger-ui .topbar { display: none !important; }
      .swagger-ui .topbar-wrapper { display: none !important; }
      .swagger-ui .swagger-ui-wrap { margin-top: 0 !important; padding-top: 0 !important; background: #ffffff !important; }
      .swagger-ui .info { margin-top: 0 !important; padding-top: 20px !important; background: #ffffff !important; }
      .swagger-ui .info .title { color: #3b82f6 !important; }
      .swagger-ui .info .title small { color: #6b7280 !important; }
      .swagger-ui .info .base-url { color: #6b7280 !important; }
      .swagger-ui .info .description { color: #374151 !important; }
      .swagger-ui .info .description p { color: #374151 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById('swagger-ui-light-mode');
      if (styleToRemove) styleToRemove.remove();
    };
  }, [spec]);

  // Get auth token for Swagger UI
  const getAuthToken = () => {
    return localStorage.getItem('adminToken') || '';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className={headingClasses}>API Documentation</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className={headingClasses}>API Documentation</h2>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className={headingClasses}>API Documentation</h2>
      <div className="w-full bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="swagger-container">
          <SwaggerUI
            spec={spec}
            deepLinking={true}
            displayRequestDuration={true}
            tryItOutEnabled={true}
            requestInterceptor={(request: any) => {
              // Add auth token to requests if available
              const token = getAuthToken();
              if (token && (request.url.includes('/api/admin/') || request.url.includes('/api/auth/'))) {
                request.headers = {
                  ...request.headers,
                  Authorization: `Bearer ${token}`,
                };
              }
              return request;
            }}
            onComplete={(_system: any) => {
              // Styles are applied via useEffect, no action needed here
            }}
          />
        </div>
      </div>
    </div>
  );
}

