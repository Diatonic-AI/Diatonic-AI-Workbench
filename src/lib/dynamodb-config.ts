// DynamoDB Configuration for Content Management System
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

// Environment configuration
const getEnvironment = () => {
  return import.meta.env.MODE || 'development';
};

// DynamoDB configuration
const dynamoConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  ...(getEnvironment() === 'development' && {
    endpoint: 'http://localhost:8002', // LocalStack endpoint for dev
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
};

// Create DynamoDB client
const dynamoClient = new DynamoDB(dynamoConfig);
const docClient = DynamoDBDocument.from(dynamoClient);

// Table names with environment prefixes
const TABLE_PREFIX = getEnvironment() === 'production' ? 'prod' : 'dev';

export const TABLES = {
  LANDING_PAGES: `${TABLE_PREFIX}-ai-nexus-landing-pages`,
  PAGE_SECTIONS: `${TABLE_PREFIX}-ai-nexus-page-sections`,
  SEO_METADATA: `${TABLE_PREFIX}-ai-nexus-seo-metadata`,
  FEATURES: `${TABLE_PREFIX}-ai-nexus-features`,
  TESTIMONIALS: `${TABLE_PREFIX}-ai-nexus-testimonials`,
  PRICING_PLANS: `${TABLE_PREFIX}-ai-nexus-pricing-plans`,
} as const;

// Content management interfaces
export interface LandingPage {
  pageId: string; // Primary key: 'toolset', 'lab', 'observatory', etc.
  tenantId: string; // Sort key for multi-tenancy support
  title: string;
  subtitle: string;
  description: string;
  heroImage?: string;
  heroVideo?: string;
  ctaText: string;
  ctaUrl: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  metadata?: Record<string, any>;
}

export interface PageSection {
  sectionId: string; // Primary key: UUID
  pageId: string; // Foreign key to LandingPage
  tenantId: string;
  sectionType: 'hero' | 'features' | 'benefits' | 'testimonials' | 'cta' | 'faq' | 'demo';
  title?: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  order: number;
  isVisible: boolean;
  styling?: {
    backgroundColor?: string;
    textColor?: string;
    layout?: string;
  };
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface SEOMetadata {
  pageId: string; // Primary key
  tenantId: string; // Sort key
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  structuredData?: Record<string, any>[];
  robotsMeta?: string;
  languageCode: string;
  regionCode?: string;
  updatedAt: string;
}

export interface Feature {
  featureId: string; // Primary key
  pageId: string; // GSI partition key
  tenantId: string;
  title: string;
  description: string;
  icon: string;
  imageUrl?: string;
  benefits: string[];
  category: string;
  order: number;
  isHighlighted: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  testimonialId: string; // Primary key
  pageId: string; // GSI partition key
  tenantId: string;
  customerName: string;
  customerTitle?: string;
  customerCompany?: string;
  customerAvatar?: string;
  content: string;
  rating: number; // 1-5 stars
  isVerified: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// DynamoDB table creation schemas
export const TABLE_SCHEMAS = {
  LANDING_PAGES: {
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
  
  PAGE_SECTIONS: {
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
  
  SEO_METADATA: {
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
  
  FEATURES: {
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
  
  TESTIMONIALS: {
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

// Utility functions for DynamoDB operations
export class ContentService {
  static async getLandingPage(pageId: string, tenantId: string = 'default'): Promise<LandingPage | null> {
    try {
      const result = await docClient.get({
        TableName: TABLES.LANDING_PAGES,
        Key: { pageId, tenantId },
      });
      
      return result.Item as LandingPage || null;
    } catch (error) {
      console.error('Error fetching landing page:', error);
      return null;
    }
  }
  
  static async getPageSections(pageId: string): Promise<PageSection[]> {
    try {
      const result = await docClient.query({
        TableName: TABLES.PAGE_SECTIONS,
        IndexName: 'PageIndex',
        KeyConditionExpression: 'pageId = :pageId',
        ExpressionAttributeValues: {
          ':pageId': pageId,
        },
        ScanIndexForward: true, // Sort by order ASC
      });
      
      return result.Items as PageSection[] || [];
    } catch (error) {
      console.error('Error fetching page sections:', error);
      return [];
    }
  }
  
  static async getSEOMetadata(pageId: string, tenantId: string = 'default'): Promise<SEOMetadata | null> {
    try {
      const result = await docClient.get({
        TableName: TABLES.SEO_METADATA,
        Key: { pageId, tenantId },
      });
      
      return result.Item as SEOMetadata || null;
    } catch (error) {
      console.error('Error fetching SEO metadata:', error);
      return null;
    }
  }
  
  static async getFeatures(pageId: string): Promise<Feature[]> {
    try {
      const result = await docClient.query({
        TableName: TABLES.FEATURES,
        IndexName: 'PageIndex',
        KeyConditionExpression: 'pageId = :pageId',
        FilterExpression: 'isVisible = :visible',
        ExpressionAttributeValues: {
          ':pageId': pageId,
          ':visible': true,
        },
        ScanIndexForward: true,
      });
      
      return result.Items as Feature[] || [];
    } catch (error) {
      console.error('Error fetching features:', error);
      return [];
    }
  }
  
  static async getTestimonials(pageId: string): Promise<Testimonial[]> {
    try {
      const result = await docClient.query({
        TableName: TABLES.TESTIMONIALS,
        IndexName: 'PageIndex',
        KeyConditionExpression: 'pageId = :pageId',
        ScanIndexForward: true,
      });
      
      return result.Items as Testimonial[] || [];
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      return [];
    }
  }
  
  // Admin methods for content management
  static async createOrUpdateLandingPage(page: LandingPage): Promise<boolean> {
    try {
      await docClient.put({
        TableName: TABLES.LANDING_PAGES,
        Item: {
          ...page,
          updatedAt: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Error creating/updating landing page:', error);
      return false;
    }
  }
  
  static async createOrUpdatePageSection(section: PageSection): Promise<boolean> {
    try {
      await docClient.put({
        TableName: TABLES.PAGE_SECTIONS,
        Item: {
          ...section,
          updatedAt: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      console.error('Error creating/updating page section:', error);
      return false;
    }
  }
}

export { docClient, dynamoClient };
