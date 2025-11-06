// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

/**
 * Global setup runs once before all tests
 * Only verifies the app is ready - does NOT change admin credentials
 * The first login test will handle changing admin@example.com to admin2@yourdomain.com
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003/api';

async function globalSetup() {
  console.log('🔧 Verifying test environment...');
  
  try {
    // Just verify the app is healthy and ready
    const healthResponse = await axios.get(`${API_BASE_URL}/healthz`);
    if (healthResponse.status === 200) {
      console.log('✅ Application is ready');
      console.log('📌 First login test will use: admin@example.com / password');
      console.log('📌 After password change, tests will use: admin2@yourdomain.com / Ncc1701d!');
      console.log('✨ Test environment ready!');
    }
  } catch (error: any) {
    console.error('❌ Application not ready:', error.message);
    console.warn('⚠️  Continuing anyway - tests may fail if app is not running');
  }
}

export default globalSetup;

