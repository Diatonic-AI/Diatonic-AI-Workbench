#!/usr/bin/env node
/**
 * Production DynamoDB Migration API Server
 * Enterprise-grade migration system with JWT auth, MCP integration, and REST API
 * 
 * Features:
 * - JWT-based authentication
 * - RESTful API for migration operations
 * - MCP-Hub integration for enhanced tooling
 * - High-level operations library
 * - Production safety guards
 * - Audit logging and compliance
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
    port: process.env.MIGRATION_API_PORT || 3001,
    jwtSecret: process.env.JWT_SECRET || 'migration-api-secret-change-in-production',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION || 'us-east-2',
    mcpHubEndpoint: process.env.MCP_HUB_ENDPOINT || 'http://localhost:3000/mcp',
    enableMcpIntegration: process.env.ENABLE_MCP_INTEGRATION === 'true',
    maxConcurrentMigrations: parseInt(process.env.MAX_CONCURRENT_MIGRATIONS) || 3,
    migrationTimeout: parseInt(process.env.MIGRATION_TIMEOUT) || 1800000, // 30 minutes
};

// Winston Logger Configuration
const logger = winston.createLogger({
    level: config.environment === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { 
        service: 'migration-api',
        environment: config.environment,
        version: '1.0.0'
    },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/migration-errors.log', 
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: 'logs/migration-combined.log',
            maxsize: 10485760,
            maxFiles: 10
        }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Express App Configuration
const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later',
        retryAfter: '15 minutes'
    }
});

app.use(limiter);
app.use('/api/auth', authLimiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
    logger.info('API Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: uuidv4()
    });
    next();
});

// DynamoDB Configuration
const dynamoDbClient = new DynamoDBClient({
    region: config.region,
    ...(config.environment === 'development' && {
        endpoint: 'http://localhost:8002'
    })
});

const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// High-Level Operations Library
class MigrationOperationsLibrary {
    constructor() {
        this.operations = new Map();
        this.initializeOperations();
    }

    initializeOperations() {
        // Table Operations
        this.registerOperation('createTable', this.createTableOperation);
        this.registerOperation('modifyTable', this.modifyTableOperation);
        this.registerOperation('deleteTable', this.deleteTableOperation);
        
        // Index Operations
        this.registerOperation('createGSI', this.createGSIOperation);
        this.registerOperation('deleteGSI', this.deleteGSIOperation);
        this.registerOperation('createLSI', this.createLSIOperation);
        
        // Capacity Operations
        this.registerOperation('updateCapacity', this.updateCapacityOperation);
        this.registerOperation('enableAutoScaling', this.enableAutoScalingOperation);
        
        // Data Operations
        this.registerOperation('migrateData', this.migrateDataOperation);
        this.registerOperation('transformData', this.transformDataOperation);
        this.registerOperation('seedData', this.seedDataOperation);
        
        // Backup Operations
        this.registerOperation('createBackup', this.createBackupOperation);
        this.registerOperation('restoreBackup', this.restoreBackupOperation);
        
        // Advanced Operations
        this.registerOperation('enableStreams', this.enableStreamsOperation);
        this.registerOperation('enablePointInTimeRecovery', this.enablePITROperation);
        this.registerOperation('addTags', this.addTagsOperation);
        this.registerOperation('enableEncryption', this.enableEncryptionOperation);
        
        // Custom Operations
        this.registerOperation('customScript', this.customScriptOperation);
        this.registerOperation('mcpToolChain', this.mcpToolChainOperation);
        
        logger.info(`Initialized ${this.operations.size} migration operations`);
    }

    registerOperation(name, handler) {
        this.operations.set(name, handler.bind(this));
    }

    async executeOperation(operationType, operationData, context) {
        const operation = this.operations.get(operationType);
        if (!operation) {
            throw new Error(`Unknown operation type: ${operationType}`);
        }

        logger.info('Executing operation', { 
            type: operationType, 
            migrationId: context.migrationId,
            environment: context.environment 
        });

        try {
            const result = await operation(operationData, context);
            logger.info('Operation completed successfully', { 
                type: operationType, 
                migrationId: context.migrationId 
            });
            return result;
        } catch (error) {
            logger.error('Operation failed', { 
                type: operationType, 
                migrationId: context.migrationId, 
                error: error.message,
                stack: error.stack 
            });
            throw error;
        }
    }

    // Table Operations
    async createTableOperation(data, context) {
        const { tableName, schema, billing, tags } = data;
        
        // Validate table doesn't exist
        try {
            await context.dynamodb.describeTable({ TableName: tableName });
            return { status: 'skipped', reason: 'Table already exists' };
        } catch (error) {
            if (error.name !== 'ResourceNotFoundException') {
                throw error;
            }
        }

        const params = {
            TableName: tableName,
            AttributeDefinitions: schema.attributes,
            KeySchema: schema.keySchema,
            BillingMode: billing?.mode || 'PAY_PER_REQUEST',
            ...(billing?.mode === 'PROVISIONED' && {
                ProvisionedThroughput: {
                    ReadCapacityUnits: billing.readCapacity,
                    WriteCapacityUnits: billing.writeCapacity
                }
            }),
            ...(schema.globalSecondaryIndexes && {
                GlobalSecondaryIndexes: schema.globalSecondaryIndexes
            }),
            ...(schema.localSecondaryIndexes && {
                LocalSecondaryIndexes: schema.localSecondaryIndexes
            }),
            ...(tags && { Tags: tags }),
            StreamSpecification: {
                StreamEnabled: data.enableStreams || false,
                ...(data.enableStreams && { StreamViewType: data.streamViewType || 'NEW_AND_OLD_IMAGES' })
            }
        };

        await context.dynamodb.createTable(params);
        
        // Wait for table to be active
        await this.waitForTableActive(tableName, context);
        
        return { status: 'created', tableName };
    }

    async modifyTableOperation(data, context) {
        const { tableName, modifications } = data;
        const results = [];

        for (const modification of modifications) {
            const { type, ...modData } = modification;
            
            switch (type) {
                case 'billing':
                    await context.dynamodb.modifyTable({
                        TableName: tableName,
                        BillingMode: modData.mode,
                        ...(modData.mode === 'PROVISIONED' && {
                            ProvisionedThroughput: {
                                ReadCapacityUnits: modData.readCapacity,
                                WriteCapacityUnits: modData.writeCapacity
                            }
                        })
                    });
                    results.push({ type: 'billing', status: 'modified' });
                    break;
                    
                case 'streams':
                    await context.dynamodb.modifyTable({
                        TableName: tableName,
                        StreamSpecification: {
                            StreamEnabled: modData.enabled,
                            ...(modData.enabled && { StreamViewType: modData.viewType })
                        }
                    });
                    results.push({ type: 'streams', status: 'modified' });
                    break;
                    
                case 'pointInTimeRecovery':
                    await context.dynamodb.modifyTable({
                        TableName: tableName,
                        PointInTimeRecoverySpecification: {
                            PointInTimeRecoveryEnabled: modData.enabled
                        }
                    });
                    results.push({ type: 'pointInTimeRecovery', status: 'modified' });
                    break;
            }
        }

        return { status: 'modified', modifications: results };
    }

    async deleteTableOperation(data, context) {
        const { tableName, confirmationCode } = data;
        
        // Production safety check
        if (context.environment === 'production' && confirmationCode !== `DELETE-${tableName}-CONFIRMED`) {
            throw new Error('Production table deletion requires confirmation code');
        }

        await context.dynamodb.deleteTable({ TableName: tableName });
        return { status: 'deleted', tableName };
    }

    // Index Operations
    async createGSIOperation(data, context) {
        const { tableName, indexName, keySchema, attributeDefinitions, projection, billing } = data;

        const params = {
            TableName: tableName,
            AttributeDefinitions: attributeDefinitions,
            GlobalSecondaryIndexUpdates: [{
                Create: {
                    IndexName: indexName,
                    KeySchema: keySchema,
                    Projection: projection || { ProjectionType: 'ALL' },
                    ...(billing && {
                        ProvisionedThroughput: {
                            ReadCapacityUnits: billing.readCapacity,
                            WriteCapacityUnits: billing.writeCapacity
                        }
                    })
                }
            }]
        };

        await context.dynamodb.updateTable(params);
        return { status: 'creating', indexName, tableName };
    }

    async deleteGSIOperation(data, context) {
        const { tableName, indexName } = data;

        const params = {
            TableName: tableName,
            GlobalSecondaryIndexUpdates: [{
                Delete: { IndexName: indexName }
            }]
        };

        await context.dynamodb.updateTable(params);
        return { status: 'deleting', indexName, tableName };
    }

    // Data Operations
    async migrateDataOperation(data, context) {
        const { sourceTable, targetTable, transform, batchSize = 25 } = data;
        
        const results = {
            itemsProcessed: 0,
            itemsMigrated: 0,
            errors: []
        };

        // Use MCP tools for enhanced data processing if available
        if (config.enableMcpIntegration && data.useMcpTools) {
            return await this.mcpEnhancedDataMigration(data, context);
        }

        // Standard data migration
        let lastEvaluatedKey = null;
        
        do {
            const scanParams = {
                TableName: sourceTable,
                Limit: batchSize * 5, // Read more than we write for efficiency
                ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
            };

            const scanResult = await context.docClient.scan(scanParams);
            const items = scanResult.Items || [];
            
            if (items.length === 0) break;

            // Process items in batches
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const transformedBatch = transform ? 
                    batch.map(item => this.applyTransformation(item, transform)) : 
                    batch;

                try {
                    await this.batchWriteItems(targetTable, transformedBatch, context);
                    results.itemsMigrated += transformedBatch.length;
                } catch (error) {
                    results.errors.push({
                        batch: i / batchSize + 1,
                        error: error.message,
                        itemCount: transformedBatch.length
                    });
                }
                
                results.itemsProcessed += batch.length;
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey;
            
        } while (lastEvaluatedKey);

        return results;
    }

    async transformDataOperation(data, context) {
        const { tableName, transformation, filter, batchSize = 25 } = data;
        
        const results = {
            itemsProcessed: 0,
            itemsTransformed: 0,
            errors: []
        };

        let lastEvaluatedKey = null;
        
        do {
            const scanParams = {
                TableName: tableName,
                Limit: batchSize * 5,
                ...(filter && { FilterExpression: filter.expression }),
                ...(filter?.expressionAttributeValues && { 
                    ExpressionAttributeValues: filter.expressionAttributeValues 
                }),
                ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
            };

            const scanResult = await context.docClient.scan(scanParams);
            const items = scanResult.Items || [];
            
            if (items.length === 0) break;

            // Transform and update items
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                
                try {
                    const transformedItems = batch.map(item => ({
                        ...item,
                        ...this.applyTransformation(item, transformation)
                    }));

                    await this.batchWriteItems(tableName, transformedItems, context);
                    results.itemsTransformed += transformedItems.length;
                } catch (error) {
                    results.errors.push({
                        batch: i / batchSize + 1,
                        error: error.message
                    });
                }
                
                results.itemsProcessed += batch.length;
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey;
            
        } while (lastEvaluatedKey);

        return results;
    }

    // MCP Integration Operations
    async mcpToolChainOperation(data, context) {
        if (!config.enableMcpIntegration) {
            throw new Error('MCP integration is not enabled');
        }

        const { toolChain, variables = {} } = data;
        const results = [];

        for (const tool of toolChain) {
            try {
                const result = await this.executeMcpTool(tool, variables, context);
                results.push({
                    tool: tool.name,
                    status: 'success',
                    result
                });
                
                // Update variables with result data
                if (tool.outputVariable && result) {
                    variables[tool.outputVariable] = result;
                }
            } catch (error) {
                results.push({
                    tool: tool.name,
                    status: 'error',
                    error: error.message
                });
                
                if (tool.required) {
                    throw new Error(`Required MCP tool ${tool.name} failed: ${error.message}`);
                }
            }
        }

        return { status: 'completed', results };
    }

    // Helper Methods
    async waitForTableActive(tableName, context, maxWaitTime = 300000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const result = await context.dynamodb.describeTable({ TableName: tableName });
                if (result.Table.TableStatus === 'ACTIVE') {
                    return;
                }
                await this.sleep(5000); // Wait 5 seconds
            } catch (error) {
                if (error.name === 'ResourceNotFoundException') {
                    await this.sleep(5000);
                    continue;
                }
                throw error;
            }
        }
        
        throw new Error(`Table ${tableName} did not become active within ${maxWaitTime}ms`);
    }

    async batchWriteItems(tableName, items, context) {
        const batchSize = 25; // DynamoDB limit
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const requestItems = {
                [tableName]: batch.map(item => ({
                    PutRequest: { Item: item }
                }))
            };

            await context.docClient.batchWrite({ RequestItems: requestItems });
        }
    }

    applyTransformation(item, transformation) {
        const result = { ...item };
        
        for (const [field, transform] of Object.entries(transformation)) {
            switch (transform.type) {
                case 'rename':
                    if (item[field] !== undefined) {
                        result[transform.newName] = item[field];
                        delete result[field];
                    }
                    break;
                case 'format':
                    if (item[field] !== undefined) {
                        result[field] = this.formatValue(item[field], transform.format);
                    }
                    break;
                case 'compute':
                    result[field] = this.computeValue(item, transform.expression);
                    break;
                case 'default':
                    if (item[field] === undefined) {
                        result[field] = transform.value;
                    }
                    break;
            }
        }
        
        return result;
    }

    formatValue(value, format) {
        switch (format.type) {
            case 'date':
                return new Date(value).toISOString();
            case 'number':
                return parseFloat(value);
            case 'string':
                return String(value);
            case 'uppercase':
                return String(value).toUpperCase();
            case 'lowercase':
                return String(value).toLowerCase();
            default:
                return value;
        }
    }

    computeValue(item, expression) {
        // Simple expression evaluator - extend as needed
        try {
            // WARNING: In production, use a safe expression evaluator
            return new Function('item', `return ${expression}`)(item);
        } catch (error) {
            logger.warn('Failed to compute expression', { expression, error: error.message });
            return null;
        }
    }

    async executeMcpTool(tool, variables, context) {
        // MCP tool execution - integrate with your MCP hub
        const mcpRequest = {
            tool: tool.name,
            parameters: this.interpolateVariables(tool.parameters, variables),
            context: {
                migrationId: context.migrationId,
                environment: context.environment
            }
        };

        // This would integrate with your actual MCP hub
        // For now, return a mock response
        return { success: true, tool: tool.name, parameters: mcpRequest.parameters };
    }

    interpolateVariables(obj, variables) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                const varName = value.slice(2, -2);
                result[key] = variables[varName] || value;
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Migration Manager
class MigrationManager {
    constructor() {
        this.operations = new MigrationOperationsLibrary();
        this.activeMigrations = new Map();
        this.migrationHistory = new Map();
    }

    async executeMigration(migrationData, context) {
        const migrationId = uuidv4();
        context.migrationId = migrationId;

        // Check concurrent migration limit
        if (this.activeMigrations.size >= config.maxConcurrentMigrations) {
            throw new Error('Maximum concurrent migrations limit reached');
        }

        const migration = {
            id: migrationId,
            name: migrationData.name,
            version: migrationData.version,
            status: 'running',
            startTime: new Date(),
            environment: context.environment,
            operations: migrationData.operations,
            results: []
        };

        this.activeMigrations.set(migrationId, migration);

        try {
            // Execute pre-migration hooks
            if (migrationData.preHooks) {
                await this.executeHooks(migrationData.preHooks, context);
            }

            // Create backup if required
            if (migrationData.backupRequired || context.environment === 'production') {
                await this.createMigrationBackup(migrationData, context);
            }

            // Execute operations
            for (let i = 0; i < migrationData.operations.length; i++) {
                const operation = migrationData.operations[i];
                
                try {
                    const result = await this.operations.executeOperation(
                        operation.type, 
                        operation.data || operation, 
                        context
                    );
                    
                    migration.results.push({
                        operationIndex: i,
                        type: operation.type,
                        status: 'success',
                        result,
                        completedAt: new Date()
                    });
                } catch (error) {
                    migration.results.push({
                        operationIndex: i,
                        type: operation.type,
                        status: 'error',
                        error: error.message,
                        completedAt: new Date()
                    });
                    
                    if (operation.required !== false) {
                        throw error;
                    }
                }
                
                // Update progress
                migration.progress = ((i + 1) / migrationData.operations.length) * 100;
            }

            // Execute post-migration hooks
            if (migrationData.postHooks) {
                await this.executeHooks(migrationData.postHooks, context);
            }

            // Mark as completed
            migration.status = 'completed';
            migration.endTime = new Date();
            migration.duration = migration.endTime - migration.startTime;

            // Record in history
            await this.recordMigrationHistory(migration, context);

            logger.info('Migration completed successfully', { 
                migrationId, 
                duration: migration.duration 
            });

            return migration;

        } catch (error) {
            migration.status = 'failed';
            migration.endTime = new Date();
            migration.duration = migration.endTime - migration.startTime;
            migration.error = error.message;

            // Record failure in history
            await this.recordMigrationHistory(migration, context);

            logger.error('Migration failed', { 
                migrationId, 
                error: error.message,
                duration: migration.duration
            });

            throw error;
        } finally {
            // Move from active to history
            this.activeMigrations.delete(migrationId);
            this.migrationHistory.set(migrationId, migration);
        }
    }

    async createMigrationBackup(migrationData, context) {
        // Extract affected tables from operations
        const affectedTables = new Set();
        
        for (const operation of migrationData.operations) {
            if (operation.tableName) {
                affectedTables.add(operation.tableName);
            }
            if (operation.data?.tableName) {
                affectedTables.add(operation.data.tableName);
            }
        }

        if (affectedTables.size > 0) {
            const backupResult = await this.operations.executeOperation(
                'createBackup',
                { 
                    tables: Array.from(affectedTables),
                    reason: `Pre-migration backup for ${migrationData.name}`,
                    migrationId: context.migrationId
                },
                context
            );
            
            logger.info('Pre-migration backup created', { 
                migrationId: context.migrationId,
                tables: Array.from(affectedTables),
                backupId: backupResult.backupId
            });
        }
    }

    async executeHooks(hooks, context) {
        for (const hook of hooks) {
            if (hook.type === 'mcpTool') {
                await this.operations.executeOperation('mcpToolChain', { toolChain: [hook] }, context);
            } else if (hook.type === 'customScript') {
                await this.operations.executeOperation('customScript', hook, context);
            }
        }
    }

    async recordMigrationHistory(migration, context) {
        const historyRecord = {
            migrationId: migration.id,
            appliedAt: migration.endTime || new Date(),
            name: migration.name,
            version: migration.version,
            status: migration.status,
            environment: context.environment,
            region: config.region,
            duration: migration.duration,
            operationCount: migration.operations.length,
            successfulOperations: migration.results.filter(r => r.status === 'success').length,
            ...(migration.error && { error: migration.error })
        };

        try {
            await context.docClient.put({
                TableName: `${context.tablePrefix}-migration-history`,
                Item: historyRecord
            });
        } catch (error) {
            logger.error('Failed to record migration history', { 
                migrationId: migration.id, 
                error: error.message 
            });
        }
    }

    getMigrationStatus(migrationId) {
        return this.activeMigrations.get(migrationId) || this.migrationHistory.get(migrationId);
    }

    listActiveMigrations() {
        return Array.from(this.activeMigrations.values());
    }

    listMigrationHistory(limit = 50) {
        return Array.from(this.migrationHistory.values())
            .sort((a, b) => b.startTime - a.startTime)
            .slice(0, limit);
    }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
            logger.warn('Invalid token attempt', { 
                ip: req.ip, 
                userAgent: req.get('User-Agent'),
                error: err.message 
            });
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        req.user = user;
        next();
    });
};

// Authorization Middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required: roles,
                current: req.user?.role
            });
        }
        next();
    };
};

// Environment Middleware
const requireEnvironment = (allowedEnvs) => {
    return (req, res, next) => {
        const targetEnv = req.body.environment || req.query.environment || config.environment;
        
        if (!allowedEnvs.includes(targetEnv)) {
            return res.status(403).json({ 
                error: 'Environment not allowed',
                allowed: allowedEnvs,
                requested: targetEnv
            });
        }
        
        req.targetEnvironment = targetEnv;
        next();
    };
};

// Initialize Migration Manager
const migrationManager = new MigrationManager();

// API Routes

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '1.0.0',
        environment: config.environment,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Authentication
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // In production, validate against a proper user database
        // This is a simplified example
        const validUsers = {
            'admin': { 
                password: await bcrypt.hash('admin-password', 10), 
                role: 'admin',
                permissions: ['read', 'write', 'admin']
            },
            'developer': { 
                password: await bcrypt.hash('dev-password', 10), 
                role: 'developer',
                permissions: ['read', 'write']
            },
            'readonly': { 
                password: await bcrypt.hash('readonly-password', 10), 
                role: 'readonly',
                permissions: ['read']
            }
        };

        const user = validUsers[username];
        if (!user || !await bcrypt.compare(password, user.password)) {
            logger.warn('Failed login attempt', { username, ip: req.ip });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { 
                username, 
                role: user.role,
                permissions: user.permissions,
                iat: Math.floor(Date.now() / 1000)
            },
            config.jwtSecret,
            { expiresIn: config.jwtExpiration }
        );

        logger.info('Successful login', { username, role: user.role, ip: req.ip });

        res.json({
            token,
            user: {
                username,
                role: user.role,
                permissions: user.permissions
            },
            expiresIn: config.jwtExpiration
        });

    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Token Validation
app.get('/api/auth/validate', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: req.user,
        expiresAt: req.user.exp * 1000
    });
});

// Migration Operations

// List Available Operations
app.get('/api/operations', authenticateToken, (req, res) => {
    const operations = Array.from(migrationManager.operations.operations.keys());
    
    res.json({
        operations: operations.map(op => ({
            name: op,
            description: `${op} operation`,
            category: this.getCategoryForOperation(op)
        })),
        total: operations.length
    });
});

// Validate Migration
app.post('/api/migrations/validate', 
    authenticateToken,
    requireRole(['admin', 'developer']),
    async (req, res) => {
        try {
            const { migration } = req.body;

            if (!migration) {
                return res.status(400).json({ error: 'Migration data required' });
            }

            // Comprehensive validation
            const validation = await this.validateMigration(migration);

            res.json({
                valid: validation.valid,
                errors: validation.errors || [],
                warnings: validation.warnings || [],
                summary: {
                    operations: migration.operations?.length || 0,
                    estimatedDuration: migration.estimatedDuration,
                    riskLevel: this.calculateRiskLevel(migration)
                }
            });

        } catch (error) {
            logger.error('Migration validation error', { error: error.message });
            res.status(500).json({ error: 'Validation failed' });
        }
    }
);

// Execute Migration
app.post('/api/migrations/execute',
    authenticateToken,
    requireRole(['admin', 'developer']),
    requireEnvironment(['development', 'staging', 'production']),
    async (req, res) => {
        try {
            const { migration, dryRun = false } = req.body;

            if (!migration) {
                return res.status(400).json({ error: 'Migration data required' });
            }

            // Production safety check
            if (req.targetEnvironment === 'production' && !req.user.permissions.includes('admin')) {
                return res.status(403).json({ 
                    error: 'Production migrations require admin privileges' 
                });
            }

            const context = {
                environment: req.targetEnvironment,
                user: req.user,
                dynamodb: dynamoDbClient,
                docClient: docClient,
                tablePrefix: this.getTablePrefix(req.targetEnvironment),
                dryRun
            };

            if (dryRun) {
                // Dry run - validate and plan only
                const plan = await this.createExecutionPlan(migration, context);
                res.json({
                    dryRun: true,
                    plan,
                    estimatedDuration: migration.estimatedDuration
                });
            } else {
                // Execute migration
                const result = await migrationManager.executeMigration(migration, context);
                res.json({
                    migrationId: result.id,
                    status: result.status,
                    startTime: result.startTime,
                    operations: result.results,
                    progress: result.progress || 100
                });
            }

        } catch (error) {
            logger.error('Migration execution error', { 
                error: error.message,
                user: req.user.username,
                environment: req.targetEnvironment
            });
            res.status(500).json({ 
                error: 'Migration execution failed',
                details: error.message
            });
        }
    }
);

// Get Migration Status
app.get('/api/migrations/:migrationId', 
    authenticateToken,
    (req, res) => {
        try {
            const migration = migrationManager.getMigrationStatus(req.params.migrationId);
            
            if (!migration) {
                return res.status(404).json({ error: 'Migration not found' });
            }

            res.json(migration);

        } catch (error) {
            logger.error('Get migration status error', { error: error.message });
            res.status(500).json({ error: 'Failed to get migration status' });
        }
    }
);

// List Active Migrations
app.get('/api/migrations/active',
    authenticateToken,
    (req, res) => {
        try {
            const activeMigrations = migrationManager.listActiveMigrations();
            res.json({
                migrations: activeMigrations,
                count: activeMigrations.length,
                maxConcurrent: config.maxConcurrentMigrations
            });

        } catch (error) {
            logger.error('List active migrations error', { error: error.message });
            res.status(500).json({ error: 'Failed to list active migrations' });
        }
    }
);

// List Migration History
app.get('/api/migrations/history',
    authenticateToken,
    (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const environment = req.query.environment;
            
            let history = migrationManager.listMigrationHistory(limit);
            
            if (environment) {
                history = history.filter(m => m.environment === environment);
            }

            res.json({
                migrations: history,
                count: history.length,
                limit
            });

        } catch (error) {
            logger.error('List migration history error', { error: error.message });
            res.status(500).json({ error: 'Failed to list migration history' });
        }
    }
);

// MCP Integration Endpoints

// List Available MCP Tools
app.get('/api/mcp/tools',
    authenticateToken,
    requireRole(['admin', 'developer']),
    async (req, res) => {
        try {
            if (!config.enableMcpIntegration) {
                return res.status(503).json({ error: 'MCP integration is not enabled' });
            }

            // This would integrate with your actual MCP hub
            const mockTools = [
                {
                    name: 'aws-dynamodb',
                    description: 'AWS DynamoDB operations',
                    capabilities: ['list_tables', 'describe_table', 'scan_table']
                },
                {
                    name: 'data-transformer',
                    description: 'Data transformation utilities',
                    capabilities: ['transform_json', 'validate_schema', 'format_data']
                }
            ];

            res.json({
                tools: mockTools,
                enabled: config.enableMcpIntegration,
                hubEndpoint: config.mcpHubEndpoint
            });

        } catch (error) {
            logger.error('List MCP tools error', { error: error.message });
            res.status(500).json({ error: 'Failed to list MCP tools' });
        }
    }
);

// Execute MCP Tool Chain
app.post('/api/mcp/execute',
    authenticateToken,
    requireRole(['admin', 'developer']),
    async (req, res) => {
        try {
            if (!config.enableMcpIntegration) {
                return res.status(503).json({ error: 'MCP integration is not enabled' });
            }

            const { toolChain, variables = {} } = req.body;

            if (!toolChain || !Array.isArray(toolChain)) {
                return res.status(400).json({ error: 'Tool chain array required' });
            }

            const context = {
                environment: config.environment,
                user: req.user,
                migrationId: uuidv4()
            };

            const result = await migrationManager.operations.executeOperation(
                'mcpToolChain',
                { toolChain, variables },
                context
            );

            res.json(result);

        } catch (error) {
            logger.error('MCP tool execution error', { error: error.message });
            res.status(500).json({ error: 'MCP tool execution failed' });
        }
    }
);

// Utility Methods
app.getCategoryForOperation = (operation) => {
    const categories = {
        createTable: 'table',
        modifyTable: 'table',
        deleteTable: 'table',
        createGSI: 'index',
        deleteGSI: 'index',
        createLSI: 'index',
        updateCapacity: 'capacity',
        enableAutoScaling: 'capacity',
        migrateData: 'data',
        transformData: 'data',
        seedData: 'data',
        createBackup: 'backup',
        restoreBackup: 'backup',
        enableStreams: 'advanced',
        enablePointInTimeRecovery: 'advanced',
        addTags: 'metadata',
        enableEncryption: 'security',
        customScript: 'custom',
        mcpToolChain: 'integration'
    };
    return categories[operation] || 'general';
};

app.validateMigration = async (migration) => {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!migration.name) errors.push('Migration name is required');
    if (!migration.version) errors.push('Migration version is required');
    if (!migration.operations || !Array.isArray(migration.operations)) {
        errors.push('Migration operations array is required');
    }

    // Version format validation
    if (migration.version && !/^\d+\.\d+\.\d+$/.test(migration.version)) {
        errors.push('Invalid version format (expected: X.Y.Z)');
    }

    // Operations validation
    if (migration.operations) {
        migration.operations.forEach((op, index) => {
            if (!op.type) {
                errors.push(`Operation ${index + 1}: type is required`);
            } else if (!migrationManager.operations.operations.has(op.type)) {
                errors.push(`Operation ${index + 1}: unknown operation type '${op.type}'`);
            }
        });
    }

    // Environment-specific validations
    if (migration.targetEnvironment === 'production') {
        if (!migration.backupRequired) {
            warnings.push('Production migrations should enable backup');
        }
        if (!migration.rollbackProcedure) {
            warnings.push('Production migrations should define rollback procedures');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
};

app.calculateRiskLevel = (migration) => {
    let riskScore = 0;
    
    if (migration.operations) {
        migration.operations.forEach(op => {
            switch (op.type) {
                case 'deleteTable':
                case 'deleteGSI':
                    riskScore += 3;
                    break;
                case 'migrateData':
                case 'transformData':
                    riskScore += 2;
                    break;
                case 'createTable':
                case 'modifyTable':
                    riskScore += 1;
                    break;
            }
        });
    }
    
    if (riskScore >= 5) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
};

app.createExecutionPlan = async (migration, context) => {
    const plan = {
        migration: migration.name,
        version: migration.version,
        environment: context.environment,
        operations: [],
        estimatedDuration: migration.estimatedDuration || 'Unknown',
        riskLevel: this.calculateRiskLevel(migration),
        backupRequired: migration.backupRequired || context.environment === 'production'
    };

    for (let i = 0; i < migration.operations.length; i++) {
        const operation = migration.operations[i];
        plan.operations.push({
            step: i + 1,
            type: operation.type,
            description: operation.description || `Execute ${operation.type}`,
            estimatedTime: operation.estimatedTime || '5 minutes',
            riskLevel: operation.riskLevel || 'medium',
            rollbackSupported: operation.rollbackSupported !== false
        });
    }

    return plan;
};

app.getTablePrefix = (environment) => {
    const prefixes = {
        development: 'ai-nexus-workbench-development',
        staging: 'ai-nexus-workbench-staging', 
        production: 'ai-nexus-workbench-prod'
    };
    return prefixes[environment] || 'ai-nexus-workbench-development';
};

// Error Handler
app.use((error, req, res, next) => {
    logger.error('Unhandled error', { 
        error: error.message, 
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    res.status(500).json({
        error: 'Internal server error',
        message: config.environment === 'development' ? error.message : undefined
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start Server
const server = app.listen(config.port, () => {
    logger.info(`Migration API Server started`, {
        port: config.port,
        environment: config.environment,
        mcpIntegration: config.enableMcpIntegration,
        nodeVersion: process.version
    });
});

module.exports = app;
