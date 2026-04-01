#!/usr/bin/env node

/**
 * Test script to verify alert API routes functionality
 * Run with: node test-alert-routes.js
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'F=|+OH&(?Jt#{p=]>w?Bq8Vd_!^Q%y1^';

// Test configuration
const TEST_CONFIG = {
  // You'll need to replace these with actual test values
  SESSION_TOKEN: process.env.SESSION_TOKEN || 'YOUR_SESSION_TOKEN_HERE',
  TEST_CONTAINER_ID: process.env.TEST_CONTAINER_ID || 'test-container-id',
  TEST_ENTRY_ID: process.env.TEST_ENTRY_ID || 'test-entry-id',
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`→ ${message}`, colors.yellow);
}

async function testRoute(method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return { status: 0, data: null, ok: false, error: error.message };
  }
}

async function runTests() {
  log('\n🚀 Starting Alert API Routes Verification\n', colors.yellow);

  // Test 1: GET /api/alert-containers (unauthenticated)
  logInfo('Testing GET /api/alert-containers without authentication...');
  const result1 = await testRoute('GET', '/api/alert-containers');
  if (result1.status === 401) {
    logSuccess('Correctly returns 401 for unauthenticated request');
  } else {
    logError(`Expected 401, got ${result1.status}`);
  }

  // Test 2: GET /api/alert-containers (authenticated)
  if (TEST_CONFIG.SESSION_TOKEN !== 'YOUR_SESSION_TOKEN_HERE') {
    logInfo('Testing GET /api/alert-containers with authentication...');
    const result2 = await testRoute('GET', '/api/alert-containers', null, {
      'Cookie': `next-auth.session-token=${TEST_CONFIG.SESSION_TOKEN}`
    });
    if (result2.ok) {
      logSuccess('Successfully retrieved alert containers');
      logInfo(`Found ${result2.data.length} containers`);
    } else {
      logError(`Failed with status ${result2.status}: ${JSON.stringify(result2.data)}`);
    }
  } else {
    logInfo('Skipping authenticated tests - set SESSION_TOKEN environment variable');
  }

  // Test 3: POST /api/cron/smart-alerts (without secret)
  logInfo('Testing POST /api/cron/smart-alerts without CRON_SECRET...');
  const result3 = await testRoute('POST', '/api/cron/smart-alerts');
  if (result3.status === 401) {
    logSuccess('Correctly returns 401 without CRON_SECRET');
  } else {
    logError(`Expected 401, got ${result3.status}`);
  }

  // Test 4: POST /api/cron/smart-alerts (with secret)
  logInfo('Testing POST /api/cron/smart-alerts with CRON_SECRET...');
  const result4 = await testRoute('POST', '/api/cron/smart-alerts', null, {
    'Authorization': `Bearer ${CRON_SECRET}`
  });
  if (result4.ok) {
    logSuccess('Cron job executed successfully');
    logInfo(`Processed: ${result4.data.processed}, Papers added: ${result4.data.papersAdded}`);
  } else {
    logError(`Failed with status ${result4.status}: ${JSON.stringify(result4.data)}`);
  }

  // Test 5: GET /api/cron/smart-alerts (should fail in production)
  logInfo('Testing GET /api/cron/smart-alerts (should fail in production)...');
  const result5 = await testRoute('GET', '/api/cron/smart-alerts');
  if (result5.status === 405) {
    logSuccess('Correctly returns 405 for GET in production');
  } else if (result5.status === 401) {
    logSuccess('Returns 401 (development mode requires admin session)');
  } else {
    logError(`Unexpected status: ${result5.status}`);
  }

  // Test 6: Environment variables check
  logInfo('\nChecking environment variables...');
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'CRON_SECRET',
    'SEMANTIC_SCHOLAR_API_KEY',
    'GOOGLE_AI_API_KEY'
  ];

  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      logSuccess(`${envVar} is set`);
    } else {
      logError(`${envVar} is missing`);
    }
  });

  log('\n✅ Alert API Routes Verification Complete!\n', colors.green);
}

// Run the tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  process.exit(1);
});
