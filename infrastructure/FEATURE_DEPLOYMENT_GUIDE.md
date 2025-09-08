# AI Nexus Workbench - Feature Deployment Guide

## Overview

This guide walks you through the gradual rollout approach for deploying AI Nexus Workbench features. Each feature area has its own set of DynamoDB tables that can be deployed independently as you develop the corresponding frontend functionality.

## Current Infrastructure Status

### ✅ Base Infrastructure (Already Deployed)
- **user-profiles** - User information and preferences
- **organization-data** - Organization-specific data and settings  
- **system-logs** - Application logs and audit trails
- **user-sessions** - Active session management
- **application-settings** - Global application configuration
- **user-content-metadata** - References to user-generated content in S3

### 📋 Feature Areas Available for Deployment

## Phase 1: Project Management
**Purpose**: Workspaces and project organization infrastructure
**Tables**: 4 tables
- `projects` - Central project management
- `workspaces` - Higher-level project organization
- `project-memberships` - User project roles and permissions
- `workspace-memberships` - Workspace membership management

**To Deploy**:
```bash
# Edit infrastructure/dynamodb-feature-modules.tf
# Change: deploy_project_management = false
# To:     deploy_project_management = true

terraform plan
terraform apply
```

## Phase 2: Agent Builder (Toolset)
**Purpose**: AI agent visual builder with flow management
**Tables**: 5 tables
- `agents` - AI agent definitions
- `agent-versions` - Version control for agents
- `agent-flows` - Visual flow definitions (nodes, edges, canvas)
- `flow-templates` - Reusable flow templates
- `prompts-library` - Reusable prompts and templates

**To Deploy**:
```bash
# Edit infrastructure/dynamodb-feature-modules.tf
# Change: deploy_agent_builder = false
# To:     deploy_agent_builder = true

terraform plan
terraform apply
```

## Phase 3: AI Lab (Future)
**Purpose**: ML experiment management and model registry
**Tables**: 5 tables (to be added)
- `models` - ML model registry
- `datasets` - Dataset registry
- `experiments` - ML experiment definitions
- `experiment-runs` - Individual experiment executions
- `metrics-timeseries` - Experiment metrics and logs

## Phase 4: Community Platform (Future)
**Purpose**: Social features and user interaction
**Tables**: 5 tables (to be added)
- `community-posts` - User posts and discussions
- `community-comments` - Post comments and replies
- `reactions` - Likes, dislikes, and other reactions
- `groups` - Community groups and topics
- `group-memberships` - User group participation

## Phase 5: Education Center (Future)
**Purpose**: Learning management system
**Tables**: 6 tables (to be added)
- `courses` - Educational course catalog
- `lessons` - Individual course lessons
- `enrollments` - User course enrollments
- `lesson-progress` - Lesson completion tracking
- `quizzes` - Course quizzes and assessments
- `quiz-results` - User quiz submissions and scores

## Phase 6: Analytics & Observatory (Future)
**Purpose**: Dashboard metrics and user activity tracking
**Tables**: 2 tables (to be added)
- `activity-feed` - Normalized activity events
- `aggregated-analytics` - Pre-computed metrics for dashboards

## Phase 7: Enhanced RBAC & Notifications (Future)
**Purpose**: Advanced permissions and notification system
**Tables**: 4 tables (to be added)
- `notifications` - User notifications
- `notification-subscriptions` - User notification preferences
- `organization-memberships` - Complete org membership with roles
- `role-permissions` - Role-based permission assignments

## Deployment Workflow

### Pre-Deployment Checklist
- [ ] Review current infrastructure state: `terraform plan`
- [ ] Ensure AWS credentials are configured
- [ ] Verify you're in the correct environment (dev/staging/prod)
- [ ] Backup current Terraform state

### Standard Deployment Process

1. **Plan Phase**:
   ```bash
   cd /home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench/infrastructure
   
   # Edit dynamodb-feature-modules.tf
   # Set the desired feature flag to true
   
   # Review planned changes
   terraform plan
   ```

2. **Apply Phase**:
   ```bash
   # Apply the changes
   terraform apply
   
   # Verify deployment
   terraform output deployed_features
   ```

3. **Verification**:
   ```bash
   # Check table creation in AWS
   aws dynamodb list-tables --region us-east-2
   
   # Or use the MCP tool
   # aws-dynamodb list_tables
   ```

### Rolling Back a Feature

If you need to roll back a feature deployment:

```bash
# Edit dynamodb-feature-modules.tf
# Set the feature flag back to false

terraform plan  # Review what will be destroyed
terraform apply # Apply the rollback
```

⚠️ **Warning**: Rolling back will delete tables and all data. Ensure you have backups!

## Development Recommendations

### Feature Development Order
1. **Start with Phase 1** (Project Management) - Provides foundation for organizing work
2. **Move to Phase 2** (Agent Builder) - Core AI functionality
3. **Add remaining phases** based on priority and user needs

### Database Design Benefits
- **Multi-tenant isolation** via organization_id and user_id prefixes
- **Time-ordered queries** with created_at/updated_at sort keys
- **Efficient access patterns** via strategic GSI placement
- **Proper data modeling** keeping items under 400KB (large objects in S3)
- **Built-in TTL** for automatic cleanup where appropriate
- **Point-in-time recovery** enabled for production environments
- **Server-side encryption** enabled throughout

### Frontend Integration Points

Each feature area provides clean integration points:

#### Project Management
- **Dashboard**: Show user's recent projects and workspaces
- **Navigation**: Project/workspace selection dropdowns
- **Permissions**: Role-based access control for projects

#### Agent Builder  
- **Toolset Section**: Full visual agent builder interface
- **Templates**: Reusable flow templates gallery
- **Prompts Library**: Shared prompt management
- **Version Control**: Agent versioning and history

## Monitoring and Maintenance

### After Each Deployment
- [ ] Verify all tables were created successfully
- [ ] Check CloudWatch metrics for new tables
- [ ] Test basic CRUD operations via AWS console or MCP tools
- [ ] Update Lambda environment variables if needed
- [ ] Document any configuration changes

### Regular Maintenance
- Monitor table usage and optimize GSI usage
- Review point-in-time recovery settings
- Check TTL configurations for data lifecycle
- Update IAM policies as new tables are added

## Troubleshooting

### Common Issues

**Table Creation Fails**:
- Check IAM permissions for DynamoDB operations
- Verify Terraform state is not corrupted
- Ensure no naming conflicts with existing tables

**Performance Issues**:
- Review GSI usage patterns
- Check for hot partitions
- Consider adjusting billing mode

**Access Issues**:
- Update IAM policies to include new table ARNs
- Check Lambda function environment variables
- Verify organization-level access controls

## Next Steps

Once you're ready to deploy your first feature area:

1. Choose **Phase 1 (Project Management)** or **Phase 2 (Agent Builder)** based on your development priorities
2. Update the feature flag in `dynamodb-feature-modules.tf`
3. Run `terraform plan` and `terraform apply`
4. Begin developing the frontend components for that feature area
5. Test the integration end-to-end
6. Move to the next phase when ready

The infrastructure is designed to be production-ready from day one, so you can deploy features confidently as you build them!
