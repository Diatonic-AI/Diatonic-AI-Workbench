/**
 * Mock Cognito Service for Security Testing
 * Provides JWT token generation and user lookup mocking
 */

import jwt from 'jsonwebtoken';
import { createPrivateKey, createPublicKey } from 'crypto';

export interface MockUserProfile {
  effectiveRole: string;
  permissions: string[];
  user?: {
    subscription_tier?: string;
    organization_id?: string;
    [key: string]: any;
  };
  subscriptionLimits?: Record<string, any>;
  quotaUsage?: Record<string, any>;
  organizations?: any[];
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  plan?: string;
  tenantId?: string;
  [key: string]: any;
}

export class MockCognitoService {
  private privateKey: string = '';
  private publicKey: string = '';
  private jwks: any = {};
  private userLookups: Map<string, MockUserProfile | null> = new Map();
  private userLookupErrors: Map<string, Error> = new Map();

  constructor() {
    this.generateKeyPair();
  }

  private generateKeyPair(): void {
    // Generate RSA key pair for JWT signing
    const { privateKey, publicKey } = require('crypto').generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;

    // Create JWKS for validation
    const publicKeyObject = createPublicKey(this.publicKey);
    const keyData = publicKeyObject.export({ format: 'jwk' });

    this.jwks = {
      keys: [{
        ...keyData,
        kid: 'test-key-id',
        alg: 'RS256',
        use: 'sig'
      }]
    };
  }

  async setup(): Promise<void> {
    // Setup mock JWKS endpoint if needed
    console.log('MockCognitoService setup complete');
  }

  async teardown(): Promise<void> {
    this.userLookups.clear();
    this.userLookupErrors.clear();
  }

  getJWKS(): any {
    return this.jwks;
  }

  async generateValidToken(payload: TokenPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload = {
      sub: payload.userId,
      email: payload.email,
      'cognito:groups': [payload.role],
      'custom:role': payload.role,
      'custom:plan': payload.plan || 'basic',
      'custom:tenant_id': payload.tenantId,
      iss: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xkNeOGMu1',
      aud: '4ldimauhip6pq3han3ot5u9qmv',
      token_use: 'id',
      auth_time: now,
      iat: now,
      exp: now + 3600, // 1 hour
      ...payload
    };

    return jwt.sign(tokenPayload, this.privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key-id'
    });
  }

  generateExpiredToken(payload: TokenPayload): string {
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload = {
      sub: payload.userId,
      email: payload.email,
      'cognito:groups': [payload.role],
      'custom:role': payload.role,
      iss: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xkNeOGMu1',
      aud: '4ldimauhip6pq3han3ot5u9qmv',
      token_use: 'id',
      auth_time: now - 7200, // 2 hours ago
      iat: now - 7200,
      exp: now - 3600, // Expired 1 hour ago
      ...payload
    };

    return jwt.sign(tokenPayload, this.privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key-id'
    });
  }

  mockUserLookup(userId: string, profile: MockUserProfile | null): void {
    this.userLookups.set(userId, profile);
  }

  mockUserLookupError(userId: string, error: Error): void {
    this.userLookupErrors.set(userId, error);
  }

  async getUserProfile(userId: string): Promise<MockUserProfile> {
    // Check for mocked errors first
    if (this.userLookupErrors.has(userId)) {
      throw this.userLookupErrors.get(userId);
    }

    // Return mocked user data
    const mockProfile = this.userLookups.get(userId);
    if (mockProfile === null) {
      throw new Error('User not found');
    }
    
    if (!mockProfile) {
      // Return default fallback profile if no mock is set
      return {
        effectiveRole: 'basic',
        permissions: ['read:profile'],
        user: { subscription_tier: 'basic' }
      };
    }

    return mockProfile;
  }

  // Helper method to verify token against our mock JWKS
  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xkNeOGMu1',
        audience: '4ldimauhip6pq3han3ot5u9qmv'
      });
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  // Generate various test scenarios
  generateTokenSet(): Record<string, string> {
    const scenarios = {
      validBasic: this.generateValidToken({
        userId: 'user-basic-123',
        email: 'basic@example.com',
        role: 'basic',
        plan: 'basic'
      }),
      validPro: this.generateValidToken({
        userId: 'user-pro-123',
        email: 'pro@example.com',
        role: 'pro',
        plan: 'pro'
      }),
      validAdmin: this.generateValidToken({
        userId: 'user-admin-123',
        email: 'admin@example.com',
        role: 'internal_admin',
        plan: 'enterprise'
      }),
      expired: this.generateExpiredToken({
        userId: 'user-expired-123',
        email: 'expired@example.com',
        role: 'basic'
      })
    };

    return scenarios;
  }

  // Mock the permissions service integration
  mockPermissionsService(): void {
    // This would normally integrate with actual permissions service
    // For testing, we just track the mocked user lookups
    console.log('Mock permissions service initialized');
  }

  // Utility method to create a malformed token
  generateMalformedToken(): string {
    return 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature';
  }

  // Utility method to create a token with wrong signature
  generateWrongSignatureToken(payload: TokenPayload): string {
    const wrongPrivateKey = require('crypto').generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).privateKey;

    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload = {
      sub: payload.userId,
      email: payload.email,
      'cognito:groups': [payload.role],
      iss: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xkNeOGMu1',
      aud: '4ldimauhip6pq3han3ot5u9qmv',
      token_use: 'id',
      exp: now + 3600
    };

    return jwt.sign(tokenPayload, wrongPrivateKey, {
      algorithm: 'RS256',
      keyid: 'wrong-key-id'
    });
  }

  // Clean up method
  reset(): void {
    this.userLookups.clear();
    this.userLookupErrors.clear();
  }
}