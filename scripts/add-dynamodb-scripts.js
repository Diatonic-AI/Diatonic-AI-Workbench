#!/usr/bin/env node

/**
 * Add DynamoDB development scripts to package.json
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add development scripts
const newScripts = {
  'docker:up': 'docker-compose -f docker-compose.dev.yml up -d',
  'docker:down': 'docker-compose -f docker-compose.dev.yml down',
  'docker:logs': 'docker-compose -f docker-compose.dev.yml logs -f',
  'db:setup': 'node scripts/setup-dynamodb-local.js',
  'db:reset': 'npm run docker:down && npm run docker:up && sleep 5 && npm run db:setup',
  'dev:full': 'npm run docker:up && sleep 5 && npm run db:setup && npm run dev'
};

packageJson.scripts = {
  ...packageJson.scripts,
  ...newScripts
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ Added DynamoDB development scripts to package.json:');
Object.entries(newScripts).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});