// Mock AWS S3 Client

const mockS3Client = {
  send: jest.fn(),
};

// Mock command constructors
const GetObjectCommand = jest.fn();
const PutObjectCommand = jest.fn();
const DeleteObjectCommand = jest.fn();
const HeadObjectCommand = jest.fn();
const ListObjectsV2Command = jest.fn();
const CopyObjectCommand = jest.fn();

// Mock responses
const createMockGetObjectResponse = (body = 'mock file content') => ({
  Body: {
    transformToString: async () => body,
    transformToByteArray: async () => Buffer.from(body),
  },
  ContentType: 'application/octet-stream',
  ContentLength: body.length,
  LastModified: new Date('2024-01-01T00:00:00.000Z'),
  ETag: '"mock-etag"',
});

const createMockPutObjectResponse = () => ({
  ETag: '"mock-etag"',
  VersionId: 'mock-version-id',
});

const createMockHeadObjectResponse = () => ({
  ContentType: 'application/octet-stream',
  ContentLength: 1024,
  LastModified: new Date('2024-01-01T00:00:00.000Z'),
  ETag: '"mock-etag"',
});

const createMockListObjectsResponse = (objects = []) => ({
  Contents: objects.map(key => ({
    Key: key,
    LastModified: new Date('2024-01-01T00:00:00.000Z'),
    ETag: '"mock-etag"',
    Size: 1024,
    StorageClass: 'STANDARD',
  })),
  IsTruncated: false,
  KeyCount: objects.length,
  MaxKeys: 1000,
});

// Mock presigned URL generator
const getSignedUrl = jest.fn().mockResolvedValue('https://mock-presigned-url.com/mock-object');

module.exports = {
  S3Client: jest.fn(() => mockS3Client),
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  getSignedUrl,
  // Test helpers
  mockS3Client,
  createMockGetObjectResponse,
  createMockPutObjectResponse,
  createMockHeadObjectResponse,
  createMockListObjectsResponse,
};
