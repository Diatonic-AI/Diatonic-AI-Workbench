# Security Testing Suite

Comprehensive security testing suite for the AI Nexus Workbench application, covering API authorization, authentication flows, and user interface security.

## Overview

This test suite validates:

- **API Authorization**: JWT validation, permission boundaries, role hierarchies
- **Authentication Flows**: Login, logout, session management
- **Route Guards**: Protected route access control
- **Subscription Enforcement**: Plan-based feature access
- **Security Headers**: XSS protection, CSRF prevention
- **Tenant Isolation**: Multi-tenant data security

## Test Structure

```
tests/
├── security/
│   └── api-authorization.test.ts    # API security tests
├── e2e/
│   └── security-flows.spec.ts       # End-to-end security flows
├── mocks/
│   └── cognito-service.ts           # Mock Cognito service
├── utils/
│   └── api-client.ts                # API test client
├── jest.config.js                   # Jest configuration
├── setup.ts                         # Test setup
└── README.md                        # This file
```

## Prerequisites

Install the required testing dependencies:

```bash
# Core testing frameworks
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @playwright/test
npm install --save-dev axios jsonwebtoken

# Additional testing utilities
npm install --save-dev jest-extended
npm install --save-dev @testing-library/jest-dom
```

## Running Tests

### API Security Tests (Jest)

Run the comprehensive API authorization test suite:

```bash
# Run all security tests
npm run test:security

# Run with coverage
npm run test:security -- --coverage

# Run specific test file
npm run test tests/security/api-authorization.test.ts

# Run in watch mode
npm run test:security -- --watch
```

### End-to-End Tests (Playwright)

Run browser-based security flow tests:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E security tests
npm run test:e2e:security

# Run on specific browser
npm run test:e2e:security -- --project=chromium

# Run with UI mode
npm run test:e2e:security -- --ui

# Generate HTML report
npm run test:e2e:security -- --reporter=html
```

### All Tests

Run the complete security test suite:

```bash
npm run test:all-security
```

## Test Configuration

### Environment Variables

Set up your testing environment:

```bash
# API endpoint for testing
export TEST_API_ENDPOINT=https://api.test.example.com

# E2E testing URL
export E2E_BASE_URL=http://localhost:8080

# Test user credentials
export TEST_BASIC_EMAIL=basic@example.com
export TEST_BASIC_PASSWORD=TestPassword123!
export TEST_ADMIN_EMAIL=admin@example.com
export TEST_ADMIN_PASSWORD=TestPassword123!
```

### AWS Configuration

The tests use mocked AWS services but require these environment variables:

```bash
export AWS_REGION=us-east-2
export COGNITO_USER_POOL_ID=us-east-2_xkNeOGMu1
export COGNITO_CLIENT_ID=4ldimauhip6pq3han3ot5u9qmv
```

## Test Categories

### 1. Authentication Required Endpoints

Validates that protected API endpoints require valid authentication:

- `/v1/users/me` - Current user profile
- `/v1/agents` - Agent management
- `/v1/lab/experiments` - Lab experiments
- `/v1/admin/*` - Admin endpoints

**Key Assertions:**
- 401 response for missing tokens
- Proper `WWW-Authenticate` headers
- Error message format consistency

### 2. JWT Token Validation

Tests various JWT token scenarios:

- **Malformed tokens**: Invalid format rejection
- **Expired tokens**: Proper expiration handling
- **Invalid signatures**: Signature verification
- **Wrong issuers**: Issuer validation
- **Valid tokens**: Successful authentication

**Security Checks:**
- Token format validation
- Cryptographic signature verification
- Claims validation (iss, aud, exp)
- Error message security (no information leakage)

### 3. Permission Boundary Enforcement

Validates role-based access control:

- **Free users**: Limited permissions, upgrade prompts
- **Basic users**: Standard feature access
- **Pro users**: Advanced features
- **Admin users**: Full system access

**Test Scenarios:**
- Access denied for insufficient permissions (403)
- Payment required for premium features (402)
- Successful access for authorized users (200/2xx)

### 4. Role Hierarchy Testing

Verifies the role precedence system:

```
internal_admin > pro > basic > free
```

**Validation Logic:**
- Higher roles can access lower-role features
- Lower roles cannot access higher-role features
- Proper 403 responses for unauthorized access

### 5. Tenant Isolation

Ensures multi-tenant data separation:

- Cross-tenant data access prevention
- Missing tenant validation
- Tenant context enforcement

### 6. Security Headers & Error Handling

Validates security best practices:

- **Security headers**: CSP, X-Frame-Options, etc.
- **Error sanitization**: No sensitive data exposure
- **Request tracing**: Proper request ID generation

## Test Data Management

### Mock User Profiles

The test suite uses predefined user profiles:

```typescript
// Basic user with standard permissions
mockCognito.mockUserLookup('basic-user-123', {
  effectiveRole: 'basic',
  permissions: ['studio.create_agents', 'studio.view_agents'],
  user: { subscription_tier: 'basic' }
});

// Admin user with full access
mockCognito.mockUserLookup('admin-user-123', {
  effectiveRole: 'internal_admin',
  permissions: ['admin:*', 'read:*', 'write:*'],
  user: { subscription_tier: 'internal' }
});
```

### Token Generation

The mock Cognito service generates realistic JWT tokens:

```typescript
const validToken = await mockCognito.generateValidToken({
  userId: 'test-user-123',
  email: 'test@example.com',
  role: 'basic',
  plan: 'basic'
});
```

## Coverage Requirements

### API Middleware Coverage

The authentication middleware must meet high coverage standards:

```javascript
coverageThreshold: {
  './lambda/api/middleware/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85
  }
}
```

### Critical Security Paths

Ensure 100% coverage for:

- JWT token validation logic
- Permission checking functions
- Role hierarchy enforcement
- Tenant isolation checks

## Integration with CI/CD

### GitHub Actions

Add security tests to your CI pipeline:

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run API security tests
        run: npm run test:security -- --coverage
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E security tests
        run: npm run test:e2e:security
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

1. **JWT Signature Errors**
   - Ensure mock keys are properly generated
   - Verify token payload structure

2. **Permission Test Failures**
   - Check user profile mock setup
   - Validate permission string matching

3. **E2E Test Timeouts**
   - Increase `actionTimeout` in Playwright config
   - Check element selectors for UI changes

4. **Mock Service Issues**
   - Reset mocks between tests
   - Verify mock method signatures match real services

### Debug Mode

Enable verbose logging:

```bash
# Jest debugging
npm run test:security -- --verbose

# Playwright debugging
npm run test:e2e:security -- --debug

# Enable trace viewing
npx playwright show-trace trace.zip
```

## Security Test Best Practices

### 1. Test Real Attack Vectors

- SQL injection attempts in API parameters
- XSS payload injection in form fields
- CSRF token bypassing
- JWT tampering scenarios

### 2. Validate Negative Cases

- Test what happens with invalid tokens
- Verify proper error handling
- Ensure no information leakage

### 3. Performance Under Attack

- Rate limiting validation
- Concurrent authentication attempts
- Resource exhaustion scenarios

### 4. Security Header Validation

- Content Security Policy enforcement
- X-Frame-Options verification
- Secure cookie attributes

## Contributing

When adding new security tests:

1. Follow existing test patterns
2. Include both positive and negative test cases
3. Update mock services as needed
4. Document new test scenarios
5. Ensure high code coverage

## References

- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [AWS Cognito Security](https://docs.aws.amazon.com/cognito/latest/developerguide/security.html)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)