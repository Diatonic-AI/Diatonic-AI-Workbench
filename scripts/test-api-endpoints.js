#!/usr/bin/env node
/**
 * API Endpoints Integration Test
 * Tests all REST API endpoints for the AI Nexus Workbench
 */

const http = require('http');
const querystring = require('querystring');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_TIMEOUT = 10000; // 10 seconds

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Nexus-Test-Client/1.0'
      },
      timeout: API_TIMEOUT
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedBody
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${API_TIMEOUT}ms`));
    });
    
    if (data && (method === 'POST' || method === 'PUT')) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test suite
async function runAPITests() {
  console.log('🧪 AI Nexus Workbench API Integration Tests');
  console.log('============================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Timeout: ${API_TIMEOUT}ms`);
  console.log('');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test helper function
  const runTest = async (testName, testFn) => {
    results.total++;
    console.log(`🔄 ${testName}...`);
    
    try {
      const result = await testFn();
      if (result.success) {
        console.log(`   ✅ PASS - ${result.message}`);
        results.passed++;
        results.tests.push({ name: testName, status: 'PASS', message: result.message });
      } else {
        console.log(`   ❌ FAIL - ${result.message}`);
        results.failed++;
        results.tests.push({ name: testName, status: 'FAIL', message: result.message });
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      results.failed++;
      results.tests.push({ name: testName, status: 'ERROR', message: error.message });
    }
  };
  
  // Test 1: Health Check
  await runTest('Health Check', async () => {
    const response = await makeRequest('GET', '/api/health');
    
    if (response.status === 200 && response.data.status === 'healthy') {
      return { success: true, message: `Service healthy - DynamoDB: ${response.data.services.dynamodb}` };
    } else {
      return { success: false, message: `Health check failed - Status: ${response.status}, Data: ${JSON.stringify(response.data)}` };
    }
  });
  
  // Test 2: API Info Endpoint
  await runTest('API Info', async () => {
    const response = await makeRequest('GET', '/api');
    
    if (response.status === 200 && response.data.name) {
      return { success: true, message: `API Info retrieved - Version: ${response.data.version}, Environment: ${response.data.environment}` };
    } else {
      return { success: false, message: `API info failed - Status: ${response.status}` };
    }
  });
  
  // Test 3: Get Toolset Items
  await runTest('Get Toolset Items', async () => {
    const response = await makeRequest('GET', '/api/toolset-items');
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      return { success: true, message: `Retrieved ${response.data.count} toolset items` };
    } else {
      return { success: false, message: `Failed to get toolset items - Status: ${response.status}` };
    }
  });
  
  // Test 4: Get Lab Experiments
  await runTest('Get Lab Experiments', async () => {
    const response = await makeRequest('GET', '/api/lab-experiments');
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      return { success: true, message: `Retrieved ${response.data.count} lab experiments` };
    } else {
      return { success: false, message: `Failed to get lab experiments - Status: ${response.status}` };
    }
  });
  
  // Test 5: Get Lab Experiments with Filter
  await runTest('Get Lab Experiments (Filtered)', async () => {
    const response = await makeRequest('GET', '/api/lab-experiments?status=active');
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      const activeCount = response.data.data.filter(exp => exp.status === 'active').length;
      return { success: true, message: `Retrieved ${activeCount} active experiments (filtered)` };
    } else {
      return { success: false, message: `Failed to get filtered lab experiments - Status: ${response.status}` };
    }
  });
  
  // Test 6: Get Dashboard Metrics
  await runTest('Get Dashboard Metrics', async () => {
    const response = await makeRequest('GET', '/api/dashboard-metrics');
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      return { success: true, message: `Retrieved ${response.data.count} dashboard metrics` };
    } else {
      return { success: false, message: `Failed to get dashboard metrics - Status: ${response.status}` };
    }
  });
  
  // Test 7: Get Dashboard Metrics with Tenant
  await runTest('Get Dashboard Metrics (Tenant)', async () => {
    const response = await makeRequest('GET', '/api/dashboard-metrics?tenant_id=dev-tenant');
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      return { success: true, message: `Retrieved ${response.data.count} metrics for tenant: ${response.data.tenant_id}` };
    } else {
      return { success: false, message: `Failed to get tenant-specific metrics - Status: ${response.status}` };
    }
  });
  
  // Test 8: Get Community Posts
  await runTest('Get Community Posts', async () => {
    const response = await makeRequest('GET', '/api/community-posts');
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      return { success: true, message: `Retrieved ${response.data.count} community posts` };
    } else {
      return { success: false, message: `Failed to get community posts - Status: ${response.status}` };
    }
  });
  
  // Test 9: Get Community Posts (Filtered)
  await runTest('Get Community Posts (Published)', async () => {
    const response = await makeRequest('GET', '/api/community-posts?published=true');
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      const publishedCount = response.data.data.filter(post => post.is_published).length;
      return { success: true, message: `Retrieved ${publishedCount} published posts` };
    } else {
      return { success: false, message: `Failed to get published posts - Status: ${response.status}` };
    }
  });
  
  // Test 10: Get Education Courses
  await runTest('Get Education Courses', async () => {
    const response = await makeRequest('GET', '/api/education-courses');
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      return { success: true, message: `Retrieved ${response.data.count} education courses` };
    } else {
      return { success: false, message: `Failed to get education courses - Status: ${response.status}` };
    }
  });
  
  // Test 11: Get Education Courses (Filtered)\n  await runTest('Get Education Courses (Beginner)', async () => {\n    const response = await makeRequest('GET', '/api/education-courses?difficulty=beginner&published=true');\n    \n    if (response.status === 200 && Array.isArray(response.data.data)) {\n      const beginnerCount = response.data.data.filter(course => \n        course.difficulty_level === 'beginner' && course.is_published\n      ).length;\n      return { success: true, message: `Retrieved ${beginnerCount} beginner courses` };\n    } else {\n      return { success: false, message: `Failed to get beginner courses - Status: ${response.status}` };\n    }\n  });
  
  // Test 12: Batch Data Endpoint
  await runTest('Batch Data (Multiple Types)', async () => {
    const response = await makeRequest('GET', '/api/batch?types=toolset,experiments,metrics');
    
    if (response.status === 200 && response.data.results) {
      const types = Object.keys(response.data.results);
      return { success: true, message: `Retrieved batch data for ${types.length} types: ${types.join(', ')}` };
    } else {
      return { success: false, message: `Failed to get batch data - Status: ${response.status}` };
    }
  });
  
  // Test 13: Statistics Endpoint
  await runTest('Statistics Overview', async () => {
    const response = await makeRequest('GET', '/api/statistics');
    
    if (response.status === 200 && response.data.statistics) {
      const stats = response.data.statistics.overview;
      return { 
        success: true, 
        message: `Stats: ${stats.total_records} total records, ${stats.toolset_items} tools, ${stats.lab_experiments} experiments` 
      };
    } else {
      return { success: false, message: `Failed to get statistics - Status: ${response.status}` };
    }
  });
  
  // Test 14: Create Toolset Item (Write Operation)
  await runTest('Create Toolset Item', async () => {
    const newTool = {\n      tool_id: 'test-integration-tool',\n      name: 'Test Integration Tool',\n      description: 'A tool created during API integration testing',\n      category: 'testing',\n      icon: 'test',\n      is_active: true,\n      display_order: 999\n    };\n    \n    const response = await makeRequest('POST', '/api/toolset-items', newTool);\n    \n    if (response.status === 201 && response.data.data) {\n      return { success: true, message: `Created tool: ${response.data.data.name}` };\n    } else {\n      return { success: false, message: `Failed to create tool - Status: ${response.status}, Error: ${response.data.error || 'Unknown'}` };\n    }\n  });
  
  // Test 15: Update Toolset Item (Write Operation)
  await runTest('Update Toolset Item', async () => {
    const updates = {\n      description: 'Updated during API testing - ' + new Date().toISOString(),\n      is_active: false\n    };\n    \n    const response = await makeRequest('PUT', '/api/toolset-items/test-integration-tool', updates);\n    \n    if (response.status === 200 && response.data.data) {\n      return { success: true, message: `Updated tool: ${response.data.data.tool_id}` };\n    } else {\n      return { success: false, message: `Failed to update tool - Status: ${response.status}, Error: ${response.data.error || 'Unknown'}` };\n    }\n  });
  
  // Test 16: Create Lab Experiment (Write Operation)
  await runTest('Create Lab Experiment', async () => {
    const newExperiment = {\n      experiment_id: 'api-test-experiment',\n      version: '1.0.0',\n      name: 'API Integration Test Experiment',\n      description: 'An experiment created during API integration testing',\n      status: 'active',\n      created_by: 'api-test-suite'\n    };\n    \n    const response = await makeRequest('POST', '/api/lab-experiments', newExperiment);\n    \n    if (response.status === 201 && response.data.data) {\n      return { success: true, message: `Created experiment: ${response.data.data.name}` };\n    } else {\n      return { success: false, message: `Failed to create experiment - Status: ${response.status}, Error: ${response.data.error || 'Unknown'}` };\n    }\n  });
  
  // Test 17: 404 Error Handling
  await runTest('404 Error Handling', async () => {
    const response = await makeRequest('GET', '/api/nonexistent-endpoint');
    
    if (response.status === 404 && response.data.error === 'Not Found') {
      return { success: true, message: '404 error handled correctly' };
    } else {
      return { success: false, message: `Unexpected 404 response - Status: ${response.status}` };
    }
  });
  
  // Test 18: Invalid Data Handling
  await runTest('Invalid Data Handling', async () => {
    const invalidTool = {\n      // Missing required fields\n      description: 'Tool without required fields'\n    };\n    \n    const response = await makeRequest('POST', '/api/toolset-items', invalidTool);\n    \n    if (response.status === 400 && response.data.error) {\n      return { success: true, message: 'Invalid data rejected with proper 400 error' };\n    } else {\n      return { success: false, message: `Invalid data not handled properly - Status: ${response.status}` };\n    }\n  });
  
  // Display Results
  console.log('');\n  console.log('📊 Test Results Summary');\n  console.log('========================');\n  console.log(`Total Tests: ${results.total}`);\n  console.log(`✅ Passed: ${results.passed}`);\n  console.log(`❌ Failed: ${results.failed}`);\n  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);\n  \n  if (results.failed > 0) {\n    console.log('');\n    console.log('❌ Failed Tests:');\n    results.tests.filter(test => test.status !== 'PASS').forEach(test => {\n      console.log(`   - ${test.name}: ${test.message}`);\n    });\n    \n    console.log('');\n    console.log('🔧 Troubleshooting:');\n    console.log('   1. Make sure the API server is running: npm run api:start');\n    console.log('   2. Verify DynamoDB Local is running: docker ps | grep dynamodb');\n    console.log('   3. Check that tables are seeded: node scripts/seed-dev-data.js');\n    console.log('   4. Ensure port 3001 is available and accessible');\n  } else {\n    console.log('');\n    console.log('🎉 All API tests passed! Your REST endpoints are working correctly.');\n    console.log('✅ Ready for frontend integration.');\n  }\n  \n  // Exit with appropriate code\n  process.exit(results.failed > 0 ? 1 : 0);\n}\n\n// Handle uncaught errors\nprocess.on('unhandledRejection', (error) => {\n  console.error('❌ Unhandled promise rejection:', error.message);\n  console.error('🔧 Make sure the API server is running and accessible');\n  process.exit(1);\n});\n\nprocess.on('uncaughtException', (error) => {\n  console.error('❌ Uncaught exception:', error.message);\n  process.exit(1);\n});\n\n// Run the tests\nrunAPITests();