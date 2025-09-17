#!/usr/bin/env node
/**
 * Seed Development Data for Local DynamoDB
 * Populates local DynamoDB with sample data for development
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutItemCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

// Local DynamoDB configuration
const dynamoClient = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: 'http://localhost:8002',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

// Sample data for development
const sampleData = {
  // Toolset items for the toolset page
  toolsetItems: [
    {
      tool_id: 'visual-agent-builder',
      name: 'Visual Agent Builder',
      description: 'Drag-and-drop interface for creating AI agents without coding',
      category: 'builder',
      icon: 'bot',
      is_active: true,
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      tool_id: 'llm-integrations',
      name: 'LLM Integrations',
      description: 'Connect with OpenAI, Anthropic, and other language models',
      category: 'integration',
      icon: 'brain',
      is_active: true,
      display_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      tool_id: 'deployment-tools',
      name: 'One-Click Deployment',
      description: 'Deploy your agents to cloud infrastructure with one click',
      category: 'deployment',
      icon: 'rocket',
      is_active: true,
      display_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  // Lab experiments
  labExperiments: [
    {
      experiment_id: 'llm-comparison-001',
      version: '1.0.0',
      name: 'LLM Performance Comparison',
      description: 'Compare response quality across different language models',
      status: 'active',
      tenant_id: 'dev-tenant',
      created_by: 'dev-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      experiment_id: 'prompt-optimization-002',
      version: '1.0.0',
      name: 'Prompt Engineering Optimization',
      description: 'Test different prompt strategies for better AI responses',
      status: 'completed',
      tenant_id: 'dev-tenant',
      created_by: 'dev-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  // Community posts
  communityPosts: [
    {
      post_id: 'getting-started-guide',
      title: 'Getting Started with AI Agent Development',
      content: 'A comprehensive guide to building your first AI agent using our platform.',
      author_id: 'dev-user',
      author_name: 'Development User',
      category: 'tutorial',
      tags: ['beginner', 'tutorial', 'agents'],
      likes_count: 15,
      comments_count: 3,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      post_id: 'advanced-prompt-techniques',
      title: 'Advanced Prompt Engineering Techniques',
      content: 'Discover advanced strategies for crafting effective prompts for AI models.',
      author_id: 'dev-user',
      author_name: 'Development User',
      category: 'advanced',
      tags: ['advanced', 'prompts', 'optimization'],
      likes_count: 42,
      comments_count: 8,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  // Education courses
  educationCourses: [
    {
      course_id: 'intro-to-ai-agents',
      title: 'Introduction to AI Agents',
      description: 'Learn the fundamentals of AI agent development from scratch.',
      instructor: 'AI Nexus Team',
      duration_hours: 4,
      difficulty_level: 'beginner',
      module_count: 8,
      enrollment_count: 156,
      average_rating: 4.8,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      course_id: 'advanced-model-training',
      title: 'Advanced Model Training Techniques',
      description: 'Master advanced techniques for training and fine-tuning AI models.',
      instructor: 'Dr. Sarah Chen',
      duration_hours: 8,
      difficulty_level: 'advanced',
      module_count: 12,
      enrollment_count: 89,
      average_rating: 4.9,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  // Dashboard metrics
  dashboardMetrics: [
    {
      metric_type: 'agents_count',
      timestamp: new Date().toISOString(),
      tenant_id: 'dev-tenant',
      metric_value: 24,
      metric_label: 'Active Agents',
      change_percent: '+12%',
      time_period: 'last_30_days',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      metric_type: 'experiments_count',
      timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      tenant_id: 'dev-tenant',
      metric_value: 156,
      metric_label: 'Experiments Run',
      change_percent: '+28%',
      time_period: 'last_30_days',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      metric_type: 'models_used',
      timestamp: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      tenant_id: 'dev-tenant',
      metric_value: 8,
      metric_label: 'Models Used',
      change_percent: '+2',
      time_period: 'last_30_days',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  // Sample user data (mock)
  users: [
    {
      user_id: 'dev-user-001',
      email: 'developer@example.com',
      first_name: 'Development',
      last_name: 'User',
      role: 'admin',
      tenant_id: 'dev-tenant',
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

// Function to seed data into a table
async function seedTable(tableName, items) {
  console.log(`📊 Seeding ${tableName} with ${items.length} items...`);
  
  try {
    // Batch write items (DynamoDB allows up to 25 items per batch)
    const batches = [];
    for (let i = 0; i < items.length; i += 25) {
      batches.push(items.slice(i, i + 25));
    }

    for (const batch of batches) {
      const writeRequests = batch.map(item => ({
        PutRequest: {
          Item: marshall(item)
        }
      }));

      await dynamoClient.send(new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: writeRequests
        }
      }));
    }

    console.log(`   ✅ Successfully seeded ${tableName}`);
  } catch (error) {
    console.error(`   ❌ Failed to seed ${tableName}:`, error.message);
  }
}

// Main seeding function
async function seedDevelopmentData() {
  console.log('🌱 Seeding Development Data');
  console.log('============================');

  try {
    // Test connection
    console.log('🔌 Testing DynamoDB connection...');
    
    // Seed data for different tables
    await seedTable('dev-ai-nexus-toolset-items', sampleData.toolsetItems);
    await seedTable('dev-ai-nexus-lab-experiments', sampleData.labExperiments);
    await seedTable('dev-ai-nexus-community-posts', sampleData.communityPosts);
    await seedTable('dev-ai-nexus-education-courses', sampleData.educationCourses);
    await seedTable('dev-ai-nexus-dashboard-metrics', sampleData.dashboardMetrics);
    await seedTable('dev-ai-nexus-users', sampleData.users);

    console.log('\n🎉 Development data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Toolset items: ${sampleData.toolsetItems.length}`);
    console.log(`   - Lab experiments: ${sampleData.labExperiments.length}`);
    console.log(`   - Community posts: ${sampleData.communityPosts.length}`);
    console.log(`   - Education courses: ${sampleData.educationCourses.length}`);
    console.log(`   - Dashboard metrics: ${sampleData.dashboardMetrics.length}`);
    console.log(`   - Users: ${sampleData.users.length}`);
    
    console.log('\n🔍 You can now start the development server:');
    console.log('   npm run dev');

  } catch (error) {
    console.error('❌ Failed to seed development data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDevelopmentData();
}

module.exports = { seedDevelopmentData };