#!/usr/bin/env node
/**
 * Test Frontend Integration with Local DynamoDB
 * Simulates the data fetching that React hooks would perform
 */

const { contentService } = require('../src/lib/content-service.ts');

async function testFrontendIntegration() {
  console.log('🧪 Testing Frontend Integration with Local DynamoDB');
  console.log('=====================================================');
  
  try {
    // Set tenant context
    contentService.setTenant('dev-tenant');
    console.log('🏢 Tenant set to: dev-tenant');
    
    // Health check first
    console.log('\n🏥 Testing service health...');
    const isHealthy = await contentService.healthCheck();
    if (!isHealthy) {
      throw new Error('Content service health check failed');
    }
    console.log('✅ Service is healthy');
    
    // Test toolset items (equivalent to useToolsetItems hook)
    console.log('\n🛠️ Testing toolset items fetch...');
    const toolsetItems = await contentService.getToolsetItems();
    console.log(`✅ Fetched ${toolsetItems.length} toolset items:`);
    toolsetItems.forEach(item => {
      console.log(`   - ${item.name} (${item.category}) [${item.is_active ? 'active' : 'inactive'}]`);
    });
    
    // Test lab experiments (equivalent to useLabExperiments hook)
    console.log('\n🧪 Testing lab experiments fetch...');
    const experiments = await contentService.getLabExperiments();
    console.log(`✅ Fetched ${experiments.length} lab experiments:`);
    experiments.forEach(exp => {
      console.log(`   - ${exp.name} (${exp.status}) by ${exp.created_by}`);
    });
    
    // Test dashboard metrics (equivalent to useDashboardMetrics hook)
    console.log('\n📊 Testing dashboard metrics fetch...');
    const metrics = await contentService.getDashboardMetrics('dev-tenant');
    console.log(`✅ Fetched ${metrics.length} dashboard metrics:`);
    metrics.forEach(metric => {
      console.log(`   - ${metric.metric_label}: ${metric.metric_value} (${metric.change_percent})`);
    });
    
    // Test community posts (equivalent to useCommunityPosts hook)
    console.log('\n💬 Testing community posts fetch...');
    const posts = await contentService.getCommunityPosts();
    console.log(`✅ Fetched ${posts.length} community posts:`);
    posts.forEach(post => {
      console.log(`   - ${post.title} (${post.category}) - ${post.likes_count} likes`);
    });
    
    // Test education courses (equivalent to useEducationCourses hook)
    console.log('\n🎓 Testing education courses fetch...');
    const courses = await contentService.getEducationCourses();
    console.log(`✅ Fetched ${courses.length} education courses:`);
    courses.forEach(course => {
      console.log(`   - ${course.title} (${course.difficulty_level}) - ${course.average_rating}/5 stars`);
    });
    
    // Test filtering (simulating hook filters)
    console.log('\n🔍 Testing filtered queries...');
    
    const activeExperiments = await contentService.getLabExperiments({ status: 'active' });
    console.log(`✅ Active experiments: ${activeExperiments.length}`);
    
    const publishedPosts = await contentService.getCommunityPosts({ published: true });
    console.log(`✅ Published posts: ${publishedPosts.length}`);
    
    const beginnerCourses = await contentService.getEducationCourses({ 
      difficulty: 'beginner', 
      published: true 
    });
    console.log(`✅ Beginner courses: ${beginnerCourses.length}`);
    
    console.log('\n🎉 Frontend integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   🛠️ Toolset Items: ${toolsetItems.length} loaded`);
    console.log(`   🧪 Lab Experiments: ${experiments.length} loaded`);
    console.log(`   📊 Dashboard Metrics: ${metrics.length} loaded`);
    console.log(`   💬 Community Posts: ${posts.length} loaded`);
    console.log(`   🎓 Education Courses: ${courses.length} loaded`);
    console.log('\n✅ Your React hooks should work correctly with this data!');
    
    // Simulate React Query behavior
    console.log('\n🔄 Simulating React Query caching behavior...');
    const start = Date.now();
    
    // Fetch data again (should be fast due to caching in real app)
    await Promise.all([
      contentService.getToolsetItems(),
      contentService.getLabExperiments(),
      contentService.getDashboardMetrics('dev-tenant')
    ]);
    
    const duration = Date.now() - start;
    console.log(`✅ Second fetch completed in ${duration}ms`);
    console.log('📝 Note: React Query will cache this data and make subsequent fetches instant');
    
  } catch (error) {
    console.error('❌ Frontend integration test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure local DynamoDB is running: docker ps | grep dynamodb');
    console.error('   2. Check if tables are seeded: node scripts/seed-dev-data.js');
    console.error('   3. Verify network connection to localhost:8002');
    process.exit(1);
  }
}

// Run the test
testFrontendIntegration();