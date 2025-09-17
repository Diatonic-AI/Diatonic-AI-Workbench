// End-to-end tests for complete experiment workflow

import { jest } from '@jest/globals';
import { handler } from '../../api/handler';
import { 
  mockDynamoDBDocumentClient,
  createMockQueryResponse,
  createMockGetResponse,
  createMockPutResponse,
  createMockUpdateResponse,
  createMockDeleteResponse,
} from '../__mocks__/aws-sdk/client-dynamodb';

describe('E2E: Complete Experiment Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Experiment Lifecycle', () => {
    it('should handle the complete experiment lifecycle: create -> update -> start -> get results -> delete', async () => {
      const tenantId = 'test-tenant-e2e';
      const projectId = 'test-project-e2e';
      let experimentId: string;

      // Mock project exists
      const mockProject = {
        id: projectId,
        tenantId,
        name: 'E2E Test Project',
        status: 'active',
      };

      // Step 1: Create experiment
      console.log('Step 1: Creating experiment');
      
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(createMockPutResponse());

      const createEvent = global.createMockEvent({
        httpMethod: 'POST',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments`,
        body: JSON.stringify({
          name: 'E2E Test Experiment',
          description: 'End-to-end test experiment',
          configuration: {
            model: 'gpt-3.5-turbo',
            parameters: {
              temperature: 0.7,
              maxTokens: 1000,
            },
          },
        }),
      });

      const createResponse = await handler(createEvent, {} as unknown);
      expect(createResponse.statusCode).toBe(201);
      
      const createBody = JSON.parse(createResponse.body);
      expect(createBody.experiment).toBeDefined();
      expect(createBody.experiment.name).toBe('E2E Test Experiment');
      expect(createBody.experiment.status).toBe('draft');
      
      experimentId = createBody.experiment.id;

      // Step 2: Update experiment
      console.log('Step 2: Updating experiment');
      
      const existingExperiment = {
        id: experimentId,
        tenantId,
        projectId,
        name: 'E2E Test Experiment',
        status: 'draft',
        configuration: {
          model: 'gpt-3.5-turbo',
          parameters: { temperature: 0.7, maxTokens: 1000 },
        },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const updatedExperiment = {
        ...existingExperiment,
        description: 'Updated description via E2E test',
        configuration: {
          model: 'gpt-4',
          parameters: { temperature: 0.8, maxTokens: 1500 },
        },
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(existingExperiment))
        .mockResolvedValueOnce(createMockUpdateResponse(updatedExperiment));

      const updateEvent = global.createMockEvent({
        httpMethod: 'PUT',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments/${experimentId}`,
        body: JSON.stringify({
          description: 'Updated description via E2E test',
          configuration: {
            model: 'gpt-4',
            parameters: { temperature: 0.8, maxTokens: 1500 },
          },
        }),
      });

      const updateResponse = await handler(updateEvent, {} as unknown);
      expect(updateResponse.statusCode).toBe(200);
      
      const updateBody = JSON.parse(updateResponse.body);
      expect(updateBody.experiment.description).toBe('Updated description via E2E test');
      expect(updateBody.experiment.configuration.model).toBe('gpt-4');

      // Step 3: Start experiment
      console.log('Step 3: Starting experiment');
      
      const startedExperiment = {
        ...updatedExperiment,
        status: 'running',
        startedAt: '2024-01-01T02:00:00.000Z',
        executionId: 'exec-e2e-123',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(updatedExperiment))
        .mockResolvedValueOnce(createMockUpdateResponse(startedExperiment));

      const startEvent = global.createMockEvent({
        httpMethod: 'POST',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments/${experimentId}/start`,
      });

      const startResponse = await handler(startEvent, {} as unknown);
      expect(startResponse.statusCode).toBe(200);
      
      const startBody = JSON.parse(startResponse.body);
      expect(startBody.experiment.status).toBe('running');
      expect(startBody.experiment.executionId).toBeDefined();

      // Step 4: Get experiment results (simulate completion)
      console.log('Step 4: Getting experiment results');
      
      const completedExperiment = {
        ...startedExperiment,
        status: 'completed',
        completedAt: '2024-01-01T03:00:00.000Z',
        results: {
          metrics: {
            accuracy: 0.87,
            f1Score: 0.84,
            precision: 0.89,
            recall: 0.85,
          },
          outputs: [
            'Generated response 1',
            'Generated response 2',
            'Generated response 3',
          ],
          executionTime: 3600, // 1 hour
          tokensUsed: 15420,
        },
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(completedExperiment)
      );

      const resultsEvent = global.createMockEvent({
        httpMethod: 'GET',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments/${experimentId}/results`,
      });

      const resultsResponse = await handler(resultsEvent, {} as unknown);
      expect(resultsResponse.statusCode).toBe(200);
      
      const resultsBody = JSON.parse(resultsResponse.body);
      expect(resultsBody.results).toBeDefined();
      expect(resultsBody.results.metrics.accuracy).toBe(0.87);
      expect(resultsBody.results.outputs).toHaveLength(3);

      // Step 5: List experiments to verify it appears
      console.log('Step 5: Listing experiments');
      
      const mockExperiments = [completedExperiment];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockExperiments)
      );

      const listEvent = global.createMockEvent({
        httpMethod: 'GET',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments`,
      });

      const listResponse = await handler(listEvent, {} as unknown);
      expect(listResponse.statusCode).toBe(200);
      
      const listBody = JSON.parse(listResponse.body);
      expect(listBody.experiments).toHaveLength(1);
      expect(listBody.experiments[0].id).toBe(experimentId);
      expect(listBody.experiments[0].status).toBe('completed');

      // Step 6: Delete experiment
      console.log('Step 6: Deleting experiment');
      
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(completedExperiment))
        .mockResolvedValueOnce(createMockDeleteResponse());

      const deleteEvent = global.createMockEvent({
        httpMethod: 'DELETE',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments/${experimentId}`,
      });

      const deleteResponse = await handler(deleteEvent, {} as any);
      expect(deleteResponse.statusCode).toBe(204);
      expect(deleteResponse.body).toBe('');

      console.log('✅ Complete experiment lifecycle test passed');
    });

    it('should handle experiment with dataset workflow', async () => {
      const tenantId = 'test-tenant-dataset';
      const projectId = 'test-project-dataset';
      let experimentId: string;
      let datasetId: string;

      // Step 1: Create dataset
      console.log('Step 1: Creating dataset');
      
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(createMockPutResponse());

      const createDatasetEvent = global.createMockEvent({
        httpMethod: 'POST',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/datasets`,
        body: JSON.stringify({
          name: 'E2E Test Dataset',
          description: 'Dataset for E2E testing',
          type: 'training',
          schema: {
            type: 'json',
            fields: ['input', 'output'],
          },
        }),
      });

      const createDatasetResponse = await handler(createDatasetEvent, {} as any);
      expect(createDatasetResponse.statusCode).toBe(201);
      
      const createDatasetBody = JSON.parse(createDatasetResponse.body);
      datasetId = createDatasetBody.dataset.id;

      // Step 2: Create experiment with dataset reference
      console.log('Step 2: Creating experiment with dataset');
      
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(createMockPutResponse());

      const createExperimentEvent = global.createMockEvent({
        httpMethod: 'POST',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments`,
        body: JSON.stringify({
          name: 'Experiment with Dataset',
          description: 'E2E test with dataset integration',
          configuration: {
            model: 'gpt-3.5-turbo',
            parameters: { temperature: 0.7 },
            datasetId: datasetId,
          },
        }),
      });

      const createExperimentResponse = await handler(createExperimentEvent, {} as any);
      expect(createExperimentResponse.statusCode).toBe(201);
      
      const createExperimentBody = JSON.parse(createExperimentResponse.body);
      experimentId = createExperimentBody.experiment.id;
      expect(createExperimentBody.experiment.configuration.datasetId).toBe(datasetId);

      // Step 3: Start experiment
      console.log('Step 3: Starting experiment with dataset');
      
      const experimentWithDataset = {
        id: experimentId,
        tenantId,
        projectId,
        name: 'Experiment with Dataset',
        status: 'draft',
        configuration: {
          model: 'gpt-3.5-turbo',
          parameters: { temperature: 0.7 },
          datasetId: datasetId,
        },
      };

      const runningExperiment = {
        ...experimentWithDataset,
        status: 'running',
        startedAt: '2024-01-01T04:00:00.000Z',
        executionId: 'exec-dataset-456',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(experimentWithDataset))
        .mockResolvedValueOnce(createMockUpdateResponse(runningExperiment));

      const startExperimentEvent = global.createMockEvent({
        httpMethod: 'POST',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments/${experimentId}/start`,
      });

      const startExperimentResponse = await handler(startExperimentEvent, {} as any);
      expect(startExperimentResponse.statusCode).toBe(200);
      
      const startExperimentBody = JSON.parse(startExperimentResponse.body);
      expect(startExperimentBody.experiment.status).toBe('running');

      console.log('✅ Experiment with dataset workflow test passed');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle validation errors gracefully', async () => {
      const tenantId = 'test-tenant-error';
      const projectId = 'test-project-error';

      console.log('Testing validation error handling');

      const invalidExperimentEvent = global.createMockEvent({
        httpMethod: 'POST',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments`,
        body: JSON.stringify({
          // Missing required 'name' field
          description: 'Invalid experiment without name',
          configuration: {
            model: 'invalid-model-name',
          },
        }),
      });

      const response = await handler(invalidExperimentEvent, {} as any);
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing required field: name');
    });

    it('should handle not found errors', async () => {
      const tenantId = 'test-tenant-notfound';
      const projectId = 'test-project-notfound';
      const nonexistentId = 'nonexistent-experiment-id';

      console.log('Testing not found error handling');

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(null)
      );

      const notFoundEvent = global.createMockEvent({
        httpMethod: 'GET',
        path: `/v1/tenants/${tenantId}/projects/${projectId}/experiments/${nonexistentId}`,
      });

      const response = await handler(notFoundEvent, {} as any);
      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Experiment not found');
    });
  });

  describe('Analytics Integration', () => {
    it('should handle analytics workflow with experiments', async () => {
      const tenantId = 'test-tenant-analytics';

      console.log('Testing analytics integration');

      const analyticsEvent = global.createMockEvent({
        httpMethod: 'GET',
        path: `/v1/tenants/${tenantId}/analytics/usage`,
        queryStringParameters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          metric: 'experiments',
        },
      });

      const response = await handler(analyticsEvent, {} as any);
      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.usage).toBeDefined();
      expect(body.usage.experiments).toBeDefined();
    });
  });
});
