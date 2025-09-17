# Diatonic AI - Complete DynamoDB Schema Documentation

This document describes the complete DynamoDB schema architecture for the Diatonic AI platform, including both the core tables and the additional tables needed to fully support the AI Lab and Toolset features.

## Overview

The Diatonic AI uses a comprehensive DynamoDB-based architecture to support its multi-faceted AI development platform. The schema is designed for:

- **Multi-tenancy**: Every table includes tenant isolation
- **Scalability**: Using DynamoDB's serverless architecture with GSIs for efficient querying
- **Security**: Server-side encryption and proper IAM policies
- **Performance**: Optimized access patterns with appropriate indexes
- **Cost-efficiency**: Pay-per-request billing mode

## Core Architecture Principles

### 1. Entity Relationships
```
Tenant (Organization)
├── Users
├── Projects
│   ├── Studio Flows (Agent Builder)
│   │   ├── Nodes
│   │   ├── Edges
│   │   └── Snapshots
│   └── Experiments (AI Lab)
│       ├── Runs
│       ├── Datasets
│       └── Models
├── Templates (Shared Resources)
└── Execution History
```

### 2. Access Patterns
- **Primary Keys**: Designed for direct entity access
- **GSIs**: Support query patterns like:
  - User-specific resources
  - Tenant-wide searches
  - Time-based queries
  - Status filtering
  - Public/shared resource discovery

## Core Tables (Existing)

### 1. Users Table
**Purpose**: User authentication and profile management
```
PK: user_id
Attributes: email, name, role, tenant_id, preferences, created_at, updated_at
GSIs:
- tenant-users-index: tenant_id + created_at
- email-lookup-index: email (unique)
```

### 2. Projects Table  
**Purpose**: Top-level project containers
```
PK: project_id
Attributes: name, description, type, owner_id, tenant_id, settings, created_at, updated_at
GSIs:
- tenant-projects-index: tenant_id + updated_at
- owner-projects-index: owner_id + created_at
```

### 3. Studio Flows Table
**Purpose**: Agent builder flow definitions  
```
PK: flow_id
Attributes: name, project_id, tenant_id, flow_data, metadata, version, created_at, updated_at
GSIs:
- project-flows-index: project_id + updated_at
- tenant-flows-index: tenant_id + updated_at
```

### 4. Studio Nodes Table
**Purpose**: Individual nodes within flows
```
PK: flow_id, SK: node_id
Attributes: type, position, data, connections, tenant_id, created_at, updated_at
GSIs:
- tenant-nodes-index: tenant_id + updated_at
```

### 5. Studio Edges Table
**Purpose**: Connections between nodes
```
PK: flow_id, SK: edge_id  
Attributes: source_node_id, target_node_id, source_handle, target_handle, tenant_id
GSIs:
- tenant-edges-index: tenant_id + flow_id
```

### 6. Studio Snapshots Table
**Purpose**: Flow version history
```
PK: flow_id, SK: snapshot_id
Attributes: version, flow_data, metadata, created_by, tenant_id, created_at
GSIs:
- tenant-snapshots-index: tenant_id + created_at
```

### 7. Experiments Table
**Purpose**: AI Lab experiment definitions
```
PK: experiment_id
Attributes: name, project_id, description, config, status, tenant_id, created_by, created_at, updated_at
GSIs:
- project-experiments-index: project_id + updated_at  
- tenant-experiments-index: tenant_id + updated_at
- status-experiments-index: status + updated_at
```

### 8. Experiment Runs Table
**Purpose**: Individual experiment executions
```
PK: experiment_id, SK: run_id
Attributes: status, config, metrics, start_time, end_time, tenant_id, created_by
GSIs:
- tenant-runs-index: tenant_id + start_time
- status-runs-index: status + start_time
```

### 9. Datasets Table  
**Purpose**: ML dataset management
```
PK: dataset_id
Attributes: name, project_id, description, type, location, metadata, tenant_id, created_at, updated_at
GSIs:
- project-datasets-index: project_id + updated_at
- tenant-datasets-index: tenant_id + updated_at
```

### 10. Models Table
**Purpose**: ML model management  
```
PK: model_id
Attributes: name, project_id, description, type, location, metadata, tenant_id, created_at, updated_at
GSIs:
- project-models-index: project_id + updated_at
- tenant-models-index: tenant_id + updated_at
```

## Additional Tables (New - AI Lab & Toolset Extensions)

### 11. Agent Templates Table
**Purpose**: Reusable flow patterns and templates for the Toolset
```
PK: template_id
Attributes: name, description, category, template_data, is_public, usage_count, rating, tenant_id, created_by, created_at, updated_at
GSIs:
- category-rating-index: category + rating (browse by category)
- public-usage-index: is_public + usage_count (popular public templates)
- tenant-templates-index: tenant_id + created_at (user's templates)
- popular-templates-index: category + usage_count (trending templates)
```

**Sample Data Structure**:
```json
{
  "template_id": "tmpl_chatbot_basic_001",
  "name": "Basic Chatbot Flow",
  "description": "A simple chatbot template with LLM integration",
  "category": "chatbots",
  "template_data": {
    "nodes": [...],
    "edges": [...],
    "config": {...}
  },
  "is_public": "true",
  "usage_count": 45,
  "rating": 4.2,
  "tenant_id": "tenant_123",
  "created_by": "user_456",
  "tags": ["beginner", "chatbot", "openai"],
  "created_at": "2025-01-07T10:00:00Z",
  "updated_at": "2025-01-07T10:00:00Z"
}
```

### 12. Flow Node Configs Table
**Purpose**: Enhanced node configurations and validation rules
```
PK: flow_id, SK: node_id
Attributes: node_type, config_schema, validation_rules, default_values, ui_config, tenant_id, updated_at
GSIs:
- node-type-index: node_type + updated_at (nodes by type)
- tenant-flows-index: tenant_id + flow_id (tenant node configs)
```

**Sample Data Structure**:
```json
{
  "flow_id": "flow_789",
  "node_id": "node_001", 
  "node_type": "llm_chat",
  "config_schema": {
    "model": {"type": "string", "required": true},
    "temperature": {"type": "number", "min": 0, "max": 2},
    "max_tokens": {"type": "number", "min": 1, "max": 4000}
  },
  "validation_rules": {
    "model": ["gpt-4", "gpt-3.5-turbo", "claude-3"],
    "custom_validations": ["validateApiKey"]
  },
  "default_values": {
    "temperature": 0.7,
    "max_tokens": 1000
  },
  "ui_config": {
    "display_order": ["model", "temperature", "max_tokens"],
    "groups": {"advanced": ["temperature", "max_tokens"]}
  },
  "tenant_id": "tenant_123",
  "updated_at": "2025-01-07T10:00:00Z"
}
```

### 13. Agent Execution History Table
**Purpose**: Track agent runs and performance metrics
```
PK: agent_id, SK: run_id
Attributes: user_id, tenant_id, status, input_data, output_data, execution_time, cost, error_details, started_at, completed_at, expires_at
GSIs:
- user-runs-index: user_id + started_at (user's executions)
- tenant-runs-index: tenant_id + started_at (tenant analytics)
- status-runs-index: status + started_at (filter by status)
- completed-runs-index: tenant_id + completed_at (completion analytics)
TTL: expires_at (180 days retention)
```

**Sample Data Structure**:
```json
{
  "agent_id": "agent_chatbot_001", 
  "run_id": "run_20250107_001",
  "user_id": "user_456",
  "tenant_id": "tenant_123",
  "status": "completed",
  "input_data": {
    "message": "Hello, how can you help?",
    "context": {...}
  },
  "output_data": {
    "response": "I can help you with...",
    "tokens_used": 150
  },
  "execution_time": 2.5,
  "cost": 0.003,
  "started_at": "2025-01-07T10:00:00Z",
  "completed_at": "2025-01-07T10:00:02.5Z",
  "expires_at": 1735689600
}
```

### 14. Lab Model Registry Table  
**Purpose**: Enhanced model management for AI Lab with deployment tracking
```
PK: tenant_id, SK: model_id
Attributes: project_id, name, model_type, version, status, deployment_status, metrics, config, location, created_at, updated_at
GSIs:
- project-models-index: project_id + updated_at (project models)
- type-status-index: model_type + status (filter by type/status)
- deployment-status-index: deployment_status + updated_at (deployment tracking)
- tenant-updated-index: tenant_id + updated_at (recent models)
```

**Sample Data Structure**:
```json
{
  "tenant_id": "tenant_123",
  "model_id": "model_classifier_v2",
  "project_id": "proj_789",
  "name": "Customer Intent Classifier v2.0",
  "model_type": "classification",
  "version": "2.0.1", 
  "status": "trained",
  "deployment_status": "deployed",
  "metrics": {
    "accuracy": 0.94,
    "f1_score": 0.92,
    "training_time": 3600
  },
  "config": {
    "algorithm": "transformer",
    "hyperparameters": {...}
  },
  "location": {
    "s3_path": "s3://models/customer-classifier-v2/",
    "endpoint": "https://api.example.com/models/classifier"
  },
  "created_at": "2025-01-07T10:00:00Z",
  "updated_at": "2025-01-07T12:00:00Z"
}
```

### 15. Experiment Run Logs Table
**Purpose**: Detailed logging for experiment execution monitoring
```
PK: experiment_id, SK: log_timestamp  
Attributes: run_id, log_level, component_type, message, metadata, tenant_id, expires_at
GSIs:
- run-logs-index: run_id + log_timestamp (run-specific logs)
- level-logs-index: log_level + log_timestamp (filter by severity) 
- component-logs-index: component_type + log_timestamp (component logs)
- tenant-logs-index: tenant_id + log_timestamp (tenant logs)
TTL: expires_at (30 days retention)
```

**Sample Data Structure**:
```json
{
  "experiment_id": "exp_789",
  "log_timestamp": "2025-01-07T10:00:00.123Z",
  "run_id": "run_001",
  "log_level": "info",
  "component_type": "data_loader", 
  "message": "Loaded 10,000 training samples",
  "metadata": {
    "samples_count": 10000,
    "processing_time": 1.2
  },
  "tenant_id": "tenant_123",
  "expires_at": 1738233600
}
```

## Query Patterns & Access Patterns

### Common Frontend Queries

1. **Dashboard - User's Projects**
   ```
   Table: Projects
   GSI: owner-projects-index  
   Query: owner_id = "user_123"
   ```

2. **Toolset - Browse Templates**
   ```
   Table: Agent Templates
   GSI: category-rating-index
   Query: category = "chatbots", rating >= 4.0
   ```

3. **AI Lab - Experiment History**
   ```
   Table: Experiments
   GSI: project-experiments-index
   Query: project_id = "proj_789"
   ```

4. **Agent Builder - Load Flow**
   ```
   Table: Studio Flows (primary)
   Query: flow_id = "flow_456"
   
   Then load related:
   - Studio Nodes: flow_id = "flow_456" 
   - Studio Edges: flow_id = "flow_456"
   ```

5. **Performance Analytics - Execution History**
   ```
   Table: Agent Execution History
   GSI: tenant-runs-index
   Query: tenant_id = "tenant_123", started_at between dates
   ```

## Security & Compliance

### Row Level Security (RLS)
- All tables include `tenant_id` for multi-tenant isolation
- IAM policies enforce tenant boundaries
- API Gateway validates tenant context in JWT tokens

### Data Encryption
- All tables use server-side encryption
- Sensitive fields (API keys, secrets) encrypted at application level
- Point-in-time recovery enabled for production tables

### Audit Trail
- All tables include `created_at`, `updated_at` timestamps
- Agent execution history provides detailed audit logs
- Experiment run logs track all ML operations

## Performance Optimization

### Read Patterns
- GSIs designed for common query patterns
- Projection type "ALL" for complex queries
- Composite sort keys for range queries

### Write Patterns  
- Single-table design where possible
- Batch operations for bulk inserts
- TTL for automatic cleanup of logs and history

### Cost Optimization
- Pay-per-request billing mode
- TTL reduces storage costs
- GSI projections minimize read costs

## Migration Strategy

### Phase 1: Core Tables (Existing)
✅ Already implemented and deployed

### Phase 2: AI Lab & Toolset Extensions (New)
1. Deploy additional tables via Terraform
2. Update API endpoints to support new entities
3. Frontend integration for enhanced features
4. Data migration for existing flows to new node config format

### Phase 3: Performance Optimization
1. Monitor query patterns and optimize GSIs
2. Implement caching layer for frequently accessed data
3. Add DynamoDB Streams for real-time updates

## Monitoring & Observability

### CloudWatch Metrics
- Read/Write capacity utilization
- Query performance and latency
- Error rates by table

### Application Metrics
- Agent execution success rates
- Template usage statistics
- Experiment completion rates

### Alerting
- High error rates
- Unusual access patterns
- Capacity threshold breaches

---

This comprehensive schema supports all current and planned features of the Diatonic AI platform while maintaining scalability, security, and cost-effectiveness.
