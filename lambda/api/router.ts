// AI Nexus Workbench - API Router

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIRequest, APIResponse, ApiHandler } from './types';
import { 
  badRequestResponse, 
  notFoundResponse, 
  internalServerErrorResponse,
  logApiCall 
} from './utils/api';

// Import handlers
import * as projectHandlers from './handlers/projects';
import * as agentHandlers from './handlers/agents';
import * as experimentHandlers from './handlers/experiments';
import * as datasetHandlers from './handlers/datasets';
import * as analyticsHandlers from './handlers/analytics';
import * as webhookHandlers from './handlers/webhooks';
import * as billingHandlers from './handlers/billing';

// Request context interface (matching handler.ts)
interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPlan?: string;
  logger: any;
  clients: any;
}

// Route definition interface
interface Route {
  method: string;
  pattern: RegExp;
  handler: ApiHandler;
  description: string;
}

// Define all API routes
const routes: Route[] = [
  // Health check
  {
    method: 'GET',
    pattern: /^\/v1\/health$/,
    handler: healthCheckHandler,
    description: 'API health check'
  },

  // Project routes
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects$/,
    handler: projectHandlers.listProjects,
    description: 'List projects for a tenant'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects$/,
    handler: projectHandlers.createProject,
    description: 'Create a new project'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)$/,
    handler: projectHandlers.getProject,
    description: 'Get a specific project'
  },
  {
    method: 'PUT',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)$/,
    handler: projectHandlers.updateProject,
    description: 'Update a project'
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)$/,
    handler: projectHandlers.deleteProject,
    description: 'Delete a project'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/stats$/,
    handler: projectHandlers.getProjectStats,
    description: 'Get project statistics'
  },

  // Agent routes
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/agents$/,
    handler: agentHandlers.listAgents,
    description: 'List agents for a project'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/agents$/,
    handler: agentHandlers.createAgent,
    description: 'Create a new agent'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/agents\/([^\/]+)$/,
    handler: agentHandlers.getAgent,
    description: 'Get a specific agent'
  },
  {
    method: 'PUT',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/agents\/([^\/]+)$/,
    handler: agentHandlers.updateAgent,
    description: 'Update an agent'
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/agents\/([^\/]+)$/,
    handler: agentHandlers.deleteAgent,
    description: 'Delete an agent'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/agents\/([^\/]+)\/run$/,
    handler: agentHandlers.runAgent,
    description: 'Execute an agent'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/agents\/([^\/]+)\/runs$/,
    handler: agentHandlers.listAgentRuns,
    description: 'List agent execution runs'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/agents\/([^\/]+)\/runs\/([^\/]+)$/,
    handler: agentHandlers.getAgentRun,
    description: 'Get specific agent run details'
  },

  // Experiment routes
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/experiments$/,
    handler: experimentHandlers.listExperiments,
    description: 'List experiments for a project'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/experiments$/,
    handler: experimentHandlers.createExperiment,
    description: 'Create a new experiment'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/experiments\/([^\/]+)$/,
    handler: experimentHandlers.getExperiment,
    description: 'Get a specific experiment'
  },
  {
    method: 'PUT',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/experiments\/([^\/]+)$/,
    handler: experimentHandlers.updateExperiment,
    description: 'Update an experiment'
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/experiments\/([^\/]+)$/,
    handler: experimentHandlers.deleteExperiment,
    description: 'Delete an experiment'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/experiments\/([^\/]+)\/start$/,
    handler: experimentHandlers.startExperiment,
    description: 'Start an experiment'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/experiments\/([^\/]+)\/results$/,
    handler: experimentHandlers.getExperimentResults,
    description: 'Get experiment results'
  },

  // Dataset routes
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/datasets$/,
    handler: datasetHandlers.listDatasets,
    description: 'List datasets for a project'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/datasets$/,
    handler: datasetHandlers.createDataset,
    description: 'Create a new dataset'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/datasets\/([^\/]+)$/,
    handler: datasetHandlers.getDataset,
    description: 'Get a specific dataset'
  },
  {
    method: 'PUT',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/datasets\/([^\/]+)$/,
    handler: datasetHandlers.updateDataset,
    description: 'Update a dataset'
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/datasets\/([^\/]+)$/,
    handler: datasetHandlers.deleteDataset,
    description: 'Delete a dataset'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/datasets\/([^\/]+)\/upload$/,
    handler: datasetHandlers.getDatasetUploadUrl,
    description: 'Get dataset upload URL'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/datasets\/([^\/]+)\/process$/,
    handler: datasetHandlers.processDataset,
    description: 'Process uploaded dataset'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/projects\/([^\/]+)\/datasets\/([^\/]+)\/validate$/,
    handler: datasetHandlers.validateDatasetSchema,
    description: 'Validate dataset schema'
  },

  // Analytics routes
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/analytics\/usage$/,
    handler: analyticsHandlers.getTenantUsageAnalytics,
    description: 'Get tenant usage analytics'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/analytics\/billing$/,
    handler: analyticsHandlers.getBillingReport,
    description: 'Get billing report'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/analytics\/recommendations$/,
    handler: analyticsHandlers.getCostOptimizationRecommendations,
    description: 'Get cost optimization recommendations'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/analytics\/events$/,
    handler: analyticsHandlers.getUsageEvents,
    description: 'Get usage events'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/analytics\/utilization$/,
    handler: analyticsHandlers.getResourceUtilization,
    description: 'Get resource utilization'
  },

  // Billing routes
  {
    method: 'GET',
    pattern: /^\/v1\/billing\/plans$/,
    handler: billingHandlers.getPricingPlans,
    description: 'Get available pricing plans'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/billing\/checkout$/,
    handler: billingHandlers.createCheckoutSession,
    description: 'Create Stripe checkout session'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/billing\/portal$/,
    handler: billingHandlers.createPortalSession,
    description: 'Create Stripe customer portal session'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/billing\/subscription$/,
    handler: billingHandlers.getSubscriptionStatus,
    description: 'Get subscription status'
  },
  {
    method: 'PUT',
    pattern: /^\/v1\/tenants\/([^\/]+)\/billing\/subscription$/,
    handler: billingHandlers.updateSubscription,
    description: 'Update subscription'
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/tenants\/([^\/]+)\/billing\/subscription$/,
    handler: billingHandlers.cancelSubscription,
    description: 'Cancel subscription'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/billing\/invoices$/,
    handler: billingHandlers.getBillingHistory,
    description: 'Get billing history and invoices'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/tenants\/([^\/]+)\/billing\/setup-intent$/,
    handler: billingHandlers.createSetupIntent,
    description: 'Create setup intent for payment method'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/tenants\/([^\/]+)\/billing\/payment-methods$/,
    handler: billingHandlers.getPaymentMethods,
    description: 'Get customer payment methods'
  },

  // Webhook routes
  {
    method: 'POST',
    pattern: /^\/v1\/webhooks\/stripe$/,
    handler: webhookHandlers.handleStripeWebhook,
    description: 'Handle Stripe webhooks'
  },
  {
    method: 'POST',
    pattern: /^\/v1\/webhooks\/external\/([^\/]+)$/,
    handler: webhookHandlers.handleExternalWebhook,
    description: 'Handle external service webhooks'
  },
  {
    method: 'GET',
    pattern: /^\/v1\/webhooks\/health$/,
    handler: webhookHandlers.handleHealthWebhook,
    description: 'Webhook health check'
  },

  // API documentation route
  {
    method: 'GET',
    pattern: /^\/v1\/docs$/,
    handler: apiDocsHandler,
    description: 'API documentation'
  },
];

// Router class
class Router {
  async handle(event: APIGatewayProxyEvent, context: RequestContext): Promise<APIGatewayProxyResult> {
    const startTime = Date.now();
    
    try {
      const method = event.httpMethod.toUpperCase();
      const path = event.path || '/';

      // Find matching route
      const matchedRoute = findMatchingRoute(method, path);
      
      if (!matchedRoute) {
        logApiCall(method, path, 404, Date.now() - startTime);
        return notFoundResponse(`No route found for ${method} ${path}`, event.headers?.['X-Request-ID'] || context.requestId);
      }

      // Extract path parameters from the matched pattern
      const pathParams = extractPathParams(matchedRoute.pattern, path);
      
      // Add path parameters to the event
      event.pathParameters = {
        ...event.pathParameters,
        ...pathParams,
      };

      // Create API request object compatible with handlers
      const apiRequest: APIRequest = {
        ...event,
        requestId: context.requestId,
        tenantId: context.tenantId,
        userId: context.userId,
        context,
      } as APIRequest;

      // Call the handler
      const response = await matchedRoute.handler(apiRequest);
      
      return response;

    } catch (error) {
      console.error('Router error:', error);
      logApiCall(
        event.httpMethod.toUpperCase(),
        event.path || '/',
        500,
        Date.now() - startTime
      );
      
      return internalServerErrorResponse(
        'An unexpected error occurred',
        event.headers?.['X-Request-ID'] || context.requestId
      );
    }
  }
}

// Main router factory function
export const createRouter = (): Router => {
  return new Router();
};

// Find matching route for method and path
function findMatchingRoute(method: string, path: string): Route | null {
  for (const route of routes) {
    if (route.method === method && route.pattern.test(path)) {
      return route;
    }
  }
  return null;
}

// Extract path parameters from regex pattern
function extractPathParams(pattern: RegExp, path: string): Record<string, string> {
  const match = path.match(pattern);
  if (!match) return {};

  const params: Record<string, string> = {};
  
  // Map captured groups to parameter names based on route patterns
  if (match[1]) params.tenantId = match[1];
  if (match[2]) params.projectId = match[2];
  if (match[3]) params.agentId = match[3];
  if (match[4]) params.runId = match[4];

  return params;
}

// Health check handler
async function healthCheckHandler(event: APIRequest): Promise<APIResponse> {
  const startTime = Date.now();
  
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      requestId: event.requestId,
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'healthy', // In real implementation, check DynamoDB
        storage: 'healthy',  // In real implementation, check S3
        eventBus: 'healthy', // In real implementation, check EventBridge
      },
    };

    logApiCall('GET', '/v1/health', 200, Date.now() - startTime);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(healthData),
    };

  } catch (error) {
    console.error('Health check error:', error);
    logApiCall('GET', '/v1/health', 500, Date.now() - startTime);
    
    return internalServerErrorResponse(
      'Health check failed',
      event.requestId
    );
  }
}

// API documentation handler
async function apiDocsHandler(event: APIRequest): Promise<APIResponse> {
  const startTime = Date.now();
  
  try {
    const docs = {
      title: 'AI Nexus Workbench API',
      version: '1.0.0',
      description: 'AI Lab & Toolset Backend API for managing AI agents, experiments, and datasets',
      baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
      endpoints: routes.map(route => ({
        method: route.method,
        pattern: route.pattern.source,
        description: route.description,
      })),
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization',
        description: 'AWS Cognito JWT tokens required for authenticated endpoints',
      },
      rateLimit: {
        requests: 1000,
        window: '1 hour',
        description: 'Rate limiting applied per tenant per hour',
      },
      resources: {
        projects: {
          description: 'Project management and organization',
          endpoints: routes.filter(r => r.pattern.source.includes('projects')),
        },
        agents: {
          description: 'AI agent creation, configuration, and execution',
          endpoints: routes.filter(r => r.pattern.source.includes('agents')),
        },
      },
      support: {
        documentation: 'https://docs.example.com',
        support: 'support@example.com',
        status: 'https://status.example.com',
      },
    };

    logApiCall('GET', '/v1/docs', 200, Date.now() - startTime);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(docs, null, 2),
    };

  } catch (error) {
    console.error('API docs error:', error);
    logApiCall('GET', '/v1/docs', 500, Date.now() - startTime);
    
    return internalServerErrorResponse(
      'Failed to generate API documentation',
      event.requestId
    );
  }
}

// Export routes for testing and documentation
export { routes };
