# Diatonic AI - Comprehensive DynamoDB Backend Schema

## Executive Summary

This document outlines the comprehensive DynamoDB backend architecture for the Diatonic AI platform. The design supports all identified features across the Dashboard, Education, Toolset, Lab, Observatory, Community, and CMS components with a scalable, multi-tenant architecture.

## 🏗️ Architecture Overview

### Multi-Tenant Design Strategy
- **Tenant Model**: Organization-based multi-tenancy with `tenantId` as the primary isolation boundary
- **User Model**: Users can belong to multiple organizations with different roles per organization
- **Data Isolation**: All data is partitioned by tenant with strict access controls

### Database Strategy
**Hybrid Approach**:
1. **Core Single Table**: `anw-core-{env}` for most entities and relationships
2. **Specialized Tables**: High-volume, time-series, and specialized use cases

## 📊 Core DynamoDB Tables

### 1. Core Table: `anw-core-{env}`

**Primary Structure**:
```
Primary Key: PK (string), SK (string)
Common Attributes:
- Type: string (entity type)
- TenantId: string (isolation boundary)
- EntityId: string (ULID)
- Status: string (active, inactive, draft, published, etc.)
- OwnerId: string (user who owns this entity)
- Name: string (human-readable name)
- Slug: string (optional URL-friendly identifier)
- CreatedAt: string (ISO 8601)
- UpdatedAt: string (ISO 8601)
- Version: number (optimistic locking)
- Tags: string[] (categorization)
- Attrs: map (flexible attributes)
- TTL: number (optional expiration)
```

**Global Secondary Indexes**:
1. **GSI1**: Tenant + Type Listing
   - PK: `T#{tenantId}#TYPE#{type}`, SK: `C#{createdAt}` or `N#{name}`
   
2. **GSI2**: User/Owner Listing
   - PK: `T#{tenantId}#USER#{userId}`, SK: `TYPE#{type}#C#{createdAt}`
   
3. **GSI3**: Parent-Child Relationships
   - PK: `T#{tenantId}#P#{parentType}#{parentId}`, SK: `TYPE#{type}#C#{createdAt}`
   
4. **GSI4**: Unique Lookups (Slugs/External References)
   - PK: `T#{tenantId}#SLUG#{slug}`, SK: `TYPE#{type}`

### 2. Events Table: `anw-events-{env}`

**Purpose**: Analytics, usage tracking, and audit trails
```
Primary Key: PK = T#{tenantId}#D#{YYYYMMDD}, SK = TS#{epochMillis}#UID#{ulid}
Attributes:
- EventName: string
- UserId: string
- SessionId: string
- Path: string
- Meta: map
- ClientInfo: map
- CreatedAt: string
- TTL: number (180 days)

GSI1: User Events
- PK: T#{tenantId}#USER#{userId}, SK: TS#{epochMillis}
```

### 3. Realtime Table: `anw-realtime-{env}`

**Purpose**: WebSocket connections and presence management
```
Connection Items:
- PK: ROOM#{roomId}, SK: CONN#{connectionId}
- TenantId, UserId, TTL (45 minutes)

Reverse Lookup Items:
- PK: USER#{userId}, SK: CONN#{connectionId}
- TenantId, Rooms: string[]

GSI1: Tenant Room Connections
- PK: T#{tenantId}#ROOM#{roomId}
```

### 4. Messages Table: `anw-messages-{env}`

**Purpose**: Real-time chat and comments (high-scale scenarios)
```
Primary Key: PK = CHAN#{channelId}, SK = TS#{epochMillis}#MID#{ulid}
Attributes:
- TenantId, AuthorId, Content, MessageType
- TTL (configurable retention)

GSI1: Tenant + User Audit
- PK: T#{tenantId}#USER#{userId}, SK: TS#{epochMillis}
```

### 5. Idempotency Table: `anw-idempotency-{env}`

**Purpose**: Ensure safe retries for POST operations
```
Primary Key: PK = IDKEY#{hashOfRequest}, SK = OP#{operationName}
Attributes:
- Response: map (cached response)
- TTL: number (24 hours)
```

## 🎯 Entity Patterns by Feature Area

### Dashboard Components

#### Recent Projects
```
Project Entity:
PK: T#{tenantId}#PROJ#{projectId}
SK: META
Type: project
OwnerId: {userId}
Name: "Sentiment Analysis"
Status: active
Attrs: {
  description: "Neural network for sentiment classification",
  lastModified: "2025-01-07T20:23:00Z",
  type: "ml-project"
}

Access Pattern:
GSI2: T#{tenantId}#USER#{userId} → TYPE#project#C#{createdAt}
```

#### Activity Feed
```
Activity Entity:
PK: T#{tenantId}#ACT#{activityId}
SK: META
Type: activity
Attrs: {
  message: "Training completed with 92% accuracy",
  activityType: "experiment_complete",
  resourceType: "experiment",
  resourceId: "exp_123"
}

Notification Entity (per user):
PK: T#{tenantId}#USER#{userId}
SK: NOTIF#{activityId}
Type: notification
Status: unread
```

### Education Hub

#### Course Structure
```
Course:
PK: T#{tenantId}#COURSE#{courseId}
SK: META
Type: course
Name: "AI Fundamentals"
Status: published
Attrs: {
  title: "AI Fundamentals",
  description: "Learn core AI concepts",
  level: "Beginner",
  duration: "2 hours",
  rating: 4.8,
  category: "fundamentals"
}

Module (Child of Course):
PK: T#{tenantId}#COURSE#{courseId}
SK: MOD#{moduleId}
Type: module
GSI3PK: T#{tenantId}#P#course#{courseId}
GSI3SK: TYPE#module#C#{createdAt}

Lesson (Child of Course):
PK: T#{tenantId}#COURSE#{courseId}
SK: LES#{lessonId}
Type: lesson
Attrs: {
  contentPath: "s3://anw-assets-dev/tenants/{tenantId}/courses/{courseId}/lessons/{lessonId}/content.md",
  videoPath: "...",
  duration: 15
}
```

#### User Progress Tracking
```
Enrollment:
PK: T#{tenantId}#USER#{userId}
SK: ENR#{courseId}
Type: enrollment
Status: active
Attrs: {
  enrolledAt: "2025-01-07T20:23:00Z",
  completionPercent: 40
}

Progress (per lesson):
PK: T#{tenantId}#USER#{userId}
SK: PROG#{courseId}#LES#{lessonId}
Type: progress
Attrs: {
  percent: 100,
  completedAt: "2025-01-07T21:15:00Z",
  timeSpent: 900
}

Access Pattern:
Get user progress for course: Query PK = T#{tenantId}#USER#{userId}, SK begins_with "PROG#{courseId}"
```

### Studio Toolset (Agent Builder)

#### Visual Flow Management
```
Studio Project:
PK: T#{tenantId}#STUDIO#{studioProjectId}
SK: META
Type: studio_project
OwnerId: {userId}
Attrs: {
  collaborators: [userId1, userId2],
  settings: {...}
}

Flow:
PK: T#{tenantId}#STUDIO#{studioProjectId}
SK: FLOW#{flowId}
Type: flow
GSI3PK: T#{tenantId}#P#studio_project#{studioProjectId}
Attrs: {
  currentSnapshot: "snap_123",
  version: "1.2"
}

Node:
PK: T#{tenantId}#FLOW#{flowId}
SK: NODE#{nodeId}
Type: node
GSI3PK: T#{tenantId}#P#flow#{flowId}
Attrs: {
  nodeType: "llm",
  position: {x: 100, y: 200},
  data: {
    label: "GPT-4 Node",
    prompt: "You are a helpful assistant"
  }
}

Edge:
PK: T#{tenantId}#FLOW#{flowId}
SK: EDGE#{edgeId}
Type: edge
Attrs: {
  source: "node_123",
  target: "node_456",
  sourceHandle: "output",
  targetHandle: "input"
}

Snapshot:
PK: T#{tenantId}#FLOW#{flowId}
SK: SNAP#{timestamp}#{snapId}
Type: snapshot
Attrs: {
  nodes: [...],
  edges: [...],
  createdBy: userId
}
```

### AI Lab (Experimentation)

#### Experiment Management
```
Experiment:
PK: T#{tenantId}#PROJ#{projectId}
SK: EXP#{expId}
Type: experiment
GSI3PK: T#{tenantId}#P#project#{projectId}
Attrs: {
  hypothesis: "Increasing batch size improves accuracy",
  metricsSchema: {...},
  status: "running"
}

Training Run:
PK: T#{tenantId}#EXP#{expId}
SK: RUN#{runId}
Type: run
GSI3PK: T#{tenantId}#P#experiment#{expId}
Attrs: {
  status: "completed",
  startedAt: "2025-01-07T20:00:00Z",
  endedAt: "2025-01-07T22:30:00Z",
  logsPath: "s3://anw-assets-dev/tenants/{tenantId}/lab/runs/{runId}/logs/",
  artifactsPath: "s3://anw-assets-dev/tenants/{tenantId}/lab/runs/{runId}/artifacts/",
  metrics: {
    accuracy: 0.92,
    loss: 0.15,
    training_time: 9000
  }
}

Model:
PK: T#{tenantId}#PROJ#{projectId}
SK: MODEL#{modelId}
Type: model
Attrs: {
  version: "v1.2",
  metrics: {...},
  registryPath: "s3://anw-assets-dev/tenants/{tenantId}/lab/models/{modelId}",
  parentRunId: "run_123"
}

Dataset:
PK: T#{tenantId}#DS#{datasetId}
SK: META
Type: dataset
Attrs: {
  s3Path: "s3://anw-assets-dev/tenants/{tenantId}/lab/datasets/{datasetId}/",
  schema: {...},
  size: 1048576,
  format: "csv",
  tags: ["training", "nlp"]
}
```

### Observatory (Analytics/Visualization)

#### Dashboard System
```
Dashboard:
PK: T#{tenantId}#OBS#{dashboardId}
SK: META
Type: dashboard
Attrs: {
  visibility: "org", // or "private"
  title: "Model Performance Overview",
  description: "Track key metrics across experiments"
}

Panel:
PK: T#{tenantId}#OBS#{dashboardId}
SK: PANEL#{panelId}
Type: panel
GSI3PK: T#{tenantId}#P#dashboard#{dashboardId}
Attrs: {
  title: "Accuracy Trends",
  panelType: "line_chart",
  position: {x: 0, y: 0, w: 6, h: 4},
  querySpec: {
    dataSource: "experiments",
    aggregation: "avg",
    metric: "accuracy",
    groupBy: "date"
  }
}

DataSource:
PK: T#{tenantId}#DSRC#{datasourceId}
SK: META
Type: datasource
Attrs: {
  sourceType: "experiments", // or "events", "external"
  connectionConfig: {...}
}
```

### Community (Nexus)

#### Social Features
```
Group:
PK: T#{tenantId}#GROUP#{groupId}
SK: META
Type: group
Name: "NLP Enthusiasts"
Attrs: {
  privacy: "public", // or "private"
  description: "Discuss NLP techniques and research",
  memberCount: 1243
}

Post:
PK: T#{tenantId}#GROUP#{groupId}
SK: POST#{postId}
Type: post
GSI3PK: T#{tenantId}#P#group#{groupId}
OwnerId: {authorId}
Attrs: {
  content: "Just published my new tutorial...",
  status: "published",
  likes: 24,
  comments: 5
}

Comment:
PK: T#{tenantId}#POST#{postId}
SK: COMM#{commentId}
Type: comment
GSI3PK: T#{tenantId}#P#post#{postId}
OwnerId: {authorId}
Attrs: {
  content: "Great tutorial! Thanks for sharing",
  parentCommentId: null // for nested comments
}

Reaction (Like):
PK: T#{tenantId}#POST#{postId}
SK: LIKE#{userId}
Type: reaction
Attrs: {
  reactionType: "like",
  createdAt: "2025-01-07T20:23:00Z"
}

Group Membership:
PK: T#{tenantId}#USER#{userId}
SK: GRPMEM#{groupId}
Type: group_membership
Attrs: {
  role: "member", // or "admin", "moderator"
  joinedAt: "2025-01-07T20:23:00Z"
}
```

### CMS & Footer Pages

#### Content Management
```
Static Page:
PK: T#{tenantId}#PAGE#{slug}
SK: META
Type: page
GSI4PK: T#{tenantId}#SLUG#{slug}
GSI4SK: TYPE#page
Attrs: {
  title: "About Us",
  contentPath: "s3://anw-assets-dev/tenants/{tenantId}/cms/pages/{slug}/content.md",
  status: "published"
}

Blog Post:
PK: T#{tenantId}#BLOG#{postId}
SK: META
Type: blog_post
Slug: "introduction-to-ai"
GSI4PK: T#{tenantId}#SLUG#{slug}
OwnerId: {authorId}
Attrs: {
  title: "Introduction to AI",
  tags: ["ai", "beginners"],
  publishedAt: "2025-01-07T20:23:00Z",
  contentPath: "s3://..."
}

Job Posting:
PK: T#{tenantId}#JOB#{jobId}
SK: META
Type: job
Attrs: {
  title: "Senior AI Engineer",
  location: "Remote",
  department: "Engineering",
  status: "open"
}

Job Application:
PK: T#{tenantId}#JOB#{jobId}
SK: APP#{appId}
Type: application
GSI3PK: T#{tenantId}#P#job#{jobId}
Attrs: {
  applicantEmail: "john@example.com",
  applicantName: "John Doe",
  resumeS3Path: "s3://...",
  coverLetter: "...",
  status: "submitted"
}

Contact Message:
PK: T#{tenantId}#CONTACT#{msgId}
SK: META
Type: contact_message
Attrs: {
  fromEmail: "customer@example.com",
  subject: "Question about pricing",
  message: "I'd like to learn more...",
  status: "new" // or "triaged", "resolved"
}
```

## 🔐 Role-Based Access Control (RBAC)

### User & Organization Management
```
Organization:
PK: T#{tenantId}#ORG#{orgId}
SK: META
Type: org
Name: "Acme AI Corp"
Attrs: {
  plan: "enterprise", // free, pro, enterprise
  settings: {
    maxUsers: 100,
    maxStorage: 1000, // GB
    features: ["advanced-analytics", "api-access"]
  },
  billingEmail: "billing@acme.com"
}

User Profile (per tenant):
PK: T#{tenantId}#USER#{userId}
SK: PROFILE
Type: user
Attrs: {
  email: "user@acme.com",
  name: "Jane Smith",
  avatar: "s3://...",
  preferences: {...},
  lastLoginAt: "2025-01-07T20:23:00Z"
}

Membership:
PK: T#{tenantId}#USER#{userId}
SK: MEM#{orgId}
Type: membership
GSI1PK: T#{tenantId}#TYPE#membership
GSI1SK: ORG#{orgId}#USER#{userId}
Attrs: {
  role: "admin", // owner, admin, editor, member, viewer
  permissions: ["read:*", "write:projects", "admin:users"],
  joinedAt: "2025-01-07T20:23:00Z",
  status: "active"
}

Role Definition (custom roles):
PK: T#{tenantId}#ROLE#{roleId}
SK: META
Type: role_definition
Name: "Project Manager"
Attrs: {
  permissions: [
    "read:projects",
    "write:projects",
    "read:experiments",
    "write:experiments"
  ],
  description: "Can manage projects and experiments"
}
```

## 🗄️ S3 Storage Architecture

### Bucket Structure
```
anw-assets-{env}/
├── tenants/{tenantId}/
│   ├── users/{userId}/
│   │   └── uploads/
│   ├── courses/{courseId}/
│   │   ├── content/
│   │   ├── videos/
│   │   └── attachments/
│   ├── studio/{projectId}/
│   │   └── assets/
│   ├── lab/
│   │   ├── datasets/{datasetId}/
│   │   ├── models/{modelId}/
│   │   └── runs/{runId}/
│   │       ├── logs/
│   │       └── artifacts/
│   ├── community/posts/{postId}/
│   │   └── attachments/
│   └── cms/
│       ├── pages/
│       └── blog/media/

anw-logs-{env}/
├── access-logs/
├── cloudtrail-logs/
└── analytics-exports/
```

## 🌐 API Gateway Structure

### REST API Endpoints

```typescript
// Authentication & Users
GET    /api/auth/me
GET    /api/orgs
POST   /api/orgs/{orgId}/invite
POST   /api/orgs/{orgId}/accept

// Dashboard
GET    /api/dashboard/recent-projects
GET    /api/dashboard/activity-feed
GET    /api/dashboard/stats

// Education
GET    /api/education/courses
GET    /api/education/courses/{courseId}
GET    /api/education/courses/{courseId}/modules
GET    /api/education/courses/{courseId}/progress
POST   /api/education/enrollments
PUT    /api/education/progress

// Studio/Toolset
GET    /api/studio/projects
POST   /api/studio/projects
GET    /api/studio/projects/{projectId}/flows
POST   /api/studio/flows
GET    /api/studio/flows/{flowId}/nodes
POST   /api/studio/flows/{flowId}/snapshots

// AI Lab
GET    /api/lab/experiments
POST   /api/lab/experiments
GET    /api/lab/experiments/{expId}/runs
POST   /api/lab/experiments/{expId}/runs
GET    /api/lab/datasets
POST   /api/lab/datasets
GET    /api/lab/models

// Observatory
GET    /api/observatory/dashboards
POST   /api/observatory/dashboards
GET    /api/observatory/dashboards/{dashboardId}/panels
POST   /api/observatory/queries

// Community
GET    /api/community/groups
POST   /api/community/groups/{groupId}/posts
GET    /api/community/groups/{groupId}/posts
POST   /api/community/posts/{postId}/comments
POST   /api/community/posts/{postId}/reactions

// Assets
POST   /api/assets/presign-upload
GET    /api/assets/presign-download

// CMS
GET    /api/cms/pages/{slug}
GET    /api/cms/blog/posts
GET    /api/cms/jobs
POST   /api/cms/jobs/{jobId}/applications
POST   /api/cms/contact

// Analytics
POST   /api/analytics/events
```

### WebSocket API Routes

```
$connect    - JWT validation & connection tracking
$disconnect - Cleanup connections
join_room   - Join collaboration room
leave_room  - Leave room
presence    - Heartbeat/presence update
broadcast   - Send message to room
doc_update  - Document/flow updates
```

## 📊 Data Access Patterns Summary

| Feature Area | Primary Patterns | GSI Used |
|-------------|------------------|----------|
| Dashboard | Recent projects by user, Activity feed | GSI2, GSI1 |
| Education | Course catalog, User progress, Enrollments | GSI1, GSI2, Direct |
| Studio | Project flows, Collaborations, Snapshots | GSI3, GSI2, GSI3 |
| Lab | Experiments by project, Training runs, Models | GSI3, GSI3, GSI1 |
| Observatory | Dashboards by tenant, Panels by dashboard | GSI1, GSI3 |
| Community | Group posts, User posts, Reactions | GSI3, GSI2, Direct |
| CMS | Pages by slug, Blog posts, Job applications | GSI4, GSI1, GSI3 |

## 🔧 Implementation Considerations

### Performance Optimization
- **Hot Partition Prevention**: Use composite keys with high-cardinality prefixes
- **Efficient Queries**: Design GSIs to support all major query patterns
- **Batch Operations**: Use BatchGetItem and BatchWriteItem where applicable
- **Caching**: Implement application-level caching for frequently accessed data

### Cost Optimization
- **On-Demand Billing**: Start with on-demand, consider provisioned for predictable workloads
- **TTL Usage**: Automatic cleanup for temporary data (sessions, idempotency, events)
- **Storage Classes**: Use S3 Intelligent Tiering for cost optimization

### Security & Compliance
- **Encryption**: SSE-KMS for all tables and S3 buckets
- **Access Control**: IAM policies with condition keys for tenant isolation
- **Audit Logging**: CloudTrail and application-level audit trails
- **Data Retention**: Configurable retention policies per data type

## 🚀 Deployment Strategy

### Infrastructure as Code
- **AWS CDK v2**: TypeScript-based infrastructure definitions
- **Multi-Environment**: dev, staging, prod with environment-specific configurations
- **Automated Deployments**: GitHub Actions with OIDC authentication

### Migration & Rollout
- **Phased Approach**: Deploy core tables first, then specialized tables
- **Data Migration**: Scripts for any existing data migration
- **Testing**: Comprehensive testing at unit, integration, and load levels

This schema provides a solid foundation for the Diatonic AI platform, supporting all identified features while maintaining scalability, security, and cost-effectiveness.
