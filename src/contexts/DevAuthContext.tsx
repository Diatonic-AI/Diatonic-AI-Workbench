import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import type { AuthUser } from 'aws-amplify/auth';

// Development user interface
interface DevUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  created_at: string;
  subscription?: {
    id: string;
    plan_id: string;
    status: 'active' | 'inactive' | 'cancelled';
    current_period_start: string;
    current_period_end: string;
    limits: Record<string, any>;
    features: string[];
    usage: {
      agents: number | string;
      api_calls: number | string;
      storage_used: string;
    };
  };
  plan_id?: string;
}

// Auth context interface
interface DevAuthContextType {
  // User state
  user: DevUser | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Tenant context
  tenantId: string;
  tenantInfo: {
    name: string;
    environment: 'development' | 'staging' | 'production';
    features: string[];
  };
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Development methods
  simulateLogin: (userData?: Partial<DevUser>) => void;
  switchTenant: (tenantId: string) => void;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

// Create context
const DevAuthContext = createContext<DevAuthContextType | null>(null);

// Development tenant configuration
const DEV_TENANT_CONFIG = {
  id: 'dev-tenant',
  name: 'Development Environment',
  environment: 'development' as const,
  features: [
    'visual-agent-builder',
    'lab-experiments', 
    'community-posts',
    'education-courses',
    'dashboard-metrics',
    'admin-tools'
  ]
};

// Default development user
const DEFAULT_DEV_USER: DevUser = {
  id: 'dev-user-001',
  email: 'developer@example.com',
  name: 'Development User',
  tenant_id: 'dev-tenant',
  role: 'admin',
  permissions: [
    'read:all',
    'write:all',
    'admin:all',
    'toolset:manage',
    'experiments:manage',
    'community:manage',
    'education:manage'
  ],
  created_at: new Date().toISOString()
};

// Auth provider component
interface DevAuthProviderProps {
  children: ReactNode;
  mockAuth?: boolean; // For development/testing
}

export function DevAuthProvider({ children, mockAuth = true }: DevAuthProviderProps) {
  const [user, setUser] = useState<DevUser | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState(DEV_TENANT_CONFIG.id);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        if (mockAuth || import.meta.env.MODE === 'development') {
          // Development mode - use mock authentication
          console.log('🔧 Development mode: Using mock authentication');
          
          // Check for persisted user first
          const persistedUser = localStorage.getItem('dev-auth-user');
          if (persistedUser) {
            try {
              const userData = JSON.parse(persistedUser);
              console.log('💾 Loading persisted user on initialization:', {
                email: userData.email,
                role: userData.role,
                tenant: userData.tenant_id
              });
              setUser(userData);
              setIsAuthenticated(true);
              setTenantId(userData.tenant_id || DEV_TENANT_CONFIG.id);
            } catch (error) {
              console.error('Error loading persisted user:', error);
              localStorage.removeItem('dev-auth-user');
              // Fallback to default user
              simulateLogin();
            }
          } else {
            // No persisted user, create default
            simulateLogin();
          }
        } else {
          // Production mode - use real AWS Amplify auth
          console.log('🔒 Production mode: Using AWS Amplify authentication');
          await checkAuthState();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError(error instanceof Error ? error.message : 'Authentication initialization failed');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [mockAuth]);

  // Check AWS Amplify auth state
  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (currentUser && session.tokens) {
        setAuthUser(currentUser);
        
        // Map AWS Cognito user to our dev user format
        const mappedUser: DevUser = {
          id: currentUser.userId,
          email: currentUser.signInDetails?.loginId || 'unknown@example.com',
          name: currentUser.username || 'User',
          tenant_id: DEV_TENANT_CONFIG.id, // Fixed to dev-tenant for development
          role: 'user', // Default role, can be enhanced with Cognito groups
          permissions: ['read:all', 'write:own'],
          created_at: new Date().toISOString()
        };
        
        setUser(mappedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      // User is not signed in
      console.log('User not authenticated:', error);
      setAuthUser(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Simulate login for development
  const simulateLogin = (userData: Partial<DevUser> = {}) => {
    const devUser = { ...DEFAULT_DEV_USER, ...userData };
    
    console.log('👤 Simulating login for development user:', {
      email: devUser.email,
      tenant: devUser.tenant_id,
      role: devUser.role,
      name: devUser.name
    });
    
    setUser(devUser);
    setIsAuthenticated(true);
    setError(null);
    
    // Store in localStorage for persistence during development
    localStorage.setItem('dev-auth-user', JSON.stringify(devUser));
    
    // Also update tenant if it changed
    if (devUser.tenant_id !== tenantId) {
      setTenantId(devUser.tenant_id);
    }
  };

  // Sign in method
  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (mockAuth || import.meta.env.MODE === 'development') {
        // Development mode - simulate sign in
        console.log('🔧 Development sign in simulation for:', email);
        
        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create user based on email
        const userData: Partial<DevUser> = {
          email,
          name: email.split('@')[0].replace(/[.-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          role: email.includes('admin') ? 'admin' : 'user'
        };
        
        simulateLogin(userData);
      } else {
        // Production mode - use real AWS Amplify auth
        const { signIn } = await import('aws-amplify/auth');
        const signInResult = await signIn({ username: email, password });
        
        if (signInResult.isSignedIn) {
          await checkAuthState();
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out method
  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (mockAuth || import.meta.env.MODE === 'development') {
        // Development mode - simulate sign out
        console.log('🔧 Development sign out simulation');
        setUser(null);
        setAuthUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('dev-auth-user');
      } else {
        // Production mode - use real AWS Amplify auth
        await signOut();
        setUser(null);
        setAuthUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error instanceof Error ? error.message : 'Sign out failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch tenant (for future multi-tenancy)
  const switchTenant = (newTenantId: string) => {
    console.log('🏢 Switching tenant:', newTenantId);
    setTenantId(newTenantId);
    
    if (user) {
      const updatedUser = { ...user, tenant_id: newTenantId };
      setUser(updatedUser);
      localStorage.setItem('dev-auth-user', JSON.stringify(updatedUser));
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Note: localStorage loading is now handled in the initialization effect above

  const contextValue: DevAuthContextType = {
    // User state
    user,
    authUser,
    isAuthenticated,
    isLoading,
    
    // Tenant context
    tenantId,
    tenantInfo: DEV_TENANT_CONFIG,
    
    // Auth methods
    signIn: handleSignIn,
    signOut: handleSignOut,
    
    // Development methods
    simulateLogin,
    switchTenant,
    
    // Error handling
    error,
    clearError
  };

  return (
    <DevAuthContext.Provider value={contextValue}>
      {children}
    </DevAuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useDevAuth() {
  const context = useContext(DevAuthContext);
  
  if (!context) {
    throw new Error('useDevAuth must be used within a DevAuthProvider');
  }
  
  return context;
}

// Unified useAuth hook that maps DevAuthContext to AuthContext interface
export function useDevAuthMapped() {
  const context = useContext(DevAuthContext);
  
  if (!context) {
    throw new Error('useDevAuthMapped must be used within a DevAuthProvider');
  }
  
  // Map DevAuthContext to AuthContext interface
  return {
    user: context.user ? {
      id: context.user.id,
      email: context.user.email,
      username: context.user.email.split('@')[0],
      name: context.user.name,
      emailVerified: true,
      groups: context.user.role === 'admin' ? ['InternalDev'] : ['FreeTier'], // Map to Cognito group format
      role: context.user.role === 'admin' ? 'internal_dev' as const : 'free' as const
    } : null,
    isLoading: context.isLoading,
    isAuthenticated: context.isAuthenticated,
    signIn: context.signIn,
    signUp: async (username: string, email: string, password: string) => {
      // For dev mode, just simulate sign up by signing in
      await context.signIn(email, password);
    },
    signOut: context.signOut,
    confirmSignUp: async (username: string, code: string) => {
      // Dev mode simulation - no-op
      console.log('Dev mode: confirmSignUp simulation');
    },
    forgotPassword: async (username: string) => {
      // Dev mode simulation - no-op
      console.log('Dev mode: forgotPassword simulation');
    },
    confirmForgotPassword: async (username: string, code: string, newPassword: string) => {
      // Dev mode simulation - no-op
      console.log('Dev mode: confirmForgotPassword simulation');
    },
    resendConfirmationCode: async (username: string) => {
      // Dev mode simulation - no-op
      console.log('Dev mode: resendConfirmationCode simulation');
    },
    refreshSession: async () => {
      // Dev mode simulation - no-op
      console.log('Dev mode: refreshSession simulation');
    },
    getAccessToken: async () => {
      // Dev mode simulation - return mock token
      return context.isAuthenticated ? 'dev-mock-token' : null;
    }
  };
}

// Auth status component for debugging
export function DevAuthStatus() {
  const { user, isAuthenticated, isLoading, tenantId, error } = useDevAuth();

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-50 bg-gray-900 text-white text-xs p-2 rounded-bl-lg shadow-lg max-w-xs">
      <div className="font-semibold mb-1">🔧 Dev Auth Status</div>
      
      {isLoading ? (
        <div className="text-yellow-300">Loading...</div>
      ) : isAuthenticated && user ? (
        <div className="space-y-1">
          <div className="text-green-300">✅ Authenticated</div>
          <div>👤 {user.name}</div>
          <div>📧 {user.email}</div>
          <div>🏢 Tenant: {tenantId}</div>
          <div>👑 Role: {user.role}</div>
        </div>
      ) : (
        <div className="text-red-300">❌ Not authenticated</div>
      )}
      
      {error && (
        <div className="text-red-300 mt-1">❌ {error}</div>
      )}
    </div>
  );
}