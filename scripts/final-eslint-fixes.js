#!/usr/bin/env node

/**
 * Final pass script to fix remaining ESLint issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying final ESLint fixes...\n');

const projectRoot = path.join(__dirname, '..');

// Function to replace content in file
function replaceInFile(filePath, patterns) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const pattern of patterns) {
    const newContent = content.replace(pattern.from, pattern.to);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${path.relative(projectRoot, filePath)}`);
    return true;
  }
  
  return false;
}

// 1. Fix all regex escape characters in router.ts
const routerPath = path.join(projectRoot, 'lambda', 'api', 'router.ts');
console.log('1️⃣ Fixing remaining regex escape characters in router.ts...');

if (fs.existsSync(routerPath)) {
  // Use simple string replace for regex patterns
  let routerContent = fs.readFileSync(routerPath, 'utf8');
  let routerChanged = false;
  
  // Fix all [^\/]+ patterns
  const originalContent = routerContent;
  routerContent = routerContent.replace(/\[\^\\\\?\/\]/g, '[^/]');
  routerContent = routerContent.replace(/\[\^\\\/\]/g, '[^/]');
  
  if (routerContent !== originalContent) {
    fs.writeFileSync(routerPath, routerContent);
    console.log(`✅ Fixed: ${path.relative(projectRoot, routerPath)}`);
    routerChanged = true;
  }
}

// 2. Fix tenant.ts regex escape
const tenantPath = path.join(projectRoot, 'lambda', 'api', 'middleware', 'tenant.ts');
console.log('2️⃣ Fixing tenant.ts regex escape...');

if (fs.existsSync(tenantPath)) {
  replaceInFile(tenantPath, [
    {
      from: /\\\\\//g,
      to: '/'
    }
  ]);
}

// 3. Fix parsing errors in specific files
console.log('3️⃣ Fixing parsing errors...');

// Fix infra/lib/observatory-core-stack.ts
const infraStackPath = path.join(projectRoot, 'infra', 'lib', 'observatory-core-stack.ts');
if (fs.existsSync(infraStackPath)) {
  let content = fs.readFileSync(infraStackPath, 'utf8');
  const lines = content.split('\n');
  
  // Look for malformed lines around line 64
  for (let i = 60; i < Math.min(lines.length, 70); i++) {
    if (lines[i].includes('unknown:')) {
      lines[i] = lines[i].replace('unknown:', 'unknown;');
    }
  }
  
  content = lines.join('\n');
  fs.writeFileSync(infraStackPath, content);
  console.log('✅ Fixed: infra/lib/observatory-core-stack.ts');
}

// Fix lambda/api/handlers/analytics.ts
const analyticsPath = path.join(projectRoot, 'lambda', 'api', 'handlers', 'analytics.ts');
if (fs.existsSync(analyticsPath)) {
  let content = fs.readFileSync(analyticsPath, 'utf8');
  // Look for incomplete statements around line 293
  content = content.replace(/unknown:\s*$/gm, 'unknown;');
  content = content.replace(/unknown:\s*\n/g, 'unknown;\n');
  fs.writeFileSync(analyticsPath, content);
  console.log('✅ Fixed: lambda/api/handlers/analytics.ts');
}

// Fix lambda/api/middleware/auth.ts
const authPath = path.join(projectRoot, 'lambda', 'api', 'middleware', 'auth.ts');
if (fs.existsSync(authPath)) {
  let content = fs.readFileSync(authPath, 'utf8');
  // Look for malformed try blocks around line 298
  content = content.replace(/}\s*\n\s*catch/g, '  } catch');
  content = content.replace(/unknown:\s*$/gm, 'unknown;');
  fs.writeFileSync(authPath, content);
  console.log('✅ Fixed: lambda/api/middleware/auth.ts');
}

// Fix lambda/community-api/handler.ts
const communityPath = path.join(projectRoot, 'lambda', 'community-api', 'handler.ts');
if (fs.existsSync(communityPath)) {
  let content = fs.readFileSync(communityPath, 'utf8');
  // Look for incomplete try-catch blocks around line 335
  content = content.replace(/}\s*\n\s*$/gm, '}');
  content = content.replace(/unknown:\s*$/gm, 'unknown;');
  fs.writeFileSync(communityPath, content);
  console.log('✅ Fixed: lambda/community-api/handler.ts');
}

// Fix UI component parsing errors
const badgePath = path.join(projectRoot, 'src', 'components', 'ui', 'badge.tsx');
if (fs.existsSync(badgePath)) {
  let content = fs.readFileSync(badgePath, 'utf8');
  // Fix incomplete interface or type definitions
  content = content.replace(/unknown\s*$/gm, 'unknown;');
  content = content.replace(/:\s*unknown\s*\n/g, ': unknown;\n');
  fs.writeFileSync(badgePath, content);
  console.log('✅ Fixed: src/components/ui/badge.tsx');
}

// Fix remaining critical any types with specific interfaces
const criticalAnyFixes = [
  // Lambda handlers
  {
    file: path.join(projectRoot, 'lambda', 'api', 'handlers', 'agents.ts'),
    patterns: [
      {
        from: /body:\s*any/g,
        to: 'body: RequestBody'
      },
      {
        from: /params:\s*any/g,
        to: 'params: Record<string, string>'
      },
      {
        from: /query:\s*any/g,
        to: 'query: Record<string, unknown>'
      },
      {
        from: /agent:\s*any/g,
        to: 'agent: AgentConfiguration'
      }
    ]
  },
  {
    file: path.join(projectRoot, 'lambda', 'api', 'handlers', 'billing.ts'),
    patterns: [
      {
        from: /stripeEvent:\s*any/g,
        to: 'stripeEvent: { type: string; data: Record<string, unknown> }'
      }
    ]
  },
  {
    file: path.join(projectRoot, 'lambda', 'api', 'handlers', 'webhooks.ts'),
    patterns: [
      {
        from: /webhook:\s*any/g,
        to: 'webhook: WebhookEvent'
      },
      {
        from: /payload:\s*any/g,
        to: 'payload: Record<string, unknown>'
      }
    ]
  }
];

console.log('4️⃣ Fixing critical any types...');
for (const { file, patterns } of criticalAnyFixes) {
  if (fs.existsSync(file)) {
    replaceInFile(file, patterns);
  }
}

// 5. Fix prefer-const issues in test files
console.log('5️⃣ Fixing prefer-const in test files...');
const testPath = path.join(projectRoot, 'lambda', 'tests', 'e2e', 'experiment-workflow.test.ts');
if (fs.existsSync(testPath)) {
  replaceInFile(testPath, [
    {
      from: /let\s+(experimentId|datasetId)\s*=/g,
      to: 'const $1 ='
    }
  ]);
}

// 6. Fix no-case-declarations in observatory handler
console.log('6️⃣ Fixing case declarations...');
const observatoryPath = path.join(projectRoot, 'lambda', 'observatory-api', 'handler.ts');
if (fs.existsSync(observatoryPath)) {
  let content = fs.readFileSync(observatoryPath, 'utf8');
  // Wrap case declarations in blocks
  content = content.replace(/case\s+([^:]+):\s*\n\s*(const|let|var)\s+/g, 
    'case $1: {\n        $2 ');
  content = content.replace(/break;\s*$/gm, '        break;\n      }');
  fs.writeFileSync(observatoryPath, content);
  console.log('✅ Fixed: lambda/observatory-api/handler.ts');
}

// 7. Fix empty object types
console.log('7️⃣ Fixing empty object types...');
const agentTypesPath = path.join(projectRoot, 'src', 'components', 'agent-builder', 'types.ts');
if (fs.existsSync(agentTypesPath)) {
  replaceInFile(agentTypesPath, [
    {
      from: /interface\s+(\w+)\s+extends\s+([^{]+)\s*{\s*}/g,
      to: 'type $1 = $2'
    }
  ]);
}

console.log('\n🎉 Final ESLint fixes completed!');
console.log('Run "npm run lint" to check remaining issues.');

process.exit(0);
