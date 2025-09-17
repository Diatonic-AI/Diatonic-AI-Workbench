# Diatonic AI - Lambda Testing Guide

This document provides comprehensive information about testing the Lambda API functions.

## Test Structure

```
lambda/tests/
├── setup.ts                    # Global test setup and configuration
├── __mocks__/                  # Mock implementations for AWS SDK and external services
│   └── aws-sdk/
│       ├── client-dynamodb.js  # DynamoDB mocks
│       ├── client-s3.js        # S3 mocks
│       └── client-eventbridge.js # EventBridge mocks
├── unit/                       # Unit tests for individual handlers
│   └── handlers/
│       ├── experiments.test.ts # Experiment handler tests
│       └── datasets.test.ts    # Dataset handler tests
├── integration/                # Integration tests
│   └── router.test.ts          # Router integration tests
└── e2e/                       # End-to-end tests
    └── experiment-workflow.test.ts # Complete workflow tests
```

## Prerequisites

1. **Node.js**: Version 18 or higher
2. **Dependencies**: Install test dependencies
   ```bash
   cd lambda
   npm install
   ```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### With Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Test individual handler functions in isolation with mocked dependencies.

**Example: Experiment Handlers**
- `listExperiments` - Test experiment listing with pagination and filtering
- `getExperiment` - Test retrieving specific experiments
- `createExperiment` - Test experiment creation with validation
- `updateExperiment` - Test experiment updates with business logic
- `deleteExperiment` - Test experiment deletion with constraints
- `startExperiment` - Test experiment execution workflow
- `getExperimentResults` - Test results retrieval

**Coverage includes:**
- Input validation
- Database operations (mocked)
- Error handling
- Business logic validation
- Response formatting

### 2. Integration Tests (`tests/integration/`)

Test the complete API router with all handlers working together.

**Router Integration Tests:**
- Route matching for all endpoint patterns
- Path parameter extraction
- Query parameter handling
- Request body processing
- Error handling (404, 500, validation errors)
- CORS header inclusion
- Request context passing

**Coverage includes:**
- Health check endpoints
- API documentation endpoints
- All CRUD operations
- Complex route patterns
- Error scenarios

### 3. End-to-End Tests (`tests/e2e/`)

Test complete workflows from API request to response.

**Complete Experiment Lifecycle:**
1. Create experiment
2. Update experiment configuration
3. Start experiment execution
4. Retrieve experiment results
5. List experiments
6. Delete experiment

**Dataset Integration Workflow:**
1. Create dataset
2. Create experiment with dataset reference
3. Execute experiment with dataset

**Error Scenarios:**
- Validation errors
- Not found errors
- Business logic violations

## Mock Strategy

### AWS SDK Mocks
- **DynamoDB**: Mocks for all CRUD operations with realistic response structures
- **S3**: Mocks for file operations and presigned URL generation
- **EventBridge**: Mocks for event publishing and rule management

### Global Test Utilities
- `createMockAPIRequest()` - Factory for API request objects
- `createMockContext()` - Factory for Lambda context objects
- `createMockEvent()` - Factory for API Gateway events

### Environment Setup
- Test-specific environment variables
- Mock AWS credentials
- Isolated test database configurations

## Test Data Management

### Mock Data Patterns
```typescript
// Standard experiment mock
const mockExperiment = {
  id: 'exp-123',
  tenantId: 'test-tenant',
  projectId: 'project-456',
  name: 'Test Experiment',
  status: 'draft',
  configuration: {
    model: 'gpt-3.5-turbo',
    parameters: { temperature: 0.7 }
  },
  createdAt: '2024-01-01T00:00:00.000Z'
};
```

### Dynamic Test Data
Tests use factory functions to create consistent but customizable test data:
```typescript
const request = global.createMockAPIRequest({
  pathParameters: { tenantId: 'custom-tenant' },
  body: JSON.stringify({ name: 'Custom Experiment' })
});
```

## Coverage Requirements

Aim for comprehensive coverage across:
- **Statements**: 90%+
- **Functions**: 95%+
- **Lines**: 90%+
- **Branches**: 85%+

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Testing Best Practices

### 1. Test Structure
- **Arrange**: Set up test data and mocks
- **Act**: Execute the function under test
- **Assert**: Verify results and side effects

### 2. Mock Management
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Reset all mocks
});
```

### 3. Async Testing
```typescript
it('should handle async operations', async () => {
  mockDynamoDBDocumentClient.send.mockResolvedValueOnce(mockResponse);
  
  const result = await handler(request);
  
  expect(result.statusCode).toBe(200);
});
```

### 4. Error Testing
```typescript
it('should handle database errors', async () => {
  mockDynamoDBDocumentClient.send.mockRejectedValueOnce(
    new Error('Database connection failed')
  );
  
  const result = await handler(request);
  
  expect(result.statusCode).toBe(500);
});
```

## Debugging Tests

### Console Output
Tests suppress console output by default. To enable debugging:
```typescript
// In specific test files
console.error = originalConsole.error; // Enable error output
```

### Test Debugging
```bash
# Run specific test file
npx jest tests/unit/handlers/experiments.test.ts

# Run with verbose output
npx jest --verbose

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Common Testing Patterns

### 1. Testing CRUD Operations
```typescript
describe('CRUD Operations', () => {
  it('should create resource', async () => { /* create test */ });
  it('should read resource', async () => { /* read test */ });
  it('should update resource', async () => { /* update test */ });
  it('should delete resource', async () => { /* delete test */ });
});
```

### 2. Testing Validation
```typescript
it('should validate required fields', async () => {
  const invalidRequest = createMockAPIRequest({
    body: JSON.stringify({ /* missing required fields */ })
  });
  
  const response = await handler(invalidRequest);
  
  expect(response.statusCode).toBe(400);
  expect(JSON.parse(response.body).error).toContain('Missing required field');
});
```

### 3. Testing Pagination
```typescript
it('should handle pagination', async () => {
  const mockItems = Array.from({ length: 20 }, (_, i) => ({ id: `item${i}` }));
  
  mockDynamoDBDocumentClient.send.mockResolvedValueOnce(
    createMockQueryResponse(mockItems.slice(0, 10), { id: 'item9' })
  );
  
  const request = createMockAPIRequest({
    queryStringParameters: { limit: '10' }
  });
  
  const response = await handler(request);
  const body = JSON.parse(response.body);
  
  expect(body.items).toHaveLength(10);
  expect(body.lastKey).toBeDefined();
});
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- No external dependencies
- Deterministic test data
- Proper cleanup and isolation
- Fast execution (< 30 seconds for full suite)

### GitHub Actions Example
```yaml
- name: Run Tests
  run: |
    cd lambda
    npm install
    npm run test:coverage
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./lambda/coverage/lcov.info
```

## Troubleshooting

### Common Issues

1. **Mock not found**: Ensure mock files are in correct `__mocks__` directory
2. **Async timeout**: Increase jest timeout or check for unresolved promises
3. **Environment variables**: Verify test environment setup in `tests/setup.ts`
4. **Path resolution**: Check TypeScript path mapping in `tsconfig.json`

### Performance Issues
- Use `--runInBand` for debugging
- Check for memory leaks in long test suites
- Clear mocks between tests

## Contributing

When adding new tests:
1. Follow existing patterns and naming conventions
2. Include both success and error scenarios
3. Test edge cases and boundary conditions
4. Update this documentation if adding new test categories
5. Ensure new tests pass in CI environment

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [AWS SDK v3 Testing Guide](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/unit-testing.html)
- [TypeScript Jest Configuration](https://kulshekhar.github.io/ts-jest/docs/getting-started/installation)
