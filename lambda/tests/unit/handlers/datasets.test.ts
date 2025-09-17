// Unit tests for dataset handlers

import { jest } from '@jest/globals';
import * as datasetHandlers from '../../../api/handlers/datasets';
import { 
  mockDynamoDBDocumentClient,
  createMockQueryResponse,
  createMockGetResponse,
  createMockPutResponse,
  createMockUpdateResponse,
  createMockDeleteResponse,
} from '../../__mocks__/aws-sdk/client-dynamodb';
import { 
  mockS3Client,
  getSignedUrl,
  createMockPutObjectResponse,
  createMockGetObjectResponse,
} from '../../__mocks__/aws-sdk/client-s3';

describe('Dataset Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listDatasets', () => {
    it('should list datasets for a project', async () => {
      const mockDatasets = [
        {
          id: 'dataset1',
          tenantId: 'test-tenant',
          projectId: 'project1',
          name: 'Test Dataset 1',
          type: 'training',
          status: 'ready',
          size: 1024,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'dataset2',
          tenantId: 'test-tenant',
          projectId: 'project1',
          name: 'Test Dataset 2',
          type: 'validation',
          status: 'processing',
          size: 2048,
          createdAt: '2024-01-01T01:00:00.000Z',
        },
      ];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockDatasets)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'GET',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        queryStringParameters: null,
      });

      const response = await datasetHandlers.listDatasets(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.datasets).toHaveLength(2);
      expect(body.datasets[0]).toMatchObject({
        id: 'dataset1',
        name: 'Test Dataset 1',
        type: 'training',
        status: 'ready',
      });
      expect(body.total).toBe(2);
    });

    it('should filter by dataset type', async () => {
      const mockDatasets = [
        {
          id: 'dataset1',
          tenantId: 'test-tenant',
          projectId: 'project1',
          name: 'Training Dataset',
          type: 'training',
          status: 'ready',
        },
      ];

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockQueryResponse(mockDatasets)
      );

      const request = global.createMockAPIRequest({
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        queryStringParameters: {
          type: 'training',
        },
      });

      const response = await datasetHandlers.listDatasets(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.datasets).toHaveLength(1);
      expect(body.datasets[0].type).toBe('training');
    });
  });

  describe('getDataset', () => {
    it('should get a specific dataset', async () => {
      const mockDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        description: 'A test dataset',
        type: 'training',
        status: 'ready',
        size: 1024,
        fileCount: 100,
        schema: {
          type: 'json',
          fields: ['input', 'output'],
        },
        metadata: {
          uploadedAt: '2024-01-01T00:00:00.000Z',
          processedAt: '2024-01-01T00:30:00.000Z',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:30:00.000Z',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(mockDataset)
      );

      const request = global.createMockAPIRequest({
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
      });

      const response = await datasetHandlers.getDataset(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.dataset).toMatchObject({
        id: 'dataset1',
        name: 'Test Dataset',
        type: 'training',
        status: 'ready',
        fileCount: 100,
      });
    });

    it('should return 404 for non-existent dataset', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(null)
      );

      const request = global.createMockAPIRequest({
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'nonexistent',
        },
      });

      const response = await datasetHandlers.getDataset(request);

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Dataset not found');
    });
  });

  describe('createDataset', () => {
    it('should create a new dataset', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(createMockPutResponse());

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        body: JSON.stringify({
          name: 'New Dataset',
          description: 'A new dataset',
          type: 'training',
          schema: {
            type: 'json',
            fields: ['input', 'output'],
          },
        }),
      });

      const response = await datasetHandlers.createDataset(request);

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.dataset).toMatchObject({
        name: 'New Dataset',
        description: 'A new dataset',
        type: 'training',
        status: 'created',
        tenantId: 'test-tenant',
        projectId: 'project1',
      });
      expect(body.dataset.id).toBeDefined();
      expect(body.dataset.createdAt).toBeDefined();
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

      const response = await datasetHandlers.createDataset(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing required field: name');
    });

    it('should validate dataset type', async () => {
      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
        },
        body: JSON.stringify({
          name: 'Test Dataset',
          type: 'invalid-type',
        }),
      });

      const response = await datasetHandlers.createDataset(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid dataset type');
    });
  });

  describe('updateDataset', () => {
    it('should update a dataset', async () => {
      const existingDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Original Name',
        status: 'ready',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const updatedDataset = {
        ...existingDataset,
        name: 'Updated Name',
        description: 'Updated description',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(existingDataset))
        .mockResolvedValueOnce(createMockUpdateResponse(updatedDataset));

      const request = global.createMockAPIRequest({
        httpMethod: 'PUT',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
        body: JSON.stringify({
          name: 'Updated Name',
          description: 'Updated description',
        }),
      });

      const response = await datasetHandlers.updateDataset(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.dataset.name).toBe('Updated Name');
      expect(body.dataset.description).toBe('Updated description');
    });

    it('should not allow updating processing datasets', async () => {
      const processingDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Processing Dataset',
        status: 'processing',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(processingDataset)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'PUT',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      const response = await datasetHandlers.updateDataset(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Cannot update dataset while processing');
    });
  });

  describe('deleteDataset', () => {
    it('should delete a dataset', async () => {
      const existingDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        status: 'ready',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(existingDataset))
        .mockResolvedValueOnce(createMockDeleteResponse());

      const request = global.createMockAPIRequest({
        httpMethod: 'DELETE',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
      });

      const response = await datasetHandlers.deleteDataset(request);

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
    });

    it('should not allow deleting processing datasets', async () => {
      const processingDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Processing Dataset',
        status: 'processing',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(processingDataset)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'DELETE',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
      });

      const response = await datasetHandlers.deleteDataset(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Cannot delete dataset while processing');
    });
  });

  describe('getDatasetUploadUrl', () => {
    it('should generate a presigned upload URL', async () => {
      const existingDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        status: 'created',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(existingDataset)
      );

      getSignedUrl.mockResolvedValueOnce('https://mock-presigned-url.com/upload');

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
        body: JSON.stringify({
          fileName: 'data.json',
          fileSize: 1024,
          contentType: 'application/json',
        }),
      });

      const response = await datasetHandlers.getDatasetUploadUrl(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.uploadUrl).toBe('https://mock-presigned-url.com/upload');
      expect(body.key).toContain('dataset1');
      expect(body.fields).toBeDefined();
    });

    it('should validate file requirements', async () => {
      const existingDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        status: 'created',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(existingDataset)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
        body: JSON.stringify({
          fileName: 'data.exe',
          fileSize: 1024,
          contentType: 'application/octet-stream',
        }),
      });

      const response = await datasetHandlers.getDatasetUploadUrl(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Unsupported file type');
    });

    it('should enforce file size limits', async () => {
      const existingDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        status: 'created',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(existingDataset)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
        body: JSON.stringify({
          fileName: 'large-file.json',
          fileSize: 1024 * 1024 * 1024 * 2, // 2GB
          contentType: 'application/json',
        }),
      });

      const response = await datasetHandlers.getDatasetUploadUrl(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('File size exceeds maximum limit');
    });
  });

  describe('processDataset', () => {
    it('should process a dataset', async () => {
      const uploadedDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        status: 'uploaded',
        s3Key: 'datasets/dataset1/data.json',
      };

      const processedDataset = {
        ...uploadedDataset,
        status: 'processing',
        processingStartedAt: '2024-01-01T01:00:00.000Z',
        jobId: 'job-123',
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce(createMockGetResponse(uploadedDataset))
        .mockResolvedValueOnce(createMockUpdateResponse(processedDataset));

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
      });

      const response = await datasetHandlers.processDataset(request);

      expect(response.statusCode).toBe(202);
      
      const body = JSON.parse(response.body);
      expect(body.dataset.status).toBe('processing');
      expect(body.dataset.jobId).toBeDefined();
      expect(body.message).toContain('Dataset processing started');
    });

    it('should not process datasets that are not uploaded', async () => {
      const createdDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        status: 'created',
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(createdDataset)
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
      });

      const response = await datasetHandlers.processDataset(request);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Dataset must be uploaded before processing');
    });
  });

  describe('validateDatasetSchema', () => {
    it('should validate dataset schema', async () => {
      const readyDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        status: 'ready',
        s3Key: 'datasets/dataset1/data.json',
        schema: {
          type: 'json',
          fields: ['input', 'output'],
        },
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(readyDataset)
      );

      // Mock S3 file content
      mockS3Client.send.mockResolvedValueOnce(
        createMockGetObjectResponse(JSON.stringify([
          { input: 'test1', output: 'result1' },
          { input: 'test2', output: 'result2' },
        ]))
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
        body: JSON.stringify({
          schema: {
            type: 'json',
            fields: ['input', 'output'],
          },
        }),
      });

      const response = await datasetHandlers.validateDatasetSchema(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.validation.isValid).toBe(true);
      expect(body.validation.sampleCount).toBe(2);
      expect(body.validation.errors).toHaveLength(0);
    });

    it('should detect schema validation errors', async () => {
      const readyDataset = {
        id: 'dataset1',
        tenantId: 'test-tenant',
        projectId: 'project1',
        name: 'Test Dataset',
        status: 'ready',
        s3Key: 'datasets/dataset1/data.json',
        schema: {
          type: 'json',
          fields: ['input', 'output'],
        },
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
        createMockGetResponse(readyDataset)
      );

      // Mock S3 file content with invalid data
      mockS3Client.send.mockResolvedValueOnce(
        createMockGetObjectResponse(JSON.stringify([
          { input: 'test1' }, // Missing output field
          { output: 'result2' }, // Missing input field
        ]))
      );

      const request = global.createMockAPIRequest({
        httpMethod: 'POST',
        pathParameters: {
          tenantId: 'test-tenant',
          projectId: 'project1',
          datasetId: 'dataset1',
        },
        body: JSON.stringify({
          schema: {
            type: 'json',
            fields: ['input', 'output'],
          },
        }),
      });

      const response = await datasetHandlers.validateDatasetSchema(request);

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.validation.isValid).toBe(false);
      expect(body.validation.errors.length).toBeGreaterThan(0);
    });
  });
});
