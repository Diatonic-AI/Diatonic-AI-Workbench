#!/usr/bin/env node

/**
 * Security Audit Script - Hardcoded Secrets Detection
 * Scans all source files for potential security issues:
 * - Hardcoded API keys, tokens, passwords
 * - Example/placeholder values that should be externalized
 * - AWS credentials in code
 * - Database connection strings
 * - URLs and endpoints that should be environment variables
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
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

// Security patterns to detect
const SECURITY_PATTERNS = {
  // Critical secrets (high priority)
  critical: [
    {
      pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['""][a-zA-Z0-9]{20,}['""]|(?:api[_-]?key|apikey)\s*[=:]\s*[a-zA-Z0-9]{20,}/gi,
      description: 'API Key detected',
      severity: 'CRITICAL'
    },
    {
      pattern: /(?:secret[_-]?key|secretkey)\s*[=:]\s*['""][^'"]{20,}['""]|(?:secret[_-]?key|secretkey)\s*[=:]\s*[a-zA-Z0-9+/]{20,}/gi,
      description: 'Secret Key detected',
      severity: 'CRITICAL'
    },
    {
      pattern: /(?:jwt[_-]?secret|jwtsecret)\s*[=:]\s*['""][^'"]{20,}['""]|(?:jwt[_-]?secret|jwtsecret)\s*[=:]\s*[a-zA-Z0-9+/]{20,}/gi,
      description: 'JWT Secret detected',
      severity: 'CRITICAL'
    },
    {
      pattern: /(?:password|passwd)\s*[=:]\s*['""][^'"]{8,}['""]|(?:password|passwd)\s*[=:]\s*[a-zA-Z0-9@#$%^&*]{8,}/gi,
      description: 'Password detected',
      severity: 'CRITICAL'
    },
    {
      pattern: /(?:access[_-]?token|accesstoken)\s*[=:]\s*['""][^'"]{20,}['""]|(?:access[_-]?token|accesstoken)\s*[=:]\s*[a-zA-Z0-9+/]{20,}/gi,
      description: 'Access Token detected',
      severity: 'CRITICAL'
    }
  ],

  // AWS specific secrets
  aws_secrets: [
    {
      pattern: /AKIA[0-9A-Z]{16}/g,
      description: 'AWS Access Key ID detected',
      severity: 'CRITICAL'
    },
    {
      pattern: /[a-zA-Z0-9+/]{40}[a-zA-Z0-9+/=]*/g,
      description: 'Potential AWS Secret Access Key detected',
      severity: 'HIGH'
    },
    {
      pattern: /arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]*:[a-zA-Z0-9-_/.]+/g,
      description: 'AWS ARN detected (may contain sensitive info)',
      severity: 'MEDIUM'
    }
  ],

  // Database connections
  database: [
    {
      pattern: /(?:mongodb|mysql|postgresql|postgres):\/\/[^'"\\s]+/gi,
      description: 'Database connection string detected',
      severity: 'HIGH'
    },
    {
      pattern: /(?:host|hostname|server)\s*[=:]\s*['""](?!localhost|127\.0\.0\.1)[a-zA-Z0-9.-]+['""]|(?:host|hostname|server)\s*[=:]\s*(?!localhost|127\.0\.0\.1)[a-zA-Z0-9.-]+/gi,
      description: 'Database host detected',
      severity: 'MEDIUM'
    }
  ],

  // Example/placeholder values that should be externalized
  examples: [
    {
      pattern: /(?:example|sample|test|demo|placeholder|your[_-]?key|your[_-]?secret|your[_-]?token|your[_-]?url|your[_-]?endpoint)/gi,
      description: 'Example/placeholder value detected',
      severity: 'MEDIUM'
    },
    {
      pattern: /(?:12345|test123|password123|secret123|key123)/gi,
      description: 'Test/example credentials detected',
      severity: 'MEDIUM'
    },
    {
      pattern: /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):[0-9]+/g,
      description: 'Localhost URL (should be environment variable)',
      severity: 'LOW'
    }
  ],

  // Hardcoded URLs and endpoints
  urls: [
    {
      pattern: /https?:\/\/[a-zA-Z0-9.-]+\.amazonaws\.com[^\s'"]*(?=["'\s]|$)/g,
      description: 'Hardcoded AWS endpoint detected',
      severity: 'HIGH'
    },
    {
      pattern: /https?:\/\/[a-zA-Z0-9.-]+\.com[^\s'"]*(?=["'\s]|$)/g,
      description: 'Hardcoded external URL detected',
      severity: 'MEDIUM'
    }
  ],

  // Generic secrets patterns
  generic: [
    {
      pattern: /['""][a-zA-Z0-9+/]{32,}={0,2}['""]|[a-zA-Z0-9+/]{32,}={0,2}(?=\s|$)/g,
      description: 'Potential base64 encoded secret',
      severity: 'MEDIUM'
    },
    {
      pattern: /['""][a-fA-F0-9]{32,}['""]|[a-fA-F0-9]{32,}(?=\s|$)/g,
      description: 'Potential hex encoded secret',
      severity: 'MEDIUM'
    }
  ]
};

// File patterns to include/exclude
const FILE_PATTERNS = {
  include: ['.js', '.ts', '.tsx', '.jsx', '.json', '.env', '.yaml', '.yml', '.md', '.sql', '.sh'],
  exclude: [
    'node_modules',
    '.git',
    'build',
    'dist',
    'coverage',
    '.cache',
    'amplify/backend/api',
    'amplify/backend/function',
    '.amplify',
    'scripts/security-audit.js' // Exclude this file
  ]
};

/**
 * Get all files to scan
 */
function getFilesToScan(directory = '.') {
  const files = [];
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip excluded directories
      if (entry.isDirectory()) {
        if (FILE_PATTERNS.exclude.some(pattern => fullPath.includes(pattern))) {
          continue;
        }
        scanDirectory(fullPath);
      } else if (entry.isFile()) {
        // Include only specified file types
        const ext = path.extname(entry.name);
        if (FILE_PATTERNS.include.includes(ext) || entry.name.startsWith('.env')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDirectory(directory);
  return files;
}

/**
 * Scan a single file for security issues
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];
    
    // Scan each category of patterns
    Object.entries(SECURITY_PATTERNS).forEach(([category, patterns]) => {
      patterns.forEach(patternConfig => {
        const matches = [...content.matchAll(patternConfig.pattern)];
        
        matches.forEach(match => {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const line = lines[lineNumber - 1];
          
          // Skip if it's in a comment and not critical
          if (patternConfig.severity !== 'CRITICAL' && 
              (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('*'))) {
            return;
          }
          
          issues.push({
            category,
            severity: patternConfig.severity,
            description: patternConfig.description,
            match: match[0],
            line: lineNumber,
            content: line.trim(),
            file: filePath
          });
        });
      });
    });
    
    return issues;
  } catch (error) {
    console.error(`${colors.red}Error scanning ${filePath}: ${error.message}${colors.reset}`);
    return [];
  }
}

/**
 * Generate security report
 */
function generateReport(allIssues) {
  const report = {
    summary: {
      totalFiles: 0,
      totalIssues: allIssues.length,
      critical: allIssues.filter(i => i.severity === 'CRITICAL').length,
      high: allIssues.filter(i => i.severity === 'HIGH').length,
      medium: allIssues.filter(i => i.severity === 'MEDIUM').length,
      low: allIssues.filter(i => i.severity === 'LOW').length
    },
    issuesByCategory: {},
    issuesBySeverity: {},
    filesWithIssues: {}
  };
  
  // Group issues by category
  allIssues.forEach(issue => {
    if (!report.issuesByCategory[issue.category]) {
      report.issuesByCategory[issue.category] = [];
    }
    report.issuesByCategory[issue.category].push(issue);
    
    if (!report.issuesBySeverity[issue.severity]) {
      report.issuesBySeverity[issue.severity] = [];
    }
    report.issuesBySeverity[issue.severity].push(issue);
    
    if (!report.filesWithIssues[issue.file]) {
      report.filesWithIssues[issue.file] = [];
    }
    report.filesWithIssues[issue.file].push(issue);
  });
  
  return report;
}

/**
 * Print detailed report
 */
function printReport(report, allIssues) {
  console.log(`${colors.bold}${colors.cyan}Security Audit Report${colors.reset}`);
  console.log(`${colors.blue}Generated: ${new Date().toISOString()}${colors.reset}`);
  console.log('='.repeat(80));
  
  // Summary
  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`${colors.red}🚨 Critical: ${report.summary.critical}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  High: ${report.summary.high}${colors.reset}`);
  console.log(`${colors.blue}ℹ️  Medium: ${report.summary.medium}${colors.reset}`);
  console.log(`${colors.green}📋 Low: ${report.summary.low}${colors.reset}`);
  console.log(`${colors.bold}Total Issues: ${report.summary.totalIssues}${colors.reset}`);
  
  // Issues by severity
  ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
    const issues = report.issuesBySeverity[severity] || [];
    if (issues.length === 0) return;
    
    const severityColor = {
      'CRITICAL': colors.red,
      'HIGH': colors.yellow,
      'MEDIUM': colors.blue,
      'LOW': colors.green
    }[severity];
    
    console.log(`\n${colors.bold}${severityColor}${severity} Issues (${issues.length}):${colors.reset}`);
    console.log('-'.repeat(40));
    
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${colors.bold}${issue.description}${colors.reset}`);
      console.log(`   📁 File: ${issue.file}:${issue.line}`);
      console.log(`   🔍 Match: ${colors.cyan}${issue.match}${colors.reset}`);
      console.log(`   📝 Context: ${issue.content.substring(0, 100)}${issue.content.length > 100 ? '...' : ''}`);
      console.log('');
    });
  });
  
  // Recommendations
  console.log(`\n${colors.bold}${colors.magenta}🔧 Recommended Actions:${colors.reset}`);
  console.log('-'.repeat(30));
  
  if (report.summary.critical > 0) {
    console.log(`${colors.red}• IMMEDIATE: Review and externalize ${report.summary.critical} critical secrets${colors.reset}`);
  }
  
  if (report.summary.high > 0) {
    console.log(`${colors.yellow}• HIGH PRIORITY: Secure ${report.summary.high} high-severity issues${colors.reset}`);
  }
  
  console.log(`${colors.blue}• Use AWS Secrets Manager for sensitive data${colors.reset}`);
  console.log(`${colors.blue}• Use AWS Systems Manager Parameter Store for configuration${colors.reset}`);
  console.log(`${colors.blue}• Replace hardcoded URLs with environment variables${colors.reset}`);
  console.log(`${colors.blue}• Remove example/placeholder values from production code${colors.reset}`);
}

/**
 * Save report to file
 */
function saveReportToFile(report, allIssues) {
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: report.summary,
    issues: allIssues,
    recommendations: [
      'Use AWS Secrets Manager for sensitive credentials',
      'Use AWS Systems Manager Parameter Store for configuration',
      'Replace hardcoded URLs with environment variables',
      'Remove example/placeholder values',
      'Implement proper secret rotation'
    ]
  };
  
  const reportPath = `security-audit-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n${colors.green}📄 Detailed report saved: ${reportPath}${colors.reset}`);
  return reportPath;
}

/**
 * Main audit function
 */
function runSecurityAudit() {
  console.log(`${colors.bold}🔒 Starting Security Audit...${colors.reset}`);
  console.log(`${colors.blue}Scanning for hardcoded secrets, API keys, and example values${colors.reset}\n`);
  
  const files = getFilesToScan();
  console.log(`${colors.blue}Scanning ${files.length} files...${colors.reset}\n`);
  
  const allIssues = [];
  let filesScanned = 0;
  
  files.forEach(file => {
    const issues = scanFile(file);
    allIssues.push(...issues);
    filesScanned++;
    
    if (filesScanned % 50 === 0) {
      console.log(`${colors.blue}Scanned ${filesScanned}/${files.length} files...${colors.reset}`);
    }
  });
  
  const report = generateReport(allIssues);
  report.summary.totalFiles = files.length;
  
  console.log(`\n${colors.green}✅ Scan completed${colors.reset}`);
  printReport(report, allIssues);
  
  const reportFile = saveReportToFile(report, allIssues);
  
  // Exit with error code if critical issues found
  if (report.summary.critical > 0) {
    console.log(`\n${colors.red}${colors.bold}❌ Security audit failed: Critical issues found${colors.reset}`);
    process.exit(1);
  } else if (report.summary.high > 0) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Security audit completed with high-priority issues${colors.reset}`);
    process.exit(2);
  } else {
    console.log(`\n${colors.green}${colors.bold}✅ Security audit passed${colors.reset}`);
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colors.bold}Security Audit Script${colors.reset}

${colors.blue}Usage:${colors.reset}
  node scripts/security-audit.js

${colors.blue}Description:${colors.reset}
  Scans all source files for potential security issues including:
  - Hardcoded API keys, tokens, passwords
  - AWS credentials and ARNs
  - Database connection strings
  - Example/placeholder values
  - Hardcoded URLs and endpoints

${colors.blue}Exit Codes:${colors.reset}
  0 - No critical or high-severity issues found
  1 - Critical issues found (immediate action required)
  2 - High-severity issues found (should be addressed)

${colors.blue}Output:${colors.reset}
  - Console report with detailed findings
  - JSON report file for further analysis
`);
  process.exit(0);
}

// Run the audit
runSecurityAudit();
