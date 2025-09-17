/**
 * API Authorization Security Test Suite
 * Comprehensive tests for authentication boundaries, permission enforcement, and JWT security
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { APITestClient } from '../utils/api-client';
import { MockCognitoService } from '../mocks/cognito-service';
import { unifiedAuthMiddleware, AuthConfig } from '../../lambda/api/middleware/unified-auth';

// Test configuration
const TEST_CONFIG = {
  region: 'us-east-2',
  userPoolId: 'us-east-2_xkNeOGMu1',
  clientId: '4ldimauhip6pq3han3ot5u9qmv',
  apiEndpoint: process.env.TEST_API_ENDPOINT || 'https://api.test.example.com',
};

describe('API Authorization Security Tests', () => {
  let client: APITestClient;
  let mockCognito: MockCognitoService;

  beforeAll(async () => {
    client = new APITestClient(TEST_CONFIG.apiEndpoint);
    mockCognito = new MockCognitoService();
    await mockCognito.setup();
  });

  afterAll(async () => {
    await mockCognito.teardown();
  });

  describe('Authentication Required Endpoints', () => {
    const protectedEndpoints = [
      { method: 'GET', path: '/v1/users/me', description: 'current user profile' },
      { method: 'POST', path: '/v1/agents', description: 'create agent' },
      { method: 'GET', path: '/v1/agents', description: 'list agents' },
      { method: 'PUT', path: '/v1/organizations/123', description: 'update organization' },
      { method: 'DELETE', path: '/v1/projects/456', description: 'delete project' },
      { method: 'GET', path: '/v1/lab/experiments', description: 'list experiments' },
      { method: 'GET', path: '/v1/observatory/analytics', description: 'view analytics' },
      { method: 'GET', path: '/v1/admin/users', description: 'admin user management' },
    ];

    protectedEndpoints.forEach(({ method, path, description }) => {
      test(`${method} ${path} (${description}) should require authentication`, async () => {
        const response = await client.request(method, path);
        
        expect(response.status).toBe(401);
        expect(response.data).toMatchObject({
          error: 'Unauthorized',
          message: 'Authentication token required'
        });
        expect(response.headers['www-authenticate']).toContain('Bearer realm="api"');
      });
    });
  });

  describe('JWT Token Validation', () => {
    test('should reject malformed tokens', async () => {
      const response = await client.get('/v1/users/me', {
        headers: { Authorization: 'Bearer malformed.jwt.token' }
      });

      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized');
      expect(response.data.message).toContain('Invalid authentication token');
    });

    test('should reject expired tokens', async () => {
      const expiredToken = mockCognito.generateExpiredToken({
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'basic'
      });

      const response = await client.get('/v1/users/me', {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });

      expect(response.status).toBe(401);
      expect(response.data.message).toContain('expired');
      expect(response.headers['www-authenticate']).toContain('error="invalid_token"');
    });

    test('should reject tokens with invalid signature', async () => {
      const validToken = await mockCognito.generateValidToken({
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'basic'
      });

      // Tamper with the signature
      const tamperedToken = validToken.slice(0, -10) + 'tampered123';

      const response = await client.get('/v1/users/me', {
        headers: { Authorization: `Bearer ${tamperedToken}` }
      });

      expect(response.status).toBe(401);
      expect(response.data.message).toContain('Invalid authentication token');
    });

    test('should reject tokens from wrong issuer', async () => {
      const wrongIssuerToken = jwt.sign({
        sub: 'test-user-123',
        email: 'test@example.com',
        iss: 'https://wrong-issuer.com',
        aud: TEST_CONFIG.clientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }, 'wrong-secret');

      const response = await client.get('/v1/users/me', {
        headers: { Authorization: `Bearer ${wrongIssuerToken}` }
      });

      expect(response.status).toBe(401);
    });

    test('should accept valid tokens', async () => {
      const validToken = await mockCognito.generateValidToken({
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'basic'
      });

      // Mock the user lookup to return valid user data
      mockCognito.mockUserLookup('test-user-123', {
        effectiveRole: 'basic',
        permissions: ['read:profile', 'studio.view_agents'],
        subscriptionLimits: {},
        quotaUsage: {},
        organizations: []
      });

      const response = await client.get('/v1/users/me', {
        headers: { Authorization: `Bearer ${validToken}` }
      });

      // Should not be 401 (may be 200 or other based on implementation)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Permission Boundary Enforcement', () => {
    let basicUserToken: string;
    let proUserToken: string;
    let adminToken: string;
    let freeUserToken: string;

    beforeEach(async () => {
      // Generate tokens for different user types
      basicUserToken = await mockCognito.generateValidToken({
        userId: 'basic-user-123',
        email: 'basic@example.com',
        role: 'basic',
        plan: 'basic'
      });

      proUserToken = await mockCognito.generateValidToken({
        userId: 'pro-user-123', 
        email: 'pro@example.com',
        role: 'pro',
        plan: 'pro'
      });

      adminToken = await mockCognito.generateValidToken({
        userId: 'admin-user-123',
        email: 'admin@example.com', 
        role: 'internal_admin',
        plan: 'enterprise'
      });

      freeUserToken = await mockCognito.generateValidToken({
        userId: 'free-user-123',
        email: 'free@example.com',
        role: 'free',
        plan: 'free'
      });

      // Mock user lookups
      mockCognito.mockUserLookup('basic-user-123', {
        effectiveRole: 'basic',
        permissions: ['studio.create_agents', 'studio.view_agents', 'lab.run_basic_experiments'],
        user: { subscription_tier: 'basic' }
      });

      mockCognito.mockUserLookup('pro-user-123', {
        effectiveRole: 'pro', 
        permissions: ['studio.create_agents', 'studio.edit_agents', 'studio.view_agents', 'lab.run_basic_experiments', 'observatory.basic_analytics'],
        user: { subscription_tier: 'pro' }
      });

      mockCognito.mockUserLookup('admin-user-123', {
        effectiveRole: 'internal_admin',
        permissions: ['admin:*', 'read:*', 'write:*'],
        user: { subscription_tier: 'internal' }
      });

      mockCognito.mockUserLookup('free-user-123', {
        effectiveRole: 'free',
        permissions: ['studio.view_agents'],
        user: { subscription_tier: 'free' }
      });
    });

    test('basic user cannot access admin endpoints', async () => {
      const response = await client.get('/v1/admin/users', {
        headers: { Authorization: `Bearer ${basicUserToken}` }
      });

      expect(response.status).toBe(403);
      expect(response.data.error).toBe('Forbidden');
      expect(response.data.message).toContain('Insufficient permissions');
    });

    test('free user cannot access premium features', async () => {
      const response = await client.post('/v1/agents', {
        headers: { Authorization: `Bearer ${freeUserToken}` },
        data: { name: 'Test Agent' }
      });

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('Insufficient permissions');
    });

    test('free user cannot access pro features', async () => {
      const response = await client.get('/v1/toolset/agent-builder-pro', {
        headers: { Authorization: `Bearer ${freeUserToken}` }
      });

      expect(response.status).toBe(402); // Payment Required
      expect(response.data.error).toBe('Payment Required');
      expect(response.data.message).toContain('Plan upgrade required');
      expect(response.data.upgradeUrl).toBe('/pricing');
    });

    test('basic user can access basic features', async () => {
      const response = await client.get('/v1/agents', {
        headers: { Authorization: `Bearer ${basicUserToken}` }
      });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(402);
    });

    test('pro user can access pro features', async () => {
      const response = await client.post('/v1/lab/advanced-experiments', {
        headers: { Authorization: `Bearer ${proUserToken}` },
        data: { experiment: 'test' }
      });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(402);
    });

    test('admin user can access all endpoints', async () => {
      const adminEndpoints = [
        '/v1/admin/users',
        '/v1/admin/organizations', 
        '/v1/admin/permissions',
        '/v1/admin/audit-logs'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await client.get(endpoint, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });

        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        expect(response.status).not.toBe(402);
      }
    });
  });

  describe('Role-Based Access Control', () => {
    test('role hierarchy should work correctly', async () => {
      const testCases = [
        { userRole: 'internal_admin', requiredRole: 'basic', shouldAllow: true },
        { userRole: 'internal_admin', requiredRole: 'pro', shouldAllow: true },
        { userRole: 'pro', requiredRole: 'basic', shouldAllow: true },
        { userRole: 'basic', requiredRole: 'pro', shouldAllow: false },
        { userRole: 'free', requiredRole: 'basic', shouldAllow: false },
      ];

      for (const { userRole, requiredRole, shouldAllow } of testCases) {
        const token = await mockCognito.generateValidToken({
          userId: `test-${userRole}-123`,
          email: `${userRole}@example.com`,
          role: userRole
        });

        mockCognito.mockUserLookup(`test-${userRole}-123`, {
          effectiveRole: userRole,
          permissions: [],
          user: { subscription_tier: userRole }
        });

        // Create a mock endpoint that requires the specific role
        const response = await client.get('/v1/test-role-endpoint', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'X-Required-Role': requiredRole // Mock header for testing
          }
        });

        if (shouldAllow) {
          expect(response.status).not.toBe(403);
        } else {
          expect(response.status).toBe(403);
        }
      }
    });
  });

  describe('Subscription Plan Enforcement', () => {
    test('plan upgrade flow should work correctly', async () => {
      const freeToken = await mockCognito.generateValidToken({
        userId: 'free-upgrade-test',
        email: 'free@example.com',
        role: 'free',
        plan: 'free'
      });

      mockCognito.mockUserLookup('free-upgrade-test', {
        effectiveRole: 'free',
        permissions: ['studio.view_agents'],
        user: { subscription_tier: 'free' }
      });

      const response = await client.post('/v1/premium-feature', {
        headers: { Authorization: `Bearer ${freeToken}` }
      });

      expect(response.status).toBe(402);
      expect(response.data).toMatchObject({
        error: 'Payment Required',
        message: expect.stringContaining('Plan upgrade required'),
        upgradeUrl: '/pricing'
      });
    });
  });

  describe('Tenant Isolation', () => {
    test('users should only access their tenant data', async () => {
      const tenant1Token = await mockCognito.generateValidToken({
        userId: 'tenant1-user',
        email: 'tenant1@example.com',
        tenantId: 'tenant-123',
        role: 'basic'
      });

      const tenant2Token = await mockCognito.generateValidToken({
        userId: 'tenant2-user', 
        email: 'tenant2@example.com',
        tenantId: 'tenant-456',
        role: 'basic'
      });

      mockCognito.mockUserLookup('tenant1-user', {
        effectiveRole: 'basic',
        permissions: ['read:organizations'],
        user: { organization_id: 'tenant-123' }
      });

      mockCognito.mockUserLookup('tenant2-user', {
        effectiveRole: 'basic', 
        permissions: ['read:organizations'],
        user: { organization_id: 'tenant-456' }
      });

      // Try to access tenant1's data with tenant2's token
      const response = await client.get('/v1/organizations/tenant-123', {
        headers: { Authorization: `Bearer ${tenant2Token}` }
      });

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('tenant');
    });

    test('missing tenant should be rejected for non-platform-admin', async () => {
      const noTenantToken = await mockCognito.generateValidToken({
        userId: 'no-tenant-user',
        email: 'notenant@example.com',
        role: 'basic'
        // No tenantId
      });

      const response = await client.get('/v1/users/me', {
        headers: { Authorization: `Bearer ${noTenantToken}` }
      });

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('missing tenant information');
    });
  });

  describe('Security Headers and Error Handling', () => {
    test('should include proper security headers in error responses', async () => {
      const response = await client.get('/v1/users/me');

      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['www-authenticate']).toBeDefined();
    });

    test('should not leak sensitive information in error messages', async () => {
      const response = await client.get('/v1/admin/users', {
        headers: { Authorization: 'Bearer invalid.token.here' }
      });

      expect(response.data.message).not.toContain('secret');
      expect(response.data.message).not.toContain('key');
      expect(response.data.message).not.toContain('password');
      expect(response.data).not.toHaveProperty('stack');
      expect(response.data).not.toHaveProperty('details');
    });

    test('should include request ID for debugging', async () => {
      const response = await client.get('/v1/users/me');

      expect(response.status).toBe(401);
      expect(response.data.requestId).toBeDefined();
      expect(typeof response.data.requestId).toBe('string');
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('should handle rapid authentication attempts gracefully', async () => {
      const rapidRequests = Array.from({ length: 10 }, (_, i) =>
        client.get('/v1/users/me', {
          headers: { Authorization: `Bearer invalid-token-${i}` }
        })
      );

      const responses = await Promise.all(rapidRequests);

      // All should be 401, but service should remain responsive
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });

      // Last response should still be properly formatted
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.data).toMatchObject({
        error: 'Unauthorized',
        message: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Integration with Permissions Service', () => {
    test('should handle permissions service errors gracefully', async () => {
      const token = await mockCognito.generateValidToken({
        userId: 'service-error-user',
        email: 'error@example.com',
        role: 'basic'
      });

      // Mock the permissions service to throw an error
      mockCognito.mockUserLookupError('service-error-user', new Error('Database connection failed'));

      const response = await client.get('/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Internal Server Error');
      expect(response.data.message).toContain('Authentication service error');
    });

    test('should fall back to token-based permissions when service unavailable', async () => {
      const token = await mockCognito.generateValidToken({
        userId: 'fallback-user',
        email: 'fallback@example.com',
        role: 'basic',
        plan: 'basic'
      });

      // Don't mock user lookup - should trigger fallback
      mockCognito.mockUserLookup('fallback-user', null);

      const response = await client.get('/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Should still work with fallback permissions
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(401);
    });
  });
});