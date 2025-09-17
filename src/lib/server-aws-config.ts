// Server-compatible AWS configuration (works in Node.js without import.meta.env)

interface DynamoDBConfig {
  region: string;
  endpoint?: string;
}

// Helper to get environment variables in Node.js
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

// Simple configuration for server-side usage
export const serverAWSConfig = {
  region: getEnvVar('VITE_AWS_REGION', 'us-east-2'),
  dynamodb: {
    region: getEnvVar('NODE_ENV', 'development') === 'development' ? 'localhost' : getEnvVar('VITE_AWS_REGION', 'us-east-2'),
    endpoint: getEnvVar('NODE_ENV', 'development') === 'development' ? 'http://localhost:8002' : undefined,
  } as DynamoDBConfig
};

// Environment detection
export const getServerEnvironment = () => {
  return getEnvVar('NODE_ENV', 'development');
};

console.log('🔧 Server AWS Config loaded:', {
  environment: getServerEnvironment(),
  region: serverAWSConfig.region,
  dynamodb: serverAWSConfig.dynamodb
});

export default serverAWSConfig;