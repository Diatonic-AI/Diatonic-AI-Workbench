/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string
  readonly BASE_URL: string
  readonly PROD: boolean
  readonly DEV: boolean
  readonly SSR: boolean
  
  // AWS Configuration
  readonly VITE_AWS_REGION: string
  readonly VITE_AWS_COGNITO_USER_POOL_ID: string
  readonly VITE_AWS_COGNITO_USER_POOL_CLIENT_ID: string
  readonly VITE_AWS_COGNITO_IDENTITY_POOL_ID: string
  readonly VITE_AWS_API_GATEWAY_ENDPOINT: string
  readonly VITE_AWS_S3_BUCKET: string
  readonly VITE_AWS_DYNAMODB_ENDPOINT?: string
  
  // Application Configuration
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_ENVIRONMENT: string
  readonly VITE_ENABLE_DEBUG_LOGS: string
  readonly VITE_ENABLE_ANALYTICS: string
  
  // API Configuration
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  
  // Feature Flags
  readonly VITE_FEATURE_NEW_DASHBOARD?: string
  readonly VITE_FEATURE_BETA_FEATURES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}