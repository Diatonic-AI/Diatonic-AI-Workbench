// Mock AWS EventBridge Client

const mockEventBridgeClient = {
  send: jest.fn(),
};

// Mock command constructors
const PutEventsCommand = jest.fn();
const ListRulesCommand = jest.fn();
const DescribeRuleCommand = jest.fn();

// Mock responses
const createMockPutEventsResponse = (failedEntryCount = 0, entries = []) => ({
  FailedEntryCount: failedEntryCount,
  Entries: entries.map((entry, index) => ({
    EventId: `mock-event-id-${index}`,
    ErrorCode: failedEntryCount > index ? 'InternalFailure' : undefined,
    ErrorMessage: failedEntryCount > index ? 'Mock error' : undefined,
  })),
});

const createMockListRulesResponse = (rules = []) => ({
  Rules: rules.map((ruleName, index) => ({
    Name: ruleName,
    Arn: `arn:aws:events:us-east-1:123456789012:rule/${ruleName}`,
    State: 'ENABLED',
    Description: `Mock rule ${index}`,
    EventPattern: '{"source": ["mock.source"]}',
  })),
  NextToken: null,
});

const createMockDescribeRuleResponse = (ruleName) => ({
  Name: ruleName,
  Arn: `arn:aws:events:us-east-1:123456789012:rule/${ruleName}`,
  State: 'ENABLED',
  Description: `Mock rule ${ruleName}`,
  EventPattern: '{"source": ["mock.source"]}',
  ScheduleExpression: null,
  RoleArn: null,
});

module.exports = {
  EventBridgeClient: jest.fn(() => mockEventBridgeClient),
  PutEventsCommand,
  ListRulesCommand,
  DescribeRuleCommand,
  // Test helpers
  mockEventBridgeClient,
  createMockPutEventsResponse,
  createMockListRulesResponse,
  createMockDescribeRuleResponse,
};
