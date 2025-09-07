import { Amplify } from 'aws-amplify';

// Environment-specific AWS configuration
interface AWSConfig {
  region: string;
  cognito: {
    userPoolId: string;
    userPoolWebClientId: string;
    identityPoolId: string;
  };
  apiGateway: {
    endpoint: string;
    region: string;
  };
  s3: {
    bucket: string;
    region: string;
  };
  dynamodb: {
    region: string;
  };
}

// Development configuration
const developmentConfig: AWSConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  cognito: {
    userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '',
    userPoolWebClientId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_CLIENT_ID || '',
    identityPoolId: import.meta.env.VITE_AWS_COGNITO_IDENTITY_POOL_ID || '',
  },
  apiGateway: {
    endpoint: import.meta.env.VITE_API_GATEWAY_URL || 'https://dev-api.diatonic.ai',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  },
  s3: {
    bucket: import.meta.env.VITE_S3_BUCKET_NAME || 'ai-nexus-workbench-dev',
    region: import.meta.env.VITE_S3_REGION || 'us-east-2',
  },
  dynamodb: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  },
};

// Staging configuration
const stagingConfig: AWSConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  cognito: {
    userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '',
    userPoolWebClientId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_CLIENT_ID || '',
    identityPoolId: import.meta.env.VITE_AWS_COGNITO_IDENTITY_POOL_ID || '',
  },
  apiGateway: {
    endpoint: import.meta.env.VITE_API_GATEWAY_URL || 'https://staging-api.diatonic.ai',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  },
  s3: {
    bucket: import.meta.env.VITE_S3_BUCKET_NAME || 'ai-nexus-workbench-staging',
    region: import.meta.env.VITE_S3_REGION || 'us-east-2',
  },
  dynamodb: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  },
};

// Production configuration
const productionConfig: AWSConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  cognito: {
    userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '',
    userPoolWebClientId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_CLIENT_ID || '',
    identityPoolId: import.meta.env.VITE_AWS_COGNITO_IDENTITY_POOL_ID || '',
  },
  apiGateway: {
    endpoint: import.meta.env.VITE_API_GATEWAY_URL || 'https://api.diatonic.ai',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  },
  s3: {
    bucket: import.meta.env.VITE_S3_BUCKET_NAME || 'ai-nexus-workbench-prod',
    region: import.meta.env.VITE_S3_REGION || 'us-east-2',
  },
  dynamodb: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  },
};

// Get current environment
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = import.meta.env.VITE_NODE_ENV || import.meta.env.NODE_ENV || 'development';
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

// Get configuration based on environment
export const getAWSConfig = (): AWSConfig => {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    default:
      return developmentConfig;
  }
};

// Initialize AWS Amplify with current configuration
export const initializeAWS = (): void => {
  const config = getAWSConfig();
  
  // Configure Amplify
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.cognito.userPoolId,
        userPoolClientId: config.cognito.userPoolWebClientId,
        identityPoolId: config.cognito.identityPoolId,
        signUpVerificationMethod: 'code',
        loginWith: {
          oauth: {
            domain: `ai-nexus-workbench-${getEnvironment()}.auth.${config.region}.amazoncognito.com`,
            scopes: ['openid', 'profile', 'email'],
            redirectSignIn: ['http://localhost:8080/', 'https://dev.diatonic.ai/'],
            redirectSignOut: ['http://localhost:8080/', 'https://dev.diatonic.ai/'],
            responseType: 'code'
          },
          username: true,
          email: true,
        }
      }
    },
    API: {
      REST: {
        'ai-nexus-api': {
          endpoint: config.apiGateway.endpoint,
          region: config.apiGateway.region
        }
      }
    },
    Storage: {
      S3: {
        bucket: config.s3.bucket,
        region: config.s3.region
      }
    }
  });

  console.log(`🚀 AWS services initialized for ${getEnvironment()} environment`, {
    region: config.region,
    environment: getEnvironment(),
    apiEndpoint: config.apiGateway.endpoint
  });
};

// Export the current configuration
export const awsConfig = getAWSConfig();
export { getEnvironment };

// AWS service clients configuration
export const awsClientConfig = {
  region: awsConfig.region,
  credentials: undefined, // Will be provided by Cognito after authentication
};

// Validation function to ensure all required config is present
export const validateAWSConfig = (): boolean => {
  const config = getAWSConfig();
  const environment = getEnvironment();
  
  const requiredFields = [
    config.cognito.userPoolId,
    config.cognito.userPoolWebClientId,
    config.cognito.identityPoolId,
    config.apiGateway.endpoint,
    config.s3.bucket
  ];
  
  const missingFields = requiredFields.filter(field => !field);
  
  if (missingFields.length > 0) {
    console.warn(`⚠️ Missing AWS configuration for ${environment}:`, {
      missingCount: missingFields.length,
      environment,
      message: 'Some AWS services may not function properly'
    });
    return false;
  }
  
  console.log(`✅ AWS configuration validated for ${environment}`);
  return true;
};

// Error handling configuration
export const awsErrorConfig = {
  retryDelayOptions: {
    customBackoff: function(retryCount: number) {
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
      return Math.pow(2, retryCount) * 100;
    }
  },
  maxRetries: 3
};
