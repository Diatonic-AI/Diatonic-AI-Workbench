// Integration tests for API router

import { jest } from '@jest/globals';
import { createRouter } from '../../api/router';
import { 
  mockDynamoDBDocumentClient,
  createMockQueryResponse,
  createMockGetResponse,
} from '../__mocks__/aws-sdk/client-dynamodb';

describe('Router Integration Tests', () => {
  let router: any;

  beforeEach(() => {
    jest.clearAllMocks();
    router = createRouter();
  });

  describe('Health Check', () => {
    it('should handle health check requests', async () => {
      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/health',
      });

      const context = global.createMockContext();

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
      expect(body.requestId).toBe('test-request-id');
      expect(body.version).toBe('1.0.0');
      expect(body.services).toBeDefined();
    });
  });

  describe('API Documentation', () => {
    it('should serve API documentation', async () => {
      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/docs',
      });

      const context = global.createMockContext();

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.title).toBe('AI Nexus Workbench API');
      expect(body.version).toBe('1.0.0');
      expect(body.endpoints).toBeDefined();
      expect(body.endpoints.length).toBeGreaterThan(0);
    });
  });

  describe('Route Matching', () => {
    it('should match project routes correctly', async () => {
      const mockProjects = [
        {
          id: 'project1',
          tenantId: 'test-tenant',
          name: 'Test Project',
          status: 'active',
        },
      ];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockProjects)
      );

      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/projects',
        pathParameters: {
          tenantId: 'test-tenant',
        },
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.projects).toBeDefined();
    });

    it('should match experiment routes correctly', async () => {
      const mockExperiments = [
        {
          id: 'exp1',
          tenantId: 'test-tenant',
          projectId: 'project1',
          name: 'Test Experiment',
          status: 'draft',
        },
      ];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockExperiments)
      );

      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/projects/project1/experiments',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiments).toBeDefined();
    });

    it('should match dataset routes correctly', async () => {
      const mockDatasets = [
        {
          id: 'dataset1',
          tenantId: 'test-tenant',
          projectId: 'project1',
          name: 'Test Dataset',
          status: 'ready',
        },
      ];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockDatasets)
      );

      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/projects/project1/datasets',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.datasets).toBeDefined();
    });

    it('should match analytics routes correctly', async () => {
      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/analytics/usage',
        pathParameters: {
          tenantId: 'test-tenant',
        },
        queryStringParameters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.usage).toBeDefined();
    });

    it('should match webhook routes correctly', async () => {
      const event = global.createMockEvent({
        httpMethod: 'POST',
        path: '/v1/webhooks/stripe',
        body: JSON.stringify({
          type: 'invoice.payment_succeeded',
          data: {
            object: {
              id: 'in_test123',
              customer: 'cus_test123',
            },
          },
        }),
        headers: {
          'stripe-signature': 'test-signature',
        },
      });

      const context = global.createMockContext();

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Webhook processed successfully');
    });
  });

  describe('Path Parameter Extraction', () => {
    it('should extract tenant and project IDs correctly', async () => {
      const mockProject = {
        id: 'project1',
        tenantId: 'test-tenant',
        name: 'Test Project',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(mockProject)
      );

      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/projects/project1',
        pathParameters: {},
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      // Verify that path parameters were correctly extracted and passed
      const body = JSON.parse(response.body);
      expect(body.project).toBeDefined();
    });

    it('should extract experiment IDs correctly', async () => {
      const mockExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Experiment',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(mockExperiment)
      );

      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/projects/project1/experiments/exp1',
        pathParameters: {},
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiment).toBeDefined();
      expect(body.experiment.id).toBe('exp1');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/unknown/route',
      });

      const context = global.createMockContext();

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('No route found');
    });

    it('should handle method not allowed', async () => {
      const event = global.createMockEvent({
        httpMethod: 'PATCH',
        path: '/v1/health',
      });

      const context = global.createMockContext();

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('No route found for PATCH /v1/health');
    });

    it('should handle internal server errors gracefully', async () => {
      // Mock a handler to throw an error
      mockDynamoDBDocumentClient.send.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/projects',
        pathParameters: {
          tenantId: 'test-tenant',
        },
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(500);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('An unexpected error occurred');
      expect(body.requestId).toBe('test-request-id');
    });
  });

  describe('Request Context', () => {
    it('should pass request context to handlers', async () => {
      const mockProjects = [
        {
          id: 'project1',
          tenantId: 'custom-tenant',
          name: 'Test Project',
        },
      ];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockProjects)
      );

      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/custom-tenant/projects',
        pathParameters: {},
        headers: {
          'X-Request-ID': 'custom-request-id',
          'Authorization': 'Bearer custom-token',
        },
      });

      const context = global.createMockContext({
        requestId: 'custom-request-id',
        tenantId: 'custom-tenant',
        userId: 'custom-user',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      // The handler should have received the correct context
      const body = JSON.parse(response.body);
      expect(body.projects).toBeDefined();
    });

    it('should include CORS headers', async () => {
      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/health',
      });

      const context = global.createMockContext();

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('Query Parameters', () => {
    it('should pass query parameters to handlers', async () => {
      const mockExperiments = [
        {
          id: 'exp1',
          tenantId: 'test-tenant',
          projectId: 'project1',
          name: 'Running Experiment',
          status: 'running',
        },
      ];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockExperiments)
      );

      const event = global.createMockEvent({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/projects/project1/experiments',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        queryStringParameters: {
          status: 'running',
          limit: '10',
        },
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiments).toBeDefined();
      expect(body.experiments.length).toBeGreaterThan(0);
      expect(body.experiments[0].status).toBe('running');
    });
  });

  describe('Request Body', () => {
    it('should pass request body to handlers for POST requests', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Attributes: {},
      });

      const requestBody = {
        name: 'New Test Experiment',
        description: 'Created via integration test',
        configuration: {
          model: 'gpt-3.5-turbo',
          parameters: { temperature: 0.7 },
        },
      };

      const event = global.createMockEvent({
        httpMethod: 'POST',
        path: '/v1/tenants/test-tenant/projects/project1/experiments',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.experiment).toBeDefined();
      expect(body.experiment.name).toBe(requestBody.name);
    });

    it('should handle malformed JSON in request body', async () => {
      const event = global.createMockEvent({
        httpMethod: 'POST',
        path: '/v1/tenants/test-tenant/projects/project1/experiments',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        body: '{ invalid json }',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const context = global.createMockContext({
        tenantId: 'test-tenant',
      });

      const response = await router.handle(event, context);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid JSON');
    });
  });
});
