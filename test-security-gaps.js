#!/usr/bin/env node

/**
 * Quick Security Assessment Script
 * Tests the current API implementation for security gaps
 */

const API_BASE = 'http://localhost:3001/api';

async function testEndpoint(method, path, headers = {}, body = null) {
  const url = `${API_BASE}${path}`;
  console.log(`\n🔍 Testing: ${method} ${url}`);
  
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
    const responseText = await response.text();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers))}`);
    
    if (responseText) {
      try {
        const json = JSON.parse(responseText);
        console.log(`   Body: ${JSON.stringify(json, null, 2)}`);
      } catch {
        console.log(`   Body: ${responseText.substring(0, 200)}...`);
      }
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: responseText
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { error: error.message };
  }
}

async function runSecurityAssessment() {
  console.log('🔒 AI Nexus Workbench API Security Assessment');
  console.log('==============================================\n');

  // Test 1: Check if endpoints require authentication
  console.log('📋 TEST 1: Authentication Requirements');
  const protectedEndpoints = [
    { method: 'GET', path: '/toolset-items' },
    { method: 'POST', path: '/toolset-items' },
    { method: 'GET', path: '/lab-experiments' },
    { method: 'POST', path: '/lab-experiments' },
    { method: 'GET', path: '/dashboard-metrics' },
    { method: 'GET', path: '/community-posts' },
    { method: 'GET', path: '/education-courses' }
  ];

  const authResults = {};
  for (const endpoint of protectedEndpoints) {
    const result = await testEndpoint(endpoint.method, endpoint.path);
    authResults[`${endpoint.method} ${endpoint.path}`] = {
      requiresAuth: result.status === 401,
      actualStatus: result.status,
      hasAuthHeader: result.headers && result.headers['www-authenticate']
    };
  }

  console.log('\n📊 Authentication Test Results:');
  Object.entries(authResults).forEach(([endpoint, result]) => {
    const status = result.requiresAuth ? '✅ PROTECTED' : '❌ UNPROTECTED';
    console.log(`   ${endpoint}: ${status} (Status: ${result.actualStatus})`);
  });

  // Test 2: Check for security headers
  console.log('\n📋 TEST 2: Security Headers');
  const healthCheck = await testEndpoint('GET', '/health');
  const securityHeaders = [
    'x-frame-options',
    'x-content-type-options', 
    'referrer-policy',
    'content-security-policy',
    'strict-transport-security'
  ];

  console.log('\n🛡️  Security Headers Analysis:');
  securityHeaders.forEach(header => {
    const present = healthCheck.headers && healthCheck.headers[header];
    const status = present ? '✅ PRESENT' : '❌ MISSING';
    const value = present ? `(${healthCheck.headers[header]})` : '';
    console.log(`   ${header}: ${status} ${value}`);
  });

  // Test 3: Test for injection vulnerabilities
  console.log('\n📋 TEST 3: Input Validation');
  const xssPayload = '<script>alert("XSS")</script>';
  const sqlPayload = "'; DROP TABLE users; --";
  
  const injectionTests = [
    { method: 'GET', path: `/toolset-items?search=${encodeURIComponent(xssPayload)}` },
    { method: 'GET', path: `/lab-experiments?filter=${encodeURIComponent(sqlPayload)}` },
    { method: 'POST', path: '/toolset-items', body: { name: xssPayload, description: 'test' } },
    { method: 'POST', path: '/lab-experiments', body: { title: sqlPayload, type: 'test' } }
  ];

  const injectionResults = {};
  for (const test of injectionTests) {
    const result = await testEndpoint(test.method, test.path, {}, test.body);
    injectionResults[`${test.method} ${test.path}`] = {
      status: result.status,
      containsPayload: result.body && (result.body.includes(xssPayload) || result.body.includes(sqlPayload)),
      error: result.error
    };
  }

  console.log('\n⚠️  Injection Vulnerability Results:');
  Object.entries(injectionResults).forEach(([endpoint, result]) => {
    const vulnerable = result.containsPayload ? '❌ VULNERABLE' : '✅ SAFE';
    console.log(`   ${endpoint}: ${vulnerable} (Status: ${result.status})`);
  });

  // Test 4: Check for unauthorized access patterns
  console.log('\n📋 TEST 4: Authorization Bypass Attempts');
  const bypassTests = [
    { method: 'GET', path: '/toolset-items', headers: { 'Authorization': 'Bearer invalid-token' } },
    { method: 'GET', path: '/toolset-items', headers: { 'X-User-ID': 'admin' } },
    { method: 'GET', path: '/toolset-items', headers: { 'X-Forwarded-User': 'admin' } },
    { method: 'PUT', path: '/toolset-items/1', body: { name: 'hacked' } },
    { method: 'DELETE', path: '/toolset-items/1' }
  ];

  const bypassResults = {};
  for (const test of bypassTests) {
    const result = await testEndpoint(test.method, test.path, test.headers, test.body);
    bypassResults[`${test.method} ${test.path}`] = {
      status: result.status,
      bypassSuccessful: result.status >= 200 && result.status < 300,
      error: result.error
    };
  }

  console.log('\n🚨 Authorization Bypass Results:');
  Object.entries(bypassResults).forEach(([endpoint, result]) => {
    const bypassed = result.bypassSuccessful ? '❌ BYPASSED' : '✅ BLOCKED';
    console.log(`   ${endpoint}: ${bypassed} (Status: ${result.status})`);
  });

  // Generate Summary Report
  console.log('\n🎯 SECURITY ASSESSMENT SUMMARY');
  console.log('==============================');
  
  const unprotectedCount = Object.values(authResults).filter(r => !r.requiresAuth).length;
  const missingHeadersCount = securityHeaders.filter(h => !healthCheck.headers?.[h]).length;
  const vulnerableInjections = Object.values(injectionResults).filter(r => r.containsPayload).length;
  const successfulBypasses = Object.values(bypassResults).filter(r => r.bypassSuccessful).length;

  console.log(`📊 Critical Findings:`);
  console.log(`   • ${unprotectedCount}/${protectedEndpoints.length} endpoints lack authentication`);
  console.log(`   • ${missingHeadersCount}/${securityHeaders.length} security headers missing`);
  console.log(`   • ${vulnerableInjections}/${injectionTests.length} injection vulnerabilities found`);
  console.log(`   • ${successfulBypasses}/${bypassTests.length} authorization bypasses possible`);

  const riskLevel = unprotectedCount > 5 || successfulBypasses > 3 ? 'HIGH' : 
                   unprotectedCount > 2 || missingHeadersCount > 3 ? 'MEDIUM' : 'LOW';

  console.log(`\n🚨 Overall Risk Level: ${riskLevel}`);
  
  if (riskLevel === 'HIGH') {
    console.log('⚡ IMMEDIATE ACTION REQUIRED:');
    console.log('   1. Implement authentication middleware for ALL endpoints');
    console.log('   2. Add comprehensive input validation');
    console.log('   3. Implement proper authorization checks');
    console.log('   4. Add security headers middleware');
  }

  console.log('\n🔗 Next Steps:');
  console.log('   1. Apply the unified authentication middleware');
  console.log('   2. Run comprehensive security tests');
  console.log('   3. Implement input sanitization');
  console.log('   4. Add security headers and CORS policies');
  console.log('\n✅ Assessment Complete');
}

// Run the assessment
runSecurityAssessment().catch(console.error);