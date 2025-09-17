#!/usr/bin/env node

import path from 'path';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting AI Nexus Workbench API Server...');
console.log('============================================');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.API_PORT || 3001);
console.log('');

const projectRoot = path.resolve(__dirname, '..');
const serverPath = path.join(projectRoot, 'src', 'api', 'server.ts');

// Check if server file exists
if (!fs.existsSync(serverPath)) {
  console.error('❌ Server file not found:', serverPath);
  process.exit(1);
}

try {
  // Try using tsx first (faster), fallback to ts-node
  const tsxPath = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
  const tsNodePath = path.join(projectRoot, 'node_modules', '.bin', 'ts-node');
  
  let runner = 'tsx';
  let runnerPath = tsxPath;
  
  if (!fs.existsSync(tsxPath)) {
    runner = 'ts-node';
    runnerPath = tsNodePath;
    
    if (!fs.existsSync(tsNodePath)) {
      console.error('❌ Neither tsx nor ts-node found. Installing tsx...');
      try {
        execSync('npm install --save-dev tsx', { cwd: projectRoot, stdio: 'inherit' });
        runner = 'tsx';
        runnerPath = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
      } catch (installError) {
        console.error('❌ Failed to install tsx:', installError.message);
        process.exit(1);
      }
    }
  }
  
  console.log(`📦 Using ${runner} to run TypeScript server...`);
  
  const serverProcess = spawn('node', [runnerPath, serverPath], {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
      API_PORT: process.env.API_PORT || '3001'
    }
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start API server:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Make sure TypeScript dependencies are installed');
    console.log('  2. Verify DynamoDB Local is running');
    console.log('  3. Check that port 3001 is available');
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error('❌ API server exited with code:', code);
      process.exit(code);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down API server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to start API server:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('  1. Make sure TypeScript dependencies are installed');
  console.log('  2. Verify DynamoDB Local is running');
  console.log('  3. Check that port 3001 is available');
  process.exit(1);
}