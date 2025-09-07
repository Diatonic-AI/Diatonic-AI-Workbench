import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser, signOut, fetchAuthSession, AuthUser } from 'aws-amplify/auth';
import { initializeAWS, validateAWSConfig } from '@/lib/aws-config';

// User interface
interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  emailVerified: boolean;
  groups: string[];
}

// Authentication context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (username: string, confirmationCode: string) => Promise<void>;
  forgotPassword: (username: string) => Promise<void>;
  confirmForgotPassword: (username: string, confirmationCode: string, newPassword: string) => Promise<void>;
  resendConfirmationCode: (username: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize AWS services
  useEffect(() => {
    const initAWS = async () => {
      try {
        // Validate configuration first
        const isValid = validateAWSConfig();
        if (!isValid) {
          console.warn('⚠️ AWS configuration is incomplete, some features may not work');
        }

        // Initialize AWS services
        initializeAWS();
        setIsInitialized(true);

        // Check for existing authentication
        await checkAuthState();
      } catch (error) {
        console.error('Failed to initialize AWS services:', error);
        setIsLoading(false);
      }
    };

    initAWS();
  }, []);

  // Check authentication state
  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userInfo = await parseUserFromAuth(currentUser);
        setUser(userInfo);
      }
    } catch (error) {
      console.log('No authenticated user found');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse user information from Cognito user
  const parseUserFromAuth = async (authUser: AuthUser): Promise<User> => {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      
      return {
        id: authUser.userId,
        email: authUser.signInDetails?.loginId || '',
        username: authUser.username,
        name: idToken?.payload?.name as string || authUser.username,
        emailVerified: idToken?.payload?.email_verified as boolean || false,
        groups: (idToken?.payload['cognito:groups'] as string[]) || [],
        avatar: idToken?.payload?.picture as string || undefined,
      };
    } catch (error) {
      console.error('Error parsing user from auth:', error);
      return {
        id: authUser.userId,
        email: '',
        username: authUser.username,
        emailVerified: false,
        groups: [],
      };
    }
  };

  // Sign in function
  const handleSignIn = async (username: string, password: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('AWS services not initialized');
    }

    setIsLoading(true);
    try {
      const { signIn } = await import('aws-amplify/auth');
      const result = await signIn({ username, password });
      
      if (result.isSignedIn) {
        await checkAuthState();
      } else {
        throw new Error('Sign in incomplete');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up function
  const handleSignUp = async (username: string, email: string, password: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('AWS services not initialized');
    }

    try {
      const { signUp } = await import('aws-amplify/auth');
      await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  // Sign out function
  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Confirm sign up function
  const handleConfirmSignUp = async (username: string, confirmationCode: string): Promise<void> => {
    try {
      const { confirmSignUp } = await import('aws-amplify/auth');
      await confirmSignUp({ username, confirmationCode });
    } catch (error) {
      console.error('Confirm sign up error:', error);
      throw error;
    }
  };

  // Forgot password function
  const handleForgotPassword = async (username: string): Promise<void> => {
    try {
      const { resetPassword } = await import('aws-amplify/auth');
      await resetPassword({ username });
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  // Confirm forgot password function
  const handleConfirmForgotPassword = async (
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> => {
    try {
      const { confirmResetPassword } = await import('aws-amplify/auth');
      await confirmResetPassword({ username, confirmationCode, newPassword });
    } catch (error) {
      console.error('Confirm forgot password error:', error);
      throw error;
    }
  };

  // Resend confirmation code function
  const handleResendConfirmationCode = async (username: string): Promise<void> => {
    try {
      const { resendSignUpCode } = await import('aws-amplify/auth');
      await resendSignUpCode({ username });
    } catch (error) {
      console.error('Resend confirmation code error:', error);
      throw error;
    }
  };

  // Refresh session function
  const refreshSession = async (): Promise<void> => {
    try {
      await checkAuthState();
    } catch (error) {
      console.error('Refresh session error:', error);
      throw error;
    }
  };

  // Get access token function
  const getAccessToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || null;
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    confirmSignUp: handleConfirmSignUp,
    forgotPassword: handleForgotPassword,
    confirmForgotPassword: handleConfirmForgotPassword,
    resendConfirmationCode: handleResendConfirmationCode,
    refreshSession,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
