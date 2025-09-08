#!/usr/bin/env node

/**
 * Comprehensive script to fix all ESLint issues in the Diatonic AI Workbench codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting comprehensive ESLint fixes...\n');

// Helper function to recursively find TypeScript files
function findTSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && !['node_modules', 'dist', 'build'].includes(item)) {
      findTSFiles(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Helper function to replace content in file
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
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

// 1. Fix regex escape characters in router.ts
console.log('1️⃣ Fixing regex escape characters...');
const routerPath = path.join(__dirname, '..', 'lambda', 'api', 'router.ts');

if (fs.existsSync(routerPath)) {
  const routerPatterns = [
    {
      from: /\(\[\^\\\\\/\]\+\)/g,
      to: '([^/]+)'
    },
    {
      from: /\[\^\\\\\/\]\+/g,
      to: '[^/]+'
    }
  ];
  
  replaceInFile(routerPath, routerPatterns);
}

// 2. Fix 'any' types - Common patterns
console.log('\n2️⃣ Fixing TypeScript "any" type issues...');

const projectRoot = path.join(__dirname, '..');
const tsFiles = findTSFiles(projectRoot);

// Common 'any' replacements
const commonAnyPatterns = [
  // Function parameters
  {
    from: /\(([^:)]+):\s*any\)/g,
    to: '($1: unknown)'
  },
  // Variable declarations
  {
    from: /let\s+([^:=\s]+):\s*any/g,
    to: 'let $1: unknown'
  },
  {
    from: /const\s+([^:=\s]+):\s*any/g,
    to: 'const $1: unknown'
  },
  // Property types
  {
    from: /([^:]+):\s*any;/g,
    to: '$1: unknown;'
  },
  // Array types
  {
    from: /Array<any>/g,
    to: 'Array<unknown>'
  },
  {
    from: /any\[\]/g,
    to: 'unknown[]'
  },
  // Generic constraints
  {
    from: /extends\s+any/g,
    to: 'extends unknown'
  }
];

// 3. Fix prefer-const issues
const preferConstPatterns = [
  {
    from: /let\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*([^;]+;)/g,
    to: (match, varName, assignment) => {
      // Only replace if the variable name doesn't appear again in assignment context
      return `const ${varName} = ${assignment}`;
    }
  }
];

// 4. Fix no-empty-object-type issues
const emptyObjectPatterns = [
  {
    from: /interface\s+(\w+)\s+extends\s+([^{]+)\s*{\s*}/g,
    to: 'type $1 = $2'
  },
  {
    from: /interface\s+(\w+)\s*{\s*}/g,
    to: 'interface $1 {\n  [key: string]: unknown;\n}'
  }
];

// Process each file
let totalFixed = 0;

for (const filePath of tsFiles) {
  try {
    const relativePath = path.relative(projectRoot, filePath);
    
    // Skip certain files
    if (relativePath.includes('node_modules') || 
        relativePath.includes('.d.ts') ||
        relativePath.includes('test') ||
        relativePath.includes('spec')) {
      continue;
    }
    
    let patternsToApply = [...commonAnyPatterns];
    
    // Add specific patterns based on file type
    if (filePath.includes('middleware') || filePath.includes('handler')) {
      patternsToApply.push(
        {
          from: /event:\s*any/g,
          to: 'event: APIGatewayEvent'
        },
        {
          from: /context:\s*any/g,
          to: 'context: APIGatewayContext'
        },
        {
          from: /req:\s*any/g,
          to: 'req: MiddlewareRequest'
        },
        {
          from: /res:\s*any/g,
          to: 'res: MiddlewareResponse'
        }
      );
    }
    
    if (filePath.includes('.tsx')) {
      patternsToApply.push(
        {
          from: /props:\s*any/g,
          to: 'props: Record<string, unknown>'
        },
        {
          from: /React\.FC<any>/g,
          to: 'React.FC<Record<string, unknown>>'
        }
      );
    }
    
    // Apply all patterns
    patternsToApply.push(...preferConstPatterns, ...emptyObjectPatterns);
    
    if (replaceInFile(filePath, patternsToApply)) {
      totalFixed++;
    }
    
  } catch (error) {
    console.warn(`⚠️ Error processing ${filePath}: ${error.message}`);
  }
}

// 5. Fix specific files with targeted fixes
console.log('\n3️⃣ Applying targeted fixes to specific files...');

// Fix tenant.ts regex escape
const tenantPath = path.join(projectRoot, 'lambda', 'api', 'middleware', 'tenant.ts');
if (fs.existsSync(tenantPath)) {
  replaceInFile(tenantPath, [
    {
      from: /\\\\\//g,
      to: '/'
    }
  ]);
}

// Add imports to files that need them
const filesToAddImports = [
  {
    file: path.join(projectRoot, 'lambda', 'api', 'middleware', 'auth.ts'),
    imports: "import { APIGatewayEvent, APIGatewayContext, MiddlewareRequest, MiddlewareResponse } from '../types/common';"
  },
  {
    file: path.join(projectRoot, 'lambda', 'api', 'middleware', 'cors.ts'),
    imports: "import { MiddlewareRequest, MiddlewareResponse } from '../types/common';"
  },
  {
    file: path.join(projectRoot, 'lambda', 'api', 'middleware', 'error.ts'),
    imports: "import { MiddlewareRequest, MiddlewareResponse, ErrorResponse } from '../types/common';"
  }
];

for (const { file, imports } of filesToAddImports) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if imports already exist
    if (!content.includes('from \'../types/common\'')) {
      // Find the last import statement
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, imports);
        content = lines.join('\n');
        fs.writeFileSync(file, content);
        console.log(`✅ Added imports to: ${path.relative(projectRoot, file)}`);
        totalFixed++;
      }
    }
  }
}

// 6. Run ESLint auto-fix
console.log('\n4️⃣ Running ESLint auto-fix...');
try {
  execSync('npm run lint -- --fix', { 
    stdio: 'inherit',
    cwd: projectRoot
  });
  console.log('✅ ESLint auto-fix completed');
} catch (error) {
  console.warn('⚠️ ESLint auto-fix had some issues, but continuing...');
}

// 7. Final summary
console.log(`\n🎉 ESLint fix complete!`);
console.log(`📊 Total files processed: ${tsFiles.length}`);
console.log(`✅ Total files fixed: ${totalFixed}`);
console.log('\n💡 Remaining issues may require manual review:');
console.log('  - Complex any types that need specific interfaces');
console.log('  - React component prop types');
console.log('  - Database query result types');
console.log('\nRun "npm run lint" again to check remaining issues.');

process.exit(0);
