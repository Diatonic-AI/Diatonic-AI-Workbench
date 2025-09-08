#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const routerPath = path.join(__dirname, '..', 'lambda', 'api', 'router.ts');

console.log('🔧 Fixing regex patterns in router.ts...');

let content = fs.readFileSync(routerPath, 'utf8');

// Simple string replacements for the problematic patterns
content = content.replace(/\[\^\\\\\\/\]\+/g, '[^/]+');
content = content.replace(/\[\^\\\\\\/\]/g, '[^/]');

fs.writeFileSync(routerPath, content);

console.log('✅ Fixed router.ts regex patterns');

// Fix tenant.ts as well
const tenantPath = path.join(__dirname, '..', 'lambda', 'api', 'middleware', 'tenant.ts');
if (fs.existsSync(tenantPath)) {
  let tenantContent = fs.readFileSync(tenantPath, 'utf8');
  tenantContent = tenantContent.replace(/\\\\\//g, '/');
  fs.writeFileSync(tenantPath, tenantContent);
  console.log('✅ Fixed tenant.ts regex patterns');
}

console.log('🎉 Regex fixes completed!');
