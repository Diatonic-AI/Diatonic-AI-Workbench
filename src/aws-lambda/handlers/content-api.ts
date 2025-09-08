/**
 * AWS Lambda Handler for Content Management API
 * Provides REST API endpoints for content operations with full observability
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logMetrics } from '@aws-lambda-powertools/metrics';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import middy from '@middy/core';
import httpCors from '@middy/http-cors';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';

import type { 
  ContentAPIEvent, 
  LandingPageContent, 
  APIResponse,
  ValidationError,
  NotFoundError,
  UnauthorizedError
} from '../types/content.types';
import { contentRepository } from '../repositories/content.repository';
import { logger, metrics, tracer, PowertoolsUtils } from '../utils/powertools';
import { MetricUnits } from '@aws-lambda-powertools/metrics';

/**
 * Main Lambda handler function
 */
const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const { httpMethod, path, pathParameters, queryStringParameters, body, headers } = event;
  
  // Extract correlation ID for distributed tracing
  const correlationId = PowertoolsUtils.getCorrelationId(headers);
  PowertoolsUtils.addCorrelationId(correlationId);
  
  logger.info('Content API request received', {
    httpMethod,
    path,
    correlationId,
    userAgent: headers['User-Agent'] || 'unknown'
  });

  try {
    const result = await handleGetLandingPage(pathParameters, queryStringParameters);
        break;
        
      case 'POST /api/content/landing-page':
        result = await handleCreateLandingPage(body);
        break;
        
      case 'PUT /api/content/landing-page/{id}':
        result = await handleUpdateLandingPage(pathParameters, body);
        break;
        
      case 'DELETE /api/content/landing-page/{id}':
        result = await handleDeleteLandingPage(pathParameters, queryStringParameters);
        break;
        
      case 'GET /api/content/landing-pages':
        result = await handleListLandingPages(queryStringParameters);
        break;
        
      case 'GET /api/content/health':
        result = await handleHealthCheck();
        break;
        
      default:
        result = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Endpoint not found: ${httpMethod} ${path}`
          }
        };
        break;
    }

    const duration = Date.now() - startTime;
    const statusCode = result.success ? 200 : (result.error?.code === 'NOT_FOUND' ? 404 : 400);

    // Add metrics
    PowertoolsUtils.addAPIMetrics(
      `${httpMethod} ${path}`,
      statusCode,
      duration,
      queryStringParameters?.tenant
    );

    // Create response
    const response = result.success 
      ? PowertoolsUtils.createSuccessResponse(result.data, context.awsRequestId, statusCode)
      : PowertoolsUtils.createErrorResponse(
          new Error(result.error?.message || 'Unknown error'), 
          context.awsRequestId, 
          statusCode
        );

    logger.info('Content API request completed', {
      statusCode,
      duration,
      correlationId
    });

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Determine error type and status code
    const statusCode = 500;
    if (error instanceof ValidationError) statusCode = 400;
    else if (error instanceof NotFoundError) statusCode = 404;
    else if (error instanceof UnauthorizedError) statusCode = 401;

    // Add error metrics
    PowertoolsUtils.addAPIMetrics(
      `${httpMethod} ${path}`,
      statusCode,
      duration,
      queryStringParameters?.tenant
    );

    logger.error('Content API request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode,
      duration,
      correlationId
    });

    return PowertoolsUtils.createErrorResponse(
      error instanceof Error ? error : new Error('Internal server error'),
      context.awsRequestId,
      statusCode
    );
  }
};

/**
 * Get landing page by service
 */
async function handleGetLandingPage(
  pathParameters: Record<string, string> | null,
  queryStringParameters: Record<string, string> | null
): Promise<APIResponse<LandingPageContent | null>> {
  const service = pathParameters?.service;
  const tenant = queryStringParameters?.tenant || 'default';

  if (!service) {
    throw new ValidationError('Service parameter is required');
  }

  const landingPage = await contentRepository.getLandingPage(service, tenant);
  
  return {
    success: true,
    data: landingPage
  };
}

/**
 * Create new landing page
 */
async function handleCreateLandingPage(body: string | null): Promise<APIResponse<LandingPageContent>> {
  if (!body) {
    throw new ValidationError('Request body is required');
  }

  const content = JSON.parse(body);
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }

  // Validate required fields
  if (!content.tenant || !content.service || !content.title) {
    throw new ValidationError('Missing required fields: tenant, service, title');
  }

  const landingPage = await contentRepository.createLandingPage(content);
  
  return {
    success: true,
    data: landingPage
  };
}

/**
 * Update existing landing page
 */
async function handleUpdateLandingPage(
  pathParameters: Record<string, string> | null,
  body: string | null
): Promise<APIResponse<LandingPageContent>> {
  const id = pathParameters?.id;

  if (!id) {
    throw new ValidationError('ID parameter is required');
  }

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  const updates = JSON.parse(body);
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }

  const landingPage = await contentRepository.updateLandingPage(id, updates);
  
  return {
    success: true,
    data: landingPage
  };
}

/**
 * Delete landing page
 */
async function handleDeleteLandingPage(
  pathParameters: Record<string, string> | null,
  queryStringParameters: Record<string, string> | null
): Promise<APIResponse<{ deleted: boolean }>> {
  const id = pathParameters?.id;
  const tenant = queryStringParameters?.tenant || 'default';

  if (!id) {
    throw new ValidationError('ID parameter is required');
  }

  const deleted = await contentRepository.deleteLandingPage(id, tenant);
  
  return {
    success: true,
    data: { deleted }
  };
}

/**
 * List landing pages for tenant
 */
async function handleListLandingPages(
  queryStringParameters: Record<string, string> | null
): Promise<APIResponse<LandingPageContent[]>> {
  const tenant = queryStringParameters?.tenant || 'default';
  const status = queryStringParameters?.status;

  const landingPages = await contentRepository.listLandingPages(tenant, status);
  
  return {
    success: true,
    data: landingPages
  };
}

/**
 * Health check endpoint
 */
async function handleHealthCheck(): Promise<APIResponse<{ status: string; timestamp: string; version: string }>> {
  return {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.FUNCTION_VERSION || '1.0.0'
    }
  };
}

/**
 * Configure middleware and export handler
 */
export const handler = middy(lambdaHandler)
  .use(httpJsonBodyParser()) // Parse JSON bodies
  .use(httpCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    headers: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })) // Handle CORS
  .use(httpErrorHandler()) // Handle errors
  .use(injectLambdaContext(logger, { logEvent: true })) // Inject logger context
  .use(logMetrics(metrics, { captureColdStartMetric: true })) // Capture metrics
  .use(captureLambdaHandler(tracer)); // Capture traces
