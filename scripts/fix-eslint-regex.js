#!/usr/bin/env node

/**
 * Script to fix unnecessary regex escape characters in router.ts
 */

const fs = require('fs');
const path = require('path');

// Path to the router file
const routerPath = path.join(__dirname, '..', 'lambda', 'api', 'router.ts');

// Read the file
let content = fs.readFileSync(routerPath, 'utf8');

// Replace all instances of [^\\/]+ with [^/]+
// This fixes the unnecessary escape characters in character classes
content = content.replace(/\[\^\\\\\//g, '[^/');

// Replace unnecessary escapes in the webhook pattern
content = content.replace(/\\\\\\\\\//g, '\\/');

console.log('Fixed regex escape characters in router.ts');

// Write the file back
fs.writeFileSync(routerPath, content);

console.log('Router.ts regex escape issues fixed!');
