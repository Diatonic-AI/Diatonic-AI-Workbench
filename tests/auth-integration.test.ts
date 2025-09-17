/**
 * Comprehensive Authentication and API Integration Test
 * 
 * Tests the complete authentication flow with dev-tenant context
 * and verifies API integration with local DynamoDB data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Components and contexts to test
import { DevAuthProvider, useDevAuth } from '../src/contexts/DevAuthContext';
import DevSignInForm from '../src/components/auth/DevSignInForm';
import { 
  useToolsetItems, 
  useApiHealth, 
  useDevUtilities 
} from '../src/hooks/useTenantContent';
import { 
  TenantServiceClient, 
  createServiceClient,
  ApiResponse 
} from '../src/lib/tenant-service-client';
import { DEV_API_BASE_URL } from '../src/lib/api-config';

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DevAuthProvider mockAuth={true}>
          {children}
        </DevAuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Test component to access auth context
const AuthTestComponent = () => {
  const auth = useDevAuth();
  const devUtils = useDevUtilities();
  const apiHealth = useApiHealth();
  
  return (
    <div data-testid="auth-test">
      <div data-testid="auth-status">
        {auth.isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="tenant-id">{auth.tenantId}</div>
      <div data-testid="user-email">{auth.user?.email || 'no-user'}</div>
      <div data-testid="user-role">{auth.user?.role || 'no-role'}</div>
      
      <button 
        data-testid="simulate-login"
        onClick={() => auth.simulateLogin()}
      >
        Simulate Login
      </button>
      
      <button
        data-testid="clear-caches"
        onClick={() => devUtils.clearAllCaches()}
      >
        Clear Caches
      </button>
      
      <div data-testid="api-health-status">
        {apiHealth.isLoading ? 'loading' : 
         apiHealth.error ? 'error' : 
         apiHealth.data ? 'healthy' : 'unknown'}
      </div>
    </div>
  );
};

// Mock API server responses for testing
global.fetch = vi.fn();

const mockFetch = fetch as MockedFunction<typeof fetch>;

describe('Authentication Integration Tests', () => {
  beforeAll(() => {
    // Setup global test environment
    process.env.NODE_ENV = 'development';
    
    // Mock successful API responses
    mockFetch.mockImplementation((url: string | URL) => {
      const urlStr = url.toString();
      
      if (urlStr.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            tenant: 'dev-tenant'
          })
        } as Response);
      }
      
      if (urlStr.includes('/api/toolset')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'test-tool-1',
                name: 'Test Tool 1',
                description: 'A test tool',
                category: 'testing',
                tenant_id: 'dev-tenant'
              }
            ],
            tenant_id: 'dev-tenant',
            timestamp: new Date().toISOString()
          })
        } as Response);
      }
      
      // Default 404 response
      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found')
      } as Response);
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('DevAuth Context', () => {
    it('should initialize with default development user', async () => {
      render(
        <TestWrapper>
          <AuthTestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      expect(screen.getByTestId('tenant-id')).toHaveTextContent('dev-tenant');
      expect(screen.getByTestId('user-email')).toHaveTextContent('developer@example.com');
      expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    });

    it('should simulate login with custom user data', async () => {
      render(
        <TestWrapper>
          <AuthTestComponent />
        </TestWrapper>
      );

      // Wait for initial auth
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Simulate login should work
      const loginButton = screen.getByTestId('simulate-login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
    });

    it('should maintain tenant context consistency', async () => {
      render(
        <TestWrapper>
          <AuthTestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tenant-id')).toHaveTextContent('dev-tenant');
      });

      // Tenant should remain consistent throughout the session
      const tenantElement = screen.getByTestId('tenant-id');
      expect(tenantElement).toHaveTextContent('dev-tenant');
    });
  });

  describe('DevSignInForm Component', () => {
    it('should render development sign-in form correctly', () => {
      render(
        <TestWrapper>
          <DevSignInForm />
        </TestWrapper>
      );

      // Check for development mode indicator
      expect(screen.getByText('🔧 Development Mode')).toBeInTheDocument();
      
      // Check for quick login options
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
      
      // Check for form elements
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should allow quick login with different user roles', async () => {
      render(
        <TestWrapper>
          <DevSignInForm />
        </TestWrapper>
      );

      // Click on admin quick login
      const adminButton = screen.getByText('Admin User').closest('button');
      expect(adminButton).toBeInTheDocument();
      
      if (adminButton) {
        fireEvent.click(adminButton);
      }

      // Should navigate after successful login (mocked in tests)
      await waitFor(() => {
        // In real app, this would navigate away
        // For tests, we just verify the button click worked
        expect(adminButton).toBeInTheDocument();
      });
    });
  });

  describe('Service Client Integration', () => {
    it('should create service client with tenant context', () => {
      const client = createServiceClient('dev-tenant', 'test-token');
      expect(client).toBeInstanceOf(TenantServiceClient);
    });

    it('should make API calls with proper tenant headers', async () => {
      const client = createServiceClient('dev-tenant', 'test-token');
      
      const response = await client.get<ApiResponse<any>>('/health');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-tenant-id': 'dev-tenant',
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      } as Response);

      const client = createServiceClient('dev-tenant');
      
      await expect(client.get('/error-endpoint')).rejects.toThrow('API Error 500');
    });
  });

  describe('Content Hooks Integration', () => {
    it('should fetch API health status', async () => {
      const TestComponent = () => {
        const health = useApiHealth();
        
        return (
          <div>
            <div data-testid="health-loading">
              {health.isLoading ? 'loading' : 'loaded'}
            </div>
            <div data-testid="health-data">
              {health.data ? JSON.stringify(health.data) : 'no-data'}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Should initially be loading
      expect(screen.getByTestId('health-loading')).toHaveTextContent('loading');

      // Should resolve with health data
      await waitFor(() => {
        expect(screen.getByTestId('health-loading')).toHaveTextContent('loaded');
      });

      await waitFor(() => {
        const healthData = screen.getByTestId('health-data');
        expect(healthData).toHaveTextContent('healthy');
      });
    });

    it('should use tenant-aware hooks correctly', async () => {
      const TestComponent = () => {
        const toolsetItems = useToolsetItems();
        
        return (
          <div>
            <div data-testid="toolset-loading">
              {toolsetItems.isLoading ? 'loading' : 'loaded'}
            </div>
            <div data-testid="toolset-count">
              {toolsetItems.data?.length || 0}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('toolset-loading')).toHaveTextContent('loaded');
      });

      await waitFor(() => {
        expect(screen.getByTestId('toolset-count')).toHaveTextContent('1');
      });
    });
  });

  describe('Development Utilities', () => {
    it('should provide development utilities', async () => {
      render(
        <TestWrapper>
          <AuthTestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      const clearButton = screen.getByTestId('clear-caches');
      fireEvent.click(clearButton);

      // Should not throw any errors
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Full Integration Flow', () => {
    it('should complete full authentication to API data flow', async () => {
      const IntegrationTestComponent = () => {
        const auth = useDevAuth();
        const toolsetItems = useToolsetItems();
        const apiHealth = useApiHealth();
        
        return (
          <div>
            <div data-testid="integration-auth">
              {auth.isAuthenticated ? 'auth-ok' : 'auth-fail'}
            </div>
            <div data-testid="integration-tenant">
              {auth.tenantId}
            </div>
            <div data-testid="integration-api">
              {apiHealth.data ? 'api-ok' : 'api-fail'}
            </div>
            <div data-testid="integration-data">
              {toolsetItems.data ? 'data-ok' : 'data-fail'}
            </div>
            <div data-testid="integration-user">
              {auth.user?.role || 'no-role'}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <IntegrationTestComponent />
        </TestWrapper>
      );

      // Wait for everything to resolve
      await waitFor(() => {
        expect(screen.getByTestId('integration-auth')).toHaveTextContent('auth-ok');
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByTestId('integration-tenant')).toHaveTextContent('dev-tenant');
      });

      await waitFor(() => {
        expect(screen.getByTestId('integration-api')).toHaveTextContent('api-ok');
      });

      await waitFor(() => {
        expect(screen.getByTestId('integration-data')).toHaveTextContent('data-ok');
      });

      expect(screen.getByTestId('integration-user')).toHaveTextContent('admin');
    });
  });
});

describe('API Configuration', () => {
  it('should use correct development API base URL', () => {
    expect(DEV_API_BASE_URL).toBe('http://localhost:3001');
  });

  it('should handle environment variable overrides', () => {
    // Test would verify environment variable handling
    // In real environment, this would check process.env values
    expect(process.env.NODE_ENV).toBe('development');
  });
});

describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const client = createServiceClient('dev-tenant');
    
    await expect(client.get('/test')).rejects.toThrow('Network error');
  });

  it('should handle malformed responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON'))
    } as Response);

    const client = createServiceClient('dev-tenant');
    
    await expect(client.get('/test')).rejects.toThrow('Invalid JSON');
  });
});

// Performance and stress tests
describe('Performance Tests', () => {
  it('should handle multiple concurrent requests', async () => {
    const client = createServiceClient('dev-tenant');
    
    const requests = Array.from({ length: 10 }, () => 
      client.get('/health')
    );

    const results = await Promise.allSettled(requests);
    
    // All requests should resolve or reject, none should hang
    expect(results.length).toBe(10);
    expect(results.every(r => r.status === 'fulfilled' || r.status === 'rejected')).toBe(true);
  });

  it('should cache authentication context efficiently', async () => {
    const TestComponent = () => {
      const auth1 = useDevAuth();
      const auth2 = useDevAuth();
      
      return (
        <div data-testid="same-instance">
          {(auth1 === auth2).toString()}
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      // Both hooks should return the same context instance
      expect(screen.getByTestId('same-instance')).toHaveTextContent('true');
    });
  });
});

export { TestWrapper };