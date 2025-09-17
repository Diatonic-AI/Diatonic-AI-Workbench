#!/usr/bin/env node
/**
 * API Server Launcher
 * Starts the Express API server for local development
 */

// Set environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.API_PORT = process.env.API_PORT || '3001';

// Import and configure TypeScript on the fly
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false
  }
});

console.log('🚀 Starting AI Nexus Workbench API Server...');
console.log('============================================');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.API_PORT}`);
console.log('');

// Check if DynamoDB is running
const { exec } = require('child_process');

exec('docker ps | grep dynamodb-local', (error, stdout, stderr) => {
  if (stdout.trim()) {
    console.log('✅ DynamoDB Local detected - ready to serve API requests');
  } else {
    console.log('⚠️  Warning: DynamoDB Local not detected');
    console.log('   Start it with: docker run -d -p 8002:8000 --name dynamodb-local amazon/dynamodb-local');
  }
  console.log('');
});

// Start the server
try {
  require('../src/api/server.ts');
} catch (error) {
  console.error('❌ Failed to start API server:', error.message);
  console.error('');
  console.error('🔧 Troubleshooting:');
  console.error('  1. Make sure TypeScript dependencies are installed');
  console.error('  2. Verify DynamoDB Local is running');
  console.error('  3. Check that port 3001 is available');
  process.exit(1);
}