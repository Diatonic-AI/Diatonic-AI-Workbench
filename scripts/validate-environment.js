#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates all required environment variables for AWS Amplify deployment
 * 
 * Usage: node scripts/validate-environment.js [--env=development|staging|production]
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Environment configuration
const ENVIRONMENTS = {
  development: {
    envFile: '.env.development',
    required: true
  },
  staging: {
    envFile: '.env.staging', 
    required: false
  },
  production: {
    envFile: '.env.production',
    required: false
  }
};

// Required environment variables by category
const REQUIRED_VARS = {
  // AWS Core Configuration
  aws_core: {
    title: 'AWS Core Configuration',
    variables: [
      {
        name: 'VITE_AWS_REGION',
        description: 'AWS region for all services',
        example: 'us-east-2',
        required: true
      },
      {
        name: 'VITE_APP_NAME',
        description: 'Application name',
        example: 'ai-nexus-workbench',
        required: true
      },
      {
        name: 'VITE_APP_VERSION',
        description: 'Application version',
        example: '1.0.0',
        required: true
      }
    ]
  },

  // AWS Cognito Authentication
  aws_cognito: {
    title: 'AWS Cognito Authentication',
    variables: [
      {
        name: 'VITE_AWS_COGNITO_USER_POOL_ID',
        description: 'Cognito User Pool ID',
        example: 'us-east-2_xxxxxxxxx',
        required: true,
        validate: (value) => value.match(/^[a-z0-9-]+_[a-zA-Z0-9]+$/)
      },
      {
        name: 'VITE_AWS_COGNITO_USER_POOL_CLIENT_ID',
        description: 'Cognito User Pool Client ID',
        example: '1234567890abcdefghijklmnop',
        required: true,
        validate: (value) => value.length >= 20
      },
      {
        name: 'VITE_AWS_COGNITO_IDENTITY_POOL_ID',
        description: 'Cognito Identity Pool ID',
        example: 'us-east-2:12345678-1234-1234-1234-123456789012',
        required: true,
        validate: (value) => value.match(/^[a-z0-9-]+:[a-f0-9-]{36}$/)
      }
    ]
  },

  // AWS Services
  aws_services: {
    title: 'AWS Services Configuration',
    variables: [
      {
        name: 'VITE_AWS_API_GATEWAY_ENDPOINT',
        description: 'API Gateway endpoint URL',
        example: 'https://api.diatonic.ai',
        required: false,
        validate: (value) => !value || value.startsWith('https://')
      },
      {
        name: 'VITE_API_GATEWAY_URL',
        description: 'API Gateway URL',
        example: 'https://xxxxxxxxxx.execute-api.us-east-2.amazonaws.com',
        required: false
      },
      {
        name: 'VITE_API_GATEWAY_STAGE',
        description: 'API Gateway stage',
        example: 'dev',
        required: false
      },
      {
        name: 'VITE_AWS_S3_BUCKET',
        description: 'S3 bucket for file storage',
        example: 'ai-nexus-workbench-storage',
        required: false
      },
      {
        name: 'VITE_S3_BUCKET_NAME',
        description: 'S3 bucket name (alternative)',
        example: 'aws-devops-dev-static-assets',
        required: false
      },
      {
        name: 'VITE_S3_REGION',
        description: 'S3 bucket region',
        example: 'us-east-2',
        required: false
      },
      {
        name: 'VITE_AWS_DYNAMODB_TABLE_PREFIX',
        description: 'DynamoDB table prefix',
        example: 'ainexus-dev-',
        required: false
      }
    ]
  },

  // Domain and URL Configuration
  domain_config: {
    title: 'Domain and URL Configuration',
    variables: [
      {
        name: 'VITE_APP_DOMAIN',
        description: 'Application domain',
        example: 'diatonic.ai',
        required: false
      },
      {
        name: 'VITE_APP_BASE_URL',
        description: 'Application base URL',
        example: 'https://www.diatonic.ai',
        required: false
      },
      {
        name: 'VITE_API_BASE_URL',
        description: 'API base URL',
        example: 'https://api.diatonic.ai',
        required: false
      },
      {
        name: 'VITE_AUTH_DOMAIN',
        description: 'Authentication domain',
        example: 'auth.diatonic.ai',
        required: false
      },
      {
        name: 'VITE_CDN_DOMAIN',
        description: 'CDN domain',
        example: 'cdn.diatonic.ai',
        required: false
      },
      {
        name: 'VITE_CLOUDFRONT_DOMAIN',
        description: 'CloudFront distribution domain',
        example: 'dxz4p4iipx5lm.cloudfront.net',
        required: false
      }
    ]
  },

  // DynamoDB Configuration
  dynamodb_config: {
    title: 'DynamoDB Configuration',
    variables: [
      {
        name: 'VITE_DYNAMODB_USER_DATA_TABLE',
        description: 'DynamoDB user data table',
        example: 'ainexus-dev-UserData',
        required: false
      },
      {
        name: 'VITE_DYNAMODB_FILES_TABLE',
        description: 'DynamoDB files table',
        example: 'ainexus-dev-Files',
        required: false
      },
      {
        name: 'VITE_DYNAMODB_SESSIONS_TABLE',
        description: 'DynamoDB sessions table',
        example: 'ainexus-dev-Sessions',
        required: false
      }
    ]
  },

  // Application Configuration
  app_config: {
    title: 'Application Configuration',
    variables: [
      {
        name: 'VITE_ENABLE_DEBUG_LOGS',
        description: 'Enable debug logging',
        example: 'false',
        required: false,
        validate: (value) => ['true', 'false'].includes(value.toLowerCase())
      },
      {
        name: 'VITE_ENABLE_ANALYTICS',
        description: 'Enable analytics tracking',
        example: 'true',
        required: false,
        validate: (value) => ['true', 'false'].includes(value.toLowerCase())
      },
      {
        name: 'VITE_DEFAULT_THEME',
        description: 'Default UI theme',
        example: 'dark',
        required: false,
        validate: (value) => !value || ['light', 'dark', 'system'].includes(value)
      },
      {
        name: 'VITE_APP_ENV',
        description: 'Application environment',
        example: 'development',
        required: false
      },
      {
        name: 'VITE_NODE_ENV',
        description: 'Node environment',
        example: 'development',
        required: false
      }
    ]
  },

  // Feature Flags
  feature_flags: {
    title: 'Feature Flags',
    variables: [
      {
        name: 'VITE_ENABLE_FILE_UPLOAD',
        description: 'Enable file upload feature',
        example: 'true',
        required: false,
        validate: (value) => !value || ['true', 'false'].includes(value.toLowerCase())
      },
      {
        name: 'VITE_ENABLE_DEBUG_LOGGING',
        description: 'Enable debug logging (alternative)',
        example: 'false',
        required: false,
        validate: (value) => !value || ['true', 'false'].includes(value.toLowerCase())
      },
      {
        name: 'VITE_ENABLE_PERFORMANCE_MONITORING',
        description: 'Enable performance monitoring',
        example: 'true',
        required: false,
        validate: (value) => !value || ['true', 'false'].includes(value.toLowerCase())
      }
    ]
  },

  // Security Configuration
  security_config: {
    title: 'Security Configuration',
    variables: [
      {
        name: 'VITE_ENABLE_CSP',
        description: 'Enable Content Security Policy',
        example: 'true',
        required: false,
        validate: (value) => !value || ['true', 'false'].includes(value.toLowerCase())
      },
      {
        name: 'VITE_ENABLE_HSTS',
        description: 'Enable HTTP Strict Transport Security',
        example: 'true',
        required: false,
        validate: (value) => !value || ['true', 'false'].includes(value.toLowerCase())
      },
      {
        name: 'VITE_ENABLE_SECURE_HEADERS',
        description: 'Enable secure headers',
        example: 'true',
        required: false,
        validate: (value) => !value || ['true', 'false'].includes(value.toLowerCase())
      },
      {
        name: 'VITE_AWS_COGNITO_USER_POOL_DOMAIN',
        description: 'Cognito User Pool Domain',
        example: 'ainexus.auth.us-east-2.amazoncognito.com',
        required: false
      }
    ]
  }
};

// Security validation patterns
const SECURITY_PATTERNS = {
  // Patterns that should NOT appear in environment variables
  forbidden: [
    /password/i,
    /secret/i,
    /private[_-]?key/i,
    /api[_-]?key/i,
    /token/i
  ],
  // Patterns that might indicate hardcoded values that should be environment-specific
  suspicious: [
    /localhost/i,
    /127\.0\.0\.1/,
    /test/i,
    /dev/i,
    /debug/i
  ]
};

/**
 * Load environment variables from file
 */
function loadEnvFile(envFile) {
  const envPath = path.resolve(envFile);
  
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key.trim()] = value;
      }
    }
  });

  return envVars;
}

/**
 * Validate individual environment variable
 */
function validateVariable(varConfig, value, environment) {
  const results = {
    name: varConfig.name,
    status: 'unknown',
    value: value || 'NOT_SET',
    masked: false,
    issues: []
  };

  // Check if required variable is set
  if (varConfig.required && (!value || value.trim() === '')) {
    results.status = 'error';
    results.issues.push('Required variable is not set');
    return results;
  }

  if (!value || value.trim() === '') {
    results.status = 'info';
    results.issues.push('Optional variable is not set');
    return results;
  }

  // Mask sensitive values
  if (varConfig.name.includes('CLIENT_ID') || 
      varConfig.name.includes('POOL_ID') || 
      varConfig.name.includes('IDENTITY_POOL')) {
    results.value = value.slice(0, 8) + '...' + value.slice(-4);
    results.masked = true;
  }

  // Run custom validation if provided
  if (varConfig.validate && !varConfig.validate(value)) {
    results.status = 'error';
    results.issues.push('Value does not match expected format');
    return results;
  }

  // Security checks
  SECURITY_PATTERNS.forbidden.forEach(pattern => {
    if (pattern.test(value)) {
      results.status = 'warning';
      results.issues.push('Contains potentially sensitive information');
    }
  });

  // Environment-specific checks
  if (environment === 'production') {
    SECURITY_PATTERNS.suspicious.forEach(pattern => {
      if (pattern.test(value)) {
        results.status = 'warning';
        results.issues.push('Contains development/test values in production');
      }
    });
  }

  if (results.status === 'unknown') {
    results.status = 'success';
  }

  return results;
}

/**
 * Print validation results
 */
function printResults(categoryResults, environment) {
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalSuccess = 0;

  console.log(`${colors.bold}${colors.cyan}Environment Variable Validation Report${colors.reset}`);
  console.log(`${colors.blue}Environment: ${environment}${colors.reset}`);
  console.log(`${colors.blue}Date: ${new Date().toISOString()}${colors.reset}`);
  console.log('='.repeat(80));

  Object.entries(categoryResults).forEach(([categoryKey, category]) => {
    console.log(`\n${colors.bold}${colors.magenta}${category.title}${colors.reset}`);
    console.log('-'.repeat(category.title.length));

    category.results.forEach(result => {
      let statusIcon, statusColor;
      
      switch (result.status) {
        case 'success':
          statusIcon = '✅';
          statusColor = colors.green;
          totalSuccess++;
          break;
        case 'error':
          statusIcon = '❌';
          statusColor = colors.red;
          totalErrors++;
          break;
        case 'warning':
          statusIcon = '⚠️';
          statusColor = colors.yellow;
          totalWarnings++;
          break;
        default:
          statusIcon = 'ℹ️';
          statusColor = colors.blue;
          break;
      }

      console.log(`${statusIcon} ${colors.bold}${result.name}${colors.reset}`);
      console.log(`   ${statusColor}Value: ${result.value}${colors.reset}`);
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          console.log(`   ${statusColor}Issue: ${issue}${colors.reset}`);
        });
      }
      console.log();
    });
  });

  // Summary
  console.log('='.repeat(80));
  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`${colors.green}✅ Success: ${totalSuccess}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${totalWarnings}${colors.reset}`);
  console.log(`${colors.red}❌ Errors: ${totalErrors}${colors.reset}`);

  return { errors: totalErrors, warnings: totalWarnings, success: totalSuccess };
}

/**
 * Generate environment file template
 */
function generateTemplate(environment) {
  const templatePath = `.env.${environment}.template`;
  
  console.log(`\n${colors.blue}Generating template: ${templatePath}${colors.reset}`);
  
  const lines = [
    `# Environment Configuration for ${environment.toUpperCase()}`,
    `# Generated on ${new Date().toISOString()}`,
    `# Copy to .env.${environment} and fill in values`,
    '',
  ];

  Object.entries(REQUIRED_VARS).forEach(([categoryKey, category]) => {
    lines.push(`# ${category.title}`);
    category.variables.forEach(variable => {
      const required = variable.required ? ' (Required)' : ' (Optional)';
      lines.push(`# ${variable.description}${required}`);
      lines.push(`# Example: ${variable.example || 'your-value-here'}`);
      lines.push(`${variable.name}=`);
      lines.push('');
    });
    lines.push('');
  });

  fs.writeFileSync(templatePath, lines.join('\n'));
  console.log(`${colors.green}Template created: ${templatePath}${colors.reset}`);
}

/**
 * Main validation function
 */
function validateEnvironment(environment) {
  console.log(`${colors.bold}Validating ${environment} environment...${colors.reset}\n`);

  const envConfig = ENVIRONMENTS[environment];
  if (!envConfig) {
    console.error(`${colors.red}Unknown environment: ${environment}${colors.reset}`);
    process.exit(1);
  }

  // Load environment variables
  const envVars = loadEnvFile(envConfig.envFile);
  
  if (!envVars) {
    console.log(`${colors.yellow}Environment file not found: ${envConfig.envFile}${colors.reset}`);
    if (envConfig.required) {
      console.error(`${colors.red}Required environment file is missing!${colors.reset}`);
      generateTemplate(environment);
      process.exit(1);
    }
    return;
  }

  console.log(`${colors.green}Environment file found: ${envConfig.envFile}${colors.reset}`);
  console.log(`${colors.blue}Loaded ${Object.keys(envVars).length} variables${colors.reset}\n`);

  // Validate all categories
  const categoryResults = {};
  
  Object.entries(REQUIRED_VARS).forEach(([categoryKey, category]) => {
    categoryResults[categoryKey] = {
      title: category.title,
      results: category.variables.map(variable => 
        validateVariable(variable, envVars[variable.name], environment)
      )
    };
  });

  // Print results
  const summary = printResults(categoryResults, environment);

  // Check for unused variables (in env file but not in our spec)
  const specifiedVars = Object.values(REQUIRED_VARS)
    .flatMap(category => category.variables.map(v => v.name));
  
  const unusedVars = Object.keys(envVars)
    .filter(key => !specifiedVars.includes(key));

  if (unusedVars.length > 0) {
    console.log(`\n${colors.bold}${colors.yellow}Unrecognized Variables:${colors.reset}`);
    unusedVars.forEach(varName => {
      console.log(`ℹ️  ${varName} (not in validation spec)`);
    });
  }

  // Final status
  if (summary.errors > 0) {
    console.log(`\n${colors.red}${colors.bold}❌ Validation failed with ${summary.errors} errors${colors.reset}`);
    process.exit(1);
  } else if (summary.warnings > 0) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Validation completed with ${summary.warnings} warnings${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.green}${colors.bold}✅ All validations passed!${colors.reset}`);
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let environment = 'development';

args.forEach(arg => {
  if (arg.startsWith('--env=')) {
    environment = arg.split('=')[1];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
${colors.bold}Environment Variable Validation Script${colors.reset}

${colors.blue}Usage:${colors.reset}
  node scripts/validate-environment.js [--env=ENVIRONMENT]

${colors.blue}Options:${colors.reset}
  --env=development    Validate development environment (default)
  --env=staging        Validate staging environment  
  --env=production     Validate production environment
  --help, -h           Show this help message

${colors.blue}Examples:${colors.reset}
  node scripts/validate-environment.js
  node scripts/validate-environment.js --env=production
  
${colors.blue}Environment Files:${colors.reset}
  development: .env.development
  staging:     .env.staging
  production:  .env.production
`);
    process.exit(0);
  }
});

// Run validation
validateEnvironment(environment);
