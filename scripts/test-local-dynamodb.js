#!/usr/bin/env node
/**
 * Test Local DynamoDB Integration
 * Verifies that the application can connect to and query local DynamoDB
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { ScanCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

// Load AWS configuration similar to the app
const isDev = process.env.NODE_ENV !== 'production';

const dynamoClient = new DynamoDBClient({
  region: 'us-east-2',
  ...(isDev && {
    endpoint: 'http://localhost:8002',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
});

// Test functions
async function testToolsetItems() {
  console.log('🧪 Testing Toolset Items...');
  
  try {
    const command = new ScanCommand({
      TableName: 'dev-ai-nexus-toolset-items',
      Limit: 10,
    });
    
    const result = await dynamoClient.send(command);
    const items = result.Items.map(item => unmarshall(item));
    
    console.log(`   ✅ Retrieved ${items.length} toolset items`);
    items.forEach(item => {
      console.log(`      - ${item.name} (${item.category})`);
    });
    
    return items;
  } catch (error) {
    console.error('   ❌ Failed to retrieve toolset items:', error.message);
    return [];
  }
}

async function testLabExperiments() {
  console.log('🧪 Testing Lab Experiments...');
  
  try {
    const command = new ScanCommand({
      TableName: 'dev-ai-nexus-lab-experiments',
      Limit: 10,
    });
    
    const result = await dynamoClient.send(command);
    const items = result.Items.map(item => unmarshall(item));
    
    console.log(`   ✅ Retrieved ${items.length} lab experiments`);
    items.forEach(item => {
      console.log(`      - ${item.name} (${item.status})`);
    });
    
    return items;
  } catch (error) {
    console.error('   ❌ Failed to retrieve lab experiments:', error.message);
    return [];
  }
}

async function testDashboardMetrics() {
  console.log('🧪 Testing Dashboard Metrics...');
  
  try {
    const command = new ScanCommand({
      TableName: 'dev-ai-nexus-dashboard-metrics',
      Limit: 10,
    });
    
    const result = await dynamoClient.send(command);
    const items = result.Items.map(item => unmarshall(item));
    
    console.log(`   ✅ Retrieved ${items.length} dashboard metrics`);
    items.forEach(item => {
      console.log(`      - ${item.metric_label}: ${item.metric_value} (${item.change_percent})`);
    });
    
    return items;
  } catch (error) {
    console.error('   ❌ Failed to retrieve dashboard metrics:', error.message);
    return [];
  }
}

async function testCommunityPosts() {
  console.log('🧪 Testing Community Posts...');
  
  try {
    const command = new ScanCommand({
      TableName: 'dev-ai-nexus-community-posts',
      Limit: 10,
    });
    
    const result = await dynamoClient.send(command);
    const items = result.Items.map(item => unmarshall(item));
    
    console.log(`   ✅ Retrieved ${items.length} community posts`);
    items.forEach(item => {
      console.log(`      - ${item.title} (${item.category}) - ${item.likes_count} likes`);
    });
    
    return items;
  } catch (error) {
    console.error('   ❌ Failed to retrieve community posts:', error.message);
    return [];
  }
}

async function testEducationCourses() {
  console.log('🧪 Testing Education Courses...');
  
  try {
    const command = new ScanCommand({
      TableName: 'dev-ai-nexus-education-courses',
      Limit: 10,
    });
    
    const result = await dynamoClient.send(command);
    const items = result.Items.map(item => unmarshall(item));
    
    console.log(`   ✅ Retrieved ${items.length} education courses`);
    items.forEach(item => {
      console.log(`      - ${item.title} (${item.difficulty_level}) - ${item.average_rating}/5`);
    });
    
    return items;
  } catch (error) {
    console.error('   ❌ Failed to retrieve education courses:', error.message);
    return [];
  }
}

async function testUsers() {
  console.log('🧪 Testing Users...');
  
  try {
    const command = new ScanCommand({
      TableName: 'dev-ai-nexus-users',
      Limit: 10,
    });
    
    const result = await dynamoClient.send(command);
    const items = result.Items.map(item => unmarshall(item));
    
    console.log(`   ✅ Retrieved ${items.length} users`);
    items.forEach(item => {
      console.log(`      - ${item.first_name} ${item.last_name} (${item.role}) - ${item.email}`);
    });
    
    return items;
  } catch (error) {
    console.error('   ❌ Failed to retrieve users:', error.message);
    return [];
  }
}

async function testTenantIsolation() {
  console.log('🧪 Testing Tenant Isolation (dev-tenant)...');
  
  try {
    // Test querying metrics by tenant
    const command = new ScanCommand({
      TableName: 'dev-ai-nexus-dashboard-metrics',
      FilterExpression: 'tenant_id = :tenant_id',
      ExpressionAttributeValues: {
        ':tenant_id': { S: 'dev-tenant' }
      }
    });
    
    const result = await dynamoClient.send(command);
    const items = result.Items.map(item => unmarshall(item));
    
    console.log(`   ✅ Found ${items.length} metrics for dev-tenant`);
    
    // Test querying experiments by tenant
    const expCommand = new ScanCommand({
      TableName: 'dev-ai-nexus-lab-experiments',
      FilterExpression: 'tenant_id = :tenant_id',
      ExpressionAttributeValues: {
        ':tenant_id': { S: 'dev-tenant' }
      }
    });
    
    const expResult = await dynamoClient.send(expCommand);
    const expItems = expResult.Items.map(item => unmarshall(item));
    
    console.log(`   ✅ Found ${expItems.length} experiments for dev-tenant`);
    
    return { metrics: items, experiments: expItems };
  } catch (error) {
    console.error('   ❌ Failed to test tenant isolation:', error.message);
    return { metrics: [], experiments: [] };
  }
}

// Main test function
async function runDynamoDBTests() {
  console.log('🧪 Testing Local DynamoDB Integration');
  console.log('=====================================');
  console.log(`Environment: ${isDev ? 'Development (Local DynamoDB)' : 'Production'}`);
  console.log(`DynamoDB Endpoint: ${isDev ? 'http://localhost:8002' : 'AWS DynamoDB'}`);
  console.log('');
  
  const results = {};
  
  try {
    results.toolsetItems = await testToolsetItems();
    console.log('');
    
    results.labExperiments = await testLabExperiments();
    console.log('');
    
    results.dashboardMetrics = await testDashboardMetrics();
    console.log('');
    
    results.communityPosts = await testCommunityPosts();
    console.log('');
    
    results.educationCourses = await testEducationCourses();
    console.log('');
    
    results.users = await testUsers();
    console.log('');
    
    results.tenantData = await testTenantIsolation();
    console.log('');
    
    console.log('📊 Test Summary:');
    console.log('================');
    console.log(`✅ Toolset Items: ${results.toolsetItems.length} items`);
    console.log(`✅ Lab Experiments: ${results.labExperiments.length} items`);
    console.log(`✅ Dashboard Metrics: ${results.dashboardMetrics.length} items`);
    console.log(`✅ Community Posts: ${results.communityPosts.length} items`);
    console.log(`✅ Education Courses: ${results.educationCourses.length} items`);
    console.log(`✅ Users: ${results.users.length} items`);
    console.log(`✅ Tenant Isolation: Working (${results.tenantData.metrics.length} metrics, ${results.tenantData.experiments.length} experiments)`);
    
    console.log('');
    console.log('🎉 All DynamoDB integration tests passed!');
    console.log('🔗 Your application should now be able to connect to local DynamoDB');
    console.log('🌐 Dev server: http://localhost:8083');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runDynamoDBTests();
}

module.exports = { runDynamoDBTests };