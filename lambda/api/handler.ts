import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

// Import router and middleware
import { createRouter } from './router';
import { corsMiddleware } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { usageMiddleware } from './middleware/usage';
import { errorMiddleware } from './middleware/error';
import { createLogger } from './utils/logger';

// Initialize AWS clients (singleton pattern for connection reuse)
class AWSClients {
  private static instance: AWSClients;
  public readonly dynamodb: DynamoDBClient;
  public readonly s3: S3Client;
  public readonly eventbridge: EventBridgeClient;
  public readonly secrets: SecretsManagerClient;

  private constructor() {
    const region = process.env.AWS_REGION || 'us-east-2';
    
    this.dynamodb = new DynamoDBClient({
      region,
      maxAttempts: 3,
      retryMode: 'adaptive',
    });

    this.s3 = new S3Client({
      region,
      maxAttempts: 3,
      retryMode: 'adaptive',
    });

    this.eventbridge = new EventBridgeClient({
      region,
      maxAttempts: 3,
      retryMode: 'adaptive',
    });

    this.secrets = new SecretsManagerClient({
      region,
      maxAttempts: 3,
      retryMode: 'adaptive',
    });
  }

  static getInstance(): AWSClients {
    if (!this.instance) {
      this.instance = new AWSClients();
    }
    return this.instance;
  }
}

// Request context interface
interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPlan?: string;
  logger: ReturnType<typeof createLogger>;
  clients: AWSClients;
}

// Main Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Initialize AWS clients
  const clients = AWSClients.getInstance();

  // Create request context
  const requestContext: RequestContext = {
    requestId: context.awsRequestId,
    logger: createLogger({
      requestId: context.awsRequestId,
      path: event.path,
      method: event.httpMethod,
      sourceIp: event.requestContext.identity.sourceIp,
    }),
    clients,
  };

  // Start request timing
  const startTime = Date.now();

  try {
    requestContext.logger.info('Request started', {
      path: event.path,
      method: event.httpMethod,
      userAgent: event.headers['User-Agent'],
      origin: event.headers.Origin,
    });

    // Apply middleware chain
    const result = await corsMiddleware(event, requestContext);
    if (result.statusCode >= 400) return result;

    // 2. Health check bypass (no auth required)
    if (event.path === '/v1/health') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(event.headers.Origin),
        },
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'unknown',
          requestId: requestContext.requestId,
          version: '1.0.0',
        }),
      };
    }

    // 3. Webhook bypass (no auth required for webhook endpoints)
    if (event.path.startsWith('/v1/webhooks/')) {
      const router = createRouter();
      return await router.handle(event, requestContext);
    }

    // 4. Authentication middleware (required for all other endpoints)
    result = await authMiddleware(event, requestContext);
    if (result.statusCode >= 400) return result;

    // 5. Tenant isolation middleware
    result = await tenantMiddleware(event, requestContext);
    if (result.statusCode >= 400) return result;

    // 6. Usage tracking middleware
    result = await usageMiddleware(event, requestContext, 'pre');
    if (result.statusCode >= 400) return result;

    // 7. Route the request
    const router = createRouter();
    result = await router.handle(event, requestContext);

    // 8. Post-request usage tracking
    await usageMiddleware(event, requestContext, 'post', result);

    return result;

  } catch (error) {
    // Error middleware
    return await errorMiddleware(error as Error, event, requestContext);

  } finally {
    // Log request completion
    const duration = Date.now() - startTime;
    requestContext.logger.info('Request completed', {
      duration,
      statusCode: undefined, // Will be filled by middleware
    });
  }
};

// Helper function to get CORS headers
function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = JSON.parse(process.env.CORS_ORIGINS || '["*"]');
  const allowOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin) 
    ? (origin || '*') 
    : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
