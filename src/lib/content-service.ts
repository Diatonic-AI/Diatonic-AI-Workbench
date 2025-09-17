import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
// Use server-compatible config for Node.js environments
import { serverAWSConfig } from './server-aws-config';

// DynamoDB client setup
let dynamoClient: DynamoDBClient | null = null;

const getDynamoClient = async (): Promise<DynamoDBClient> => {
  if (!dynamoClient) {
    try {
      const isServerSide = typeof window === 'undefined';
      const config = serverAWSConfig;
      
      const clientConfig: any = {
        region: config.dynamodb.region,
      };
      
      // Use local DynamoDB endpoint if specified
      if (config.dynamodb.endpoint) {
        console.log('🔧 Using local DynamoDB endpoint:', config.dynamodb.endpoint);
        clientConfig.endpoint = config.dynamodb.endpoint;
        clientConfig.credentials = {
          accessKeyId: 'fake',
          secretAccessKey: 'fake',
        };
      } else {
        // Production - credentials will be provided by AWS environment
        console.log('🔒 Using AWS DynamoDB for production');
      }
      
      dynamoClient = new DynamoDBClient(clientConfig);
    } catch (error) {
      console.error('Failed to initialize DynamoDB client:', error);
      throw error;
    }
  }
  return dynamoClient;
};

// Table names (with environment prefix)
const getTableName = (baseName: string): string => {
  // For development, use the dev-diatonic-ai prefix to match local tables
  const env = process.env.NODE_ENV || 'development';
  if (env === 'development' && serverAWSConfig.dynamodb?.endpoint) {
    return `dev-diatonic-ai-${baseName}`;
  }
  return `diatonic-ai-${env}-${baseName}`;
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

// Add new type definitions for our local data
export interface ToolsetItem {
  tool_id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface LabExperiment {
  experiment_id: string;
  version: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetric {
  metric_type: string;
  timestamp: string;
  tenant_id: string;
  metric_value: number;
  metric_label: string;
  change_percent: string;
  time_period: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityPost {
  post_id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  category: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface EducationCourse {
  course_id: string;
  title: string;
  description: string;
  instructor: string;
  duration_hours: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  module_count: number;
  enrollment_count: number;
  average_rating: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// Content Service Class
export class ContentService {
  private static instance: ContentService;
  private tenantId = 'dev-tenant'; // Use dev-tenant for development

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
      
      const params: any = {
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

  // New methods for local DynamoDB data types
  async getToolsetItems(): Promise<ToolsetItem[]> {
    try {
      const client = await getDynamoClient();
      const response = await client.send(new ScanCommand({
        TableName: getTableName('toolset-items'),
      }));
      
      if (!response.Items) {
        return [];
      }
      
      const items = response.Items.map(item => unmarshall(item) as ToolsetItem);
      return items.sort((a, b) => a.display_order - b.display_order);
    } catch (error) {
      console.error('Error fetching toolset items:', error);
      return [];
    }
  }

  async getLabExperiments(filters?: { status?: string }): Promise<LabExperiment[]> {
    try {
      const client = await getDynamoClient();
      let command;
      
      if (filters?.status) {
        command = new ScanCommand({
          TableName: getTableName('lab-experiments'),
          FilterExpression: '#status = :status AND tenant_id = :tenantId',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: marshall({
            ':status': filters.status,
            ':tenantId': this.tenantId,
          }),
        });
      } else {
        command = new ScanCommand({
          TableName: getTableName('lab-experiments'),
          FilterExpression: 'tenant_id = :tenantId',
          ExpressionAttributeValues: marshall({
            ':tenantId': this.tenantId,
          }),
        });
      }
      
      const response = await client.send(command);
      
      if (!response.Items) {
        return [];
      }
      
      const items = response.Items.map(item => unmarshall(item) as LabExperiment);
      return items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } catch (error) {
      console.error('Error fetching lab experiments:', error);
      return [];
    }
  }

  async getDashboardMetrics(tenantId?: string): Promise<DashboardMetric[]> {
    try {
      const client = await getDynamoClient();
      const targetTenantId = tenantId || this.tenantId;
      
      const response = await client.send(new ScanCommand({
        TableName: getTableName('dashboard-metrics'),
        FilterExpression: 'tenant_id = :tenantId',
        ExpressionAttributeValues: marshall({
          ':tenantId': targetTenantId,
        }),
      }));
      
      if (!response.Items) {
        return [];
      }
      
      const items = response.Items.map(item => unmarshall(item) as DashboardMetric);
      return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return [];
    }
  }

  async getCommunityPosts(filters?: { category?: string; published?: boolean }): Promise<CommunityPost[]> {
    try {
      const client = await getDynamoClient();
      let command;
      
      if (filters?.category || filters?.published !== undefined) {
        const filterExpressions: string[] = [];
        const expressionAttributeValues: Record<string, any> = {};
        
        if (filters.category) {
          filterExpressions.push('category = :category');
          expressionAttributeValues[':category'] = filters.category;
        }
        
        if (filters.published !== undefined) {
          filterExpressions.push('is_published = :published');
          expressionAttributeValues[':published'] = filters.published;
        }
        
        command = new ScanCommand({
          TableName: getTableName('community-posts'),
          FilterExpression: filterExpressions.join(' AND '),
          ExpressionAttributeValues: marshall(expressionAttributeValues),
        });
      } else {
        command = new ScanCommand({
          TableName: getTableName('community-posts'),
        });
      }
      
      const response = await client.send(command);
      
      if (!response.Items) {
        return [];
      }
      
      const items = response.Items.map(item => unmarshall(item) as CommunityPost);
      return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('Error fetching community posts:', error);
      return [];
    }
  }

  async getEducationCourses(filters?: { difficulty?: string; published?: boolean }): Promise<EducationCourse[]> {
    try {
      const client = await getDynamoClient();
      let command;
      
      if (filters?.difficulty || filters?.published !== undefined) {
        const filterExpressions: string[] = [];
        const expressionAttributeValues: Record<string, any> = {};
        
        if (filters.difficulty) {
          filterExpressions.push('difficulty_level = :difficulty');
          expressionAttributeValues[':difficulty'] = filters.difficulty;
        }
        
        if (filters.published !== undefined) {
          filterExpressions.push('is_published = :published');
          expressionAttributeValues[':published'] = filters.published;
        }
        
        command = new ScanCommand({
          TableName: getTableName('education-courses'),
          FilterExpression: filterExpressions.join(' AND '),
          ExpressionAttributeValues: marshall(expressionAttributeValues),
        });
      } else {
        command = new ScanCommand({
          TableName: getTableName('education-courses'),
        });
      }
      
      const response = await client.send(command);
      
      if (!response.Items) {
        return [];
      }
      
      const items = response.Items.map(item => unmarshall(item) as EducationCourse);
      return items.sort((a, b) => {
        if (b.average_rating !== a.average_rating) {
          return b.average_rating - a.average_rating;
        }
        return b.enrollment_count - a.enrollment_count;
      });
    } catch (error) {
      console.error('Error fetching education courses:', error);
      return [];
    }
  }

  async createToolsetItem(item: Omit<ToolsetItem, 'created_at' | 'updated_at'>): Promise<ToolsetItem> {
    try {
      const client = await getDynamoClient();
      const now = new Date().toISOString();
      
      const newItem: ToolsetItem = {
        ...item,
        created_at: now,
        updated_at: now,
      };

      await client.send(new PutItemCommand({
        TableName: getTableName('toolset-items'),
        Item: marshall(newItem),
      }));

      return newItem;
    } catch (error) {
      console.error('Error creating toolset item:', error);
      throw new Error('Failed to create toolset item');
    }
  }

  async updateToolsetItem(toolId: string, updates: Partial<ToolsetItem>): Promise<ToolsetItem> {
    try {
      const client = await getDynamoClient();
      const updateItem = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Build update expression dynamically
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updateItem).forEach(([key, value]) => {
        const nameKey = `#${key}`;
        const valueKey = `:${key}`;
        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
      });

      const command = new UpdateItemCommand({
        TableName: getTableName('toolset-items'),
        Key: marshall({ tool_id: toolId }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: 'ALL_NEW',
      });

      const result = await client.send(command);
      return unmarshall(result.Attributes!) as ToolsetItem;
    } catch (error) {
      console.error('Error updating toolset item:', error);
      throw new Error('Failed to update toolset item');
    }
  }

  async createLabExperiment(experiment: Omit<LabExperiment, 'created_at' | 'updated_at' | 'tenant_id'>): Promise<LabExperiment> {
    try {
      const client = await getDynamoClient();
      const now = new Date().toISOString();
      
      const newExperiment: LabExperiment = {
        ...experiment,
        tenant_id: this.tenantId,
        created_at: now,
        updated_at: now,
      };

      await client.send(new PutItemCommand({
        TableName: getTableName('lab-experiments'),
        Item: marshall(newExperiment),
      }));

      return newExperiment;
    } catch (error) {
      console.error('Error creating lab experiment:', error);
      throw new Error('Failed to create lab experiment');
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const client = await getDynamoClient();
      // Try a simple operation on one of our local tables
      await client.send(new ScanCommand({
        TableName: getTableName('toolset-items'),
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
