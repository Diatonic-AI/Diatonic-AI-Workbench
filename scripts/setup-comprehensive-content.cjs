#!/usr/bin/env node

/**
 * Comprehensive Content Setup for AI Nexus Workbench
 * Creates DynamoDB tables and seeds them with rich content for all services
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  CreateTableCommand, 
  PutItemCommand, 
  ListTablesCommand,
  DescribeTableCommand,
  waitUntilTableExists
} = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Configuration
const region = process.env.AWS_REGION || 'us-east-2';
const environment = process.env.NODE_ENV || 'development';

// Use local DynamoDB for development
const dynamoConfig = {
  region,
  endpoint: environment === 'development' ? 'http://localhost:8002' : undefined,
};

const dynamoClient = new DynamoDBClient(dynamoConfig);

// Table configurations
const tables = {
  'content-pages': {
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'tenantId', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PageTenantIndex',
        KeySchema: [
          { AttributeName: 'pageId', KeyType: 'HASH' },
          { AttributeName: 'tenantId', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  'content-features': {
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PageCategoryIndex',
        KeySchema: [
          { AttributeName: 'pageId', KeyType: 'HASH' },
          { AttributeName: 'category', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  'content-feature-details': {
    AttributeDefinitions: [
      { AttributeName: 'featureId', AttributeType: 'S' },
      { AttributeName: 'tenantId', AttributeType: 'S' },
      { AttributeName: 'slug', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'featureId', KeyType: 'HASH' },
      { AttributeName: 'tenantId', KeyType: 'RANGE' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'SlugIndex',
        KeySchema: [
          { AttributeName: 'slug', KeyType: 'HASH' },
          { AttributeName: 'tenantId', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'CategoryIndex',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'tenantId', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  'content-testimonials': {
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'isFeatured', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'FeaturedIndex',
        KeySchema: [
          { AttributeName: 'pageId', KeyType: 'HASH' },
          { AttributeName: 'isFeatured', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  'content-seo': {
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'pageId', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PageIndex',
        KeySchema: [
          { AttributeName: 'pageId', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  }
};

// Utility functions
function getTableName(baseName) {
  return `ai-nexus-workbench-${environment}-${baseName}`;
}

async function createTablesIfNotExist() {
  console.log('🔍 Checking existing tables...');
  
  const { TableNames } = await dynamoClient.send(new ListTablesCommand({}));
  
  for (const [tableName, config] of Object.entries(tables)) {
    const fullTableName = getTableName(tableName);
    
    if (!TableNames.includes(fullTableName)) {
      console.log(`📋 Creating table: ${fullTableName}`);
      
      const createParams = {
        TableName: fullTableName,
        ...config,
        BillingMode: 'PAY_PER_REQUEST'
      };
      
      // Add proper provisioning for GSI
      if (config.GlobalSecondaryIndexes) {
        createParams.GlobalSecondaryIndexes = config.GlobalSecondaryIndexes.map(gsi => ({
          ...gsi,
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }));
        createParams.BillingMode = 'PROVISIONED';
        createParams.ProvisionedThroughput = {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        };
      }
      
      await dynamoClient.send(new CreateTableCommand(createParams));
      
      // Wait for table to be active
      await waitUntilTableExists({
        client: dynamoClient,
        maxWaitTime: 60
      }, {
        TableName: fullTableName
      });
      
      console.log(`✅ Table created: ${fullTableName}`);
    } else {
      console.log(`✅ Table already exists: ${fullTableName}`);
    }
  }
}

// Comprehensive content data
async function seedComprehensiveData() {
  const currentTime = new Date().toISOString();
  console.log('🌱 Seeding comprehensive content data...');

  // Service Pages Content
  const servicePages = [
    {
      PK: 'PAGE#toolset',
      SK: 'TENANT#default',
      pageId: 'toolset',
      tenantId: 'default',
      title: 'AI Toolset',
      subtitle: 'Visual Agent Builder for Everyone',
      description: 'Create powerful AI agents with our intuitive drag-and-drop interface. No coding required - just connect, configure, and deploy intelligent automation solutions in minutes.',
      ctaText: 'Start Building Agents',
      ctaUrl: '/toolset',
      heroImage: '/images/toolset-hero.jpg',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      PK: 'PAGE#lab',
      SK: 'TENANT#default',
      pageId: 'lab',
      tenantId: 'default',
      title: 'AI Lab',
      subtitle: 'Experiment with Confidence',
      description: 'Push the boundaries of AI innovation in our secure cloud environment. Test cutting-edge models, run complex experiments, and iterate quickly with enterprise-grade infrastructure.',
      ctaText: 'Start Experimenting',
      ctaUrl: '/lab',
      heroImage: '/images/lab-hero.jpg',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      PK: 'PAGE#observatory',
      SK: 'TENANT#default',
      pageId: 'observatory',
      tenantId: 'default',
      title: 'Observatory',
      subtitle: 'Intelligence Through Insights',
      description: 'Transform data into actionable intelligence with advanced analytics and visualization tools. Monitor performance, track trends, and make data-driven decisions across your AI ecosystem.',
      ctaText: 'Explore Analytics',
      ctaUrl: '/observatory',
      heroImage: '/images/observatory-hero.jpg',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      PK: 'PAGE#community',
      SK: 'TENANT#default',
      pageId: 'community',
      tenantId: 'default',
      title: 'Community Hub',
      subtitle: 'Connect. Learn. Grow.',
      description: 'Join a vibrant ecosystem of AI developers, researchers, and innovators. Share knowledge, collaborate on projects, and accelerate your AI journey with our global community.',
      ctaText: 'Join Community',
      ctaUrl: '/community',
      heroImage: '/images/community-hero.jpg',
      status: 'published',
      version: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'system',
      updatedBy: 'system',
    }
  ];

  // Service Features (comprehensive for all services)
  const serviceFeatures = [
    // Toolset Features
    {
      PK: 'FEATURES#toolset',
      SK: 'TENANT#default#FEATURE#drag-drop',
      featureId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      title: 'Drag & Drop Interface',
      description: 'Build complex AI workflows with our intuitive visual editor. Connect nodes, configure settings, and see your agent come to life in real-time.',
      icon: 'drag-drop',
      benefits: ['No coding required', 'Visual workflow design', 'Real-time preview', 'Instant validation'],
      category: 'usability',
      order: 1,
      isHighlighted: true,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#toolset',
      SK: 'TENANT#default#FEATURE#templates',
      featureId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      title: 'Pre-built Templates',
      description: 'Start with proven AI agent templates for common use cases. From customer service bots to data analysis agents - get started in seconds.',
      icon: 'template',
      benefits: ['50+ ready-to-use templates', 'Industry-specific solutions', 'Best practices included', 'One-click customization'],
      category: 'productivity',
      order: 2,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#toolset',
      SK: 'TENANT#default#FEATURE#deployment',
      featureId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      title: 'One-Click Deployment',
      description: 'Deploy your AI agents to production with a single click. Our platform handles scaling, monitoring, and maintenance automatically.',
      icon: 'deploy',
      benefits: ['Instant deployment', 'Auto-scaling infrastructure', 'Built-in monitoring', 'Zero-downtime updates'],
      category: 'deployment',
      order: 3,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#toolset',
      SK: 'TENANT#default#FEATURE#collaboration',
      featureId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      title: 'Team Collaboration',
      description: 'Work together seamlessly with real-time collaboration. Share agents, review changes, and iterate as a team.',
      icon: 'users',
      benefits: ['Real-time collaboration', 'Version control', 'Role-based permissions', 'Team workspaces'],
      category: 'collaboration',
      order: 4,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },

    // Lab Features
    {
      PK: 'FEATURES#lab',
      SK: 'TENANT#default#FEATURE#marketplace',
      featureId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      title: 'Model Marketplace',
      description: 'Access hundreds of pre-trained models and curated datasets. From GPT variants to specialized computer vision models - find what you need.',
      icon: 'marketplace',
      benefits: ['500+ pre-trained models', 'Curated datasets', 'Community contributions', 'Regular updates'],
      category: 'resources',
      order: 1,
      isHighlighted: true,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#lab',
      SK: 'TENANT#default#FEATURE#tracking',
      featureId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      title: 'Experiment Tracking',
      description: 'Track experiments, compare results, and manage versions with MLOps best practices. Never lose an important experiment again.',
      icon: 'tracking',
      benefits: ['Complete experiment history', 'Result comparison', 'Reproducible experiments', 'Automated versioning'],
      category: 'management',
      order: 2,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#lab',
      SK: 'TENANT#default#FEATURE#notebooks',
      featureId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      title: 'Collaborative Notebooks',
      description: 'Work together on experiments with shared Jupyter notebooks. Real-time editing, commenting, and code review tools.',
      icon: 'notebook',
      benefits: ['Real-time collaboration', 'Shared environments', 'Code review tools', 'GPU acceleration'],
      category: 'collaboration',
      order: 3,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#lab',
      SK: 'TENANT#default#FEATURE#pipeline',
      featureId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      title: 'ML Pipeline Automation',
      description: 'Automate your machine learning pipelines from data ingestion to model deployment. Focus on research, let us handle the operations.',
      icon: 'pipeline',
      benefits: ['Automated workflows', 'Data pipeline integration', 'Model CI/CD', 'Performance monitoring'],
      category: 'automation',
      order: 4,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },

    // Observatory Features
    {
      PK: 'FEATURES#observatory',
      SK: 'TENANT#default#FEATURE#dashboards',
      featureId: uuidv4(),
      pageId: 'observatory',
      tenantId: 'default',
      title: 'Real-time Dashboards',
      description: 'Create stunning dashboards that update in real-time. Monitor model performance, system health, and business metrics all in one place.',
      icon: 'dashboard',
      benefits: ['Real-time updates', 'Customizable widgets', 'Interactive charts', 'Mobile responsive'],
      category: 'visualization',
      order: 1,
      isHighlighted: true,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#observatory',
      SK: 'TENANT#default#FEATURE#alerting',
      featureId: uuidv4(),
      pageId: 'observatory',
      tenantId: 'default',
      title: 'Intelligent Alerting',
      description: 'Get notified when things matter. Smart alerts that learn from your patterns and reduce noise while ensuring you never miss critical issues.',
      icon: 'alert',
      benefits: ['Smart alert rules', 'Multi-channel notifications', 'Alert correlation', 'Escalation policies'],
      category: 'monitoring',
      order: 2,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#observatory',
      SK: 'TENANT#default#FEATURE#analytics',
      featureId: uuidv4(),
      pageId: 'observatory',
      tenantId: 'default',
      title: 'Advanced Analytics',
      description: 'Dive deep into your data with advanced analytics tools. Statistical analysis, trend detection, and predictive insights at your fingertips.',
      icon: 'analytics',
      benefits: ['Statistical analysis', 'Trend detection', 'Predictive modeling', 'Export capabilities'],
      category: 'analysis',
      order: 3,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#observatory',
      SK: 'TENANT#default#FEATURE#integration',
      featureId: uuidv4(),
      pageId: 'observatory',
      tenantId: 'default',
      title: 'Data Source Integration',
      description: 'Connect to any data source seamlessly. From databases to APIs, logs to metrics - bring all your data together in one unified view.',
      icon: 'integration',
      benefits: ['100+ connectors', 'Real-time sync', 'Schema auto-detection', 'Data transformation'],
      category: 'integration',
      order: 4,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },

    // Community Features
    {
      PK: 'FEATURES#community',
      SK: 'TENANT#default#FEATURE#forums',
      featureId: uuidv4(),
      pageId: 'community',
      tenantId: 'default',
      title: 'Discussion Forums',
      description: 'Engage with the global AI community. Ask questions, share knowledge, and learn from experts across various AI domains.',
      icon: 'forum',
      benefits: ['Expert community', 'Topic-based discussions', 'Reputation system', 'Best answer recognition'],
      category: 'social',
      order: 1,
      isHighlighted: true,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#community',
      SK: 'TENANT#default#FEATURE#projects',
      featureId: uuidv4(),
      pageId: 'community',
      tenantId: 'default',
      title: 'Project Showcase',
      description: 'Share your AI projects with the community. Get feedback, find collaborators, and inspire others with your innovations.',
      icon: 'project',
      benefits: ['Project galleries', 'Collaboration matching', 'Feedback system', 'Featured projects'],
      category: 'sharing',
      order: 2,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#community',
      SK: 'TENANT#default#FEATURE#events',
      featureId: uuidv4(),
      pageId: 'community',
      tenantId: 'default',
      title: 'Events & Webinars',
      description: 'Join live events, webinars, and workshops. Learn from industry leaders and connect with like-minded AI enthusiasts.',
      icon: 'calendar',
      benefits: ['Live events', 'Expert speakers', 'Interactive sessions', 'Recording access'],
      category: 'learning',
      order: 3,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'FEATURES#community',
      SK: 'TENANT#default#FEATURE#mentorship',
      featureId: uuidv4(),
      pageId: 'community',
      tenantId: 'default',
      title: 'Mentorship Program',
      description: 'Connect with experienced AI professionals. Get guidance, career advice, and accelerate your growth in the AI field.',
      icon: 'mentor',
      benefits: ['Expert mentors', 'Structured programs', 'Goal tracking', 'Career guidance'],
      category: 'growth',
      order: 4,
      isHighlighted: false,
      isVisible: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
  ];

  // SEO Metadata for all pages
  const seoMetadata = [
    {
      PK: 'SEO#toolset',
      SK: 'TENANT#default',
      pageId: 'toolset',
      tenantId: 'default',
      metaTitle: 'AI Toolset - Visual Agent Builder | AI Nexus Workbench',
      metaDescription: 'Build powerful AI agents with our drag-and-drop visual interface. No coding required. Deploy intelligent automation solutions in minutes with enterprise-grade tools.',
      metaKeywords: ['AI agent builder', 'visual AI development', 'no-code AI', 'automation platform', 'drag-and-drop AI', 'intelligent automation'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/toolset',
      ogTitle: 'AI Toolset - Visual Agent Builder for Everyone',
      ogDescription: 'Create powerful AI agents with our intuitive drag-and-drop interface. No coding required - just connect, configure, and deploy.',
      ogImage: '/og-images/toolset-social.jpg',
      twitterTitle: 'Build AI Agents Visually - No Coding Required',
      twitterDescription: 'Create powerful AI agents with drag-and-drop simplicity. Deploy in minutes, scale automatically.',
      twitterImage: '/og-images/toolset-twitter.jpg',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'AI Toolset',
        'description': 'Visual AI agent builder platform',
        'applicationCategory': 'DeveloperApplication',
        'operatingSystem': 'Web',
        'offers': {
          '@type': 'Offer',
          'priceCurrency': 'USD'
        }
      },
      languageCode: 'en-US',
      updatedAt: currentTime,
    },
    {
      PK: 'SEO#lab',
      SK: 'TENANT#default',
      pageId: 'lab',
      tenantId: 'default',
      metaTitle: 'AI Lab - Cloud Experimentation Platform | AI Nexus Workbench',
      metaDescription: 'Experiment with cutting-edge AI models in our secure cloud environment. Access 500+ models, collaborate on notebooks, and track experiments with MLOps best practices.',
      metaKeywords: ['AI experimentation', 'cloud AI lab', 'model testing', 'AI research platform', 'ML experiments', 'MLOps', 'Jupyter notebooks'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/lab',
      ogTitle: 'AI Lab - Experiment with Confidence in the Cloud',
      ogDescription: 'Push the boundaries of AI innovation with 500+ pre-trained models, collaborative notebooks, and enterprise infrastructure.',
      ogImage: '/og-images/lab-social.jpg',
      twitterTitle: 'AI Lab - Cloud Experimentation Platform',
      twitterDescription: 'Access 500+ AI models, collaborate on experiments, track results. Enterprise-grade ML infrastructure.',
      twitterImage: '/og-images/lab-twitter.jpg',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'AI Lab',
        'description': 'Cloud-based AI experimentation platform',
        'applicationCategory': 'DeveloperApplication',
        'operatingSystem': 'Web'
      },
      languageCode: 'en-US',
      updatedAt: currentTime,
    },
    {
      PK: 'SEO#observatory',
      SK: 'TENANT#default',
      pageId: 'observatory',
      tenantId: 'default',
      metaTitle: 'Observatory - AI Analytics & Visualization | AI Nexus Workbench',
      metaDescription: 'Transform data into actionable intelligence with real-time dashboards, advanced analytics, and intelligent alerting. Monitor AI performance and business metrics.',
      metaKeywords: ['AI analytics', 'data visualization', 'performance monitoring', 'AI insights', 'business intelligence', 'real-time dashboards'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/observatory',
      ogTitle: 'Observatory - Intelligence Through Real-Time Insights',
      ogDescription: 'Transform data into actionable intelligence with advanced analytics, real-time dashboards, and smart alerting.',
      ogImage: '/og-images/observatory-social.jpg',
      twitterTitle: 'Observatory - AI Analytics & Visualization Platform',
      twitterDescription: 'Real-time dashboards, intelligent alerts, advanced analytics. Turn your data into insights.',
      twitterImage: '/og-images/observatory-twitter.jpg',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'Observatory',
        'description': 'AI analytics and visualization platform',
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'Web'
      },
      languageCode: 'en-US',
      updatedAt: currentTime,
    },
    {
      PK: 'SEO#community',
      SK: 'TENANT#default',
      pageId: 'community',
      tenantId: 'default',
      metaTitle: 'Community Hub - AI Developer Network | AI Nexus Workbench',
      metaDescription: 'Join 50,000+ AI developers, researchers, and innovators. Share knowledge, showcase projects, attend events, and get mentorship in our vibrant community.',
      metaKeywords: ['AI community', 'developer network', 'AI collaboration', 'knowledge sharing', 'AI forum', 'mentorship', 'AI events'],
      canonicalUrl: 'https://ai-nexus-workbench.com/services/community',
      ogTitle: 'Community Hub - Connect, Learn, and Grow with AI Experts',
      ogDescription: 'Join 50,000+ AI developers. Share projects, get mentorship, attend events, and accelerate your AI journey.',
      ogImage: '/og-images/community-social.jpg',
      twitterTitle: 'Join the AI Developer Community - 50,000+ Members',
      twitterDescription: 'Connect with AI experts, share projects, get mentorship. Accelerate your AI journey.',
      twitterImage: '/og-images/community-twitter.jpg',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'AI Nexus Community',
        'description': 'AI developer and researcher community',
        'url': 'https://ai-nexus-workbench.com/services/community'
      },
      languageCode: 'en-US',
      updatedAt: currentTime,
    }
  ];

  // Testimonials
  const testimonials = [
    // Toolset Testimonials
    {
      PK: 'TESTIMONIALS#toolset',
      SK: 'TENANT#default#TEST#001',
      testimonialId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      customerName: 'Sarah Chen',
      customerTitle: 'Lead AI Engineer',
      customerCompany: 'TechFlow Solutions',
      content: 'The visual agent builder has revolutionized our workflow. We can now build complex AI solutions in hours instead of weeks. The drag-and-drop interface is intuitive, and the deployment process is seamless.',
      rating: 5,
      isVerified: true,
      isFeatured: 'true',
      order: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'TESTIMONIALS#toolset',
      SK: 'TENANT#default#TEST#002',
      testimonialId: uuidv4(),
      pageId: 'toolset',
      tenantId: 'default',
      customerName: 'Marcus Johnson',
      customerTitle: 'CTO',
      customerCompany: 'InnovateCorp',
      content: 'Our non-technical team members can now create sophisticated AI agents. The template library saved us months of development time. ROI was immediate.',
      rating: 5,
      isVerified: true,
      isFeatured: 'true',
      order: 2,
      createdAt: currentTime,
      updatedAt: currentTime,
    },

    // Lab Testimonials
    {
      PK: 'TESTIMONIALS#lab',
      SK: 'TENANT#default#TEST#001',
      testimonialId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      customerName: 'Dr. Michael Rodriguez',
      customerTitle: 'Research Director',
      customerCompany: 'Innovation Labs',
      content: 'AI Lab has accelerated our research by 300%. The experiment tracking and model marketplace are game-changers. We can now iterate faster and collaborate more effectively.',
      rating: 5,
      isVerified: true,
      isFeatured: 'true',
      order: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'TESTIMONIALS#lab',
      SK: 'TENANT#default#TEST#002',
      testimonialId: uuidv4(),
      pageId: 'lab',
      tenantId: 'default',
      customerName: 'Lisa Wang',
      customerTitle: 'Senior Data Scientist',
      customerCompany: 'DataCorp Analytics',
      content: 'The collaborative notebooks feature is incredible. Our team can work together in real-time, and the automated ML pipelines have reduced our deployment time from weeks to days.',
      rating: 5,
      isVerified: true,
      isFeatured: 'true',
      order: 2,
      createdAt: currentTime,
      updatedAt: currentTime,
    },

    // Observatory Testimonials
    {
      PK: 'TESTIMONIALS#observatory',
      SK: 'TENANT#default#TEST#001',
      testimonialId: uuidv4(),
      pageId: 'observatory',
      tenantId: 'default',
      customerName: 'Jennifer Park',
      customerTitle: 'Data Science Manager',
      customerCompany: 'DataDriven Inc',
      content: 'The analytics dashboard gives us unprecedented visibility into our AI performance. The intelligent alerting system has prevented multiple outages. Essential for enterprise deployments.',
      rating: 5,
      isVerified: true,
      isFeatured: 'true',
      order: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'TESTIMONIALS#observatory',
      SK: 'TENANT#default#TEST#002',
      testimonialId: uuidv4(),
      pageId: 'observatory',
      tenantId: 'default',
      customerName: 'Alex Thompson',
      customerTitle: 'VP of Engineering',
      customerCompany: 'ScaleTech',
      content: 'Observatory transformed how we monitor our AI systems. Real-time insights and predictive analytics help us stay ahead of issues. The ROI tracking shows 40% improvement in system reliability.',
      rating: 5,
      isVerified: true,
      isFeatured: 'true',
      order: 2,
      createdAt: currentTime,
      updatedAt: currentTime,
    },

    // Community Testimonials
    {
      PK: 'TESTIMONIALS#community',
      SK: 'TENANT#default#TEST#001',
      testimonialId: uuidv4(),
      pageId: 'community',
      tenantId: 'default',
      customerName: 'David Kim',
      customerTitle: 'AI Researcher',
      customerCompany: 'Stanford University',
      content: 'The community has been instrumental in my AI journey. The mentorship program connected me with industry experts, and the project showcase helped me land my dream job.',
      rating: 5,
      isVerified: true,
      isFeatured: 'true',
      order: 1,
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      PK: 'TESTIMONIALS#community',
      SK: 'TENANT#default#TEST#002',
      testimonialId: uuidv4(),
      pageId: 'community',
      tenantId: 'default',
      customerName: 'Rachel Martinez',
      customerTitle: 'Machine Learning Engineer',
      customerCompany: 'AIStartup Inc',
      content: 'The discussion forums are incredible. I get answers from world-class experts within hours. The events and webinars keep me updated with the latest AI trends and techniques.',
      rating: 5,
      isVerified: true,
      isFeatured: 'true',
      order: 2,
      createdAt: currentTime,
      updatedAt: currentTime,
    }
  ];

  // Feature Detail Pages
  const featureDetails = [
    {
      featureId: 'visual-agent-builder',
      slug: 'visual-agent-builder',
      tenantId: 'default',
      title: 'Visual Agent Builder',
      subtitle: 'Build AI Agents Without Code',
      description: 'Create sophisticated AI agents using our intuitive drag-and-drop interface. No programming knowledge required.',
      longDescription: `Our Visual Agent Builder revolutionizes AI development by making it accessible to everyone. Whether you're a business analyst, product manager, or seasoned developer, you can create powerful AI agents in minutes, not months.

The platform uses a node-based visual programming approach where you connect different AI components like puzzle pieces. Each node represents a specific function - from data input and processing to LLM interactions and output formatting. Simply drag nodes onto the canvas, connect them with visual links, and configure their settings through intuitive interfaces.

Behind the scenes, our platform generates optimized code and handles all the complex infrastructure requirements. Your visual workflows are automatically converted into production-ready AI agents that can scale to handle millions of interactions.`,
      benefits: [
        'No coding experience required',
        'Visual workflow design with real-time preview',
        'Instant validation and error detection',
        'Template library with 50+ pre-built agents',
        'One-click deployment to production',
        'Automatic scaling and monitoring'
      ],
      useCases: [
        {
          title: 'Customer Support Automation',
          description: 'Create intelligent chatbots that handle customer inquiries, route tickets, and provide 24/7 support.',
          industry: 'E-commerce'
        },
        {
          title: 'Document Processing',
          description: 'Build agents that extract, categorize, and process documents automatically.',
          industry: 'Finance'
        },
        {
          title: 'Content Generation',
          description: 'Design workflows that generate personalized content, social media posts, and marketing copy.',
          industry: 'Marketing'
        },
        {
          title: 'Data Analysis Automation',
          description: 'Create agents that analyze data, generate reports, and provide insights automatically.',
          industry: 'Analytics'
        }
      ],
      technicalSpecs: [
        { spec: 'Supported AI Models', value: '100+ including GPT-4, Claude, Gemini' },
        { spec: 'Processing Speed', value: 'Sub-second response times' },
        { spec: 'Scalability', value: 'Auto-scales to millions of requests' },
        { spec: 'Deployment Options', value: 'Cloud, on-premise, or hybrid' },
        { spec: 'Integration APIs', value: '500+ pre-built connectors' },
        { spec: 'Security', value: 'SOC 2 Type II certified' }
      ],
      screenshots: [
        '/screenshots/visual-builder-main.jpg',
        '/screenshots/visual-builder-nodes.jpg',
        '/screenshots/visual-builder-templates.jpg',
        '/screenshots/visual-builder-deploy.jpg'
      ],
      demoUrl: '/demo/visual-agent-builder',
      documentationUrl: '/docs/visual-agent-builder',
      category: 'toolset',
      tags: ['visual-programming', 'no-code', 'ai-agents', 'automation'],
      status: 'published',
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      featureId: 'experiment-tracking',
      slug: 'experiment-tracking',
      tenantId: 'default',
      title: 'ML Experiment Tracking',
      subtitle: 'Track, Compare, and Reproduce Your ML Experiments',
      description: 'Never lose track of your machine learning experiments again. Compare results, manage versions, and ensure reproducibility.',
      longDescription: `Our ML Experiment Tracking system is designed for serious machine learning practitioners who need to manage hundreds or thousands of experiments. Built on MLOps best practices, it provides comprehensive experiment management from conception to production.

Every experiment is automatically versioned and tracked with complete metadata including code versions, data snapshots, hyperparameters, and results. Our advanced comparison tools let you identify patterns across experiments and understand what drives performance improvements.

The system integrates seamlessly with popular ML frameworks including TensorFlow, PyTorch, Scikit-learn, and more. Whether you're running experiments locally, in the cloud, or on distributed clusters, everything is centralized in one place.`,
      benefits: [
        'Complete experiment history and versioning',
        'Advanced result comparison and visualization',
        'Automatic code and data versioning',
        'Reproducible experiment environments',
        'Integration with popular ML frameworks',
        'Distributed experiment coordination'
      ],
      useCases: [
        {
          title: 'Hyperparameter Optimization',
          description: 'Track thousands of hyperparameter combinations and identify optimal configurations.',
          industry: 'Research'
        },
        {
          title: 'Model Architecture Search',
          description: 'Compare different neural network architectures and training strategies systematically.',
          industry: 'Deep Learning'
        },
        {
          title: 'A/B Testing for Models',
          description: 'Run controlled experiments to compare model performance in production.',
          industry: 'Product'
        },
        {
          title: 'Research Reproducibility',
          description: 'Ensure research results can be reproduced and validated by other team members.',
          industry: 'Academia'
        }
      ],
      technicalSpecs: [
        { spec: 'Experiment Storage', value: 'Unlimited experiment history' },
        { spec: 'Framework Support', value: 'TensorFlow, PyTorch, Scikit-learn, XGBoost' },
        { spec: 'Distributed Training', value: 'Support for multi-node experiments' },
        { spec: 'Data Versioning', value: 'Automatic dataset snapshots' },
        { spec: 'Visualization', value: 'Interactive charts and comparisons' },
        { spec: 'API Access', value: 'REST and Python SDK' }
      ],
      screenshots: [
        '/screenshots/experiment-dashboard.jpg',
        '/screenshots/experiment-comparison.jpg',
        '/screenshots/experiment-metrics.jpg',
        '/screenshots/experiment-reproducibility.jpg'
      ],
      demoUrl: '/demo/experiment-tracking',
      documentationUrl: '/docs/experiment-tracking',
      category: 'lab',
      tags: ['mlops', 'experiment-tracking', 'machine-learning', 'reproducibility'],
      status: 'published',
      createdAt: currentTime,
      updatedAt: currentTime,
    },
    {
      featureId: 'real-time-dashboards',
      slug: 'real-time-dashboards',
      tenantId: 'default',
      title: 'Real-time Analytics Dashboards',
      subtitle: 'Monitor Your AI Systems with Live Data Visualization',
      description: 'Create stunning dashboards that update in real-time. Monitor model performance, system health, and business metrics.',
      longDescription: `Our Real-time Analytics Dashboards provide instant visibility into your AI systems and business metrics. Built for scale and performance, our dashboards can handle millions of data points while maintaining sub-second update times.

The drag-and-drop dashboard builder makes it easy to create professional visualizations without any coding. Choose from dozens of chart types, customize colors and styling, and arrange components exactly how you want them.

Advanced features include drill-down capabilities, interactive filtering, and automated anomaly detection. Set up intelligent alerts that notify you when metrics go outside normal ranges, and use our mobile-responsive design to monitor your systems from anywhere.`,
      benefits: [
        'Real-time data updates with sub-second latency',
        'Drag-and-drop dashboard designer',
        'Mobile-responsive design',
        'Interactive filtering and drill-down',
        'Automated anomaly detection',
        'Custom alert rules and notifications'
      ],
      useCases: [
        {
          title: 'AI Model Performance Monitoring',
          description: 'Track model accuracy, latency, and throughput in real-time across production systems.',
          industry: 'AI/ML'
        },
        {
          title: 'Business Intelligence Dashboards',
          description: 'Monitor KPIs, revenue metrics, and customer behavior with live business data.',
          industry: 'Business'
        },
        {
          title: 'Infrastructure Monitoring',
          description: 'Keep track of system health, resource usage, and performance across cloud infrastructure.',
          industry: 'DevOps'
        },
        {
          title: 'IoT Device Monitoring',
          description: 'Visualize sensor data, device status, and environmental conditions in real-time.',
          industry: 'IoT'
        }
      ],
      technicalSpecs: [
        { spec: 'Update Frequency', value: 'Sub-second real-time updates' },
        { spec: 'Data Sources', value: '100+ pre-built connectors' },
        { spec: 'Chart Types', value: '50+ visualization options' },
        { spec: 'Concurrent Users', value: 'Unlimited dashboard viewers' },
        { spec: 'Data Retention', value: 'Configurable from 30 days to 7 years' },
        { spec: 'Export Options', value: 'PDF, PNG, CSV, Excel' }
      ],
      screenshots: [
        '/screenshots/dashboard-builder.jpg',
        '/screenshots/dashboard-realtime.jpg',
        '/screenshots/dashboard-mobile.jpg',
        '/screenshots/dashboard-alerts.jpg'
      ],
      demoUrl: '/demo/real-time-dashboards',
      documentationUrl: '/docs/real-time-dashboards',
      category: 'observatory',
      tags: ['dashboards', 'real-time', 'analytics', 'visualization'],
      status: 'published',
      createdAt: currentTime,
      updatedAt: currentTime,
    }
  ];

  console.log('📝 Inserting service pages...');
  for (const page of servicePages) {
    await dynamoClient.send(new PutItemCommand({
      TableName: getTableName('content-pages'),
      Item: marshall(page)
    }));
  }

  console.log('🎯 Inserting service features...');
  for (const feature of serviceFeatures) {
    await dynamoClient.send(new PutItemCommand({
      TableName: getTableName('content-features'),
      Item: marshall(feature)
    }));
  }

  console.log('🔍 Inserting SEO metadata...');
  for (const seo of seoMetadata) {
    await dynamoClient.send(new PutItemCommand({
      TableName: getTableName('content-seo'),
      Item: marshall(seo)
    }));
  }

  console.log('💬 Inserting testimonials...');
  for (const testimonial of testimonials) {
    await dynamoClient.send(new PutItemCommand({
      TableName: getTableName('content-testimonials'),
      Item: marshall(testimonial)
    }));
  }

  console.log('📋 Inserting feature details...');
  for (const detail of featureDetails) {
    await dynamoClient.send(new PutItemCommand({
      TableName: getTableName('content-feature-details'),
      Item: marshall(detail)
    }));
  }

  console.log('✅ Content seeding completed successfully!');
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting comprehensive DynamoDB setup...');
    console.log(`📍 Environment: ${environment}`);
    console.log(`🌍 Region: ${region}`);
    
    await createTablesIfNotExist();
    await seedComprehensiveData();
    
    console.log('🎉 Setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 5 DynamoDB tables created/verified');
    console.log('- 4 service pages with comprehensive content');
    console.log('- 16 detailed service features');
    console.log('- 4 pages of SEO-optimized metadata');
    console.log('- 8 customer testimonials');
    console.log('- 3 detailed feature pages');
    console.log('\n🔗 Next steps:');
    console.log('- Update frontend components to use real DynamoDB data');
    console.log('- Test content service integration');
    console.log('- Deploy to development environment');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, getTableName };
