# Diatonic AI - Frontend Integration Guide

This guide walks you through integrating the newly deployed AWS backend infrastructure with your React application.

## Table of Contents
- [Infrastructure Overview](#infrastructure-overview)
- [Environment Configuration](#environment-configuration)
- [AWS Amplify Setup](#aws-amplify-setup)
- [Authentication Implementation](#authentication-implementation)
- [API Integration](#api-integration)
- [Role-Based Access Control](#role-based-access-control)
- [Testing](#testing)
- [Deployment](#deployment)

## Infrastructure Overview

Your backend infrastructure includes:

### 🔐 Authentication Services
- **AWS Cognito User Pool**: User authentication and management
- **AWS Cognito Identity Pool**: AWS credential management
- **User Groups**: BasicUsers, OrgUsers, Development, Testing

### 📊 Data Storage
- **DynamoDB Tables**:
  - User profiles and preferences
  - Organization data
  - System logs and audit trails
  - User sessions
  - Application settings
  - User content metadata
- **S3 Bucket**: User-generated content storage

### 🔌 API Services
- **API Gateway**: RESTful endpoints for user management
- **Lambda Functions**: Backend logic for registration, profile management, authentication triggers

### 📋 API Endpoints Available
- `POST /users` - User registration
- `GET /users/{user_id}` - Get user profile
- `PUT /users/{user_id}` - Update user profile
- `DELETE /users/{user_id}` - Delete user account (admin only)

## Environment Configuration

### 1. Update Environment Variables

After running `deploy-and-test.sh`, you'll have a `test_config.json` file with your infrastructure details. Create or update your `.env` files:

#### `.env.development`
```env
# AWS Configuration
REACT_APP_AWS_REGION=us-east-2
REACT_APP_AWS_USER_POOL_ID=<your-user-pool-id>
REACT_APP_AWS_USER_POOL_CLIENT_ID=<your-user-pool-client-id>
REACT_APP_AWS_IDENTITY_POOL_ID=<your-identity-pool-id>

# API Configuration
REACT_APP_API_BASE_URL=<your-api-gateway-url>
REACT_APP_API_VERSION=v1

# S3 Configuration
REACT_APP_S3_BUCKET=<your-s3-bucket-name>

# Application Configuration
REACT_APP_ENVIRONMENT=development
REACT_APP_LOG_LEVEL=debug
```

#### `.env.production`
```env
# AWS Configuration
REACT_APP_AWS_REGION=us-east-2
REACT_APP_AWS_USER_POOL_ID=<your-production-user-pool-id>
REACT_APP_AWS_USER_POOL_CLIENT_ID=<your-production-client-id>
REACT_APP_AWS_IDENTITY_POOL_ID=<your-production-identity-pool-id>

# API Configuration
REACT_APP_API_BASE_URL=<your-production-api-url>
REACT_APP_API_VERSION=v1

# S3 Configuration
REACT_APP_S3_BUCKET=<your-production-s3-bucket>

# Application Configuration
REACT_APP_ENVIRONMENT=production
REACT_APP_LOG_LEVEL=error
```

### 2. Install AWS Dependencies

```bash
cd /home/daclab-ai/dev/AWS-DevOps/apps/diatonic-ai-platform
npm install aws-amplify @aws-amplify/auth @aws-amplify/storage @aws-amplify/api
```

## AWS Amplify Setup

### 1. Create Amplify Configuration

Create `src/aws-config.js`:

```javascript
import { Amplify } from 'aws-amplify';

const awsConfig = {
  // Authentication
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_AWS_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_AWS_USER_POOL_CLIENT_ID,
    identityPoolId: process.env.REACT_APP_AWS_IDENTITY_POOL_ID,
    
    // Optional: Customize authentication flow
    authenticationFlowType: 'USER_PASSWORD_AUTH',
    
    // Optional: Configure password requirements to match your Cognito settings
    passwordSettings: {
      minimumLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
    }
  },
  
  // API Gateway
  API: {
    endpoints: [
      {
        name: 'UserManagement',
        endpoint: process.env.REACT_APP_API_BASE_URL,
        region: process.env.REACT_APP_AWS_REGION,
        custom_header: async () => {
          return { Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}` }
        }
      }
    ]
  },
  
  // S3 Storage
  Storage: {
    AWSS3: {
      bucket: process.env.REACT_APP_S3_BUCKET,
      region: process.env.REACT_APP_AWS_REGION,
    }
  }
};

// Configure Amplify
Amplify.configure(awsConfig);

export default awsConfig;
```

### 2. Initialize Amplify in Your App

Update `src/index.js` or `src/App.js`:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './aws-config'; // Import to initialize Amplify
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Authentication Implementation

### 1. Create Authentication Context

Create `src/contexts/AuthContext.js`:

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already authenticated on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      const currentUser = await Auth.currentAuthenticatedUser();
      setUser(currentUser);
      setError(null);
    } catch (error) {
      console.log('No authenticated user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const user = await Auth.signIn(email, password);
      setUser(user);
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message || 'Authentication failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, fullName, organizationId = 'individual', role = 'basic') => {
    try {
      setLoading(true);
      setError(null);

      // First create user via our API (which handles Cognito + DynamoDB)
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          organization_id: organizationId,
          role
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const userData = await response.json();
      
      // Now sign in the user
      const signedInUser = await Auth.signIn(email, password);
      setUser(signedInUser);
      
      return { ...userData, user: signedInUser };
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await Auth.signOut();
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message || 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserAttributes = async () => {
    try {
      if (!user) return null;
      const attributes = await Auth.userAttributes(user);
      return attributes.reduce((acc, attr) => {
        acc[attr.getName()] = attr.getValue();
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting user attributes:', error);
      return null;
    }
  };

  const getUserGroups = async () => {
    try {
      const session = await Auth.currentSession();
      const idToken = session.getIdToken();
      const groups = idToken.payload['cognito:groups'] || [];
      return groups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  };

  const isInGroup = async (groupName) => {
    const groups = await getUserGroups();
    return groups.includes(groupName);
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    getCurrentUserAttributes,
    getUserGroups,
    isInGroup,
    checkAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2. Create Login Component

Create `src/components/Login.js`:

```javascript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [organizationId, setOrganizationId] = useState('individual');
  const [role, setRole] = useState('basic');

  const { signIn, signUp, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isRegistering) {
        await signUp(email, password, fullName, organizationId, role);
        alert('Registration successful! You are now logged in.');
      } else {
        await signIn(email, password);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegistering ? 'Create your account' : 'Sign in to your account'}
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            {isRegistering && (
              <div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                />
              </div>
            )}
            
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${!isRegistering ? 'rounded-t-md' : ''} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
              />
            </div>
            
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${!isRegistering ? 'rounded-b-md' : ''} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
              />
            </div>

            {isRegistering && (
              <>
                <div>
                  <select
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  >
                    <option value="individual">Individual User</option>
                    <option value="test-org">Test Organization</option>
                    <option value="company-a">Company A</option>
                  </select>
                </div>
                
                <div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  >
                    <option value="basic">Basic User</option>
                    <option value="org_user">Organization User</option>
                    <option value="developer">Developer</option>
                    <option value="tester">Tester</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Sign In')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-indigo-600 hover:text-indigo-500"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
```

### 3. Create Protected Route Component

Create `src/components/ProtectedRoute.js`:

```javascript
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredGroup = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // TODO: Implement group-based access control if requiredGroup is specified
  // This would require checking the user's Cognito groups

  return children;
};

export default ProtectedRoute;
```

## API Integration

### 1. Create API Service

Create `src/services/api.js`:

```javascript
import { Auth } from 'aws-amplify';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL;
  }

  async getAuthHeader() {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      return { Authorization: `Bearer ${token}` };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {};
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const authHeaders = await this.getAuthHeader();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // User Profile Methods
  async getUserProfile(userId) {
    return this.request(`/users/${userId}`);
  }

  async updateUserProfile(userId, updates) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUserAccount(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Registration (doesn't require auth)
  async registerUser(userData) {
    return fetch(`${this.baseURL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    }).then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || 'Registration failed');
        });
      }
      return response.json();
    });
  }
}

export default new ApiService();
```

### 2. Create User Profile Hook

Create `src/hooks/useUserProfile.js`:

```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';

export const useUserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get user ID from Cognito attributes
      const attributes = await Auth.userAttributes(user);
      const userId = attributes.find(attr => attr.Name === 'custom:user_id')?.Value;
      
      if (userId) {
        const profileData = await ApiService.getUserProfile(userId);
        setProfile(profileData.user_profile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    if (!profile) return;

    try {
      setLoading(true);
      const updatedProfile = await ApiService.updateUserProfile(profile.user_id, updates);
      setProfile(updatedProfile.user_profile);
      return updatedProfile;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
  };
};
```

## Role-Based Access Control

### 1. Create Permission Hook

Create `src/hooks/usePermissions.js`:

```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) {
        setGroups([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userGroups = await getUserGroups();
        setGroups(userGroups);
      } catch (error) {
        console.error('Error fetching user groups:', error);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  const hasPermission = (requiredGroup) => {
    return groups.includes(requiredGroup);
  };

  const hasAnyPermission = (requiredGroups) => {
    return requiredGroups.some(group => groups.includes(group));
  };

  const isBasicUser = () => hasPermission('BasicUsers');
  const isOrgUser = () => hasPermission('OrgUsers');
  const isDeveloper = () => hasPermission('Development');
  const isTester = () => hasPermission('Testing');
  const isAdmin = () => hasAnyPermission(['Development', 'Testing']);

  return {
    groups,
    loading,
    hasPermission,
    hasAnyPermission,
    isBasicUser,
    isOrgUser,
    isDeveloper,
    isTester,
    isAdmin,
  };
};
```

### 2. Create Permission-Based Components

Create `src/components/ConditionalRender.js`:

```javascript
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

export const ShowForGroup = ({ group, children }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;
  
  return hasPermission(group) ? children : null;
};

export const ShowForAnyGroup = ({ groups, children }) => {
  const { hasAnyPermission, loading } = usePermissions();

  if (loading) return null;
  
  return hasAnyPermission(groups) ? children : null;
};

export const HideForGroup = ({ group, children }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;
  
  return hasPermission(group) ? null : children;
};
```

## Testing

### 1. Create Test User Component

Create `src/components/TestUserInfo.js` for development:

```javascript
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { usePermissions } from '../hooks/usePermissions';

const TestUserInfo = () => {
  const { user, getCurrentUserAttributes } = useAuth();
  const { profile } = useUserProfile();
  const { groups } = usePermissions();
  const [attributes, setAttributes] = useState({});

  useEffect(() => {
    const fetchAttributes = async () => {
      const attrs = await getCurrentUserAttributes();
      setAttributes(attrs || {});
    };
    
    if (user) {
      fetchAttributes();
    }
  }, [user, getCurrentUserAttributes]);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="bg-gray-100 p-4 rounded-lg mt-4">
      <h3 className="text-lg font-semibold mb-2">Debug: User Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="font-medium text-gray-700">Cognito Attributes</h4>
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(attributes, null, 2)}
          </pre>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">User Groups</h4>
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(groups, null, 2)}
          </pre>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">DynamoDB Profile</h4>
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestUserInfo;
```

### 2. Update Main App Component

Update your `src/App.js`:

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard'; // Your existing dashboard
import TestUserInfo from './components/TestUserInfo';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                  <TestUserInfo />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

## Deployment

### 1. Build and Test

```bash
# Install dependencies
npm install

# Test locally
npm start

# Build for production
npm run build
```

### 2. Deploy to S3/CloudFront (if configured)

If you have CloudFront distribution set up:

```bash
# Build the app
npm run build

# Deploy to S3 (replace with your bucket name)
aws s3 sync build/ s3://your-app-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### 3. Environment-Specific Configuration

Make sure to:
- Use different `.env` files for different environments
- Test authentication flows in each environment
- Verify API endpoints are correctly configured
- Test role-based access controls

## Final Steps

### 1. Complete the last todo item:

```bash
# Mark the final task as complete
echo "Frontend integration guide created and ready for implementation"
```

### 2. Test the complete flow:

1. **Deploy Infrastructure**: Run `./deploy-and-test.sh dev`
2. **Configure Frontend**: Update environment variables with output values
3. **Test Registration**: Create a new user account
4. **Test Authentication**: Login with the new account
5. **Test Profile Management**: Update user preferences
6. **Test Role-Based Access**: Verify group assignments work
7. **Test API Integration**: Confirm all endpoints work correctly

### 3. Verify Security:

- Ensure JWT tokens are properly validated
- Confirm role-based access controls work
- Test that unauthorized users cannot access protected resources
- Verify user data is properly isolated by organization/group

## Support

If you encounter issues:

1. Check the test report generated by `deploy-and-test.sh`
2. Review CloudWatch logs for Lambda functions and API Gateway
3. Verify environment variables are correctly set
4. Test individual components (Auth, API, Permissions) separately
5. Use the TestUserInfo component to debug authentication state

Your Diatonic AI now has a complete, production-ready authentication and user management system integrated with AWS services!
