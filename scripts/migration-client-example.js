#!/usr/bin/env node
/**
 * Migration API Client Example
 * Demonstrates how to interact with the DynamoDB Migration API Server
 * 
 * Usage:
 *   node migration-client-example.js [command] [options]
 * 
 * Commands:
 *   login           - Login and get JWT token
 *   validate        - Validate a migration file
 *   execute         - Execute a migration
 *   status          - Get migration status
 *   active          - List active migrations
 *   history         - Get migration history
 *   health          - Check server health
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Configuration
const config = {
    apiUrl: process.env.MIGRATION_API_URL || 'http://localhost:3001',
    username: process.env.MIGRATION_USER || 'admin',
    password: process.env.MIGRATION_PASSWORD || 'admin-password',
    environment: process.env.MIGRATION_ENV || 'development'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelColor = {
        'INFO': 'blue',
        'SUCCESS': 'green', 
        'WARNING': 'yellow',
        'ERROR': 'red'
    }[level] || 'reset';
    
    console.log(`${colorize(`[${level}]`, levelColor)} ${colorize(timestamp, 'dim')} ${message}`);
    
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// Migration API Client Class
class MigrationAPIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.token = null;
        this.client = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    // Server responded with error status
                    const message = error.response.data?.error || error.response.statusText;
                    log('ERROR', `API Error (${error.response.status}): ${message}`);
                } else if (error.request) {
                    // Request made but no response received
                    log('ERROR', 'Network Error: No response from server');
                } else {
                    // Error in request setup
                    log('ERROR', `Request Error: ${error.message}`);
                }
                throw error;
            }
        );
    }

    setToken(token) {
        this.token = token;
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Authentication
    async login(username, password) {
        try {
            const response = await this.client.post('/api/auth/login', {
                username,
                password
            });
            
            this.setToken(response.data.token);
            log('SUCCESS', 'Authentication successful', {
                user: response.data.user,
                expiresIn: response.data.expiresIn
            });
            
            return response.data;
        } catch (error) {
            log('ERROR', 'Authentication failed');
            throw error;
        }
    }

    // Validate JWT token
    async validateToken() {
        try {
            const response = await this.client.get('/api/auth/validate');
            log('INFO', 'Token validation successful', response.data);
            return response.data;
        } catch (error) {
            log('ERROR', 'Token validation failed');
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            log('INFO', 'Server health check', response.data);
            return response.data;
        } catch (error) {
            log('ERROR', 'Health check failed');
            throw error;
        }
    }

    // Migration operations
    async validateMigration(migration) {
        try {
            const response = await this.client.post('/api/migrations/validate', {
                migration
            });
            
            if (response.data.valid) {
                log('SUCCESS', 'Migration validation passed', response.data);
            } else {
                log('WARNING', 'Migration validation failed', response.data);
            }
            
            return response.data;
        } catch (error) {
            log('ERROR', 'Migration validation request failed');
            throw error;
        }
    }

    async executeMigration(migration, environment = 'development', dryRun = false) {
        try {
            const response = await this.client.post('/api/migrations/execute', {
                migration,
                environment,
                dryRun
            });
            
            if (dryRun) {
                log('INFO', 'Dry run execution plan', response.data);
            } else {
                log('SUCCESS', 'Migration execution started', response.data);
            }
            
            return response.data;
        } catch (error) {
            log('ERROR', 'Migration execution failed');
            throw error;
        }
    }

    async getMigrationStatus(migrationId) {
        try {
            const response = await this.client.get(`/api/migrations/${migrationId}`);
            log('INFO', 'Migration status', response.data);
            return response.data;
        } catch (error) {
            log('ERROR', 'Failed to get migration status');
            throw error;
        }
    }

    async listActiveMigrations() {
        try {
            const response = await this.client.get('/api/migrations/active');
            log('INFO', 'Active migrations', response.data);
            return response.data;
        } catch (error) {
            log('ERROR', 'Failed to list active migrations');
            throw error;
        }
    }

    async getMigrationHistory(limit = 10, environment = null) {
        try {
            const params = { limit };
            if (environment) params.environment = environment;
            
            const response = await this.client.get('/api/migrations/history', { params });
            log('INFO', 'Migration history', response.data);
            return response.data;
        } catch (error) {
            log('ERROR', 'Failed to get migration history');
            throw error;
        }
    }

    // MCP operations
    async listMcpTools() {
        try {
            const response = await this.client.get('/api/mcp/tools');
            log('INFO', 'Available MCP tools', response.data);
            return response.data;
        } catch (error) {
            log('ERROR', 'Failed to list MCP tools');
            throw error;
        }
    }

    async executeMcpToolChain(toolChain, variables = {}) {
        try {
            const response = await this.client.post('/api/mcp/execute', {
                toolChain,
                variables
            });
            
            log('SUCCESS', 'MCP tool chain execution completed', response.data);
            return response.data;
        } catch (error) {
            log('ERROR', 'MCP tool chain execution failed');
            throw error;
        }
    }
}

// Utility functions
async function loadMigrationFile(filePath) {
    try {
        const absolutePath = path.resolve(filePath);
        const content = await fs.readFile(absolutePath, 'utf-8');
        const migration = JSON.parse(content);
        
        log('INFO', `Loaded migration file: ${absolutePath}`, {
            name: migration.name,
            version: migration.version,
            operations: migration.operations?.length || 0
        });
        
        return migration;
    } catch (error) {
        log('ERROR', `Failed to load migration file: ${filePath}`);
        throw error;
    }
}

async function promptConfirmation(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(`${colorize(message, 'yellow')} (y/N): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

async function waitForCompletion(client, migrationId, pollInterval = 5000) {
    log('INFO', 'Monitoring migration progress...');
    
    let attempts = 0;
    const maxAttempts = 360; // 30 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
        try {
            const status = await client.getMigrationStatus(migrationId);
            
            if (status.status === 'completed') {
                log('SUCCESS', 'Migration completed successfully!');
                return status;
            } else if (status.status === 'failed') {
                log('ERROR', 'Migration failed!');
                return status;
            } else if (status.status === 'running') {
                const progress = status.progress || 0;
                log('INFO', `Migration in progress... ${progress}%`);
            }
            
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;
            
        } catch (error) {
            log('WARNING', 'Failed to check migration status, retrying...');
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;
        }
    }
    
    log('ERROR', 'Migration monitoring timeout reached');
    throw new Error('Migration monitoring timeout');
}

// Command handlers
const commands = {
    async login() {
        const client = new MigrationAPIClient(config.apiUrl);
        await client.login(config.username, config.password);
        
        // Save token to file for other commands
        await fs.writeFile('.migration-token', client.token);
        log('INFO', 'Token saved to .migration-token file');
    },

    async health() {
        const client = new MigrationAPIClient(config.apiUrl);
        await client.healthCheck();
    },

    async validate() {
        const migrationFile = process.argv[3];
        if (!migrationFile) {
            log('ERROR', 'Migration file path required');
            process.exit(1);
        }

        const client = new MigrationAPIClient(config.apiUrl);
        
        // Load token if exists
        try {
            const token = await fs.readFile('.migration-token', 'utf-8');
            client.setToken(token.trim());
        } catch (error) {
            log('ERROR', 'No authentication token found. Run "login" command first.');
            process.exit(1);
        }

        const migration = await loadMigrationFile(migrationFile);
        await client.validateMigration(migration);
    },

    async execute() {
        const migrationFile = process.argv[3];
        const dryRun = process.argv.includes('--dry-run');
        const environment = process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1] || config.environment;

        if (!migrationFile) {
            log('ERROR', 'Migration file path required');
            process.exit(1);
        }

        const client = new MigrationAPIClient(config.apiUrl);
        
        // Load token
        try {
            const token = await fs.readFile('.migration-token', 'utf-8');
            client.setToken(token.trim());
        } catch (error) {
            log('ERROR', 'No authentication token found. Run "login" command first.');
            process.exit(1);
        }

        const migration = await loadMigrationFile(migrationFile);
        
        // Validate first
        const validation = await client.validateMigration(migration);
        if (!validation.valid) {
            log('ERROR', 'Migration validation failed. Cannot execute.');
            return;
        }

        // Show execution plan for dry run or confirmation
        if (dryRun) {
            log('INFO', 'Executing dry run...');
            await client.executeMigration(migration, environment, true);
            return;
        }

        // Confirm execution for production
        if (environment === 'production') {
            const confirmed = await promptConfirmation(
                `This will execute migration "${migration.name}" in PRODUCTION. Are you sure?`
            );
            if (!confirmed) {
                log('INFO', 'Migration cancelled by user');
                return;
            }
        }

        // Execute migration
        const result = await client.executeMigration(migration, environment, false);
        
        if (result.migrationId) {
            log('INFO', `Migration started with ID: ${result.migrationId}`);
            
            // Wait for completion if requested
            if (process.argv.includes('--wait')) {
                await waitForCompletion(client, result.migrationId);
            } else {
                log('INFO', 'Use "status" command to monitor progress');
            }
        }
    },

    async status() {
        const migrationId = process.argv[3];
        if (!migrationId) {
            log('ERROR', 'Migration ID required');
            process.exit(1);
        }

        const client = new MigrationAPIClient(config.apiUrl);
        
        try {
            const token = await fs.readFile('.migration-token', 'utf-8');
            client.setToken(token.trim());
        } catch (error) {
            log('ERROR', 'No authentication token found. Run "login" command first.');
            process.exit(1);
        }

        await client.getMigrationStatus(migrationId);
    },

    async active() {
        const client = new MigrationAPIClient(config.apiUrl);
        
        try {
            const token = await fs.readFile('.migration-token', 'utf-8');
            client.setToken(token.trim());
        } catch (error) {
            log('ERROR', 'No authentication token found. Run "login" command first.');
            process.exit(1);
        }

        await client.listActiveMigrations();
    },

    async history() {
        const limit = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || 10;
        const environment = process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1];

        const client = new MigrationAPIClient(config.apiUrl);
        
        try {
            const token = await fs.readFile('.migration-token', 'utf-8');
            client.setToken(token.trim());
        } catch (error) {
            log('ERROR', 'No authentication token found. Run "login" command first.');
            process.exit(1);
        }

        await client.getMigrationHistory(limit, environment);
    },

    async mcpTools() {
        const client = new MigrationAPIClient(config.apiUrl);
        
        try {
            const token = await fs.readFile('.migration-token', 'utf-8');
            client.setToken(token.trim());
        } catch (error) {
            log('ERROR', 'No authentication token found. Run "login" command first.');
            process.exit(1);
        }

        await client.listMcpTools();
    },

    help() {
        console.log(`
${colorize('Migration API Client', 'bright')}

${colorize('Usage:', 'blue')}
  node migration-client-example.js [command] [options]

${colorize('Commands:', 'blue')}
  ${colorize('login', 'green')}                 - Login and get JWT token
  ${colorize('health', 'green')}                - Check server health  
  ${colorize('validate <file>', 'green')}       - Validate a migration file
  ${colorize('execute <file>', 'green')}        - Execute a migration
  ${colorize('status <id>', 'green')}           - Get migration status
  ${colorize('active', 'green')}                - List active migrations
  ${colorize('history', 'green')}               - Get migration history
  ${colorize('mcpTools', 'green')}              - List available MCP tools
  ${colorize('help', 'green')}                  - Show this help message

${colorize('Options:', 'blue')}
  ${colorize('--dry-run', 'cyan')}              - Execute dry run (for execute command)
  ${colorize('--env=<environment>', 'cyan')}    - Target environment (development, staging, production)
  ${colorize('--wait', 'cyan')}                 - Wait for migration completion (for execute command)
  ${colorize('--limit=<number>', 'cyan')}       - Limit number of history records (for history command)

${colorize('Environment Variables:', 'blue')}
  ${colorize('MIGRATION_API_URL', 'cyan')}      - API server URL (default: http://localhost:3001)
  ${colorize('MIGRATION_USER', 'cyan')}         - Username (default: admin)
  ${colorize('MIGRATION_PASSWORD', 'cyan')}     - Password (default: admin-password)
  ${colorize('MIGRATION_ENV', 'cyan')}          - Default environment (default: development)

${colorize('Examples:', 'blue')}
  ${colorize('# Login', 'dim')}
  node migration-client-example.js login

  ${colorize('# Validate migration file', 'dim')}
  node migration-client-example.js validate migrations/001-initial-schema-setup.json

  ${colorize('# Execute dry run', 'dim')}
  node migration-client-example.js execute migrations/001-initial-schema-setup.json --dry-run

  ${colorize('# Execute migration and wait for completion', 'dim')}
  node migration-client-example.js execute migrations/001-initial-schema-setup.json --wait

  ${colorize('# Get migration status', 'dim')}
  node migration-client-example.js status abc-123-def

  ${colorize('# View recent migration history', 'dim')}
  node migration-client-example.js history --limit=20 --env=development
`);
    }
};

// Main execution
async function main() {
    const command = process.argv[2];

    if (!command || !commands[command]) {
        commands.help();
        process.exit(1);
    }

    try {
        await commands[command]();
    } catch (error) {
        if (error.response?.status === 401) {
            log('ERROR', 'Authentication required. Run "login" command first.');
        } else if (error.response?.status === 403) {
            log('ERROR', 'Insufficient permissions for this operation.');
        } else if (error.code === 'ECONNREFUSED') {
            log('ERROR', 'Cannot connect to API server. Make sure it is running.');
        }
        process.exit(1);
    }
}

// Handle process signals
process.on('SIGINT', () => {
    log('INFO', 'Client interrupted');
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    log('ERROR', 'Unhandled promise rejection', error);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { MigrationAPIClient, commands };
