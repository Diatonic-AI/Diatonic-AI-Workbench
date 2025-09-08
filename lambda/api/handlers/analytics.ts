// AI Nexus Workbench - Usage Analytics API Handlers

import { APIRequest, APIResponse, UsageEvent, TenantUsage, PaginatedResponse } from '../types';
import { 
  successResponse, 
  errorResponse, 
  validateRequest,
  parseRequestBody
} from '../utils/api';
import { 
  queryItems,
  generateTimestamp,
  getTenantUsageStats,
  getUsageByResource,
  getUsageByTimeRange
} from '../utils/database';

/**
 * Get tenant usage analytics
 * GET /v1/tenants/{tenantId}/analytics/usage
 */
export const getTenantUsageAnalytics = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const { 
      startDate, 
      endDate, 
      granularity = 'daily',
      includeBreakdown = 'true' 
    } = event.queryStringParameters || {};

    if (!tenantId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Validate date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate ? new Date(endDate) : new Date();

    if (start >= end) {
      return errorResponse('Start date must be before end date', 400, event.requestId);
    }

    // Get usage statistics
    const usageStats = await getTenantUsageStats(tenantId as string, start, end);
    
    // Get detailed breakdown if requested
    let breakdown = null;
    if (includeBreakdown === 'true') {
      breakdown = await getUsageBreakdown(tenantId as string, start, end, granularity as string);
    }

    const analytics = {
      tenantId,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        durationDays: Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
      },
      summary: {
        totalRequests: usageStats.totalRequests,
        totalTokens: usageStats.totalTokens,
        totalCostUsd: usageStats.totalCostUsd,
        avgLatencyMs: usageStats.avgLatencyMs,
        errorRate: usageStats.errorRate,
        uniqueUsers: usageStats.uniqueUsers,
      },
      resources: {
        agents: usageStats.agentUsage,
        experiments: usageStats.experimentUsage,
        datasets: usageStats.datasetUsage,
      },
      breakdown,
      limits: usageStats.limits,
      recommendations: generateOptimizationRecommendations(usageStats),
    };

    return successResponse(analytics, event.requestId);

  } catch (error) {
    console.error('Get tenant usage analytics error:', error);
    return errorResponse('Failed to get usage analytics', 500, event.requestId);
  }
};

/**
 * Get billing report for a tenant
 * GET /v1/tenants/{tenantId}/analytics/billing
 */
export const getBillingReport = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const { 
      month,
      year = new Date().getFullYear().toString(),
      detailed = 'true'
    } = event.queryStringParameters || {};

    if (!tenantId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = parseInt(year);

    // Calculate billing period
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59); // Last day of month

    const billingData = await getBillingData(tenantId as string, startDate, endDate);
    
    const report = {
      tenantId,
      billingPeriod: {
        month: targetMonth,
        year: targetYear,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      invoice: {
        subtotal: billingData.subtotal,
        taxes: billingData.taxes,
        discounts: billingData.discounts,
        total: billingData.total,
        currency: 'USD',
      },
      usage: {
        apiRequests: billingData.apiRequests,
        computeUnits: billingData.computeUnits,
        storageGb: billingData.storageGb,
        bandwidthGb: billingData.bandwidthGb,
      },
      breakdown: detailed === 'true' ? billingData.breakdown : null,
      paymentStatus: billingData.paymentStatus,
      nextBillingDate: billingData.nextBillingDate,
      planDetails: billingData.planDetails,
    };

    return successResponse(report, event.requestId);

  } catch (error) {
    console.error('Get billing report error:', error);
    return errorResponse('Failed to get billing report', 500, event.requestId);
  }
};

/**
 * Get cost optimization recommendations
 * GET /v1/tenants/{tenantId}/analytics/recommendations
 */
export const getCostOptimizationRecommendations = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const { category, priority } = event.queryStringParameters || {};

    if (!tenantId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Get usage data for analysis
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
    const usageStats = await getTenantUsageStats(tenantId as string, startDate, endDate);

    // Generate recommendations
    const recommendations = await generateDetailedRecommendations(usageStats, category, priority);

    const response = {
      tenantId,
      analysisDate: generateTimestamp(),
      analysisPeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalPotentialSavings: recommendations.reduce((sum, rec) => sum + (rec.potentialSavingsUsd || 0), 0),
      recommendations: recommendations.map(rec => ({
        id: rec.id,
        category: rec.category,
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        impact: rec.impact,
        effort: rec.effort,
        potentialSavingsUsd: rec.potentialSavingsUsd,
        actions: rec.actions,
        metrics: rec.metrics,
      })),
      summary: {
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
        lowPriority: recommendations.filter(r => r.priority === 'low').length,
        categories: [...new Set(recommendations.map(r => r.category))],
      },
    };

    return successResponse(response, event.requestId);

  } catch (error) {
    console.error('Get cost optimization recommendations error:', error);
    return errorResponse('Failed to get cost optimization recommendations', 500, event.requestId);
  }
};

/**
 * Get usage events for a tenant
 * GET /v1/tenants/{tenantId}/analytics/events
 */
export const getUsageEvents = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const { 
      limit = 100, 
      nextToken, 
      resourceType, 
      operation,
      startDate,
      endDate,
      userId 
    } = event.queryStringParameters || {};

    if (!tenantId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const queryParams: any = {
      PK: `TENANT#${tenantId}`,
      SKPrefix: 'EVENT#',
      limit: Math.min(parseInt(limit as string), 1000),
      nextToken: nextToken as string,
      sortOrder: 'desc', // Most recent first
      filter: {},
    };

    // Add filters
    if (resourceType) queryParams.filter.resourceType = resourceType as string;
    if (operation) queryParams.filter.operation = operation as string;
    if (userId) queryParams.filter.userId = userId as string;
    if (startDate) queryParams.filter.startDate = startDate as string;
    if (endDate) queryParams.filter.endDate = endDate as string;

    const result = await queryItems(queryParams);

    const events = result.items.map(item => ({
      id: item.id,
      tenantId: item.tenantId,
      userId: item.userId,
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      operation: item.operation,
      timestamp: item.timestamp,
      duration: item.duration,
      tokensConsumed: item.tokensConsumed,
      costUsd: item.costUsd,
      metadata: item.metadata,
    }));

    const response: PaginatedResponse<UsageEvent> = {
      items: events,
      pagination: {
        nextToken: result.nextToken,
        hasMore: !!result.nextToken,
        limit: parseInt(limit as string),
      },
      requestId: event.requestId,
    };

    return successResponse(response, event.requestId);

  } catch (error) {
    console.error('Get usage events error:', error);
    return errorResponse('Failed to get usage events', 500, event.requestId);
  }
};

/**
 * Get resource utilization metrics
 * GET /v1/tenants/{tenantId}/analytics/utilization
 */
export const getResourceUtilization = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const { resourceType, timeframe = '7d' } = event.queryStringParameters || {};

    if (!tenantId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Calculate time range
    const endDate = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return errorResponse('Invalid timeframe', 400, event.requestId);
    }

    const utilizationData = await getResourceUtilizationData(
      tenantId as string, 
      startDate, 
      endDate, 
      resourceType as string
    );

    const response = {
      tenantId,
      timeframe,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      utilization: utilizationData.metrics,
      trends: utilizationData.trends,
      topResources: utilizationData.topResources,
      efficiency: utilizationData.efficiency,
      alerts: utilizationData.alerts,
    };

    return successResponse(response, event.requestId);

  } catch (error) {
    console.error('Get resource utilization error:', error);
    return errorResponse('Failed to get resource utilization', 500, event.requestId);
  }
};

// Helper function to get usage breakdown by time period
async function getUsageBreakdown(tenantId: string, startDate: Date, endDate: Date, granularity: string): Promise<any> {
  // This would typically query time-series data
  // For simulation, we'll generate sample breakdown data
  
  const periods: any[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const periodStart = new Date(current);
    let periodEnd: Date;
    
    switch (granularity) {
      case 'hourly':
        periodEnd = new Date(current.getTime() + 60 * 60 * 1000);
        break;
      case 'daily':
        periodEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        periodEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        break;
      default:
        periodEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    periods.push({
      period: periodStart.toISOString(),
      requests: Math.floor(Math.random() * 1000) + 100,
      tokens: Math.floor(Math.random() * 100000) + 10000,
      cost: Math.floor(Math.random() * 100) / 100,
      avgLatency: Math.floor(Math.random() * 1000) + 100,
    });
    
    current.setTime(periodEnd.getTime());
  }
  
  return periods;
}

// Helper function to get billing data
async function getBillingData(tenantId: string, startDate: Date, endDate: Date): Promise<any> {
  // This would typically query billing events and calculate costs
  // For simulation, we'll generate sample billing data
  
  const baseUsage = {
    apiRequests: Math.floor(Math.random() * 50000) + 10000,
    computeUnits: Math.floor(Math.random() * 1000) + 100,
    storageGb: Math.floor(Math.random() * 100) + 10,
    bandwidthGb: Math.floor(Math.random() * 500) + 50,
  };

  const subtotal = 
    baseUsage.apiRequests * 0.001 + // $0.001 per request
    baseUsage.computeUnits * 0.10 + // $0.10 per compute unit
    baseUsage.storageGb * 0.025 + // $0.025 per GB storage
    baseUsage.bandwidthGb * 0.005; // $0.005 per GB bandwidth

  const taxes = subtotal * 0.08; // 8% tax
  const discounts = subtotal * 0.05; // 5% discount
  const total = subtotal + taxes - discounts;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    discounts: Math.round(discounts * 100) / 100,
    total: Math.round(total * 100) / 100,
    ...baseUsage,
    breakdown: [
      { category: 'API Requests', usage: baseUsage.apiRequests, rate: '$0.001', cost: Math.round(baseUsage.apiRequests * 0.001 * 100) / 100 },
      { category: 'Compute', usage: baseUsage.computeUnits, rate: '$0.10', cost: Math.round(baseUsage.computeUnits * 0.10 * 100) / 100 },
      { category: 'Storage', usage: baseUsage.storageGb, rate: '$0.025', cost: Math.round(baseUsage.storageGb * 0.025 * 100) / 100 },
      { category: 'Bandwidth', usage: baseUsage.bandwidthGb, rate: '$0.005', cost: Math.round(baseUsage.bandwidthGb * 0.005 * 100) / 100 },
    ],
    paymentStatus: 'paid',
    nextBillingDate: new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    planDetails: {
      name: 'Pro',
      tier: 'professional',
      billingCycle: 'monthly',
    },
  };
}

// Helper function to generate optimization recommendations
function generateOptimizationRecommendations(usageStats: any): any[] {
  const recommendations: any[] = [];

  // High error rate recommendation
  if (usageStats.errorRate > 0.05) {
    recommendations.push({
      id: 'reduce-error-rate',
      type: 'performance',
      priority: 'high',
      title: 'Reduce API Error Rate',
      description: `Your current error rate is ${(usageStats.errorRate * 100).toFixed(1)}%. Consider reviewing error logs and improving error handling.`,
      potentialSavings: '15-25%',
    });
  }

  // High latency recommendation
  if (usageStats.avgLatencyMs > 2000) {
    recommendations.push({
      id: 'optimize-latency',
      type: 'performance',
      priority: 'medium',
      title: 'Optimize Response Times',
      description: `Average response time is ${usageStats.avgLatencyMs}ms. Consider optimizing queries or upgrading your plan.`,
      potentialSavings: '10-15%',
    });
  }

  // Underutilized resources
  if (usageStats.utilizationRate < 0.3) {
    recommendations.push({
      id: 'right-size-resources',
      type: 'cost',
      priority: 'medium',
      title: 'Right-size Resources',
      description: 'Your resource utilization is low. Consider downgrading to a smaller plan to reduce costs.',
      potentialSavings: '20-40%',
    });
  }

  return recommendations;
}

// Helper function to generate detailed recommendations
async function generateDetailedRecommendations(usageStats: any, category?: string, priority?: string): Promise<any[]> {
  const recommendations = [
    {
      id: 'optimize-agent-configuration',
      category: 'performance',
      priority: 'high',
      title: 'Optimize Agent Configuration',
      description: 'Some agents are using suboptimal configurations leading to higher costs and slower responses.',
      impact: 'high',
      effort: 'medium',
      potentialSavingsUsd: 250,
      actions: [
        'Review temperature and max_tokens settings',
        'Consider using smaller models for simple tasks',
        'Implement response caching for repeated queries',
      ],
      metrics: {
        currentCost: 1200,
        projectedCost: 950,
        implementationTime: '2-3 days',
      },
    },
    {
      id: 'reduce-unused-datasets',
      category: 'storage',
      priority: 'medium',
      title: 'Clean Up Unused Datasets',
      description: 'Several datasets have not been accessed in the last 90 days and are incurring storage costs.',
      impact: 'medium',
      effort: 'low',
      potentialSavingsUsd: 85,
      actions: [
        'Archive datasets older than 90 days',
        'Move infrequently accessed data to cold storage',
        'Set up automated cleanup policies',
      ],
      metrics: {
        unusedDatasets: 12,
        storageReduction: '45GB',
        implementationTime: '1 day',
      },
    },
    {
      id: 'consolidate-experiments',
      category: 'compute',
      priority: 'low',
      title: 'Consolidate Similar Experiments',
      description: 'Multiple experiments are testing similar hypotheses and could be combined to reduce compute costs.',
      impact: 'low',
      effort: 'high',
      potentialSavingsUsd: 150,
      actions: [
        'Review experiment designs for overlap',
        'Merge experiments with similar objectives',
        'Use more efficient statistical testing methods',
      ],
      metrics: {
        redundantExperiments: 8,
        computeReduction: '25%',
        implementationTime: '5-7 days',
      },
    },
  ];

  // Filter by category if specified
  let filtered = recommendations;
  if (category) {
    filtered = filtered.filter(rec => rec.category === category);
  }

  // Filter by priority if specified
  if (priority) {
    filtered = filtered.filter(rec => rec.priority === priority);
  }

  return filtered;
}

// Helper function to get resource utilization data
async function getResourceUtilizationData(tenantId: string, startDate: Date, endDate: Date, resourceType?: string): Promise<any> {
  // This would typically query metrics and utilization data
  // For simulation, we'll generate sample data
  
  const metrics = {
    cpu: {
      average: 65,
      peak: 89,
      trend: 'stable',
    },
    memory: {
      average: 72,
      peak: 95,
      trend: 'increasing',
    },
    storage: {
      used: 85,
      available: 200,
      trend: 'increasing',
    },
    network: {
      inbound: 145,
      outbound: 203,
      trend: 'stable',
    },
  };

  const topResources = [
    { id: 'agent-1', type: 'agent', name: 'Customer Support Agent', utilization: 87, cost: 245 },
    { id: 'exp-2', type: 'experiment', name: 'A/B Test Campaign', utilization: 73, cost: 189 },
    { id: 'dataset-3', type: 'dataset', name: 'Training Data v2', utilization: 91, cost: 156 },
  ];

  const efficiency = {
    overall: 78,
    costEfficiency: 82,
    resourceEfficiency: 74,
    recommendations: 3,
  };

  const alerts = [
    { level: 'warning', message: 'CPU utilization above 85% for Agent-1', timestamp: generateTimestamp() },
    { level: 'info', message: 'Storage utilization trending upward', timestamp: generateTimestamp() },
  ];

  return {
    metrics,
    trends: generateTrendData(startDate, endDate),
    topResources,
    efficiency,
    alerts,
  };
}

// Helper function to generate trend data
function generateTrendData(startDate: Date, endDate: Date): any {
  const dataPoints: any[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dataPoints.push({
      timestamp: current.toISOString(),
      cpu: Math.floor(Math.random() * 30) + 60,
      memory: Math.floor(Math.random() * 40) + 50,
      storage: Math.floor(Math.random() * 20) + 70,
      network: Math.floor(Math.random() * 100) + 100,
    });
    
    current.setTime(current.getTime() + 60 * 60 * 1000); // 1 hour intervals
  }
  
  return dataPoints;
}
