// Test Setup - Global configuration and mocks

import { jest } from '@jest/globals';

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  AWS_REGION: 'us-east-1',
  DYNAMODB_TABLE: 'test-ai-nexus-table',
  S3_BUCKET: 'test-ai-nexus-bucket',
  EVENTBRIDGE_BUS: 'test-ai-nexus-bus',
  JWT_SECRET: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })(),
  API_BASE_URL: 'https://test-api.example.com',
  LOG_LEVEL: 'error', // Suppress logs during testing
};

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during testing
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks before each test
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = originalConsole.error; // Keep errors for debugging
  console.debug = jest.fn();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore console after all tests
  Object.assign(console, originalConsole);
});

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      createMockAPIRequest: (overrides?: any) => any;
      createMockContext: (overrides?: any) => any;
      createMockEvent: (overrides?: any) => any;
    }
  }
}

// Mock API request factory
global.createMockAPIRequest = (overrides = {}) => ({
  httpMethod: 'GET',
  path: '/v1/health',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-ID': 'test-request-id',
    'Authorization': 'Bearer test-token',
  },
  queryStringParameters: null,
  pathParameters: null,
  body: null,
  isBase64Encoded: false,
  requestId: 'test-request-id',
  tenantId: 'test-tenant-id',
  userId: 'test-user-id',
  context: {
    requestId: 'test-request-id',
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    userRole: 'admin',
    userPlan: 'pro',
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    clients: {
      dynamodb: {},
      s3: {},
      eventbridge: {},
    },
  },
  ...overrides,
});

// Mock Lambda context factory
global.createMockContext = (overrides = {}) => ({
  requestId: 'test-request-id',
  tenantId: 'test-tenant-id',
  userId: 'test-user-id',
  userRole: 'admin',
  userPlan: 'pro',
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  clients: {
    dynamodb: {},
    s3: {},
    eventbridge: {},
  },
  ...overrides,
});

// Mock API Gateway event factory
global.createMockEvent = (overrides = {}) => ({
  resource: '/v1/{proxy+}',
  path: '/v1/health',
  httpMethod: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-ID': 'test-request-id',
    'Authorization': 'Bearer test-token',
  },
  multiValueHeaders: {},
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  requestContext: {
    resourceId: 'test',
    resourcePath: '/v1/{proxy+}',
    httpMethod: 'GET',
    extendedRequestId: 'test-extended-id',
    requestTime: '2024-01-01T00:00:00.000Z',
    path: '/test/v1/health',
    accountId: '123456789012',
    protocol: 'HTTP/1.1',
    stage: 'test',
    domainPrefix: 'test',
    requestTimeEpoch: 1704067200000,
    requestId: 'test-request-id',
    identity: {
      cognitoIdentityPoolId: null,
      accountId: null,
      cognitoIdentityId: null,
      caller: null,
      sourceIp: '127.0.0.1',
      principalOrgId: null,
      accessKey: null,
      cognitoAuthenticationType: null,
      cognitoAuthenticationProvider: null,
      userArn: null,
      userAgent: 'test-user-agent',
      user: null,
    },
    domainName: 'test-api.example.com',
    apiId: 'test-api-id',
  },
  body: null,
  isBase64Encoded: false,
  ...overrides,
});

export {};
