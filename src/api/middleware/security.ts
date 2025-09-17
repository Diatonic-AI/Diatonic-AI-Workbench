/**
 * Security Middleware Integration for Express Server
 * Applies unified authentication and security headers
 */

import { Request, Response, NextFunction } from 'express';
import { localAuthMiddleware, AuthConfig, UserContext } from './auth-local';
import jwt from 'jsonwebtoken';

// Extended auth config for Express middleware
interface ExtendedAuthConfig extends AuthConfig {
  region?: string;
  userPoolId?: string;
  clientId?: string;
  requiredPermissions?: Record<string, string[]>;
  roleHierarchy?: Record<string, string[]>;
  planUpgradeUrl?: string;
  enableFallbackToTokenClaims?: boolean;
}

// Security configuration
const securityConfig: ExtendedAuthConfig = {
  region: process.env.AWS_REGION || 'us-east-2',
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-2_xkNeOGMu1',
  clientId: process.env.COGNITO_CLIENT_ID || '4ldimauhip6pq3han3ot5u9qmv',
  requiredPermissions: {
    'GET:/api/toolset-items': ['studio.view_agents'],
    'POST:/api/toolset-items': ['studio.create_agents'],
    'PUT:/api/toolset-items': ['studio.edit_agents'],
    'GET:/api/lab-experiments': ['lab.view_experiments'],
    'POST:/api/lab-experiments': ['lab.create_experiments'],
    'GET:/api/dashboard-metrics': ['dashboard.view_metrics'],
    'GET:/api/community-posts': ['community.view_posts'],
    'GET:/api/education-courses': ['education.view_courses']
  },
  roleHierarchy: {
    'internal_admin': ['platform_admin', 'pro', 'basic', 'free'],
    'platform_admin': ['pro', 'basic', 'free'],
    'pro': ['basic', 'free'],
    'basic': ['free'],
    'free': []
  },
  planUpgradeUrl: '/pricing',
  enableFallbackToTokenClaims: true
};

/**
 * Convert AWS Lambda middleware to Express middleware
 */
export function createExpressAuthMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log(`🔒 Auth middleware called for ${req.method} ${req.path}`);
    
    // Skip authentication for health check and public endpoints
    const publicEndpoints = ['/api/health', '/api/statistics'];
    if (publicEndpoints.includes(req.path) || req.path === '/api' || req.path === '/api/') {
      console.log(`📖 Public endpoint detected, skipping auth: ${req.path}`);
      return next();
    }
    
    console.log(`🔐 Private endpoint detected, checking auth: ${req.path}`);

    try {
      // Create Lambda-style event object
      const event = {
        httpMethod: req.method,
        path: req.path,
        headers: {
          ...req.headers,
          // Ensure headers are strings
          authorization: req.headers.authorization || req.headers.Authorization as string || ''
        },
        requestContext: {
          requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          accountId: 'local-dev',
          stage: 'dev'
        }
      };

      // Create Lambda-style context object
      const context = {
        requestId: event.requestContext.requestId,
        functionName: 'express-auth-middleware',
        functionVersion: '1.0.0'
      };

      // Apply the unified auth middleware
      const endpoint = `${req.method}:${req.path}`;
      const endpointConfig: AuthConfig = {
        requireAuth: true,
        requiredPermissions: securityConfig.requiredPermissions?.[endpoint] || [],
        allowAnonymous: false
      };

      // Call the local auth middleware and handle the AuthResult response
      const authResult = await localAuthMiddleware(event, endpointConfig);

      // Success case - userContext is present
      if (authResult.userContext) {
        console.log(`✅ Authentication successful for user: ${authResult.userContext.userId}`);
        (req as any).user = authResult.userContext;
        (req as any).authContext = authResult.userContext;
        return next();
      }
      
      // Error case - authResult.error contains API Gateway response
      if (authResult.error) {
        console.log(`❌ Authentication failed: ${authResult.error.statusCode} - ${JSON.parse(authResult.error.body).message}`);
        res.status(authResult.error.statusCode);
        
        // Add security headers from the middleware
        if (authResult.error.headers) {
          Object.entries(authResult.error.headers).forEach(([key, value]) => {
            res.set(key, value as string);
          });
        }
        
        const errorBody = JSON.parse(authResult.error.body);
        return res.json(errorBody);
      }
      
      // Fallback case - neither userContext nor error (shouldn't happen)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication middleware returned unexpected response',
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication service error',
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Security headers
    res.set({
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' http://localhost:* ws://localhost:*",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Permitted-Cross-Domain-Policies': 'none'
    });

    next();
  };
}

/**
 * Rate limiting middleware (simple implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

export function rateLimit() {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    let clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    }
    
    clientData.count++;
    requestCounts.set(clientId, clientData);
    
    // Clean up old entries
    if (Math.random() < 0.01) { // 1% chance to clean up
      for (const [key, data] of requestCounts.entries()) {
        if (now > data.resetTime) {
          requestCounts.delete(key);
        }
      }
    }
    
    if (clientData.count > RATE_LIMIT_MAX) {
      res.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000).toString());
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
    res.set('X-RateLimit-Remaining', (RATE_LIMIT_MAX - clientData.count).toString());
    res.set('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000).toString());
    
    next();
  };
}

/**
 * Request logging middleware with security context
 */
export function securityLogging() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const user = (req as any).user;
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    (req as any).requestId = requestId;
    
    // Log the request with security context
    console.log(`[${new Date().toISOString()}] ${requestId} ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: user?.sub || 'unauthenticated',
      role: user?.['custom:role'] || 'none',
      tenant: user?.['custom:tenant_id'] || 'none'
    });
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${requestId} ${res.statusCode} ${duration}ms`);
    });
    
    next();
  };
}

/**
 * Input sanitization middleware (temporarily disabled)
 */
export function sanitizeInput() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Temporarily disabled for debugging
    next();
  };
}
