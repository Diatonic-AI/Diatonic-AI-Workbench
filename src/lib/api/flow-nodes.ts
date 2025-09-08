// Flow Node Configs API Service for Visual Agent Builder
import { 
  createDynamoDBOperations, 
  TABLE_NAMES, 
  GSI_NAMES, 
  FlowNodeConfig,
  generateId, 
  getCurrentTenantId, 
  getCurrentUserId 
} from './dynamodb-client';

export interface CreateFlowNodeInput {
  template_id?: string;
  node_type: 'trigger' | 'llm' | 'output' | 'transform' | 'decision';
  node_configuration: unknown; // Will be JSON stringified
  position: number;
  connections?: unknown; // Will be JSON stringified
}

export interface UpdateFlowNodeInput {
  node_type?: 'trigger' | 'llm' | 'output' | 'transform' | 'decision';
  node_configuration?: unknown;
  position?: number;
  connections?: unknown;
}

export interface FlowNodeFilter {
  template_id?: string;
  node_type?: string;
  tenant_id?: string;
  limit?: number;
}

/**
 * Flow configuration for agent builder flows
 */
export interface FlowConfiguration {
  flow_id: string;
  template_id?: string;
  flow_name: string;
  description: string;
  nodes: FlowNodeConfig[];
  metadata?: unknown;
}

/**
 * Flow Node Configs Service Class
 */
export class FlowNodeConfigsService {
  private dbOps: unknown;
  private initialized = false;

  private async ensureInitialized() {
    if (!this.initialized) {
      this.dbOps = await createDynamoDBOperations();
      this.initialized = true;
    }
  }

  /**
   * Create a new flow node configuration
   */
  async createFlowNode(input: CreateFlowNodeInput): Promise<FlowNodeConfig> {
    await this.ensureInitialized();

    const node: FlowNodeConfig = {
      node_id: generateId(),
      template_id: input.template_id,
      node_type: input.node_type,
      node_configuration: JSON.stringify(input.node_configuration),
      position: input.position,
      connections: JSON.stringify(input.connections || {}),
      created_at: new Date().toISOString(),
      tenant_id: getCurrentTenantId(),
      created_by: getCurrentUserId(),
    };

    await this.dbOps.putItem(TABLE_NAMES.FLOW_NODE_CONFIGS, node);
    return node;
  }

  /**
   * Get a flow node by ID
   */
  async getFlowNode(nodeId: string): Promise<FlowNodeConfig | null> {
    await this.ensureInitialized();

    return await this.dbOps.getItem<FlowNodeConfig>(
      TABLE_NAMES.FLOW_NODE_CONFIGS,
      { node_id: nodeId }
    );
  }

  /**
   * Update a flow node configuration
   */
  async updateFlowNode(nodeId: string, input: UpdateFlowNodeInput): Promise<FlowNodeConfig | null> {
    await this.ensureInitialized();

    const updateExpressionParts: string[] = [];
    const expressionAttributeValues: Record<string, any> = {
      ':updated_at': new Date().toISOString(),
      ':updated_by': getCurrentUserId(),
    };

    if (input.node_type) {
      updateExpressionParts.push('node_type = :node_type');
      expressionAttributeValues[':node_type'] = input.node_type;
    }

    if (input.node_configuration) {
      updateExpressionParts.push('node_configuration = :node_configuration');
      expressionAttributeValues[':node_configuration'] = JSON.stringify(input.node_configuration);
    }

    if (input.position !== undefined) {
      updateExpressionParts.push('#position = :position');
      expressionAttributeValues[':position'] = input.position;
    }

    if (input.connections) {
      updateExpressionParts.push('connections = :connections');
      expressionAttributeValues[':connections'] = JSON.stringify(input.connections);
    }

    if (updateExpressionParts.length === 0) {
      throw new Error('No update fields provided');
    }

    const updateExpression = `SET ${updateExpressionParts.join(', ')}, updated_at = :updated_at, updated_by = :updated_by`;
    const expressionAttributeNames: Record<string, string> = {};

    if (input.position !== undefined) {
      expressionAttributeNames['#position'] = 'position';
    }

    return await this.dbOps.updateItem<FlowNodeConfig>(
      TABLE_NAMES.FLOW_NODE_CONFIGS,
      { node_id: nodeId },
      updateExpression,
      expressionAttributeValues,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    );
  }

  /**
   * Delete a flow node configuration
   */
  async deleteFlowNode(nodeId: string): Promise<void> {
    await this.ensureInitialized();

    await this.dbOps.deleteItem(
      TABLE_NAMES.FLOW_NODE_CONFIGS,
      { node_id: nodeId }
    );
  }

  /**
   * Get nodes for a specific template/flow
   */
  async getTemplateNodes(templateId: string, limit: number = 100): Promise<FlowNodeConfig[]> {
    await this.ensureInitialized();

    return await this.dbOps.queryGSI<FlowNodeConfig>(
      TABLE_NAMES.FLOW_NODE_CONFIGS,
      GSI_NAMES.TEMPLATE_NODES,
      'template_id = :template_id',
      { ':template_id': templateId },
      undefined,
      limit,
      true // Sort by position ascending
    );
  }

  /**
   * Get tenant flow nodes
   */
  async getTenantFlowNodes(tenantId?: string, limit: number = 100): Promise<FlowNodeConfig[]> {
    await this.ensureInitialized();

    const targetTenantId = tenantId || getCurrentTenantId();

    return await this.dbOps.queryGSI<FlowNodeConfig>(
      TABLE_NAMES.FLOW_NODE_CONFIGS,
      GSI_NAMES.TENANT_FLOWS,
      'tenant_id = :tenant_id',
      { ':tenant_id': targetTenantId },
      undefined,
      limit,
      false // Sort by created_at descending
    );
  }

  /**
   * Search flow nodes with filters
   */
  async searchFlowNodes(filters: FlowNodeFilter): Promise<FlowNodeConfig[]> {
    await this.ensureInitialized();

    const limit = filters.limit || 100;

    // Use GSI for better performance when possible
    if (filters.template_id) {
      return this.getTemplateNodes(filters.template_id, limit);
    }

    if (filters.tenant_id || !filters.template_id) {
      return this.getTenantFlowNodes(filters.tenant_id, limit);
    }

    // Default to scan with filters
    let filterExpression: string | object = {};
    const filterParts: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};

    if (filters.node_type) {
      filterParts.push('node_type = :node_type');
      expressionAttributeValues[':node_type'] = filters.node_type;
    }

    if (filterParts.length > 0) {
      filterExpression = filterParts.join(' AND ');
    }

    return await this.dbOps.scanTable<FlowNodeConfig>(
      TABLE_NAMES.FLOW_NODE_CONFIGS,
      filterExpression,
      Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
      undefined,
      limit
    );
  }

  // ==================== FLOW MANAGEMENT METHODS ====================

  /**
   * Create a complete flow with multiple nodes
   */
  async createFlow(flowConfig: {
    flow_name: string;
    description: string;
    template_id?: string;
    nodes: Omit<CreateFlowNodeInput, 'template_id'>[];
  }): Promise<FlowConfiguration> {
    await this.ensureInitialized();

    const flowId = generateId();
    const templateId = flowConfig.template_id || flowId; // Use flow ID as template ID if not provided

    // Create all nodes for this flow
    const createdNodes: FlowNodeConfig[] = [];
    
    for (const nodeInput of flowConfig.nodes) {
      const node = await this.createFlowNode({
        ...nodeInput,
        template_id: templateId,
      });
      createdNodes.push(node);
    }

    const flow: FlowConfiguration = {
      flow_id: flowId,
      template_id: templateId,
      flow_name: flowConfig.flow_name,
      description: flowConfig.description,
      nodes: createdNodes,
      metadata: {
        created_at: new Date().toISOString(),
        created_by: getCurrentUserId(),
        tenant_id: getCurrentTenantId(),
        node_count: createdNodes.length,
      }
    };

    return flow;
  }

  /**
   * Get a complete flow configuration by template ID
   */
  async getFlowConfiguration(templateId: string): Promise<FlowConfiguration | null> {
    await this.ensureInitialized();

    const nodes = await this.getTemplateNodes(templateId);
    
    if (nodes.length === 0) {
      return null;
    }

    // Extract flow information from first node (they all share template_id)
    const firstNode = nodes[0];
    
    return {
      flow_id: templateId,
      template_id: templateId,
      flow_name: `Flow ${templateId}`, // This would typically come from a flows table
      description: `Flow configuration with ${nodes.length} nodes`,
      nodes: nodes.sort((a, b) => a.position - b.position), // Sort by position
      metadata: {
        created_at: firstNode.created_at,
        created_by: firstNode.created_by,
        tenant_id: firstNode.tenant_id,
        node_count: nodes.length,
      }
    };
  }

  /**
   * Update a complete flow configuration
   */
  async updateFlowConfiguration(
    templateId: string, 
    updates: {
      flow_name?: string;
      description?: string;
      nodes?: (FlowNodeConfig & { action?: 'create' | 'update' | 'delete' })[];
    }
  ): Promise<FlowConfiguration | null> {
    await this.ensureInitialized();

    if (updates.nodes) {
      // Process node updates
      for (const node of updates.nodes) {
        switch (node.action) {
          case 'create':
            await this.createFlowNode({
              template_id: templateId,
              node_type: node.node_type,
              node_configuration: JSON.parse(node.node_configuration),
              position: node.position,
              connections: JSON.parse(node.connections),
            });
            break;
            
          case 'update':
            await this.updateFlowNode(node.node_id, {
              node_type: node.node_type,
              node_configuration: JSON.parse(node.node_configuration),
              position: node.position,
              connections: JSON.parse(node.connections),
            });
            break;
            
          case 'delete':
            await this.deleteFlowNode(node.node_id);
            break;
        }
      }
    }

    // Return updated flow configuration
    return this.getFlowConfiguration(templateId);
  }

  /**
   * Delete a complete flow (all nodes)
   */
  async deleteFlow(templateId: string): Promise<void> {
    await this.ensureInitialized();

    const nodes = await this.getTemplateNodes(templateId);
    
    // Delete all nodes in the flow
    for (const node of nodes) {
      await this.deleteFlowNode(node.node_id);
    }
  }

  /**
   * Clone a flow configuration
   */
  async cloneFlow(
    sourceTemplateId: string, 
    newFlowName: string, 
    newDescription?: string
  ): Promise<FlowConfiguration | null> {
    await this.ensureInitialized();

    const sourceFlow = await this.getFlowConfiguration(sourceTemplateId);
    if (!sourceFlow) {
      return null;
    }

    // Create new flow with cloned nodes
    const clonedNodeInputs: Omit<CreateFlowNodeInput, 'template_id'>[] = sourceFlow.nodes.map(node => ({
      node_type: node.node_type,
      node_configuration: JSON.parse(node.node_configuration),
      position: node.position,
      connections: JSON.parse(node.connections),
    }));

    return this.createFlow({
      flow_name: newFlowName,
      description: newDescription || `Cloned from ${sourceFlow.flow_name}`,
      nodes: clonedNodeInputs,
    });
  }

  // ==================== VALIDATION AND UTILITIES ====================

  /**
   * Validate a flow configuration for correctness
   */
  async validateFlow(templateId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    await this.ensureInitialized();

    const nodes = await this.getTemplateNodes(templateId);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (nodes.length === 0) {
      errors.push('Flow has no nodes');
      return { isValid: false, errors, warnings };
    }

    // Check for required node types
    const nodeTypes = nodes.map(n => n.node_type);
    const hasStartNode = nodeTypes.includes('trigger');
    const hasEndNode = nodeTypes.includes('output');

    if (!hasStartNode) {
      errors.push('Flow must have at least one trigger node');
    }

    if (!hasEndNode) {
      warnings.push('Flow should have at least one output node');
    }

    // Check for duplicate positions
    const positions = nodes.map(n => n.position);
    const uniquePositions = new Set(positions);
    
    if (positions.length !== uniquePositions.size) {
      warnings.push('Flow has nodes with duplicate positions');
    }

    // Validate node configurations
    for (const node of nodes) {
      try {
        JSON.parse(node.node_configuration);
        JSON.parse(node.connections);
      } catch (e) {
        errors.push(`Invalid JSON configuration in node ${node.node_id}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get flow statistics
   */
  async getFlowStats(templateId?: string): Promise<{
    total_nodes: number;
    nodes_by_type: Record<string, number>;
    avg_nodes_per_flow: number;
    most_used_node_type: string;
  }> {
    await this.ensureInitialized();

    let nodes;
    if (templateId) {
      nodes = await this.getTemplateNodes(templateId);
    } else {
      nodes = await this.getTenantFlowNodes(undefined, 1000);
    }

    const nodesByType = nodes.reduce((acc, node) => {
      acc[node.node_type] = (acc[node.node_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedNodeType = Object.entries(nodesByType)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    // Calculate flows count for average
    const templateIds = new Set(nodes.map(n => n.template_id).filter(Boolean));
    const flowCount = templateIds.size || 1;

    return {
      total_nodes: nodes.length,
      nodes_by_type: nodesByType,
      avg_nodes_per_flow: Math.round(nodes.length / flowCount),
      most_used_node_type: mostUsedNodeType,
    };
  }

  /**
   * Reorder nodes in a flow
   */
  async reorderFlowNodes(
    templateId: string, 
    nodePositions: { node_id: string; position: number }[]
  ): Promise<void> {
    await this.ensureInitialized();

    // Update position for each node
    for (const nodePos of nodePositions) {
      await this.updateFlowNode(nodePos.node_id, {
        position: nodePos.position
      });
    }
  }
}

// Export a singleton instance
export const flowNodeConfigsService = new FlowNodeConfigsService();
export default flowNodeConfigsService;
