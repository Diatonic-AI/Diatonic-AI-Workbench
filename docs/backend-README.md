# Diatonic AI - Backend Implementation

This document provides comprehensive information about the Diatonic AI backend implementation, including the Community and Observatory services.

## 🏗️ Architecture Overview

The backend consists of two main stacks:

### 1. Community Backend (`CommunityCoreStack`)
Handles social features, user interactions, and community management:

- **Posts Management**: Create, read, update posts with engagement tracking
- **Groups & Communities**: Community creation and management
- **User Interactions**: Likes, comments, follows, bookmarks
- **Content Moderation**: Automated and manual content review
- **Real-time Notifications**: SNS-based notification system

### 2. Observatory Backend (`ObservatoryCoreStack`) 
Provides analytics, monitoring, and metrics tracking:

- **Metrics Collection**: Real-time metrics recording and aggregation
- **Event Tracking**: Custom event tracking with properties
- **Session Management**: User session tracking and analytics
- **Dashboard Data**: Pre-aggregated analytics for reporting
- **Real-time Streaming**: Optional Kinesis-based real-time analytics
- **Data Lake Integration**: Optional S3 + Glue + Athena for long-term analytics

## 📊 Database Schema

### Community Tables (DynamoDB)

#### Posts Table (`posts`)
```
PK: POST#<post_id>
SK: METADATA
Attributes:
- tenant_id (string, GSI partition key)
- author_id (string, GSI partition key) 
- category (string, GSI partition key)
- title, content, tags[]
- like_count, comment_count, engagement_score
- created_at, updated_at
- status: draft|published|archived|moderated
```

#### Groups Table (`groups`)
```
PK: GROUP#<group_id>
SK: METADATA | MEMBER#<user_id>
Attributes:
- tenant_id (string, GSI partition key)
- name, description, group_type
- member_count, post_count
- created_at, updated_at
```

#### Interactions Table (`interactions`)
```
PK: INTERACTION#<type>#<content_id>
SK: <user_id>#<timestamp>
Attributes:
- interaction_type: like|follow|comment|share|bookmark
- content_type: post|comment|group|user
- created_at, ttl
```

### Observatory Tables (DynamoDB)

#### Metrics Table (`metrics`)
```
PK: <metric_type>#<tenant_id>
SK: <timestamp>#<user_id>
Attributes:
- metric_name, value, unit
- dimensions{}, properties{}
- session_id, timestamp, ttl
```

#### Events Table (`events`)
```  
PK: <event_type>#<date>
SK: <timestamp>#<event_id>
Attributes:
- event_name, event_type
- properties{}, user_id, session_id
- timestamp, ttl
```

#### Sessions Table (`sessions`)
```
PK: <session_id>
SK: <updated_at>
Attributes:
- user_id, tenant_id
- started_at, last_activity, duration_seconds
- page_views, events_count
- device_info{}, referrer, utm_parameters{}
```

#### Aggregates Table (`aggregates`)
```
PK: <aggregation_type>#<period>
SK: <tenant_id>#<timestamp>
Attributes:
- period: hour|day|week|month
- period_start, period_end
- metrics{}, dimensions{}
```

## 🚀 Deployment Guide

### Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Node.js 18+** and npm
3. **AWS CDK** installed globally: `npm install -g aws-cdk`
4. **CDK Bootstrap** completed: `cdk bootstrap`

### Environment Setup

```bash
# Clone the repository
cd /home/daclab-ai/dev/AWS-DevOps/apps/diatonic-ai-platform

# Make deployment script executable
chmod +x scripts/deploy-backend.sh

# Set AWS environment variables
export AWS_REGION=us-east-2
export AWS_ACCOUNT_ID=<your-account-id>
```

### Deployment Options

#### 1. Development Environment (Basic)
```bash
./scripts/deploy-backend.sh --environment dev
```

#### 2. Staging Environment (Enhanced)
```bash
./scripts/deploy-backend.sh \
  --environment staging \
  --enable-waf \
  --enable-analytics
```

#### 3. Production Environment (Full Features)
```bash
./scripts/deploy-backend.sh \
  --environment prod \
  --enable-waf \
  --enable-logging \
  --enable-analytics \
  --enable-datalake
```

#### 4. Individual Stack Deployment
```bash
# Deploy only Community backend
./scripts/deploy-backend.sh --environment dev --stack-filter community

# Deploy only Observatory backend  
./scripts/deploy-backend.sh --environment dev --stack-filter observatory
```

#### 5. Dry Run (Preview Changes)
```bash
./scripts/deploy-backend.sh --environment prod --dry-run
```

### Deployment Script Options

| Option | Description | Default |
|--------|-------------|---------|
| `-e, --environment` | Environment (dev/staging/prod) | `dev` |
| `-w, --enable-waf` | Enable WAF protection | `false` |
| `-l, --enable-logging` | Enable detailed logging | `false` |
| `-a, --enable-analytics` | Enable real-time analytics | `false` |
| `-d, --enable-datalake` | Enable data lake features | `false` |
| `-c, --cors-origins` | CORS origins (comma-separated) | `localhost:3000,8080` |
| `-s, --stack-filter` | Deploy specific stack | `all` |
| `-n, --dry-run` | Preview without deploying | `false` |

## 📡 API Endpoints

### Community API

Base URL: `https://<api-gateway-url>/v1`

#### Posts
```
GET    /posts                    # List posts (paginated)
POST   /posts                    # Create new post
GET    /posts/{id}               # Get specific post
PUT    /posts/{id}               # Update post
DELETE /posts/{id}               # Delete post

Query Parameters:
- limit: Number of posts (default: 20)
- category: Filter by category
- author: Filter by author ID
- tag: Filter by tag
- sortBy: created_at|engagement_score
- order: asc|desc
- cursor: Pagination cursor
```

#### Groups
```
GET    /groups                   # List groups
POST   /groups                   # Create new group
GET    /groups/{id}              # Get specific group
PUT    /groups/{id}              # Update group
DELETE /groups/{id}              # Delete group

POST   /groups/{id}/members      # Join group
DELETE /groups/{id}/members/{userId}  # Leave/remove member
```

#### Interactions
```
POST   /interactions             # Add interaction (like, follow, etc.)
DELETE /interactions/{id}        # Remove interaction
GET    /users/{id}/interactions  # Get user interactions
```

### Observatory API

Base URL: `https://<api-gateway-url>/v1`

#### Metrics
```
POST   /metrics                  # Record metric
GET    /metrics                  # Get metrics data

Query Parameters:
- metricType: Required metric type filter
- startTime: ISO timestamp
- endTime: ISO timestamp  
- granularity: hour|day|week|month
- limit: Number of results
```

#### Events
```
POST   /events                   # Track event
GET    /events                   # Get events data
```

#### Sessions
```
POST   /sessions                 # Create new session
PUT    /sessions/{id}            # Update session
GET    /sessions/{id}            # Get session data
```

#### Analytics
```
GET    /dashboard                # Get dashboard data
GET    /users/{id}/activity      # Get user activity

Query Parameters:
- period: hour|day|week|month
- days: Number of days back
- hours: Number of hours back  
- limit: Number of results
```

## 🔐 Authentication & Authorization

Both APIs use **AWS Cognito** for authentication:

### Required Headers
```
Authorization: Bearer <jwt-token>
X-Session-ID: <session-id>        # Optional for Observatory
Content-Type: application/json
```

### JWT Claims
```json
{
  "sub": "user-id",
  "email": "user@example.com", 
  "custom:tenant_id": "tenant-123",
  "custom:role": "user|admin|moderator",
  "custom:reputation_score": 100,
  "custom:community_level": "bronze"
}
```

### Tenant Isolation
All operations are automatically scoped to the tenant specified in the JWT token's `custom:tenant_id` claim.

## 📈 Monitoring & Observability

### CloudWatch Dashboards
Each environment gets a dedicated dashboard showing:
- API request counts and latency
- DynamoDB read/write capacity utilization
- Lambda function metrics
- Error rates and alarms

### EventBridge Integration
Both backends publish events to EventBridge for:
- Cross-service communication
- Triggering aggregation workflows  
- Real-time notifications
- Audit logging

### Optional Features

#### Real-time Analytics (Kinesis)
When enabled, provides:
- Real-time event streaming
- Sub-second analytics updates
- Stream processing with Lambda

#### Data Lake (S3 + Glue + Athena)
When enabled, provides:
- Long-term data retention
- Complex analytical queries
- Data science/ML workloads
- Historical trend analysis

## 🛠️ Local Development

### Lambda Function Testing

```bash
# Install dependencies
cd lambda/community-api && npm install
cd ../observatory-api && npm install

# Run type checking
npm run type-check

# Run linting  
npm run lint

# Run tests (when available)
npm run test
```

### CDK Development

```bash
cd infra

# Install dependencies
npm install

# Synthesize CloudFormation templates
cdk synth --app "npx ts-node bin/backend-stacks.ts"

# Validate changes
cdk diff AiNexusCommunityCore-dev --context environment=dev

# Deploy single stack
cdk deploy AiNexusCommunityCore-dev --context environment=dev
```

## 🔧 Configuration

### Environment Variables

#### Community API Lambda
```
POSTS_TABLE_NAME=ainexus-community-dev-posts
GROUPS_TABLE_NAME=ainexus-community-dev-groups
INTERACTIONS_TABLE_NAME=ainexus-community-dev-interactions
MODERATION_TABLE_NAME=ainexus-community-dev-moderation
CONTENT_BUCKET_NAME=ainexus-community-dev-content-*
EVENT_BUS_NAME=ainexus-community-dev-events
NOTIFICATION_TOPIC_ARN=arn:aws:sns:*
USER_POOL_ID=us-east-2_*
CORS_ORIGINS=["*"]
```

#### Observatory API Lambda
```
METRICS_TABLE_NAME=ainexus-observatory-dev-metrics
AGGREGATES_TABLE_NAME=ainexus-observatory-dev-aggregates
SESSIONS_TABLE_NAME=ainexus-observatory-dev-sessions
EVENTS_TABLE_NAME=ainexus-observatory-dev-events
EVENT_BUS_NAME=ainexus-observatory-dev-events
ANALYTICS_STREAM_NAME=ainexus-observatory-dev-analytics
DATA_LAKE_BUCKET=ainexus-observatory-dev-datalake-*
RETENTION_DAYS=30
```

## 🧪 Testing

### Health Checks
```bash
# Test Community API
curl https://<community-api>/v1/health

# Test Observatory API  
curl https://<observatory-api>/v1/health
```

### Example API Calls

#### Create a Post
```bash
curl -X POST https://<community-api>/v1/posts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello World",
    "content": "My first post!",
    "category": "general",
    "tags": ["introduction", "hello"]
  }'
```

#### Record a Metric
```bash
curl -X POST https://<observatory-api>/v1/metrics \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "metricName": "page.view",
    "value": 1,
    "dimensions": {"page": "/dashboard"},
    "properties": {"load_time": 1.23}
  }'
```

## 🔒 Security Considerations

### WAF Protection (Production)
When `--enable-waf` is used, the following protections are applied:
- AWS Managed Rules (Common Rule Set)
- Rate limiting (1000 requests/minute per IP)
- Automatic blocking of malicious patterns

### Data Protection
- All DynamoDB tables encrypted at rest
- S3 buckets with public access blocked
- VPC endpoints for internal communication (when available)
- IAM roles with least-privilege access

### Content Moderation
The Community backend includes:
- Automated content scanning (configurable)
- Manual moderation workflows
- User reputation scoring
- Community-based flagging system

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [EventBridge Patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)

## 🆘 Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

2. **Lambda Timeout Issues**
   - Check DynamoDB throttling in CloudWatch
   - Verify network connectivity
   - Review Lambda memory allocation

3. **CORS Errors**
   - Verify `corsOrigins` context parameter
   - Check API Gateway CORS configuration
   - Ensure preflight OPTIONS handling

4. **Authentication Failures**
   - Validate Cognito User Pool configuration
   - Check JWT token expiration
   - Verify custom attributes setup

### Cleanup

```bash
# Destroy all stacks (WARNING: Data loss)
cdk destroy AiNexusObservatoryCore-dev AiNexusCommunityCore-dev \
  --context environment=dev
```

---

🚀 **Ready to deploy?** Run `./scripts/deploy-backend.sh --help` for deployment options.
