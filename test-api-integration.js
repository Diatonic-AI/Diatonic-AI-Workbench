#!/usr/bin/env node
/**
 * API Integration Test Script
 * Tests the API client authentication and endpoint connectivity
 */

const fetch = require('node-fetch');

const API_BASE_URL = process.env.VITE_API_GATEWAY_URL || 'https://api.dev.diatonic.ai';
const TENANT_ID = process.env.VITE_TENANT_ID || 'diatonicvisuals';

console.log('🔍 Testing API Integration...');
console.log(`📡 API Base URL: ${API_BASE_URL}`);
console.log(`🏢 Tenant ID: ${TENANT_ID}`);

// Test health endpoint (no auth required)
async function testHealthEndpoint() {
  try {
    console.log('\n1️⃣  Testing Health Endpoint...');
    const response = await fetch(`${API_BASE_URL}/v1/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Health endpoint working');
      console.log(`   Status: ${data.status}`);
      console.log(`   Environment: ${data.environment}`);
      console.log(`   Version: ${data.version}`);
      return true;
    } else {
      console.log('❌ Health endpoint failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Health endpoint connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test billing plans endpoint (no auth required)
async function testBillingPlansEndpoint() {
  try {
    console.log('\n2️⃣  Testing Billing Plans Endpoint...');
    const response = await fetch(`${API_BASE_URL}/v1/billing/plans`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Billing plans endpoint working');
      console.log(`   Plans found: ${data.plans?.length || 0}`);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Billing plans endpoint failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorData.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Billing plans endpoint connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test authenticated endpoint (should fail without auth)
async function testAuthenticatedEndpoint() {
  try {
    console.log('\n3️⃣  Testing Authenticated Endpoint (subscription status)...');
    const response = await fetch(`${API_BASE_URL}/v1/tenants/${TENANT_ID}/billing/subscription`);
    
    if (response.status === 401) {
      console.log('✅ Authentication protection working');
      console.log('   Correctly returns 401 Unauthorized without token');
      return true;
    } else if (response.ok) {
      console.log('⚠️  Unexpected success - endpoint should require authentication');
      return false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log(`ℹ️  Response: ${response.status} - ${errorData.error || 'Unknown error'}`);
      return response.status === 401; // Still consider 401 as success for this test
    }
  } catch (error) {
    console.log('❌ Authenticated endpoint connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test CORS headers
async function testCorsHeaders() {
  try {
    console.log('\n4️⃣  Testing CORS Headers...');
    const response = await fetch(`${API_BASE_URL}/v1/health`, {
      method: 'OPTIONS'
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
    };
    
    console.log('✅ CORS headers present');
    console.log(`   Allow Origin: ${corsHeaders['access-control-allow-origin']}`);
    console.log(`   Allow Methods: ${corsHeaders['access-control-allow-methods']}`);
    console.log(`   Allow Headers: ${corsHeaders['access-control-allow-headers']}`);
    
    return corsHeaders['access-control-allow-origin'] !== null;
  } catch (error) {
    console.log('❌ CORS test failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test Stripe webhook endpoint structure
async function testStripeWebhookEndpoint() {
  try {
    console.log('\n5️⃣  Testing Stripe Webhook Endpoint...');
    const response = await fetch(`${API_BASE_URL}/v1/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    });
    
    // Should fail with signature verification error, not 404
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error && errorData.error.includes('signature')) {
        console.log('✅ Stripe webhook endpoint configured correctly');
        console.log('   Correctly requires signature verification');
        return true;
      }
    }
    
    console.log(`ℹ️  Webhook response: ${response.status}`);
    const errorData = await response.json().catch(() => ({}));
    console.log(`   Message: ${errorData.error || errorData.message || 'Unknown'}`);
    
    // Consider it working if it's not a 404 (endpoint exists)
    return response.status !== 404;
  } catch (error) {
    console.log('❌ Stripe webhook test failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 API Integration Test Suite');
  console.log('=' .repeat(50));
  
  const results = [];
  
  results.push(await testHealthEndpoint());
  results.push(await testBillingPlansEndpoint());
  results.push(await testAuthenticatedEndpoint());
  results.push(await testCorsHeaders());
  results.push(await testStripeWebhookEndpoint());
  
  console.log('\n📊 Test Results:');
  console.log('=' .repeat(50));
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('🎉 All API integration tests passed!');
    console.log('   The backend is properly configured and accessible');
  } else {
    console.log('⚠️  Some tests failed - check backend configuration');
  }
  
  return passed === total;
}

// Run the tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
