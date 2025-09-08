// Mock AWS DynamoDB Client

const mockDynamoDBClient = {
  send: jest.fn(),
};

const mockDynamoDBDocumentClient = {
  send: jest.fn(),
};

// Mock command constructors
const GetCommand = jest.fn();
const PutCommand = jest.fn();
const UpdateCommand = jest.fn();
const DeleteCommand = jest.fn();
const QueryCommand = jest.fn();
const ScanCommand = jest.fn();

// Mock responses
const createMockItem = (id, overrides = {}) => ({
  id,
  tenantId: 'test-tenant-id',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockQueryResponse = (items = [], lastEvaluatedKey = null) => ({
  Items: items,
  Count: items.length,
  ScannedCount: items.length,
  LastEvaluatedKey: lastEvaluatedKey,
});

const createMockGetResponse = (item = null) => ({
  Item: item,
});

const createMockPutResponse = () => ({
  Attributes: {},
});

const createMockUpdateResponse = (item) => ({
  Attributes: item,
});

const createMockDeleteResponse = () => ({
  Attributes: {},
});

module.exports = {
  DynamoDBClient: jest.fn(() => mockDynamoDBClient),
  DynamoDBDocumentClient: {
    from: jest.fn(() => mockDynamoDBDocumentClient),
  },
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  // Test helpers
  mockDynamoDBClient,
  mockDynamoDBDocumentClient,
  createMockItem,
  createMockQueryResponse,
  createMockGetResponse,
  createMockPutResponse,
  createMockUpdateResponse,
  createMockDeleteResponse,
};
