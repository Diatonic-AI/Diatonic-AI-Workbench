#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SimpleUIInventory {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.inventory = {
      timestamp: new Date().toISOString(),
      projectRoot,
      components: [],
      routes: [],
      tailwindClasses: {},
      shadcnComponents: {},
      radixComponents: {},
      issues: [],
      stats: {
        totalComponents: 0,
        totalPages: 0,
        totalRoutes: 0,
        uniqueTailwindClasses: 0,
        potentialA11yIssues: 0,
      },
    };
  }

  findFiles(dir, extension = '.tsx') {
    const files = [];
    
    function traverse(currentPath) {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip certain directories
          if (['node_modules', '.git', 'dist', 'build', '.vite'].includes(item)) {
            continue;
          }
          traverse(fullPath);
        } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
          if (!fullPath.includes('.test.') && !fullPath.includes('.spec.') && !fullPath.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  analyzeFile(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract components
    const components = this.extractComponents(content, relativePath);
    this.inventory.components.push(...components);
    
    // Extract routes
    const routes = this.extractRoutes(content, relativePath);
    this.inventory.routes.push(...routes);
    
    // Extract Tailwind classes
    const tailwindClasses = this.extractTailwindClasses(content, relativePath);
    for (const [className, info] of Object.entries(tailwindClasses)) {
      if (!this.inventory.tailwindClasses[className]) {
        this.inventory.tailwindClasses[className] = {
          className,
          count: 0,
          files: [],
          isResponsive: false,
          isRisky: false,
          variants: [],
        };
      }
      const existing = this.inventory.tailwindClasses[className];
      existing.count += info.count;
      if (!existing.files.includes(relativePath)) {
        existing.files.push(relativePath);
      }
      existing.isResponsive = existing.isResponsive || info.isResponsive;
      existing.isRisky = existing.isRisky || info.isRisky;
      existing.variants = [...new Set([...existing.variants, ...info.variants])];
    }
    
    // Extract shadcn/ui usage
    const shadcnUsage = this.extractShadcnUsage(content);
    for (const [component, count] of Object.entries(shadcnUsage)) {
      this.inventory.shadcnComponents[component] = (this.inventory.shadcnComponents[component] || 0) + count;
    }
    
    // Extract Radix usage
    const radixUsage = this.extractRadixUsage(content);
    for (const [component, count] of Object.entries(radixUsage)) {
      this.inventory.radixComponents[component] = (this.inventory.radixComponents[component] || 0) + count;
    }
    
    // Analyze A11y risks
    const a11yRisks = this.analyzeA11yRisks(content, relativePath);
    this.inventory.issues.push(...a11yRisks);
  }

  extractComponents(content, filePath) {
    const components = [];
    
    // Match React components (function declarations and const with arrow functions)
    const functionMatches = content.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*(?:\(|\=)/g) || [];
    
    for (const match of functionMatches) {
      const nameMatch = match.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/);
      if (nameMatch) {
        const name = nameMatch[1];
        components.push({
          path: filePath,
          name,
          isPage: filePath.includes('/pages/') || filePath.includes('Page.tsx'),
          isLazy: content.includes('React.lazy') && content.includes(name),
          shadcnComponents: this.extractShadcnFromText(content),
          radixComponents: this.extractRadixFromText(content),
          tailwindClasses: this.extractTailwindFromText(content),
          a11yRisks: this.analyzeA11yRisks(content, filePath).length,
        });
      }
    }
    
    // Check for lazy components
    const lazyMatches = content.match(/React\.lazy\(\s*\(\)\s*=>\s*import\(['"`]([^'"`]+)['"`]\)/g) || [];
    for (const match of lazyMatches) {
      const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
      if (pathMatch) {
        components.push({
          path: filePath,
          name: `LazyComponent(${pathMatch[1]})`,
          isPage: true,
          isLazy: true,
          shadcnComponents: [],
          radixComponents: [],
          tailwindClasses: [],
          a11yRisks: 0,
        });
      }
    }
    
    return components;
  }

  extractRoutes(content, filePath) {
    const routes = [];
    
    // Extract React Router routes
    const routeMatches = content.match(/<Route\s+path=["']([^"']+)["']\s+element=\{([^}]+)\}/g) || [];
    
    for (const match of routeMatches) {
      const pathMatch = match.match(/path=["']([^"']+)["']/);
      const elementMatch = match.match(/element=\{([^}]+)\}/);
      
      if (pathMatch && elementMatch) {
        const isProtected = content.includes('ProtectedRoute');
        const permissionMatch = content.match(/requiredPermission=\{([^}]+)\}/);
        
        routes.push({
          path: pathMatch[1],
          element: elementMatch[1].trim(),
          isProtected,
          requiredPermission: permissionMatch?.[1],
          isLazy: elementMatch[1].includes('lazy') || content.includes('React.lazy'),
        });
      }
    }
    
    return routes;
  }

  extractTailwindClasses(content, filePath) {
    const classes = {};
    
    // Extract className strings
    const classNameMatches = content.match(/className\s*=\s*["'`]([^"'`]+)["'`]/g) || [];
    const clsxMatches = content.match(/clsx\s*\(\s*["'`]([^"'`]+)["'`]/g) || [];
    const cnMatches = content.match(/cn\s*\(\s*["'`]([^"'`]+)["'`]/g) || [];
    
    const allMatches = [...classNameMatches, ...clsxMatches, ...cnMatches];
    
    for (const match of allMatches) {
      const classStringMatch = match.match(/["'`]([^"'`]+)["'`]/);
      if (classStringMatch) {
        const classString = classStringMatch[1];
        const classList = classString.split(/\s+/).filter(Boolean);
        
        for (const className of classList) {
          if (!classes[className]) {
            classes[className] = {
              count: 0,
              isResponsive: /^(sm|md|lg|xl|2xl):/.test(className),
              isRisky: this.isRiskyTailwindClass(className),
              variants: this.extractVariants(className),
            };
          }
          classes[className].count++;
        }
      }
    }
    
    return classes;
  }

  extractShadcnUsage(content) {
    const usage = {};
    const shadcnComponents = [
      'Button', 'Card', 'Dialog', 'Input', 'Label', 'Select', 'Textarea',
      'Checkbox', 'RadioGroup', 'Switch', 'Slider', 'Progress', 'Avatar',
      'Badge', 'Alert', 'AlertDialog', 'AspectRatio', 'Accordion',
      'Breadcrumb', 'Calendar', 'Carousel', 'Chart', 'Collapsible',
      'Command', 'ContextMenu', 'Drawer', 'DropdownMenu', 'Form',
      'HoverCard', 'InputOTP', 'Menubar', 'NavigationMenu', 'Pagination',
      'Popover', 'ResizablePanel', 'ScrollArea', 'Separator', 'Sheet',
      'Skeleton', 'Sonner', 'Table', 'Tabs', 'Toast', 'Toaster',
      'Toggle', 'ToggleGroup', 'Tooltip', 'TooltipProvider',
    ];
    
    for (const component of shadcnComponents) {
      const regex = new RegExp(`<${component}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        usage[component] = matches.length;
      }
    }
    
    return usage;
  }

  extractRadixUsage(content) {
    const usage = {};
    const radixImports = content.match(/from\s+['"]@radix-ui\/([^'"]+)['"]/g) || [];
    
    for (const importStatement of radixImports) {
      const packageMatch = importStatement.match(/@radix-ui\/([^'"]+)/);
      if (packageMatch) {
        const packageName = packageMatch[1];
        usage[packageName] = (usage[packageName] || 0) + 1;
      }
    }
    
    return usage;
  }

  extractShadcnFromText(content) {
    const components = [];
    const shadcnComponents = [
      'Button', 'Card', 'Dialog', 'Input', 'Label', 'Select', 'Textarea',
    ];
    
    for (const component of shadcnComponents) {
      if (content.includes(`<${component}`)) {
        components.push(component);
      }
    }
    
    return components;
  }

  extractRadixFromText(content) {
    const components = [];
    const matches = content.match(/from\s+['"]@radix-ui\/([^'"]+)['"]/g) || [];
    
    return matches.map(match => {
      const packageMatch = match.match(/@radix-ui\/([^'"]+)/);
      return packageMatch?.[1] || '';
    }).filter(Boolean);
  }

  extractTailwindFromText(content) {
    const classes = [];
    const classMatches = content.match(/className\s*=\s*["'`]([^"'`]+)["'`]/g) || [];
    
    for (const match of classMatches) {
      const classString = match.match(/["'`]([^"'`]+)["'`]/)?.[1] || '';
      classes.push(...classString.split(/\s+/).filter(Boolean));
    }
    
    return [...new Set(classes)];
  }

  analyzeA11yRisks(content, filePath) {
    const risks = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Icon-only buttons without aria-label
      if (line.includes('<button') && 
          (line.includes('<Icon') || line.includes('<Lucide') || line.includes('Icon')) && 
          !line.includes('aria-label') && 
          !line.includes('sr-only') &&
          !line.includes('children')) {
        risks.push({
          type: 'icon-button-no-label',
          severity: 'high',
          description: 'Icon-only button without accessible label',
          line: lineNumber,
          suggestion: 'Add aria-label or include visually hidden text with sr-only class',
          file: filePath,
        });
      }
      
      // Images without alt text
      if (line.includes('<img') && !line.includes('alt=')) {
        risks.push({
          type: 'image-no-alt',
          severity: 'high',
          description: 'Image without alternative text',
          line: lineNumber,
          suggestion: 'Add alt attribute with descriptive text or alt="" for decorative images',
          file: filePath,
        });
      }
      
      // Form inputs without labels
      if ((line.includes('<input') || line.includes('<Input')) && 
          !line.includes('aria-label') && 
          !line.includes('aria-labelledby')) {
        // Check if there's a nearby Label component (simplified)
        const hasNearbyLabel = lines.slice(Math.max(0, index - 3), index + 4)
          .some(nearbyLine => nearbyLine.includes('<Label') || nearbyLine.includes('<label'));
        
        if (!hasNearbyLabel) {
          risks.push({
            type: 'input-no-label',
            severity: 'high',
            description: 'Form input without associated label',
            line: lineNumber,
            suggestion: 'Add Label component or aria-label attribute',
            file: filePath,
          });
        }
      }
      
      // Fixed height containers with potential overflow
      if (line.includes('h-[') && line.includes('overflow-hidden')) {
        risks.push({
          type: 'fixed-height-overflow',
          severity: 'medium',
          description: 'Fixed height container with overflow hidden may clip content',
          line: lineNumber,
          suggestion: 'Consider using min-h instead of fixed height or ensure content fits',
          file: filePath,
        });
      }
    });
    
    return risks;
  }

  isRiskyTailwindClass(className) {
    const riskyPatterns = [
      /^h-\[\d+/,        // Fixed heights
      /^w-\[\d+/,        // Fixed widths  
      /^text-\[\d+px\]/, // Pixel-based text sizes
      /overflow-hidden/, // Potential content clipping
      /absolute$/,       // Absolute positioning without responsive guards
      /fixed$/,          // Fixed positioning
    ];
    
    return riskyPatterns.some(pattern => pattern.test(className));
  }

  extractVariants(className) {
    const variants = [];
    
    // Extract responsive variants
    const responsiveMatch = className.match(/^(sm|md|lg|xl|2xl):/);
    if (responsiveMatch) {
      variants.push(`responsive:${responsiveMatch[1]}`);
    }
    
    // Extract state variants
    if (className.includes('hover:')) variants.push('hover');
    if (className.includes('focus:')) variants.push('focus');
    if (className.includes('active:')) variants.push('active');
    if (className.includes('disabled:')) variants.push('disabled');
    if (className.includes('dark:')) variants.push('dark');
    
    return variants;
  }

  calculateStats() {
    this.inventory.stats = {
      totalComponents: this.inventory.components.length,
      totalPages: this.inventory.components.filter(c => c.isPage).length,
      totalRoutes: this.inventory.routes.length,
      uniqueTailwindClasses: Object.keys(this.inventory.tailwindClasses).length,
      potentialA11yIssues: this.inventory.issues.length,
    };
  }

  async analyze() {
    console.log('🔍 Starting UI inventory analysis...');
    
    const srcDir = path.join(this.projectRoot, 'src');
    const files = this.findFiles(srcDir);
    
    console.log(`📁 Found ${files.length} files to analyze`);
    
    for (const filePath of files) {
      try {
        this.analyzeFile(filePath);
      } catch (error) {
        console.warn(`⚠️  Error analyzing ${filePath}:`, error.message);
      }
    }
    
    this.calculateStats();
    console.log('✅ Analysis complete');
  }

  async generateReports() {
    const outputDir = path.join(this.projectRoot, 'reports', 'ui-audit', 'inventory');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate JSON inventory
    fs.writeFileSync(
      path.join(outputDir, 'inventory.json'),
      JSON.stringify(this.inventory, null, 2)
    );
    
    // Generate summary markdown
    this.generateSummaryMarkdown(outputDir);
    
    // Generate CSV reports
    this.generateCSVReports(outputDir);
    
    console.log(`📊 Reports generated in: ${outputDir}`);
  }

  generateSummaryMarkdown(outputDir) {
    const { stats } = this.inventory;
    const topTailwindClasses = Object.values(this.inventory.tailwindClasses)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    const topShadcnComponents = Object.entries(this.inventory.shadcnComponents)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    const criticalIssues = this.inventory.issues.filter(i => i.severity === 'critical');
    const highIssues = this.inventory.issues.filter(i => i.severity === 'high');
    
    const markdown = `# UI Inventory Report

Generated: ${new Date(this.inventory.timestamp).toLocaleString()}

## 📊 Overview Statistics

- **Total Components**: ${stats.totalComponents}
- **Total Pages**: ${stats.totalPages}  
- **Total Routes**: ${stats.totalRoutes}
- **Unique Tailwind Classes**: ${stats.uniqueTailwindClasses}
- **Potential A11y Issues**: ${stats.potentialA11yIssues}

## 🎨 Top 20 Tailwind Classes

| Class | Usage Count | Responsive | Risky |
|-------|-------------|------------|-------|
${topTailwindClasses.map(cls => 
  `| \`${cls.className}\` | ${cls.count} | ${cls.isResponsive ? '✅' : '❌'} | ${cls.isRisky ? '⚠️' : '✅'} |`
).join('\n')}

## 🧩 Top shadcn/ui Components

| Component | Usage Count |
|-----------|-------------|
${topShadcnComponents.map(([component, count]) => 
  `| ${component} | ${count} |`
).join('\n')}

## 🚨 Critical Accessibility Issues

${criticalIssues.length > 0 ? 
  criticalIssues.map(issue => 
    `- **${issue.type}**: ${issue.description} (${issue.file}:${issue.line})`
  ).join('\n')
  : 'No critical issues detected ✅'
}

## ⚠️ High Priority Issues

${highIssues.length > 0 ?
  highIssues.slice(0, 10).map(issue =>
    `- **${issue.type}**: ${issue.description} (${issue.file}:${issue.line})`
  ).join('\n')
  : 'No high priority issues detected ✅'
}

## 🗺️ Route Inventory

| Path | Element | Protected | Lazy |
|------|---------|-----------|------|
${this.inventory.routes.map(route => 
  `| ${route.path} | ${route.element} | ${route.isProtected ? '🔒' : '🌐'} | ${route.isLazy ? '⏳' : '⚡'} |`
).join('\n')}

## 📁 Files Analyzed

Total files processed: ${this.inventory.components.length} components across ${stats.totalPages} pages.

## 🎯 Key Findings

### Responsive Design Status
- ${Object.values(this.inventory.tailwindClasses).filter(c => c.isResponsive).length} responsive classes detected
- ${Object.values(this.inventory.tailwindClasses).filter(c => c.isRisky).length} potentially risky classes found

### Component Library Usage
- shadcn/ui components: ${Object.keys(this.inventory.shadcnComponents).length} different types used
- Radix UI primitives: ${Object.keys(this.inventory.radixComponents).length} different packages imported

### Performance Indicators
- Lazy routes: ${this.inventory.routes.filter(r => r.isLazy).length}/${this.inventory.routes.length} routes
- Code splitting strategy appears ${this.inventory.routes.filter(r => r.isLazy).length > this.inventory.routes.length * 0.6 ? 'good' : 'needs improvement'}

## 🔧 Next Steps

### Immediate Actions (P0)
1. **Fix Critical A11y Issues**: ${criticalIssues.length} critical accessibility issues need immediate attention
2. **Address High Priority Issues**: ${highIssues.length} high priority issues to resolve

### Short-term Improvements (P1)  
1. **Responsive Audit**: Review ${Object.values(this.inventory.tailwindClasses).filter(c => c.isRisky).length} risky Tailwind classes
2. **Component Consolidation**: Optimize usage of ${Object.keys(this.inventory.shadcnComponents).length} shadcn/ui components

### Long-term Optimization (P2)
1. **Performance**: Enhance lazy loading for remaining ${this.inventory.routes.filter(r => !r.isLazy).length} routes
2. **Code Splitting**: Consider bundle optimization for ${stats.totalComponents} components

---

*Report generated by Simple UI Inventory Auditor*
`;
    
    fs.writeFileSync(path.join(outputDir, 'INVENTORY.md'), markdown);
  }

  generateCSVReports(outputDir) {
    // Components CSV
    const componentsCSV = [
      'Path,Name,IsPage,IsLazy,ShadcnComponents,TailwindClasses,A11yRisks'
    ];
    
    for (const component of this.inventory.components) {
      componentsCSV.push([
        component.path,
        component.name,
        component.isPage,
        component.isLazy,
        component.shadcnComponents.join(';'),
        component.tailwindClasses.length,
        component.a11yRisks,
      ].join(','));
    }
    
    fs.writeFileSync(path.join(outputDir, 'components.csv'), componentsCSV.join('\n'));
    
    // Tailwind classes CSV
    const tailwindCSV = [
      'ClassName,Count,Files,IsResponsive,IsRisky,Variants'
    ];
    
    const sortedClasses = Object.values(this.inventory.tailwindClasses)
      .sort((a, b) => b.count - a.count);
    
    for (const classUsage of sortedClasses) {
      tailwindCSV.push([
        classUsage.className,
        classUsage.count,
        classUsage.files.join(';'),
        classUsage.isResponsive,
        classUsage.isRisky,
        classUsage.variants.join(';'),
      ].join(','));
    }
    
    fs.writeFileSync(path.join(outputDir, 'tailwind-classes.csv'), tailwindCSV.join('\n'));
    
    // Issues CSV
    const issuesCSV = [
      'Type,Severity,Description,File,Line,Suggestion'
    ];
    
    for (const issue of this.inventory.issues) {
      issuesCSV.push([
        issue.type,
        issue.severity,
        `"${issue.description}"`,
        issue.file,
        issue.line || '',
        `"${issue.suggestion}"`,
      ].join(','));
    }
    
    fs.writeFileSync(path.join(outputDir, 'issues.csv'), issuesCSV.join('\n'));
  }
}

// Main execution
async function main() {
  const projectRoot = process.cwd();
  const auditor = new SimpleUIInventory(projectRoot);
  
  try {
    await auditor.analyze();
    await auditor.generateReports();
    
    console.log('\n✅ UI Inventory audit completed successfully!');
    console.log('📁 Check reports/ui-audit/inventory/ for detailed results');
    
  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}