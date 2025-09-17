#!/usr/bin/env node

/**
 * DynamoDB Local Table Setup Script
 * 
 * This script creates all required DynamoDB tables for local development.
 * Run this after starting the local DynamoDB instance.
 */

const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

// DynamoDB configuration for local development
const dynamoConfig = {
  endpoint: 'http://localhost:8002',
  region: 'us-east-2',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

const dynamoClient = new DynamoDB(dynamoConfig);
const docClient = DynamoDBDocument.from(dynamoClient);

// Table definitions from your config
const TABLES = {
  LANDING_PAGES: 'dev-ai-nexus-landing-pages',
  PAGE_SECTIONS: 'dev-ai-nexus-page-sections',
  SEO_METADATA: 'dev-ai-nexus-seo-metadata',
  FEATURES: 'dev-ai-nexus-features',
  TESTIMONIALS: 'dev-ai-nexus-testimonials',
  PRICING_PLANS: 'dev-ai-nexus-pricing-plans',
};

const TABLE_SCHEMAS = {
  [TABLES.LANDING_PAGES]: {
    TableName: TABLES.LANDING_PAGES,
    KeySchema: [
      { AttributeName: 'pageId', KeyType: 'HASH' },
      { AttributeName: 'tenantId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'tenantId', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'updatedAt', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'StatusIndex',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'updatedAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 10 },
  },
  
  [TABLES.PAGE_SECTIONS]: {
    TableName: TABLES.PAGE_SECTIONS,
    KeySchema: [
      { AttributeName: 'sectionId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'sectionId', AttributeType: 'S' },
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'order', AttributeType: 'N' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PageIndex',
        KeySchema: [
          { AttributeName: 'pageId', KeyType: 'HASH' },
          { AttributeName: 'order', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 10 },
  },
  
  [TABLES.SEO_METADATA]: {
    TableName: TABLES.SEO_METADATA,
    KeySchema: [
      { AttributeName: 'pageId', KeyType: 'HASH' },
      { AttributeName: 'tenantId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'tenantId', AttributeType: 'S' },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  
  [TABLES.FEATURES]: {
    TableName: TABLES.FEATURES,
    KeySchema: [
      { AttributeName: 'featureId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'featureId', AttributeType: 'S' },
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'order', AttributeType: 'N' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PageIndex',
        KeySchema: [
          { AttributeName: 'pageId', KeyType: 'HASH' },
          { AttributeName: 'order', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 10 },
  },
  
  [TABLES.TESTIMONIALS]: {
    TableName: TABLES.TESTIMONIALS,
    KeySchema: [
      { AttributeName: 'testimonialId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'testimonialId', AttributeType: 'S' },
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'order', AttributeType: 'N' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PageIndex',
        KeySchema: [
          { AttributeName: 'pageId', KeyType: 'HASH' },
          { AttributeName: 'order', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 10 },
  },
  
  [TABLES.PRICING_PLANS]: {
    TableName: TABLES.PRICING_PLANS,
    KeySchema: [
      { AttributeName: 'planId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'planId', AttributeType: 'S' },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
};

// Helper functions
async function tableExists(tableName) {
  try {
    await dynamoClient.describeTable({ TableName: tableName });
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTable(schema) {
  const tableName = schema.TableName;
  console.log(`🔨 Creating table: ${tableName}`);
  
  try {
    await dynamoClient.createTable(schema);
    
    // Wait for table to be active
    let status = 'CREATING';
    while (status !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await dynamoClient.describeTable({ TableName: tableName });
      status = result.Table.TableStatus;
      console.log(`   ⏳ Table status: ${status}`);
    }
    
    console.log(`   ✅ Table created successfully: ${tableName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error creating table ${tableName}:`, error.message);
    return false;
  }
}

async function seedSampleData() {
  console.log('\n🌱 Seeding sample data...');
  
  // Sample landing page data
  const sampleLandingPages = [
    {
      pageId: 'toolset',
      tenantId: 'default',
      title: 'AI Toolset',
      subtitle: 'Build Powerful AI Agents',
      description: 'Create sophisticated AI agents with our intuitive drag-and-drop interface and professional-grade tools.',
      ctaText: 'Get Started',
      ctaUrl: '/toolset',
      status: 'published',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      pageId: 'lab',
      tenantId: 'default',
      title: 'AI Laboratory',
      subtitle: 'Experiment and Innovate',
      description: 'Experiment with models, datasets, and simulations in a secure cloud environment.',
      ctaText: 'Start Experimenting',
      ctaUrl: '/lab',
      status: 'published',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      pageId: 'observatory',
      tenantId: 'default',
      title: 'Analytics Observatory',
      subtitle: 'Visualize Your Data',
      description: 'Powerful visualization tools to understand your data and model performance at a glance.',
      ctaText: 'Explore Analytics',
      ctaUrl: '/observatory',
      status: 'published',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      pageId: 'community',
      tenantId: 'default',
      title: 'AI Community Hub',
      subtitle: 'Connect and Collaborate',
      description: 'Join a vibrant ecosystem of AI developers, researchers, and innovators. Share knowledge, collaborate on projects.',
      ctaText: 'Join Community',
      ctaUrl: '/community',
      status: 'published',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    },
  ];

  // Insert sample data
  for (const page of sampleLandingPages) {
    try {
      await docClient.put({
        TableName: TABLES.LANDING_PAGES,
        Item: page,
      });
      console.log(`   ✅ Added landing page: ${page.pageId}`);
    } catch (error) {
      console.error(`   ❌ Error adding landing page ${page.pageId}:`, error.message);
    }
  }
}

async function testConnection() {
  console.log('🔌 Testing DynamoDB connection...');
  
  try {
    await dynamoClient.listTables({});
    console.log('   ✅ Connection successful!');
    return true;
  } catch (error) {
    console.error('   ❌ Connection failed:', error.message);
    console.error('   💡 Make sure DynamoDB Local is running on http://localhost:8002');
    return false;
  }
}

async function main() {
  console.log('🚀 DynamoDB Local Setup Script');
  console.log('================================\n');
  
  // Test connection
  if (!(await testConnection())) {
    process.exit(1);
  }
  
  console.log('\n📋 Setting up tables...\n');
  
  let tablesCreated = 0;
  let tablesSkipped = 0;
  
  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    if (await tableExists(tableName)) {
      console.log(`⏭️  Table already exists: ${tableName}`);
      tablesSkipped++;
    } else {
      if (await createTable(schema)) {
        tablesCreated++;
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Tables created: ${tablesCreated}`);
  console.log(`   ⏭️  Tables skipped: ${tablesSkipped}`);
  console.log(`   📋 Total tables: ${Object.keys(TABLE_SCHEMAS).length}`);
  
  if (tablesCreated > 0) {
    await seedSampleData();
  }
  
  console.log(`\n🎉 DynamoDB Local setup complete!`);
  console.log(`\n🔍 Access DynamoDB Admin UI at: http://localhost:8001`);
  console.log(`📊 DynamoDB Local running at: http://localhost:8002`);
  console.log(`\nYou can now run: npm run dev\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, testConnection, createTable, seedSampleData };