// Agent Templates API Service
import { 
  createDynamoDBOperations, 
  TABLE_NAMES, 
  GSI_NAMES, 
  AgentTemplate, 
  generateId, 
  getCurrentTenantId, 
  getCurrentUserId 
} from './dynamodb-client';

export interface CreateAgentTemplateInput {
  template_name: string;
  description: string;
  template_type: 'conversational' | 'task-based' | 'analytical' | 'creative';
  category: string;
  configuration: unknown; // Will be JSON stringified
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateAgentTemplateInput {
  template_name?: string;
  description?: string;
  template_type?: 'conversational' | 'task-based' | 'analytical' | 'creative';
  category?: string;
  configuration?: unknown;
  is_public?: boolean;
  tags?: string[];
}

export interface AgentTemplatesFilter {
  category?: string;
  template_type?: string;
  is_public?: boolean;
  tenant_id?: string;
  limit?: number;
  sort_by?: 'popularity' | 'rating' | 'created_at' | 'usage_count';
  sort_direction?: 'asc' | 'desc';
}

/**
 * Agent Templates Service Class
 */
export class AgentTemplatesService {
  private dbOps: unknown;
  private initialized = false;

  private async ensureInitialized() {
    if (!this.initialized) {
      this.dbOps = await createDynamoDBOperations();
      this.initialized = true;
    }
  }

  /**
   * Create a new agent template
   */
  async createTemplate(input: CreateAgentTemplateInput): Promise<AgentTemplate> {
    await this.ensureInitialized();

    const template: AgentTemplate = {
      template_id: generateId(),
      template_name: input.template_name,
      description: input.description,
      template_type: input.template_type,
      category: input.category,
      configuration: JSON.stringify(input.configuration),
      is_public: input.is_public ? 'true' : 'false',
      usage_count: 0,
      rating: 0,
      tags: input.tags || [],
      created_at: new Date().toISOString(),
      tenant_id: getCurrentTenantId(),
      created_by: getCurrentUserId(),
    };

    await this.dbOps.putItem(TABLE_NAMES.AGENT_TEMPLATES, template);
    return template;
  }

  /**
   * Get an agent template by ID
   */
  async getTemplate(templateId: string): Promise<AgentTemplate | null> {
    await this.ensureInitialized();

    return await this.dbOps.getItem<AgentTemplate>(
      TABLE_NAMES.AGENT_TEMPLATES,
      { template_id: templateId }
    );
  }

  /**
   * Update an existing agent template
   */
  async updateTemplate(templateId: string, input: UpdateAgentTemplateInput): Promise<AgentTemplate | null> {
    await this.ensureInitialized();

    const updateExpressionParts: string[] = [];
    const expressionAttributeValues: Record<string, any> = {
      ':updated_at': new Date().toISOString(),
      ':updated_by': getCurrentUserId(),
    };
    const expressionAttributeNames: Record<string, string> = {};

    if (input.template_name) {
      updateExpressionParts.push('#template_name = :template_name');
      expressionAttributeValues[':template_name'] = input.template_name;
      expressionAttributeNames['#template_name'] = 'template_name';
    }

    if (input.description) {
      updateExpressionParts.push('description = :description');
      expressionAttributeValues[':description'] = input.description;
    }

    if (input.template_type) {
      updateExpressionParts.push('template_type = :template_type');
      expressionAttributeValues[':template_type'] = input.template_type;
    }

    if (input.category) {
      updateExpressionParts.push('category = :category');
      expressionAttributeValues[':category'] = input.category;
    }

    if (input.configuration) {
      updateExpressionParts.push('#configuration = :configuration');
      expressionAttributeValues[':configuration'] = JSON.stringify(input.configuration);
      expressionAttributeNames['#configuration'] = 'configuration';
    }

    if (input.is_public !== undefined) {
      updateExpressionParts.push('is_public = :is_public');
      expressionAttributeValues[':is_public'] = input.is_public ? 'true' : 'false';
    }

    if (input.tags) {
      updateExpressionParts.push('tags = :tags');
      expressionAttributeValues[':tags'] = input.tags;
    }

    if (updateExpressionParts.length === 0) {
      throw new Error('No update fields provided');
    }

    const updateExpression = `SET ${updateExpressionParts.join(', ')}, updated_at = :updated_at, updated_by = :updated_by`;

    return await this.dbOps.updateItem<AgentTemplate>(
      TABLE_NAMES.AGENT_TEMPLATES,
      { template_id: templateId },
      updateExpression,
      expressionAttributeValues,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    );
  }

  /**
   * Delete an agent template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.ensureInitialized();

    await this.dbOps.deleteItem(
      TABLE_NAMES.AGENT_TEMPLATES,
      { template_id: templateId }
    );
  }

  /**
   * Get templates by category with popularity sorting
   */
  async getPopularTemplatesByCategory(
    category: string, 
    limit: number = 10
  ): Promise<AgentTemplate[]> {
    await this.ensureInitialized();

    return await this.dbOps.queryGSI<AgentTemplate>(
      TABLE_NAMES.AGENT_TEMPLATES,
      GSI_NAMES.POPULAR_TEMPLATES,
      'category = :category',
      { ':category': category },
      undefined,
      limit,
      false // Sort by usage_count descending
    );
  }

  /**
   * Get templates by tenant with time sorting
   */
  async getTenantTemplates(
    tenantId?: string,
    limit: number = 20
  ): Promise<AgentTemplate[]> {
    await this.ensureInitialized();

    const targetTenantId = tenantId || getCurrentTenantId();

    return await this.dbOps.queryGSI<AgentTemplate>(
      TABLE_NAMES.AGENT_TEMPLATES,
      GSI_NAMES.TENANT_TEMPLATES,
      'tenant_id = :tenant_id',
      { ':tenant_id': targetTenantId },
      undefined,
      limit,
      false // Sort by created_at descending
    );
  }

  /**
   * Get public templates by usage
   */
  async getPublicTemplates(limit: number = 20): Promise<AgentTemplate[]> {
    await this.ensureInitialized();

    return await this.dbOps.queryGSI<AgentTemplate>(
      TABLE_NAMES.AGENT_TEMPLATES,
      GSI_NAMES.PUBLIC_USAGE,
      'is_public = :is_public',
      { ':is_public': 'true' },
      undefined,
      limit,
      false // Sort by usage_count descending
    );
  }

  /**
   * Get templates by category and rating
   */
  async getTemplatesByRating(
    category: string,
    minRating: number = 3,
    limit: number = 10
  ): Promise<AgentTemplate[]> {
    await this.ensureInitialized();

    return await this.dbOps.queryGSI<AgentTemplate>(
      TABLE_NAMES.AGENT_TEMPLATES,
      GSI_NAMES.CATEGORY_RATING,
      'category = :category AND rating >= :min_rating',
      { 
        ':category': category,
        ':min_rating': minRating
      },
      undefined,
      limit,
      false // Sort by rating descending
    );
  }

  /**
   * Increment template usage count
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    await this.ensureInitialized();

    await this.dbOps.updateItem(
      TABLE_NAMES.AGENT_TEMPLATES,
      { template_id: templateId },
      'SET usage_count = usage_count + :increment, updated_at = :updated_at',
      {
        ':increment': 1,
        ':updated_at': new Date().toISOString(),
      }
    );
  }

  /**
   * Update template rating
   */
  async updateRating(templateId: string, newRating: number): Promise<void> {
    await this.ensureInitialized();

    if (newRating < 0 || newRating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    await this.dbOps.updateItem(
      TABLE_NAMES.AGENT_TEMPLATES,
      { template_id: templateId },
      'SET rating = :rating, updated_at = :updated_at',
      {
        ':rating': newRating,
        ':updated_at': new Date().toISOString(),
      }
    );
  }

  /**
   * Search templates with flexible filters
   */
  async searchTemplates(filters: AgentTemplatesFilter): Promise<AgentTemplate[]> {
    await this.ensureInitialized();

    const limit = filters.limit || 20;
    
    // If filtering by category and sorting by popularity
    if (filters.category && filters.sort_by === 'popularity') {
      return this.getPopularTemplatesByCategory(filters.category, limit);
    }

    // If filtering by public status and sorting by usage
    if (filters.is_public === true && filters.sort_by === 'usage_count') {
      return this.getPublicTemplates(limit);
    }

    // If filtering by tenant
    if (filters.tenant_id || (!filters.is_public && !filters.category)) {
      return this.getTenantTemplates(filters.tenant_id, limit);
    }

    // Default to scan with filters (less efficient but flexible)
    let filterExpression: string | undefined;
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};
    const filterParts: string[] = [];

    if (filters.template_type) {
      filterParts.push('template_type = :template_type');
      expressionAttributeValues[':template_type'] = filters.template_type;
    }

    if (filters.is_public !== undefined) {
      filterParts.push('is_public = :is_public');
      expressionAttributeValues[':is_public'] = filters.is_public ? 'true' : 'false';
    }

    if (filterParts.length > 0) {
      filterExpression = filterParts.join(' AND ');
    }

    return await this.dbOps.scanTable<AgentTemplate>(
      TABLE_NAMES.AGENT_TEMPLATES,
      filterExpression,
      Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      limit
    );
  }

  /**
   * Get template categories with counts
   */
  async getTemplateCategories(): Promise<{ category: string; count: number }[]> {
    await this.ensureInitialized();

    // This would typically be implemented with a separate category tracking table
    // For now, we'll scan and group (not efficient for large datasets)
    const templates = await this.dbOps.scanTable<AgentTemplate>(TABLE_NAMES.AGENT_TEMPLATES);
    
    const categoryMap = new Map<string, number>();
    templates.forEach(template => {
      const count = categoryMap.get(template.category) || 0;
      categoryMap.set(template.category, count + 1);
    });

    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count
    })).sort((a, b) => b.count - a.count);
  }
}

// Export a singleton instance
export const agentTemplatesService = new AgentTemplatesService();
export default agentTemplatesService;
