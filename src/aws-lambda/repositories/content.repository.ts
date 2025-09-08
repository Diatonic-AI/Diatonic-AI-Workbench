/**
 * DynamoDB Content Repository
 * Implements content management operations using AWS DynamoDB
 * Leverages MCP DynamoDB tools for enhanced development experience
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  LandingPageContent,
  ContentRepository,
  BaseEntity
} from '../types/content.types';
import { logger, tracer, PowertoolsUtils } from '../utils/powertools';
import { ulid } from 'ulid';

/**
 * DynamoDB-based content repository implementation
 * Uses single-table design with GSI for efficient queries
 */
export class DynamoDBContentRepository implements ContentRepository {
  private readonly client: DynamoDBClient;
  private readonly tableName: string;
  private readonly gsiName: string;

  constructor(
    tableName = process.env.CONTENT_TABLE_NAME || 'diatonic-ai-content',
    region = process.env.AWS_REGION || 'us-east-1'
  ) {
    this.client = tracer.captureAWSv3Client(new DynamoDBClient({ region }));
    this.tableName = tableName;
    this.gsiName = `${tableName}-tenant-type-index`;
  }

  /**
   * Get landing page by service and tenant
   */
  async getLandingPage(service: string, tenant: string): Promise<LandingPageContent | null> {
    return PowertoolsUtils.withTracing('DynamoDB.GetLandingPage', async () => {
      try {
        const command = new GetItemCommand({
          TableName: this.tableName,
          Key: marshall({
            PK: `TENANT#${tenant}`,
            SK: `LANDING_PAGE#${service}`
          })
        });

        const result = await this.client.send(command);

        if (!result.Item) {
          logger.info('Landing page not found', { service, tenant });
          return null;
        }

        const item = unmarshall(result.Item) as LandingPageContent;
        
        logger.info('Landing page retrieved successfully', {
          service,
          tenant,
          id: item.id
        });

        return item;
      } catch (error) {
        logger.error('Failed to get landing page', {
          error: error instanceof Error ? error.message : 'Unknown error',
          service,
          tenant
        });
        throw error;
      }
    });
  }

  /**
   * Create new landing page content
   */
  async createLandingPage(
    content: Omit<LandingPageContent, 'id' | 'created'>
  ): Promise<LandingPageContent> {
    return PowertoolsUtils.withTracing('DynamoDB.CreateLandingPage', async () => {
      const now = new Date().toISOString();
      const id = ulid();
      
      const landingPage: LandingPageContent = {
        ...content,
        id,
        created: now,
        updated: now,
        version: 1
      };

      try {
        const command = new PutItemCommand({
          TableName: this.tableName,
          Item: marshall({
            ...landingPage,
            PK: `TENANT#${content.tenant}`,
            SK: `LANDING_PAGE#${content.service}`,
            GSI1PK: `TYPE#landing-page`,
            GSI1SK: `TENANT#${content.tenant}#SERVICE#${content.service}`,
            TTL: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year TTL
          }),
          ConditionExpression: 'attribute_not_exists(PK)' // Prevent overwrites
        });

        await this.client.send(command);

        logger.info('Landing page created successfully', {
          id: landingPage.id,
          service: content.service,
          tenant: content.tenant
        });

        return landingPage;
      } catch (error) {
        logger.error('Failed to create landing page', {
          error: error instanceof Error ? error.message : 'Unknown error',
          service: content.service,
          tenant: content.tenant
        });
        throw error;
      }
    });
  }

  /**
   * Update existing landing page
   */
  async updateLandingPage(
    id: string,
    updates: Partial<LandingPageContent>
  ): Promise<LandingPageContent> {
    return PowertoolsUtils.withTracing('DynamoDB.UpdateLandingPage', async () => {
      if (!updates.tenant) {
        throw new Error('Tenant is required for updates');
      }

      const now = new Date().toISOString();
      const version = (updates.version || 1) + 1;

      // Build update expression dynamically
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Always update these fields
      updateExpressions.push('#updated = :updated', '#version = :version');
      expressionAttributeNames['#updated'] = 'updated';
      expressionAttributeNames['#version'] = 'version';
      expressionAttributeValues[':updated'] = now;
      expressionAttributeValues[':version'] = version;

      // Add other fields to update
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created' && key !== 'updated' && key !== 'version' && key !== 'tenant') {
          const attrName = `#${key}`;
          const attrValue = `:${key}`;
          updateExpressions.push(`${attrName} = ${attrValue}`);
          expressionAttributeNames[attrName] = key;
          expressionAttributeValues[attrValue] = value;
        }
      });

      try {
        const command = new UpdateItemCommand({
          TableName: this.tableName,
          Key: marshall({
            PK: `TENANT#${updates.tenant}`,
            SK: updates.service ? `LANDING_PAGE#${updates.service}` : `LANDING_PAGE#${id}`
          }),
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
          ConditionExpression: 'attribute_exists(PK)', // Ensure item exists
          ReturnValues: 'ALL_NEW'
        });

        const result = await this.client.send(command);

        if (!result.Attributes) {
          throw new Error('Update failed - no attributes returned');
        }

        const updatedItem = unmarshall(result.Attributes) as LandingPageContent;

        logger.info('Landing page updated successfully', {
          id: updatedItem.id,
          version: updatedItem.version,
          tenant: updates.tenant
        });

        return updatedItem;
      } catch (error) {
        logger.error('Failed to update landing page', {
          error: error instanceof Error ? error.message : 'Unknown error',
          id,
          tenant: updates.tenant
        });
        throw error;
      }
    });
  }

  /**
   * Delete landing page
   */
  async deleteLandingPage(id: string, tenant: string): Promise<boolean> {
    return PowertoolsUtils.withTracing('DynamoDB.DeleteLandingPage', async () => {
      try {
        const command = new DeleteItemCommand({
          TableName: this.tableName,
          Key: marshall({
            PK: `TENANT#${tenant}`,
            SK: `LANDING_PAGE#${id}`
          }),
          ConditionExpression: 'attribute_exists(PK)', // Ensure item exists
          ReturnValues: 'ALL_OLD'
        });

        const result = await this.client.send(command);

        const deleted = !!result.Attributes;

        logger.info('Landing page deletion attempted', {
          id,
          tenant,
          deleted
        });

        return deleted;
      } catch (error) {
        logger.error('Failed to delete landing page', {
          error: error instanceof Error ? error.message : 'Unknown error',
          id,
          tenant
        });
        throw error;
      }
    });
  }

  /**
   * List landing pages for a tenant
   */
  async listLandingPages(tenant: string, status?: string): Promise<LandingPageContent[]> {
    return PowertoolsUtils.withTracing('DynamoDB.ListLandingPages', async () => {
      try {
        let command;

        if (status) {
          // Use GSI to filter by status
          command = new QueryCommand({
            TableName: this.tableName,
            IndexName: this.gsiName,
            KeyConditionExpression: 'GSI1PK = :type AND begins_with(GSI1SK, :tenant)',
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: {
              '#status': 'status'
            },
            ExpressionAttributeValues: marshall({
              ':type': 'TYPE#landing-page',
              ':tenant': `TENANT#${tenant}`,
              ':status': status
            })
          });
        } else {
          // Query all landing pages for tenant
          command = new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: marshall({
              ':pk': `TENANT#${tenant}`,
              ':sk': 'LANDING_PAGE#'
            })
          });
        }

        const result = await this.client.send(command);

        const items = result.Items?.map(item => unmarshall(item) as LandingPageContent) || [];

        logger.info('Landing pages listed successfully', {
          tenant,
          status,
          count: items.length
        });

        return items;
      } catch (error) {
        logger.error('Failed to list landing pages', {
          error: error instanceof Error ? error.message : 'Unknown error',
          tenant,
          status
        });
        throw error;
      }
    });
  }

  /**
   * Get all content by type (for admin dashboard)
   */
  async getContentByType(type: string, tenant?: string): Promise<BaseEntity[]> {
    return PowertoolsUtils.withTracing('DynamoDB.GetContentByType', async () => {
      try {
        let command;

        if (tenant) {
          // Query specific tenant
          command = new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk',
            FilterExpression: '#type = :type',
            ExpressionAttributeNames: {
              '#type': 'type'
            },
            ExpressionAttributeValues: marshall({
              ':pk': `TENANT#${tenant}`,
              ':type': type
            })
          });
        } else {
          // Scan all tenants (admin operation)
          command = new ScanCommand({
            TableName: this.tableName,
            FilterExpression: '#type = :type',
            ExpressionAttributeNames: {
              '#type': 'type'
            },
            ExpressionAttributeValues: marshall({
              ':type': type
            })
          });
        }

        const result = await this.client.send(command);
        const items = result.Items?.map(item => unmarshall(item) as BaseEntity) || [];

        logger.info('Content retrieved by type', {
          type,
          tenant,
          count: items.length
        });

        return items;
      } catch (error) {
        logger.error('Failed to get content by type', {
          error: error instanceof Error ? error.message : 'Unknown error',
          type,
          tenant
        });
        throw error;
      }
    });
  }
}

// Export singleton instance
export const contentRepository = new DynamoDBContentRepository();
