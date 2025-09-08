import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from './aws-config';
import { getCurrentCredentials } from 'aws-amplify/auth';

// DynamoDB client setup
let dynamoClient: DynamoDBClient | null = null;

const getDynamoClient = async (): Promise<DynamoDBClient> => {
  if (!dynamoClient) {
    try {
      // Get credentials from Amplify Auth
      const credentials = await getCurrentCredentials();
      
      dynamoClient = new DynamoDBClient({
        region: awsConfig.region,
        credentials: credentials.credentials,
      });
    } catch (error) {
      console.warn('Failed to get AWS credentials, using local/default config:', error);
      // Fallback for local development
      dynamoClient = new DynamoDBClient({
        region: awsConfig.region,
        endpoint: 'http://localhost:8002', // Local DynamoDB
      });
    }
  }
  return dynamoClient;
};

// Table names (with environment prefix)
const getTableName = (baseName: string): string => {
  const env = import.meta.env.VITE_NODE_ENV || 'development';
  return `ai-nexus-workbench-${env}-${baseName}`;
};

// Type definitions
export interface ServicePageContent {
  pageId: string;
  tenantId: string;
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  heroImage?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ServiceFeature {
  featureId: string;
  pageId: string;
  tenantId: string;
  title: string;
  description: string;
  icon: string;
  benefits: string[];
  category: string;
  order: number;
  isHighlighted: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceTestimonial {
  testimonialId: string;
  pageId: string;
  tenantId: string;
  customerName: string;
  customerTitle: string;
  customerCompany: string;
  content: string;
  rating: number;
  isVerified: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SEOMetadata {
  pageId: string;
  tenantId: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  structuredData?: Record<string, any>;
  languageCode: string;
  updatedAt: string;
}

export interface FeatureDetail {
  featureId: string;
  slug: string;
  tenantId: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  benefits: string[];
  useCases: Array<{
    title: string;
    description: string;
    industry?: string;
  }>;
  technicalSpecs?: Array<{
    spec: string;
    value: string;
  }>;
  screenshots: string[];
  demoUrl?: string;
  documentationUrl?: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// Content Service Class
export class ContentService {
  private static instance: ContentService;
  private tenantId = 'default'; // Default tenant for now

  static getInstance(): ContentService {
    if (!ContentService.instance) {
      ContentService.instance = new ContentService();
    }
    return ContentService.instance;
  }

  setTenant(tenantId: string): void {
    this.tenantId = tenantId;
  }

  // Service Page Content Methods
  async getServicePageContent(pageId: string): Promise<ServicePageContent | null> {
    try {
      const client = await getDynamoClient();
      const response = await client.send(new GetItemCommand({
        TableName: getTableName('content-pages'),
        Key: marshall({
          PK: `PAGE#${pageId}`,
          SK: `TENANT#${this.tenantId}`
        })
      }));

      if (!response.Item) {
        return null;
      }

      return unmarshall(response.Item) as ServicePageContent;
    } catch (error) {
      console.error('Error fetching service page content:', error);
      return null;
    }
  }

  async getServiceFeatures(pageId: string): Promise<ServiceFeature[]> {
    try {
      const client = await getDynamoClient();
      const response = await client.send(new QueryCommand({
        TableName: getTableName('content-features'),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: marshall({
          ':pk': `FEATURES#${pageId}`,
          ':sk': `TENANT#${this.tenantId}#FEATURE`
        }),
        ScanIndexForward: true // Sort by order
      }));

      if (!response.Items) {
        return [];
      }

      return response.Items
        .map(item => unmarshall(item) as ServiceFeature)
        .filter(feature => feature.isVisible)
        .sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Error fetching service features:', error);
      return [];
    }
  }

  async getServiceTestimonials(pageId: string, limit = 5): Promise<ServiceTestimonial[]> {
    try {
      const client = await getDynamoClient();
      const response = await client.send(new QueryCommand({
        TableName: getTableName('content-testimonials'),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: marshall({
          ':pk': `TESTIMONIALS#${pageId}`,
          ':sk': `TENANT#${this.tenantId}#TEST`
        }),
        Limit: limit,
        ScanIndexForward: true
      }));

      if (!response.Items) {
        return [];
      }

      return response.Items
        .map(item => unmarshall(item) as ServiceTestimonial)
        .sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Error fetching service testimonials:', error);
      return [];
    }
  }

  async getSEOMetadata(pageId: string): Promise<SEOMetadata | null> {
    try {
      const client = await getDynamoClient();
      const response = await client.send(new GetItemCommand({
        TableName: getTableName('content-seo'),
        Key: marshall({
          PK: `SEO#${pageId}`,
          SK: `TENANT#${this.tenantId}`
        })
      }));

      if (!response.Item) {
        return null;
      }

      return unmarshall(response.Item) as SEOMetadata;
    } catch (error) {
      console.error('Error fetching SEO metadata:', error);
      return null;
    }
  }

  // Feature Detail Page Methods
  async getFeatureDetail(slug: string): Promise<FeatureDetail | null> {
    try {
      const client = await getDynamoClient();
      const response = await client.send(new QueryCommand({
        TableName: getTableName('content-feature-details'),
        IndexName: 'SlugIndex',
        KeyConditionExpression: 'slug = :slug AND tenantId = :tenantId',
        ExpressionAttributeValues: marshall({
          ':slug': slug,
          ':tenantId': this.tenantId
        })
      }));

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      return unmarshall(response.Items[0]) as FeatureDetail;
    } catch (error) {
      console.error('Error fetching feature detail:', error);
      return null;
    }
  }

  async getAllFeatureDetails(category?: string): Promise<FeatureDetail[]> {
    try {
      const client = await getDynamoClient();
      
      let params: any = {
        TableName: getTableName('content-feature-details'),
        FilterExpression: 'tenantId = :tenantId AND #status = :status',
        ExpressionAttributeValues: marshall({
          ':tenantId': this.tenantId,
          ':status': 'published'
        }),
        ExpressionAttributeNames: {
          '#status': 'status'
        }
      };

      if (category) {
        params.FilterExpression += ' AND category = :category';
        params.ExpressionAttributeValues[':category'] = marshall(category).category;
      }

      const response = await client.send(new ScanCommand(params));

      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => unmarshall(item) as FeatureDetail);
    } catch (error) {
      console.error('Error fetching feature details:', error);
      return [];
    }
  }

  // Content Management Methods (for admin)
  async createOrUpdateServicePage(content: Partial<ServicePageContent>): Promise<boolean> {
    try {
      const client = await getDynamoClient();
      const now = new Date().toISOString();
      
      const item: ServicePageContent = {
        pageId: content.pageId!,
        tenantId: this.tenantId,
        title: content.title || '',
        subtitle: content.subtitle || '',
        description: content.description || '',
        ctaText: content.ctaText || 'Learn More',
        ctaUrl: content.ctaUrl || '#',
        heroImage: content.heroImage,
        status: content.status || 'draft',
        version: (content.version || 0) + 1,
        createdAt: content.createdAt || now,
        updatedAt: now,
        createdBy: content.createdBy || 'system',
        updatedBy: content.updatedBy || 'system',
      };

      await client.send(new PutItemCommand({
        TableName: getTableName('content-pages'),
        Item: marshall(item)
      }));

      return true;
    } catch (error) {
      console.error('Error saving service page content:', error);
      return false;
    }
  }

  async createOrUpdateFeature(feature: Partial<ServiceFeature>): Promise<boolean> {
    try {
      const client = await getDynamoClient();
      const now = new Date().toISOString();
      
      const item: ServiceFeature = {
        featureId: feature.featureId || `feature_${Date.now()}`,
        pageId: feature.pageId!,
        tenantId: this.tenantId,
        title: feature.title || '',
        description: feature.description || '',
        icon: feature.icon || 'star',
        benefits: feature.benefits || [],
        category: feature.category || 'general',
        order: feature.order || 0,
        isHighlighted: feature.isHighlighted ?? false,
        isVisible: feature.isVisible ?? true,
        createdAt: feature.createdAt || now,
        updatedAt: now,
      };

      await client.send(new PutItemCommand({
        TableName: getTableName('content-features'),
        Item: marshall(item)
      }));

      return true;
    } catch (error) {
      console.error('Error saving feature:', error);
      return false;
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const client = await getDynamoClient();
      // Try a simple operation
      await client.send(new ScanCommand({
        TableName: getTableName('content-pages'),
        Limit: 1
      }));
      return true;
    } catch (error) {
      console.error('Content service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const contentService = ContentService.getInstance();

// Fallback data for when DynamoDB is not available
export const fallbackContent = {
  toolset: {
    title: 'AI Toolset',
    subtitle: 'Visual Agent Builder for Everyone',
    description: 'Create powerful AI agents with our intuitive drag-and-drop interface. No coding required - just connect, configure, and deploy intelligent automation solutions in minutes.',
    ctaText: 'Start Building Agents',
    ctaUrl: '/toolset',
  },
  lab: {
    title: 'AI Lab',
    subtitle: 'Experiment with Confidence',
    description: 'Push the boundaries of AI innovation in our secure cloud environment. Test cutting-edge models, run complex experiments, and iterate quickly with enterprise-grade infrastructure.',
    ctaText: 'Start Experimenting',
    ctaUrl: '/lab',
  },
  observatory: {
    title: 'Observatory',
    subtitle: 'Intelligence Through Insights',
    description: 'Transform data into actionable intelligence with advanced analytics and visualization tools. Monitor performance, track trends, and make data-driven decisions across your AI ecosystem.',
    ctaText: 'Explore Analytics',
    ctaUrl: '/observatory',
  },
  community: {
    title: 'Community Hub',
    subtitle: 'Connect. Learn. Grow.',
    description: 'Join a vibrant ecosystem of AI developers, researchers, and innovators. Share knowledge, collaborate on projects, and accelerate your AI journey with our global community.',
    ctaText: 'Join Community',
    ctaUrl: '/community',
  },
  education: {
    title: 'Education Hub',
    subtitle: 'Learn AI Development the Right Way',
    description: 'Master AI development with our comprehensive learning platform. From beginner tutorials to advanced courses, get hands-on experience with real-world projects and expert guidance.',
    ctaText: 'Start Learning',
    ctaUrl: '/education',
  }
};
