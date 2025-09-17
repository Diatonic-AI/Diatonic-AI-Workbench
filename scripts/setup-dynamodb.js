#!/usr/bin/env node

/**
 * DynamoDB Setup and Content Seeding Script
 * 
 * This script creates DynamoDB tables and seeds them with initial content
 * for the AI Nexus Workbench landing pages and CMS system.
 */

const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Configuration
const isProduction = process.env.NODE_ENV === 'production';
const region = process.env.VITE_AWS_REGION || 'us-east-2';

const dynamoConfig = {
  region,
  ...(process.env.NODE_ENV === 'development' && {
    endpoint: 'http://localhost:8002', // LocalStack for development
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
};

const dynamoClient = new DynamoDB(dynamoConfig);
const docClient = DynamoDBDocument.from(dynamoClient);

// Table names
const TABLE_PREFIX = isProduction ? 'prod' : 'dev';
const TABLES = {
  LANDING_PAGES: `${TABLE_PREFIX}-ai-nexus-landing-pages`,
  PAGE_SECTIONS: `${TABLE_PREFIX}-ai-nexus-page-sections`,
  SEO_METADATA: `${TABLE_PREFIX}-ai-nexus-seo-metadata`,
  FEATURES: `${TABLE_PREFIX}-ai-nexus-features`,
  TESTIMONIALS: `${TABLE_PREFIX}-ai-nexus-testimonials`,
};

// Table schemas
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
};

// Utility functions
async function createTable(schema) {
  try {
    await dynamoClient.createTable(schema);
    console.log(`✅ Created table: ${schema.TableName}`);
    
    // Wait for table to become active
    await dynamoClient.waitFor('tableExists', { TableName: schema.TableName });
    console.log(`📊 Table ${schema.TableName} is now active`);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`⚠️  Table ${schema.TableName} already exists`);
    } else {
      console.error(`❌ Error creating table ${schema.TableName}:`, error);
      throw error;
    }
  }
}

async function seedData() {
  const currentTime = new Date().toISOString();

  // Landing Pages Data
  const landingPages = [
    {
      pageId: 'toolset',
      tenantId: 'default',
      title: 'AI Toolset',
      subtitle: 'Visual Agent Builder for Everyone',
      description: 'Create powerful AI agents with our intuitive drag-and-drop interface. No coding required - just connect, configure, and deploy intelligent automation solutions in minutes.',
      ctaText: 'Start Building Agents',
      ctaUrl: '/toolset',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      pageId: 'lab',
      tenantId: 'default',
      title: 'AI Lab',
      subtitle: 'Experiment with Confidence',
      description: 'Push the boundaries of AI innovation in our secure cloud environment. Test cutting-edge models, run complex experiments, and iterate quickly with enterprise-grade infrastructure.',
      ctaText: 'Start Experimenting',
      ctaUrl: '/lab',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      pageId: 'observatory',
      tenantId: 'default',
      title: 'Observatory',
      subtitle: 'Intelligence Through Insights',
      description: 'Transform data into actionable intelligence with advanced analytics and visualization tools. Monitor performance, track trends, and make data-driven decisions across your AI ecosystem.',
      ctaText: 'Explore Analytics',
      ctaUrl: '/observatory',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      pageId: 'community',
      tenantId: 'default',
      title: 'Community Hub',
      subtitle: 'Connect. Learn. Grow.',
      description: 'Join a vibrant ecosystem of AI developers, researchers, and innovators. Share knowledge, collaborate on projects, and accelerate your AI journey with our global community.',
      ctaText: 'Join Community',
      ctaUrl: '/community',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      pageId: 'education',
      tenantId: 'default',
      title: 'Education Hub',
      subtitle: 'Learn AI Development the Right Way',
      description: 'Master AI development with our comprehensive learning platform. From beginner tutorials to advanced courses, get hands-on experience with real-world projects and expert guidance.',
      ctaText: 'Start Learning',
      ctaUrl: '/education',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    },
  ];

  // SEO Metadata
  const seoData = [
    {
      pageId: 'toolset',
      tenantId: 'default',
      metaTitle: 'AI Toolset - Visual Agent Builder | AI Nexus Workbench',
      metaDescription: 'Build powerful AI agents with our drag-and-drop visual interface. No coding required. Deploy intelligent automation solutions in minutes.',
      metaKeywords: ['AI agent builder', 'visual AI development', 'no-code AI', 'automation platform', 'drag-and-drop AI'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/toolset',
      ogTitle: 'AI Toolset - Visual Agent Builder',
      ogDescription: 'Create powerful AI agents with our intuitive drag-and-drop interface. No coding required.',
      ogImage: '/og-images/toolset.jpg',
      languageCode: 'en-US',
      updatedAt: currentTime,
    },
    {
      pageId: 'lab',
      tenantId: 'default',
      metaTitle: 'AI Lab - Cloud Experimentation Platform | AI Nexus Workbench',
      metaDescription: 'Experiment with cutting-edge AI models in our secure cloud environment. Test, iterate, and innovate with enterprise-grade infrastructure.',
      metaKeywords: ['AI experimentation', 'cloud AI lab', 'model testing', 'AI research platform', 'ML experiments'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/lab',
      ogTitle: 'AI Lab - Experiment with Confidence',
      ogDescription: 'Push the boundaries of AI innovation in our secure cloud environment.',
      ogImage: '/og-images/lab.jpg',
      languageCode: 'en-US',
      updatedAt: currentTime,
    },
    {
      pageId: 'observatory',
      tenantId: 'default',
      metaTitle: 'Observatory - AI Analytics & Visualization | AI Nexus Workbench',
      metaDescription: 'Transform data into actionable intelligence with advanced analytics and visualization tools. Monitor AI performance and track trends.',
      metaKeywords: ['AI analytics', 'data visualization', 'performance monitoring', 'AI insights', 'business intelligence'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/observatory',
      ogTitle: 'Observatory - Intelligence Through Insights',
      ogDescription: 'Transform data into actionable intelligence with advanced analytics and visualization tools.',
      ogImage: '/og-images/observatory.jpg',
      languageCode: 'en-US',
      updatedAt: currentTime,
    },
    {
      pageId: 'community',
      tenantId: 'default',
      metaTitle: 'Community Hub - AI Developer Network | AI Nexus Workbench',
      metaDescription: 'Join a vibrant ecosystem of AI developers, researchers, and innovators. Share knowledge, collaborate, and accelerate your AI journey.',
      metaKeywords: ['AI community', 'developer network', 'AI collaboration', 'knowledge sharing', 'AI forum'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/community',
      ogTitle: 'Community Hub - Connect. Learn. Grow.',
      ogDescription: 'Join a vibrant ecosystem of AI developers, researchers, and innovators.',
      ogImage: '/og-images/community.jpg',
      languageCode: 'en-US',
      updatedAt: currentTime,
    },
    {
      pageId: 'education',
      tenantId: 'default',
      metaTitle: 'Education Hub - AI Development Learning | AI Nexus Workbench',
      metaDescription: 'Master AI development with our comprehensive learning platform. From beginner tutorials to advanced courses with hands-on experience.',
      metaKeywords: ['AI education', 'machine learning courses', 'AI tutorials', 'developer training', 'hands-on AI learning'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/education',
      ogTitle: 'Education Hub - Learn AI Development the Right Way',
      ogDescription: 'Master AI development with our comprehensive learning platform.',
      ogImage: '/og-images/education.jpg',
      languageCode: 'en-US',
      updatedAt: currentTime,
    },
  ];

  // Features Data
  const featuresData = [
    // Toolset Features
    {
      featureId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      title: 'Drag & Drop Interface',
      description: 'Build complex AI workflows with our intuitive visual editor',
      icon: 'drag-drop',
      benefits: ['No coding required', 'Visual workflow design', 'Real-time preview'],
      category: 'usability',
      order: 1,
      isHighlighted: true,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      featureId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      title: 'Pre-built Templates',
      description: 'Start with proven AI agent templates for common use cases',
      icon: 'template',
      benefits: ['Quick start templates', 'Industry-specific solutions', 'Best practices included'],
      category: 'productivity',
      order: 2,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      featureId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      title: 'One-Click Deployment',
      description: 'Deploy your AI agents to production with a single click',
      icon: 'deploy',
      benefits: ['Instant deployment', 'Auto-scaling', 'Monitoring included'],
      category: 'deployment',
      order: 3,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    
    // Lab Features
    {
      featureId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      title: 'Model Marketplace',
      description: 'Access hundreds of pre-trained models and datasets',
      icon: 'marketplace',
      benefits: ['Latest AI models', 'Curated datasets', 'Community contributions'],
      category: 'resources',
      order: 1,
      isHighlighted: true,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      featureId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      title: 'Experiment Tracking',
      description: 'Track experiments, compare results, and manage versions',
      icon: 'tracking',
      benefits: ['Version control', 'Result comparison', 'Reproducible experiments'],
      category: 'management',
      order: 2,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      featureId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      title: 'Collaborative Notebooks',
      description: 'Work together on experiments with shared Jupyter notebooks',
      icon: 'collaboration',
      benefits: ['Real-time collaboration', 'Shared environments', 'Code review tools'],
      category: 'collaboration',
      order: 3,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
  ];

  // Testimonials Data
  const testimonialsData = [
    {
      testimonialId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      customerName: 'Sarah Chen',
      customerTitle: 'Lead AI Engineer',
      customerCompany: 'TechFlow Solutions',
      content: 'The visual agent builder has revolutionized our workflow. We can now build complex AI solutions in hours instead of weeks.',
      rating: 5,
      isVerified: true,
      isFeatured: true,
      order: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      testimonialId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      customerName: 'Dr. Michael Rodriguez',
      customerTitle: 'Research Director',
      customerCompany: 'Innovation Labs',
      content: 'AI Lab has accelerated our research by 300%. The experiment tracking and model marketplace are game-changers.',
      rating: 5,
      isVerified: true,
      isFeatured: true,
      order: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      testimonialId: uuidv4(),
      pageId: 'observatory',
      tenantId: 'default',
      customerName: 'Jennifer Park',
      customerTitle: 'Data Science Manager',
      customerCompany: 'DataDriven Inc',
      content: 'The analytics dashboard gives us unprecedented visibility into our AI performance. Essential for enterprise deployments.',
      rating: 5,
      isVerified: true,
      isFeatured: true,
      order: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
  ];

  try {
    // Seed landing pages
    console.log('🌱 Seeding landing pages...');
    for (const page of landingPages) {
      await docClient.put({
        TableName: TABLES.LANDING_PAGES,
        Item: page
      });
    }

    // Seed SEO metadata
    console.log('🔍 Seeding SEO metadata...');
    for (const seo of seoData) {
      await docClient.put({
        TableName: TABLES.SEO_METADATA,
        Item: seo
      });
    }

    // Seed features
    console.log('⚡ Seeding features...');
    for (const feature of featuresData) {
      await docClient.put({
        TableName: TABLES.FEATURES,
        Item: feature
      });
    }

    // Seed testimonials
    console.log('💬 Seeding testimonials...');
    for (const testimonial of testimonialsData) {
      await docClient.put({
        TableName: TABLES.TESTIMONIALS,
        Item: testimonial
      });
    }

    console.log('✅ Data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting DynamoDB setup...');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Region: ${region}`);
  
  try {
    // Create tables
    console.log('📋 Creating tables...');
    for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
      await createTable(schema);
    }

    console.log('⏳ Waiting for tables to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Seed data
    await seedData();

    console.log('🎉 DynamoDB setup completed successfully!');
    console.log('📊 Tables created:');
    Object.values(TABLES).forEach(tableName => {
      console.log(`  ✅ ${tableName}`);
    });

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main();
}

module.exports = {
  main,
  TABLES,
  TABLE_SCHEMAS
};
