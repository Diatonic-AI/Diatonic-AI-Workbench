#!/usr/bin/env node

/**
 * Extract Production DynamoDB Table Schemas
 * 
 * This script extracts all table schemas from production DynamoDB
 * and generates a comprehensive local setup script.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// AWS configuration
const AWS_REGION = 'us-east-2';
const TABLE_PREFIX = 'aws-devops-dev-';

// Exclude terraform and stripe tables from main app setup
const EXCLUDE_PATTERNS = [
  'terraform-state-lock',
  'ai-nexus-dev-stripe-',
  'diatonic-prod-',
  'diatonic-ai-workbench-dev'
];

async function executeAwsCommand(command) {
  try {
    console.log(`🔍 Executing: ${command.slice(0, 100)}...`);
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.warn(`⚠️  Warning: ${stderr}`);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`❌ Error executing command: ${error.message}`);
    return null;
  }
}

async function getTableSchema(tableName) {
  const command = `aws dynamodb describe-table --table-name "${tableName}" --region ${AWS_REGION}`;
  const result = await executeAwsCommand(command);
  
  if (!result || !result.Table) {
    console.error(`❌ Failed to get schema for table: ${tableName}`);
    return null;
  }
  
  const table = result.Table;
  
  // Extract essential schema information
  const schema = {
    TableName: tableName.replace('aws-devops-dev-', 'dev-ai-nexus-'),
    KeySchema: table.KeySchema,
    AttributeDefinitions: table.AttributeDefinitions,
    BillingMode: table.BillingMode || 'PROVISIONED',
    ProvisionedThroughput: table.BillingMode === 'PAY_PER_REQUEST' ? undefined : {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };
  
  // Add Global Secondary Indexes if they exist
  if (table.GlobalSecondaryIndexes && table.GlobalSecondaryIndexes.length > 0) {
    schema.GlobalSecondaryIndexes = table.GlobalSecondaryIndexes.map(gsi => ({
      IndexName: gsi.IndexName,
      KeySchema: gsi.KeySchema,
      Projection: gsi.Projection,
      ProvisionedThroughput: table.BillingMode === 'PAY_PER_REQUEST' ? undefined : {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));
  }
  
  // Add Local Secondary Indexes if they exist
  if (table.LocalSecondaryIndexes && table.LocalSecondaryIndexes.length > 0) {
    schema.LocalSecondaryIndexes = table.LocalSecondaryIndexes.map(lsi => ({
      IndexName: lsi.IndexName,
      KeySchema: lsi.KeySchema,
      Projection: lsi.Projection
    }));
  }
  
  return schema;
}

async function getSampleData(tableName, limit = 5) {
  const command = `aws dynamodb scan --table-name "${tableName}" --region ${AWS_REGION} --limit ${limit}`;
  const result = await executeAwsCommand(command);
  
  if (!result || !result.Items) {
    return [];
  }
  
  return result.Items;
}

async function extractAllSchemas() {
  console.log('🚀 Extracting Production DynamoDB Schemas');
  console.log('==========================================\\n');
  
  // Get list of tables
  console.log('📋 Getting table list...');
  const tablesResult = await executeAwsCommand(`aws dynamodb list-tables --region ${AWS_REGION}`);
  
  if (!tablesResult || !tablesResult.TableNames) {
    console.error('❌ Failed to get table list');
    return;
  }
  
  // Filter tables
  const relevantTables = tablesResult.TableNames.filter(tableName => {
    if (!tableName.startsWith(TABLE_PREFIX)) return false;
    
    for (const pattern of EXCLUDE_PATTERNS) {
      if (tableName.includes(pattern)) return false;
    }
    
    return true;
  });
  
  console.log(`📊 Found ${relevantTables.length} relevant tables:`);
  relevantTables.forEach(table => console.log(`   - ${table}`));
  console.log('');
  
  const schemas = {};
  const sampleData = {};
  
  // Extract schemas
  for (const tableName of relevantTables) {
    console.log(`📋 Processing table: ${tableName}`);
    
    const schema = await getTableSchema(tableName);
    if (schema) {
      schemas[schema.TableName] = schema;
      console.log(`   ✅ Schema extracted`);
      
      // Get sample data for seeding (if needed)
      const samples = await getSampleData(tableName, 3);
      if (samples.length > 0) {
        sampleData[schema.TableName] = samples;
        console.log(`   📄 Sample data: ${samples.length} items`);
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { schemas, sampleData, tableCount: relevantTables.length };
}

async function generateSetupScript(schemas, sampleData) {
  const timestamp = new Date().toISOString();
  
  const script = `#!/usr/bin/env node

/**
 * Production-Ready DynamoDB Local Setup Script
 * 
 * Generated from production schemas on ${timestamp}
 * This script creates an exact replica of your production DynamoDB tables locally.
 */

const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

// DynamoDB configuration for local development
const dynamoConfig = {
  endpoint: 'http://localhost:8002',
  region: 'us-east-2',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

const dynamoClient = new DynamoDB(dynamoConfig);
const docClient = DynamoDBDocument.from(dynamoClient);

// Production table schemas (extracted from AWS)
const TABLE_SCHEMAS = ${JSON.stringify(schemas, null, 2)};

// Helper functions
async function tableExists(tableName) {
  try {
    await dynamoClient.describeTable({ TableName: tableName });
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTable(schema) {
  const tableName = schema.TableName;
  console.log(\`🔨 Creating table: \${tableName}\`);
  
  try {
    // Remove undefined fields
    const cleanSchema = JSON.parse(JSON.stringify(schema));
    
    await dynamoClient.createTable(cleanSchema);
    
    // Wait for table to be active
    let status = 'CREATING';
    while (status !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await dynamoClient.describeTable({ TableName: tableName });
      status = result.Table.TableStatus;
      console.log(\`   ⏳ Table status: \${status}\`);
    }
    
    console.log(\`   ✅ Table created successfully: \${tableName}\`);
    return true;
  } catch (error) {
    console.error(\`   ❌ Error creating table \${tableName}:\`, error.message);
    return false;
  }
}

async function testConnection() {
  console.log('🔌 Testing DynamoDB connection...');
  
  try {
    await dynamoClient.listTables({});
    console.log('   ✅ Connection successful!');
    return true;
  } catch (error) {
    console.error('   ❌ Connection failed:', error.message);
    console.error('   💡 Make sure DynamoDB Local is running on http://localhost:8002');
    return false;
  }
}

async function main() {
  console.log('🚀 Production DynamoDB Local Setup');
  console.log('==================================\\n');
  
  // Test connection
  if (!(await testConnection())) {
    process.exit(1);
  }
  
  console.log('\\n📋 Setting up production tables...\\n');
  
  let tablesCreated = 0;
  let tablesSkipped = 0;
  
  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    if (await tableExists(tableName)) {
      console.log(\`⏭️  Table already exists: \${tableName}\`);
      tablesSkipped++;
    } else {
      if (await createTable(schema)) {
        tablesCreated++;
      }
    }
  }
  
  console.log(\`\\n📊 Summary:\`);
  console.log(\`   ✅ Tables created: \${tablesCreated}\`);
  console.log(\`   ⏭️  Tables skipped: \${tablesSkipped}\`);
  console.log(\`   📋 Total tables: \${Object.keys(TABLE_SCHEMAS).length}\`);
  
  console.log(\`\\n🎉 Production DynamoDB setup complete!\`);
  console.log(\`\\n🔍 Access DynamoDB Admin UI at: http://localhost:8001\`);
  console.log(\`📊 DynamoDB Local running at: http://localhost:8002\`);
  console.log(\`\\nYou can now run: npm run dev\\n\`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, testConnection, createTable };`;

  return script;
}

async function main() {
  try {
    const { schemas, sampleData, tableCount } = await extractAllSchemas();
    
    if (!schemas || Object.keys(schemas).length === 0) {
      console.error('❌ No schemas extracted');
      return;
    }
    
    console.log(`\\n📝 Generating setup script for ${tableCount} tables...`);
    
    const setupScript = await generateSetupScript(schemas, sampleData);
    
    // Write the new setup script
    const outputPath = path.join(__dirname, 'setup-production-dynamodb.js');
    fs.writeFileSync(outputPath, setupScript);
    
    // Make it executable
    fs.chmodSync(outputPath, '755');
    
    console.log(`\\n✅ Production setup script created: ${outputPath}`);
    console.log(`📊 Extracted ${Object.keys(schemas).length} table schemas`);
    
    // Create table summary
    const summaryPath = path.join(__dirname, 'production-tables-summary.md');
    const summary = generateTableSummary(schemas);
    fs.writeFileSync(summaryPath, summary);
    
    console.log(`📋 Table summary created: ${summaryPath}`);
    console.log('\\n🚀 Run the following to set up production replica:');
    console.log('   npm run docker:down && npm run docker:up');
    console.log('   node scripts/setup-production-dynamodb.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function generateTableSummary(schemas) {
  const timestamp = new Date().toISOString();
  
  let summary = `# Production DynamoDB Tables Summary

Generated on: ${timestamp}

## Tables Overview

Total tables extracted: ${Object.keys(schemas).length}

`;

  for (const [tableName, schema] of Object.entries(schemas)) {
    summary += `### ${tableName}

**Primary Key:**
`;
    
    schema.KeySchema.forEach(key => {
      const attr = schema.AttributeDefinitions.find(a => a.AttributeName === key.AttributeName);
      summary += `- ${key.AttributeName} (${key.KeyType}) - ${attr?.AttributeType}\n`;
    });
    
    if (schema.GlobalSecondaryIndexes) {
      summary += `\n**Global Secondary Indexes:**\n`;
      schema.GlobalSecondaryIndexes.forEach(gsi => {
        summary += `- ${gsi.IndexName}:\n`;
        gsi.KeySchema.forEach(key => {
          summary += `  - ${key.AttributeName} (${key.KeyType})\n`;
        });
      });
    }
    
    if (schema.LocalSecondaryIndexes) {
      summary += `\n**Local Secondary Indexes:**\n`;
      schema.LocalSecondaryIndexes.forEach(lsi => {
        summary += `- ${lsi.IndexName}\n`;
      });
    }
    
    summary += '\n';
  }
  
  return summary;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, extractAllSchemas, generateSetupScript };