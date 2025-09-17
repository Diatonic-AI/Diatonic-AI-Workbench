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
    endpoint: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_GATEWAY_URL || 'https://api.dev.diatonic.ai',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  },
  s3: {
    bucket: import.meta.env.VITE_AWS_S3_BUCKET || import.meta.env.VITE_S3_BUCKET_NAME || 'aws-devops-dev-static-assets-development-gwenbxgb',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
  },
  dynamodb: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
    endpoint: import.meta.env.VITE_DYNAMODB_ENDPOINT || 'http://localhost:8002',
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

// Get OAuth domain based on environment
const getOAuthDomain = (environment: string, region: string): string => {
  // Use explicit domain from environment variable if provided
  if (import.meta.env.VITE_AUTH_DOMAIN) {
    return import.meta.env.VITE_AUTH_DOMAIN;
  }
  
  // Environment-specific domain mapping
  switch (environment) {
    case 'production':
      return `ai-nexus-bnhhi105.auth.${region}.amazoncognito.com`;
    case 'staging':
      return `ai-nexus-workbench-staging.auth.${region}.amazoncognito.com`;
    default:
      return `ai-nexus-workbench-dev-auth.auth.${region}.amazoncognito.com`;
  }
};

// Get redirect URLs based on environment and type
const getRedirectUrls = (environment: string, type: 'signin' | 'signout'): string[] => {
  const baseUrls = {
    development: ['http://localhost:8080/', 'https://dev.diatonic.ai/'],
    staging: ['https://staging.diatonic.ai/'],
    production: ['https://app.diatonic.ai/', 'https://diatonic.ai/'] // app.diatonic.ai = toolset/lab, diatonic.ai = frontend
  };
  
  const envUrls = baseUrls[environment as keyof typeof baseUrls] || baseUrls.development;
  
  if (type === 'signin') {
    // Add auth callback paths for sign-in
    return envUrls.map(url => {
      if (url.includes('localhost')) {
        return url; // Keep localhost as-is
      }
      return url.endsWith('/') ? `${url}auth/callback` : `${url}/auth/callback`;
    });
  } else {
    // Use base URLs for sign-out
    return envUrls;
  }
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
            domain: import.meta.env.VITE_AUTH_DOMAIN || getOAuthDomain(getEnvironment(), config.region),
            scopes: ['openid', 'profile', 'email'],
            redirectSignIn: getRedirectUrls(getEnvironment(), 'signin'),
            redirectSignOut: getRedirectUrls(getEnvironment(), 'signout'),
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

// API Gateway Configuration Singleton for Lead Management
export class APIGatewayConfig {
  private static instance: APIGatewayConfig;
  private config: AWSConfig;

  private constructor() {
    this.config = getAWSConfig();
  }

  public static getInstance(): APIGatewayConfig {
    if (!APIGatewayConfig.instance) {
      APIGatewayConfig.instance = new APIGatewayConfig();
    }
    return APIGatewayConfig.instance;
  }

  public getEndpoint(): string {
    return this.config.apiGateway.endpoint;
  }

  public getRegion(): string {
    return this.config.apiGateway.region;
  }

  public getFullEndpoint(path?: string): string {
    const baseEndpoint = this.config.apiGateway.endpoint;
    const environment = getEnvironment();
    
    // Add environment stage if not already present
    let endpoint = baseEndpoint;
    if (!endpoint.includes('/dev') && !endpoint.includes('/staging') && !endpoint.includes('/prod')) {
      const stage = environment === 'production' ? 'prod' : 
                   environment === 'staging' ? 'staging' : 'dev';
      endpoint = `${baseEndpoint}/${stage}`;
    }
    
    return path ? `${endpoint}${path.startsWith('/') ? '' : '/'}${path}` : endpoint;
  }

  public refresh(): void {
    this.config = getAWSConfig();
  }
}

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
