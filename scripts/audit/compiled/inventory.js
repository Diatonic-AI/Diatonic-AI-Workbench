#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const globby_1 = require("globby");
const fs_1 = require("fs");
const path_1 = require("path");
class UIInventoryAuditor {
    constructor(projectRoot) {
        this.projectRoot = (0, path_1.resolve)(projectRoot);
        this.project = new ts_morph_1.Project({
            tsConfigFilePath: (0, path_1.join)(this.projectRoot, "tsconfig.json"),
        });
        this.inventory = {
            timestamp: new Date().toISOString(),
            projectRoot: this.projectRoot,
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
    async analyze() {
        console.log("🔍 Starting comprehensive UI inventory audit...");
        // Discover all relevant files
        const files = await (0, globby_1.globby)([
            "src/**/*.{ts,tsx}",
            "!src/**/*.{test,spec}.{ts,tsx}",
            "!src/**/*.d.ts",
        ], {
            cwd: this.projectRoot,
            absolute: true,
        });
        console.log(`📁 Found ${files.length} files to analyze`);
        // Analyze each file
        for (const filePath of files) {
            await this.analyzeFile(filePath);
        }
        // Calculate stats
        this.calculateStats();
        console.log("✅ Analysis complete");
    }
    async analyzeFile(filePath) {
        const relativePath = filePath.replace(this.projectRoot + '/', '');
        const sourceFile = this.project.getSourceFile(filePath);
        if (!sourceFile) {
            console.warn(`⚠️  Could not load source file: ${relativePath}`);
            return;
        }
        const content = (0, fs_1.readFileSync)(filePath, 'utf8');
        // Analyze different aspects
        const components = this.extractComponents(sourceFile, relativePath);
        const routes = this.extractRoutes(sourceFile, relativePath);
        const tailwindUsage = this.extractTailwindClasses(content, relativePath);
        const shadcnUsage = this.extractShadcnUsage(content, relativePath);
        const radixUsage = this.extractRadixUsage(content, relativePath);
        const a11yRisks = this.analyzeA11yRisks(content, relativePath);
        // Merge into inventory
        this.inventory.components.push(...components);
        this.inventory.routes.push(...routes);
        this.inventory.issues.push(...a11yRisks);
        // Update class usage maps
        for (const usage of tailwindUsage) {
            if (!this.inventory.tailwindClasses[usage.className]) {
                this.inventory.tailwindClasses[usage.className] = {
                    className: usage.className,
                    count: 0,
                    files: [],
                    isResponsive: false,
                    isRisky: false,
                    variants: [],
                };
            }
            const existing = this.inventory.tailwindClasses[usage.className];
            existing.count += usage.count;
            if (!existing.files.includes(relativePath)) {
                existing.files.push(relativePath);
            }
            existing.isResponsive = existing.isResponsive || usage.isResponsive;
            existing.isRisky = existing.isRisky || usage.isRisky;
            existing.variants = [...new Set([...existing.variants, ...usage.variants])];
        }
        for (const [component, count] of Object.entries(shadcnUsage)) {
            this.inventory.shadcnComponents[component] = (this.inventory.shadcnComponents[component] || 0) + count;
        }
        for (const [component, count] of Object.entries(radixUsage)) {
            this.inventory.radixComponents[component] = (this.inventory.radixComponents[component] || 0) + count;
        }
    }
    extractComponents(sourceFile, filePath) {
        const components = [];
        // Find React components (function declarations and arrow functions)
        sourceFile.getFunctions().forEach((func) => {
            if (this.isReactComponent(func)) {
                components.push(this.analyzeComponent(func, filePath, false));
            }
        });
        sourceFile.getVariableDeclarations().forEach((varDecl) => {
            const initializer = varDecl.getInitializer();
            if (initializer && (ts_morph_1.Node.isArrowFunction(initializer) ||
                ts_morph_1.Node.isFunctionExpression(initializer))) {
                if (this.isReactComponent(initializer)) {
                    components.push(this.analyzeComponent(varDecl, filePath, false));
                }
            }
        });
        // Check for lazy-loaded components
        const content = sourceFile.getFullText();
        const lazyMatches = content.match(/React\.lazy\(\s*\(\)\s*=>\s*import\(['"`]([^'"`]+)['"`]\)/g);
        if (lazyMatches) {
            lazyMatches.forEach((match) => {
                const importPath = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
                if (importPath) {
                    components.push({
                        path: filePath,
                        name: `LazyComponent(${importPath})`,
                        isPage: filePath.includes('/pages/'),
                        isLazy: true,
                        shadcnComponents: [],
                        radixComponents: [],
                        tailwindClasses: [],
                        a11yRisks: [],
                    });
                }
            });
        }
        return components;
    }
    extractRoutes(sourceFile, filePath) {
        const routes = [];
        const content = sourceFile.getFullText();
        // Extract React Router routes
        const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{([^}]+)\}/g;
        let match;
        while ((match = routeRegex.exec(content)) !== null) {
            const [, path, element] = match;
            // Check for protection wrappers
            const isProtected = content.includes('ProtectedRoute');
            const permissionMatch = content.match(/requiredPermission=\{([^}]+)\}/);
            routes.push({
                path,
                element: element.trim(),
                isProtected,
                requiredPermission: permissionMatch?.[1],
                isLazy: element.includes('React.lazy') || element.includes('lazy('),
            });
        }
        return routes;
    }
    extractTailwindClasses(content, filePath) {
        const usage = [];
        // Extract className strings
        const classNameRegex = /className\s*=\s*["'`]([^"'`]+)["'`]/g;
        const clsxRegex = /clsx\s*\(\s*["'`]([^"'`]+)["'`]/g;
        const cnRegex = /cn\s*\(\s*["'`]([^"'`]+)["'`]/g;
        const extractClasses = (regex) => {
            let match;
            while ((match = regex.exec(content)) !== null) {
                const classString = match[1];
                const classes = classString.split(/\s+/).filter(Boolean);
                for (const className of classes) {
                    const isResponsive = /^(sm|md|lg|xl|2xl):/.test(className);
                    const isRisky = this.isRiskyTailwindClass(className);
                    const variants = this.extractVariants(className);
                    usage.push({
                        className,
                        count: 1,
                        files: [filePath],
                        isResponsive,
                        isRisky,
                        variants,
                    });
                }
            }
        };
        extractClasses(classNameRegex);
        extractClasses(clsxRegex);
        extractClasses(cnRegex);
        return usage;
    }
    extractShadcnUsage(content, filePath) {
        const usage = {};
        // Common shadcn/ui components
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
    extractRadixUsage(content, filePath) {
        const usage = {};
        // Extract Radix UI imports
        const radixImports = content.match(/from\s+['"]@radix-ui\/[^'"]+['"]/g) || [];
        for (const importStatement of radixImports) {
            const packageMatch = importStatement.match(/@radix-ui\/([^'"]+)/);
            if (packageMatch) {
                const packageName = packageMatch[1];
                usage[packageName] = (usage[packageName] || 0) + 1;
            }
        }
        return usage;
    }
    analyzeA11yRisks(content, filePath) {
        const risks = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            // Icon-only buttons without aria-label
            if (line.includes('<button') &&
                (line.includes('<Icon') || line.includes('<Lucide')) &&
                !line.includes('aria-label') &&
                !line.includes('sr-only')) {
                risks.push({
                    type: 'icon-button-no-label',
                    severity: 'high',
                    description: 'Icon-only button without accessible label',
                    line: lineNumber,
                    suggestion: 'Add aria-label or include visually hidden text with sr-only class',
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
                });
            }
            // Heading level skipping
            const headingMatch = line.match(/<h([1-6])/);
            if (headingMatch) {
                // This is a simplified check - in practice, you'd track heading hierarchy
                const level = parseInt(headingMatch[1]);
                if (level > 3) {
                    risks.push({
                        type: 'heading-skip-level',
                        severity: 'medium',
                        description: `Potentially skipped heading level (h${level})`,
                        line: lineNumber,
                        suggestion: 'Ensure heading hierarchy is logical and sequential',
                    });
                }
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
                });
            }
        });
        return risks;
    }
    isReactComponent(node) {
        const name = node.getName?.() || node.getSymbol?.()?.getName();
        return name && /^[A-Z]/.test(name);
    }
    analyzeComponent(node, filePath, isLazy) {
        const name = node.getName?.() || node.getSymbol?.()?.getName() || 'UnnamedComponent';
        const content = node.getFullText?.() || '';
        return {
            path: filePath,
            name,
            isPage: filePath.includes('/pages/'),
            isLazy,
            shadcnComponents: this.extractShadcnFromText(content),
            radixComponents: this.extractRadixFromText(content),
            tailwindClasses: this.extractTailwindFromText(content),
            a11yRisks: this.analyzeA11yRisks(content, filePath),
            reactFlowUsage: this.extractReactFlowUsage(content),
        };
    }
    extractShadcnFromText(content) {
        const components = [];
        const shadcnComponents = [
            'Button', 'Card', 'Dialog', 'Input', 'Label', 'Select', 'Textarea',
            // ... (same list as above)
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
    extractReactFlowUsage(content) {
        if (!content.includes('ReactFlow') && !content.includes('@xyflow/react')) {
            return undefined;
        }
        return {
            nodeTypes: this.extractReactFlowNodeTypes(content),
            edgeTypes: this.extractReactFlowEdgeTypes(content),
            panelComponents: this.extractReactFlowPanels(content),
            touchInteractions: content.includes('onNodeDrag') || content.includes('onNodeClick'),
            keyboardInteractions: content.includes('onKeyDown') || content.includes('keyboard'),
        };
    }
    extractReactFlowNodeTypes(content) {
        const matches = content.match(/nodeTypes\s*=\s*\{([^}]+)\}/);
        if (!matches)
            return [];
        const nodeTypesContent = matches[1];
        return nodeTypesContent.split(',').map(entry => {
            const typeMatch = entry.trim().match(/(\w+):/);
            return typeMatch?.[1] || '';
        }).filter(Boolean);
    }
    extractReactFlowEdgeTypes(content) {
        const matches = content.match(/edgeTypes\s*=\s*\{([^}]+)\}/);
        if (!matches)
            return [];
        const edgeTypesContent = matches[1];
        return edgeTypesContent.split(',').map(entry => {
            const typeMatch = entry.trim().match(/(\w+):/);
            return typeMatch?.[1] || '';
        }).filter(Boolean);
    }
    extractReactFlowPanels(content) {
        const panels = [];
        if (content.includes('MiniMap'))
            panels.push('MiniMap');
        if (content.includes('Controls'))
            panels.push('Controls');
        if (content.includes('Background'))
            panels.push('Background');
        if (content.includes('Panel'))
            panels.push('Panel');
        return panels;
    }
    isRiskyTailwindClass(className) {
        const riskyPatterns = [
            /^h-\[\d+/, // Fixed heights
            /^w-\[\d+/, // Fixed widths  
            /^text-\[\d+px\]/, // Pixel-based text sizes
            /overflow-hidden/, // Potential content clipping
            /absolute$/, // Absolute positioning without responsive guards
            /fixed$/, // Fixed positioning
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
        if (className.includes('hover:'))
            variants.push('hover');
        if (className.includes('focus:'))
            variants.push('focus');
        if (className.includes('active:'))
            variants.push('active');
        if (className.includes('disabled:'))
            variants.push('disabled');
        if (className.includes('dark:'))
            variants.push('dark');
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
    async generateReports() {
        const outputDir = (0, path_1.join)(this.projectRoot, 'reports', 'ui-audit', 'inventory');
        (0, fs_1.mkdirSync)(outputDir, { recursive: true });
        // Generate JSON inventory
        (0, fs_1.writeFileSync)((0, path_1.join)(outputDir, 'inventory.json'), JSON.stringify(this.inventory, null, 2));
        // Generate CSV reports
        this.generateComponentsCSV(outputDir);
        this.generatePagesCSV(outputDir);
        this.generateTailwindCSV(outputDir);
        this.generateShadcnCSV(outputDir);
        this.generateRadixCSV(outputDir);
        // Generate issues report
        this.generateIssuesReport(outputDir);
        // Generate summary markdown
        this.generateSummaryMarkdown(outputDir);
        console.log(`📊 Reports generated in: ${outputDir}`);
    }
    generateComponentsCSV(outputDir) {
        const csvLines = [
            'Path,Name,IsPage,IsLazy,ShadcnComponents,RadixComponents,TailwindClasses,A11yRisks'
        ];
        for (const component of this.inventory.components) {
            csvLines.push([
                component.path,
                component.name,
                component.isPage.toString(),
                component.isLazy.toString(),
                component.shadcnComponents.join(';'),
                component.radixComponents.join(';'),
                component.tailwindClasses.length.toString(),
                component.a11yRisks.length.toString(),
            ].join(','));
        }
        (0, fs_1.writeFileSync)((0, path_1.join)(outputDir, 'components.csv'), csvLines.join('\n'));
    }
    generatePagesCSV(outputDir) {
        const pages = this.inventory.components.filter(c => c.isPage);
        const csvLines = [
            'Path,Name,IsLazy,ShadcnComponents,RadixComponents,A11yRisks'
        ];
        for (const page of pages) {
            csvLines.push([
                page.path,
                page.name,
                page.isLazy.toString(),
                page.shadcnComponents.join(';'),
                page.radixComponents.join(';'),
                page.a11yRisks.length.toString(),
            ].join(','));
        }
        (0, fs_1.writeFileSync)((0, path_1.join)(outputDir, 'pages.csv'), csvLines.join('\n'));
    }
    generateTailwindCSV(outputDir) {
        const csvLines = [
            'ClassName,Count,Files,IsResponsive,IsRisky,Variants'
        ];
        const sortedClasses = Object.values(this.inventory.tailwindClasses)
            .sort((a, b) => b.count - a.count);
        for (const classUsage of sortedClasses) {
            csvLines.push([
                classUsage.className,
                classUsage.count.toString(),
                classUsage.files.join(';'),
                classUsage.isResponsive.toString(),
                classUsage.isRisky.toString(),
                classUsage.variants.join(';'),
            ].join(','));
        }
        (0, fs_1.writeFileSync)((0, path_1.join)(outputDir, 'tailwind-classes.csv'), csvLines.join('\n'));
    }
    generateShadcnCSV(outputDir) {
        const csvLines = [
            'Component,Count'
        ];
        const sortedComponents = Object.entries(this.inventory.shadcnComponents)
            .sort(([, a], [, b]) => b - a);
        for (const [component, count] of sortedComponents) {
            csvLines.push(`${component},${count}`);
        }
        (0, fs_1.writeFileSync)((0, path_1.join)(outputDir, 'shadcn-usage.csv'), csvLines.join('\n'));
    }
    generateRadixCSV(outputDir) {
        const csvLines = [
            'Component,Count'
        ];
        const sortedComponents = Object.entries(this.inventory.radixComponents)
            .sort(([, a], [, b]) => b - a);
        for (const [component, count] of sortedComponents) {
            csvLines.push(`${component},${count}`);
        }
        (0, fs_1.writeFileSync)((0, path_1.join)(outputDir, 'radix-usage.csv'), csvLines.join('\n'));
    }
    generateIssuesReport(outputDir) {
        const issues = {
            timestamp: this.inventory.timestamp,
            totalIssues: this.inventory.issues.length,
            issuesBySeverity: {
                critical: this.inventory.issues.filter(i => i.severity === 'critical').length,
                high: this.inventory.issues.filter(i => i.severity === 'high').length,
                medium: this.inventory.issues.filter(i => i.severity === 'medium').length,
                low: this.inventory.issues.filter(i => i.severity === 'low').length,
            },
            issuesByType: {},
            issues: this.inventory.issues,
        };
        // Count by type
        for (const issue of this.inventory.issues) {
            issues.issuesByType[issue.type] = (issues.issuesByType[issue.type] || 0) + 1;
        }
        (0, fs_1.writeFileSync)((0, path_1.join)(outputDir, 'issues-heuristics.json'), JSON.stringify(issues, null, 2));
    }
    generateSummaryMarkdown(outputDir) {
        const { stats } = this.inventory;
        const topTailwindClasses = Object.values(this.inventory.tailwindClasses)
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        const topShadcnComponents = Object.entries(this.inventory.shadcnComponents)
            .sort(([, a], [, b]) => b - a)
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
|-------|-------------|------------|--------|
${topTailwindClasses.map(cls => `| \`${cls.className}\` | ${cls.count} | ${cls.isResponsive ? '✅' : '❌'} | ${cls.isRisky ? '⚠️' : '✅'} |`).join('\n')}

## 🧩 Top shadcn/ui Components

| Component | Usage Count |
|-----------|-------------|
${topShadcnComponents.map(([component, count]) => `| ${component} | ${count} |`).join('\n')}

## 🚨 Critical Accessibility Issues

${criticalIssues.length > 0 ?
            criticalIssues.map(issue => `- **${issue.type}**: ${issue.description} (${issue.line ? `Line ${issue.line}` : 'Location TBD'})`).join('\n')
            : 'No critical issues detected ✅'}

## ⚠️ High Priority Issues

${highIssues.length > 0 ?
            highIssues.slice(0, 10).map(issue => `- **${issue.type}**: ${issue.description}`).join('\n')
            : 'No high priority issues detected ✅'}

## 🗺️ Route Inventory

| Path | Element | Protected | Lazy |
|------|---------|-----------|------|
${this.inventory.routes.map(route => `| ${route.path} | ${route.element} | ${route.isProtected ? '🔒' : '🌐'} | ${route.isLazy ? '⏳' : '⚡'} |`).join('\n')}

## 📁 Files Analyzed

Total files processed: ${this.inventory.components.length} components across ${stats.totalPages} pages.

## Next Steps

1. **Address Critical Issues**: Focus on accessibility violations first
2. **Responsive Review**: Audit components with risky Tailwind classes
3. **Performance**: Review lazy loading strategy for ${this.inventory.routes.filter(r => r.isLazy).length} lazy routes
4. **Component Library**: Consider consolidating ${Object.keys(this.inventory.shadcnComponents).length} shadcn/ui components

---

*Report generated by UI Inventory Auditor v1.0.0*
`;
        (0, fs_1.writeFileSync)((0, path_1.join)(outputDir, 'INVENTORY.md'), markdown);
    }
}
// Main execution
async function main() {
    const projectRoot = process.cwd();
    const auditor = new UIInventoryAuditor(projectRoot);
    try {
        await auditor.analyze();
        await auditor.generateReports();
        console.log("\n✅ UI Inventory audit completed successfully!");
        console.log("📁 Check reports/ui-audit/inventory/ for detailed results");
    }
    catch (error) {
        console.error("\n❌ Audit failed:", error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
