// Unit tests for experiment handlers

import { jest } from '@jest/globals';
import * as experimentHandlers from '../../../api/handlers/experiments';
import { 
  mockDynamoDBDocumentClient,
  createMockQueryResponse,
  createMockGetResponse,
  createMockPutResponse,
  createMockUpdateResponse,
  createMockDeleteResponse,
} from '../../__mocks__/aws-sdk/client-dynamodb';

describe('Experiment Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listExperiments', () => {
    it('should list experiments for a project', async () => {
      const mockExperiments = [
        {
          id: 'exp1',
          tenantId: 'test-tenant',
          projectId: 'project1',
          name: 'Test Experiment 1',
          status: 'draft',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'exp2',
          tenantId: 'test-tenant',
          projectId: 'project1',
          name: 'Test Experiment 2',
          status: 'running',
          createdAt: '2024-01-01T01:00:00.000Z',
        },
      ];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockExperiments)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'GET',
        path: '/v1/tenants/test-tenant/projects/project1/experiments',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        queryStringParameters: null,
      });

      const response = await experimentHandlers.listExperiments(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiments).toHaveLength(2);
      expect(body.experiments[0]).toMatchObject({
        id: 'exp1',
        name: 'Test Experiment 1',
        status: 'draft',
      });
      expect(body.total).toBe(2);
      expect(mockDynamoDBDocumentClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle pagination', async () => {
      const mockExperiments = Array.from({ length: 5 }, (_, i) => ({
        id: `exp${i + 1}`,
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: `Test Experiment ${i + 1}`,
        status: 'draft',
      }));

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockExperiments.slice(0, 3), { id: 'exp3' })
      );

      const request = global.createMockAPIRequest({
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        queryStringParameters: {
          limit: '3',
          lastKey: null,
        },
      });

      const response = await experimentHandlers.listExperiments(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiments).toHaveLength(3);
      expect(body.lastKey).toBeDefined();
    });

    it('should filter by status', async () => {
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

      const request = global.createMockAPIRequest({
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        queryStringParameters: {
          status: 'running',
        },
      });

      const response = await experimentHandlers.listExperiments(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiments).toHaveLength(1);
      expect(body.experiments[0].status).toBe('running');
    });
  });

  describe('getExperiment', () => {
    it('should get a specific experiment', async () => {
      const mockExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Experiment',
        description: 'A test experiment',
        status: 'draft',
        configuration: {
          model: 'gpt-3.5-turbo',
          parameters: { temperature: 0.7 },
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(mockExperiment)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'GET',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
      });

      const response = await experimentHandlers.getExperiment(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiment).toMatchObject({
        id: 'exp1',
        name: 'Test Experiment',
        status: 'draft',
        configuration: {
          model: 'gpt-3.5-turbo',
          parameters: { temperature: 0.7 },
        },
      });
    });

    it('should return 404 for non-existent experiment', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(null)
      );

      const request = global.createMockAPIRequest({
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'nonexistent',
        },
      });

      const response = await experimentHandlers.getExperiment(request);

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Experiment not found');
    });
  });

  describe('createExperiment', () => {
    it('should create a new experiment', async () => {
      const mockExperiment = {
        id: 'exp-new',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'New Experiment',
        description: 'A new experiment',
        configuration: {
          model: 'gpt-4',
          parameters: { temperature: 0.8 },
        },
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(createMockPutResponse());

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        body: JSON.stringify({
          name: 'New Experiment',
          description: 'A new experiment',
          configuration: {
            model: 'gpt-4',
            parameters: { temperature: 0.8 },
          },
        }),
      });

      const response = await experimentHandlers.createExperiment(request);

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.experiment).toMatchObject({
        name: 'New Experiment',
        description: 'A new experiment',
        status: 'draft',
        tenantId: 'test-tenant',
        projectId: 'project1',
      });
      expect(body.experiment.id).toBeDefined();
      expect(body.experiment.createdAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        body: JSON.stringify({
          description: 'Missing name field',
        }),
      });

      const response = await experimentHandlers.createExperiment(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing required field: name');
    });

    it('should validate experiment configuration', async () => {
      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        body: JSON.stringify({
          name: 'Test Experiment',
          configuration: {
            model: 'invalid-model',
          },
        }),
      });

      const response = await experimentHandlers.createExperiment(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid configuration');
    });
  });

  describe('updateExperiment', () => {
    it('should update an experiment', async () => {
      const existingExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Original Name',
        status: 'draft',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const updatedExperiment = {
        ...existingExperiment,
        name: 'Updated Name',
        description: 'Updated description',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(existingExperiment))
        .mockResolvedValueOnce(createMockUpdateResponse(updatedExperiment));

      const request = global.createMockAPIRequest({
        httpMethod: 'PUT',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
        body: JSON.stringify({
          name: 'Updated Name',
          description: 'Updated description',
        }),
      });

      const response = await experimentHandlers.updateExperiment(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiment.name).toBe('Updated Name');
      expect(body.experiment.description).toBe('Updated description');
    });

    it('should not allow updating running experiments', async () => {
      const runningExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Running Experiment',
        status: 'running',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(runningExperiment)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'PUT',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      const response = await experimentHandlers.updateExperiment(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Cannot update experiment while running');
    });
  });

  describe('deleteExperiment', () => {
    it('should delete an experiment', async () => {
      const existingExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Experiment',
        status: 'draft',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(existingExperiment))
        .mockResolvedValueOnce(createMockDeleteResponse());

      const request = global.createMockAPIRequest({
        httpMethod: 'DELETE',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
      });

      const response = await experimentHandlers.deleteExperiment(request);

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
    });

    it('should not allow deleting running experiments', async () => {
      const runningExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Running Experiment',
        status: 'running',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(runningExperiment)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'DELETE',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
      });

      const response = await experimentHandlers.deleteExperiment(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Cannot delete experiment while running');
    });
  });

  describe('startExperiment', () => {
    it('should start an experiment', async () => {
      const draftExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Experiment',
        status: 'draft',
        configuration: {
          model: 'gpt-3.5-turbo',
          parameters: { temperature: 0.7 },
        },
      };

      const startedExperiment = {
        ...draftExperiment,
        status: 'running',
        startedAt: '2024-01-01T01:00:00.000Z',
        executionId: 'exec-123',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(draftExperiment))
        .mockResolvedValueOnce(createMockUpdateResponse(startedExperiment));

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
      });

      const response = await experimentHandlers.startExperiment(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.experiment.status).toBe('running');
      expect(body.experiment.startedAt).toBeDefined();
      expect(body.experiment.executionId).toBeDefined();
    });

    it('should not start already running experiments', async () => {
      const runningExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Running Experiment',
        status: 'running',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(runningExperiment)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
      });

      const response = await experimentHandlers.startExperiment(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Experiment is already running');
    });
  });

  describe('getExperimentResults', () => {
    it('should get experiment results', async () => {
      const completedExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Completed Experiment',
        status: 'completed',
        results: {
          metrics: {
            accuracy: 0.85,
            f1Score: 0.82,
          },
          outputs: ['result1', 'result2'],
          completedAt: '2024-01-01T02:00:00.000Z',
        },
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(completedExperiment)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'GET',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
      });

      const response = await experimentHandlers.getExperimentResults(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.results).toMatchObject({
        metrics: {
          accuracy: 0.85,
          f1Score: 0.82,
        },
        outputs: ['result1', 'result2'],
      });
    });

    it('should return appropriate message for experiments without results', async () => {
      const draftExperiment = {
        id: 'exp1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Draft Experiment',
        status: 'draft',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(draftExperiment)
      );

      const request = global.createMockAPIRequest({
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          experimentId: 'exp1',
        },
      });

      const response = await experimentHandlers.getExperimentResults(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.message).toContain('No results available');
      expect(body.status).toBe('draft');
    });
  });
});
