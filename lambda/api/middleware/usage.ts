// AI Nexus Workbench - Usage Tracking Middleware

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { randomUUID } from 'crypto';

// Request context interface
interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPlan?: string;
  logger: unknown;
  clients: unknown;
}

/**
 * Usage tracking middleware to monitor API usage for billing and analytics
 */
export const usageMiddleware = async (
  event: APIGatewayProxyEvent,
  context: RequestContext,
  phase: 'pre' | 'post',
  response?: APIGatewayProxyResult
): Promise<APIGatewayProxyResult> => {
  
  try {
    if (phase === 'pre') {
      // Pre-request tracking: record API call start
      await trackApiCallStart(event, context);
    } else if (phase === 'post' && response) {
      // Post-request tracking: record API call completion
      await trackApiCallEnd(event, context, response);
    }
    
    // Return success to continue processing
    return {
      statusCode: 200,
      headers: {},
      body: '',
    };
    
  } catch (error) {
    context.logger.error('Usage tracking middleware error', error);
    
    // Don't fail the request if usage tracking fails
    return {
      statusCode: 200,
      headers: {},
      body: '',
    };
  }
};

/**
 * Track the start of an API call
 */
async function trackApiCallStart(
  event: APIGatewayProxyEvent,
  context: RequestContext
): Promise<void> {
  
  // Skip tracking for health checks and internal endpoints
  if (event.path === '/v1/health' || event.path === '/v1/docs') {
    return;
  }
  
  const startEvent = {
    eventId: randomUUID(),
    requestId: context.requestId,
    tenantId: context.tenantId || 'unknown',
    userId: context.userId || 'unknown',
    userRole: context.userRole || 'unknown',
    userPlan: context.userPlan || 'free',
    method: event.httpMethod,
    path: event.path,
    userAgent: event.headers['User-Agent'] || 'unknown',
    sourceIp: event.requestContext?.identity?.sourceIp || 'unknown',
    timestamp: new Date().toISOString(),
    phase: 'start',
  };
  
  context.logger.info('API call started', startEvent);
  
  // Send to EventBridge for processing
  try {
    await context.clients.eventbridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'ai-nexus-workbench.api',
            DetailType: 'API Call Started',
            Detail: JSON.stringify(startEvent),
            EventBusName: process.env.EVENT_BUS_NAME,
          },
        ],
      })
    );
  } catch (error) {
    context.logger.error('Failed to send start event to EventBridge', error);
  }
}

/**
 * Track the completion of an API call
 */
async function trackApiCallEnd(
  event: APIGatewayProxyEvent,
  context: RequestContext,
  response: APIGatewayProxyResult
): Promise<void> {
  
  // Skip tracking for health checks and internal endpoints
  if (event.path === '/v1/health' || event.path === '/v1/docs') {
    return;
  }
  
  const endEvent = {
    eventId: randomUUID(),
    requestId: context.requestId,
    tenantId: context.tenantId || 'unknown',
    userId: context.userId || 'unknown',
    userRole: context.userRole || 'unknown',
    userPlan: context.userPlan || 'free',
    method: event.httpMethod,
    path: event.path,
    statusCode: response.statusCode,
    responseSize: response.body?.length || 0,
    timestamp: new Date().toISOString(),
    phase: 'end',
    // Calculate costs based on plan and usage
    costs: calculateApiCosts(event, context, response),
  };
  
  context.logger.info('API call completed', endEvent);
  
  // Send to EventBridge for processing
  try {
    await context.clients.eventbridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'ai-nexus-workbench.api',
            DetailType: 'API Call Completed',
            Detail: JSON.stringify(endEvent),
            EventBusName: process.env.EVENT_BUS_NAME,
          },
        ],
      })
    );
  } catch (error) {
    context.logger.error('Failed to send end event to EventBridge', error);
  }
}

/**
 * Calculate API costs based on plan and usage
 */
function calculateApiCosts(
  event: APIGatewayProxyEvent,
  context: RequestContext,
  response: APIGatewayProxyResult
): any {
  
  const plan = context.userPlan || 'free';
  const method = event.httpMethod;
  const isSuccess = response.statusCode < 400;
  
  // Base costs per plan (in cents)
  const baseCosts = {
    free: { read: 0, write: 0, compute: 0 },
    pro: { read: 0.01, write: 0.05, compute: 0.1 },
    enterprise: { read: 0.005, write: 0.02, compute: 0.05 },
  };
  
  const planCosts = baseCosts[plan as keyof typeof baseCosts] || baseCosts.free;
  
  const operationType = 'read';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    operationType = 'write';
  }
  
  // Only charge for successful requests
  const cost = isSuccess ? planCosts[operationType as keyof typeof planCosts] : 0;
  
  return {
    plan,
    operationType,
    baseCost: cost,
    totalCost: cost, // Could include additional factors like data size, complexity, etc.
    currency: 'USD',
  };
}
