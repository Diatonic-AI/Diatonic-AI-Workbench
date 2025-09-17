# Production DynamoDB Tables Summary

Generated on: 2025-09-16T19:27:40.787Z

## Tables Overview

Total tables extracted: 56

### dev-ai-nexus-activity-feed

**Primary Key:**
- entity_id (HASH) - S
- timestamp (RANGE) - S

**Global Secondary Indexes:**
- organization-type-index:
  - organization_id (HASH)
  - activity_type (RANGE)
- user-timestamp-index:
  - user_id (HASH)
  - timestamp (RANGE)
- organization-timestamp-index:
  - organization_id (HASH)
  - timestamp (RANGE)

### dev-ai-nexus-agent-execution-history

**Primary Key:**
- agent_id (HASH) - S
- run_id (RANGE) - S

**Global Secondary Indexes:**
- status-runs-index:
  - status (HASH)
  - started_at (RANGE)
- tenant-runs-index:
  - tenant_id (HASH)
  - started_at (RANGE)
- user-runs-index:
  - user_id (HASH)
  - started_at (RANGE)
- completed-runs-index:
  - tenant_id (HASH)
  - completed_at (RANGE)

### dev-ai-nexus-agent-flows

**Primary Key:**
- agent_id (HASH) - S
- version (RANGE) - S

**Global Secondary Indexes:**
- updated-at-index:
  - agent_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-agent-templates

**Primary Key:**
- template_id (HASH) - S

**Global Secondary Indexes:**
- popular-templates-index:
  - category (HASH)
  - usage_count (RANGE)
- tenant-templates-index:
  - tenant_id (HASH)
  - created_at (RANGE)
- category-rating-index:
  - category (HASH)
  - rating (RANGE)
- public-usage-index:
  - is_public (HASH)
  - usage_count (RANGE)

### dev-ai-nexus-agent-versions

**Primary Key:**
- agent_id (HASH) - S
- version (RANGE) - S

**Global Secondary Indexes:**
- created-at-index:
  - agent_id (HASH)
  - created_at (RANGE)
- creator-index:
  - created_by (HASH)
  - created_at (RANGE)

### dev-ai-nexus-agents

**Primary Key:**
- agent_id (HASH) - S

**Global Secondary Indexes:**
- organization-updated-index:
  - organization_id (HASH)
  - updated_at (RANGE)
- organization-status-index:
  - organization_id (HASH)
  - agent_status (RANGE)
- owner-updated-index:
  - owner_user_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-aggregated-analytics

**Primary Key:**
- metric_name (HASH) - S
- date_dimension (RANGE) - S

**Global Secondary Indexes:**
- organization-date-index:
  - organization_id (HASH)
  - date_dimension (RANGE)

### dev-ai-nexus-application-settings

**Primary Key:**
- setting_category (HASH) - S
- setting_key (RANGE) - S

**Global Secondary Indexes:**
- updated-at-index:
  - setting_category (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-cognito-group-mappings

**Primary Key:**
- cognito_group (HASH) - S

**Global Secondary Indexes:**
- role-updated-index:
  - role (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-community-comments

**Primary Key:**
- post_id (HASH) - S
- comment_id (RANGE) - S

**Global Secondary Indexes:**
- author-created-index:
  - author_user_id (HASH)
  - created_at (RANGE)

### dev-ai-nexus-community-posts

**Primary Key:**
- post_id (HASH) - S

**Global Secondary Indexes:**
- organization-created-index:
  - organization_id (HASH)
  - created_at (RANGE)
- organization-trending-index:
  - organization_id (HASH)
  - trending_score (RANGE)
- author-created-index:
  - author_user_id (HASH)
  - created_at (RANGE)
- topic-created-index:
  - topic (HASH)
  - created_at (RANGE)

### dev-ai-nexus-courses

**Primary Key:**
- course_id (HASH) - S

**Global Secondary Indexes:**
- category-updated-index:
  - category (HASH)
  - updated_at (RANGE)
- visibility-updated-index:
  - visibility (HASH)
  - updated_at (RANGE)
- category-difficulty-index:
  - category (HASH)
  - difficulty_level (RANGE)

### dev-ai-nexus-dashboard-metrics

**Primary Key:**
- metric_type (HASH) - S
- timestamp (RANGE) - S

**Global Secondary Indexes:**
- user-metrics-index:
  - user_id (HASH)
  - timestamp (RANGE)
- daily-metrics-index:
  - metric_type (HASH)
  - date (RANGE)

### dev-ai-nexus-datasets

**Primary Key:**
- dataset_id (HASH) - S

**Global Secondary Indexes:**
- organization-updated-index:
  - organization_id (HASH)
  - updated_at (RANGE)
- organization-type-index:
  - organization_id (HASH)
  - dataset_type (RANGE)
- owner-updated-index:
  - owner_user_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-education-courses

**Primary Key:**
- course_id (HASH) - S

**Global Secondary Indexes:**
- category-courses-index:
  - category (HASH)
  - title (RANGE)
- difficulty-courses-index:
  - difficulty_level (HASH)
  - created_at (RANGE)

### dev-ai-nexus-enrollments

**Primary Key:**
- user_id (HASH) - S
- course_id (RANGE) - S

**Global Secondary Indexes:**
- course-enrolled-index:
  - course_id (HASH)
  - enrolled_at (RANGE)
- user-status-index:
  - user_id (HASH)
  - enrollment_status (RANGE)

### dev-ai-nexus-experiment-run-logs

**Primary Key:**
- experiment_id (HASH) - S
- log_timestamp (RANGE) - S

**Global Secondary Indexes:**
- level-logs-index:
  - log_level (HASH)
  - log_timestamp (RANGE)
- run-logs-index:
  - run_id (HASH)
  - log_timestamp (RANGE)
- component-logs-index:
  - component_type (HASH)
  - log_timestamp (RANGE)
- tenant-logs-index:
  - tenant_id (HASH)
  - log_timestamp (RANGE)

### dev-ai-nexus-experiment-runs

**Primary Key:**
- experiment_id (HASH) - S
- run_id (RANGE) - S

**Global Secondary Indexes:**
- created-at-index:
  - experiment_id (HASH)
  - created_at (RANGE)
- experiment-status-index:
  - experiment_id (HASH)
  - run_status (RANGE)

### dev-ai-nexus-experiments

**Primary Key:**
- experiment_id (HASH) - S

**Global Secondary Indexes:**
- project-created-index:
  - project_id (HASH)
  - created_at (RANGE)
- user-created-index:
  - user_id (HASH)
  - created_at (RANGE)
- user-status-index:
  - user_id (HASH)
  - experiment_status (RANGE)

### dev-ai-nexus-flow-node-configs

**Primary Key:**
- flow_id (HASH) - S
- node_id (RANGE) - S

**Global Secondary Indexes:**
- node-type-index:
  - node_type (HASH)
  - updated_at (RANGE)
- tenant-flows-index:
  - tenant_id (HASH)
  - flow_id (RANGE)

### dev-ai-nexus-flow-templates

**Primary Key:**
- template_id (HASH) - S

**Global Secondary Indexes:**
- category-updated-index:
  - category (HASH)
  - updated_at (RANGE)
- creator-updated-index:
  - created_by (HASH)
  - updated_at (RANGE)
- visibility-updated-index:
  - visibility (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-group-memberships

**Primary Key:**
- group_id (HASH) - S
- user_id (RANGE) - S

**Global Secondary Indexes:**
- group-joined-index:
  - group_id (HASH)
  - joined_at (RANGE)
- user-role-index:
  - user_id (HASH)
  - group_role (RANGE)

### dev-ai-nexus-groups

**Primary Key:**
- group_id (HASH) - S

**Global Secondary Indexes:**
- organization-updated-index:
  - organization_id (HASH)
  - updated_at (RANGE)
- topic-updated-index:
  - topic (HASH)
  - updated_at (RANGE)
- visibility-updated-index:
  - visibility (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-lab-experiments

**Primary Key:**
- experiment_id (HASH) - S
- version (RANGE) - S

**Global Secondary Indexes:**
- status-experiments-index:
  - status (HASH)
  - created_at (RANGE)
- workspace-experiments-index:
  - workspace_id (HASH)
  - created_at (RANGE)
- user-experiments-index:
  - user_id (HASH)
  - created_at (RANGE)

### dev-ai-nexus-lab-model-registry

**Primary Key:**
- tenant_id (HASH) - S
- model_id (RANGE) - S

**Global Secondary Indexes:**
- project-models-index:
  - project_id (HASH)
  - updated_at (RANGE)
- deployment-status-index:
  - deployment_status (HASH)
  - updated_at (RANGE)
- type-status-index:
  - model_type (HASH)
  - status (RANGE)
- tenant-updated-index:
  - tenant_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-lesson-progress

**Primary Key:**
- user_id (HASH) - S
- course_lesson_id (RANGE) - S

**Global Secondary Indexes:**
- user-updated-index:
  - user_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-lessons

**Primary Key:**
- course_id (HASH) - S
- lesson_id (RANGE) - S

**Global Secondary Indexes:**
- course-order-index:
  - course_id (HASH)
  - order_idx (RANGE)

### dev-ai-nexus-metrics-timeseries

**Primary Key:**
- run_id (HASH) - S
- timestamp (RANGE) - S

**Global Secondary Indexes:**
- metric-time-index:
  - metric_name (HASH)
  - timestamp (RANGE)

### dev-ai-nexus-models

**Primary Key:**
- model_id (HASH) - S

**Global Secondary Indexes:**
- organization-updated-index:
  - organization_id (HASH)
  - updated_at (RANGE)
- organization-type-index:
  - organization_id (HASH)
  - model_type (RANGE)
- owner-updated-index:
  - owner_user_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-notification-subscriptions

**Primary Key:**
- user_id (HASH) - S
- channel (RANGE) - S

### dev-ai-nexus-notifications

**Primary Key:**
- user_id (HASH) - S
- notification_id (RANGE) - S

**Global Secondary Indexes:**
- user-unread-index:
  - user_id (HASH)
  - is_read (RANGE)
- user-type-index:
  - user_id (HASH)
  - notification_type (RANGE)
- user-created-index:
  - user_id (HASH)
  - created_at (RANGE)

### dev-ai-nexus-organization-data

**Primary Key:**
- organization_id (HASH) - S
- data_type (RANGE) - S

**Global Secondary Indexes:**
- created-at-index:
  - organization_id (HASH)
  - created_at (RANGE)
- data-type-index:
  - data_type (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-organization-memberships

**Primary Key:**
- organization_id (HASH) - S
- user_id (RANGE) - S

**Global Secondary Indexes:**
- organization-role-index:
  - organization_id (HASH)
  - org_role (RANGE)
- organization-joined-index:
  - organization_id (HASH)
  - joined_at (RANGE)
- user-role-index:
  - user_id (HASH)
  - org_role (RANGE)

### dev-ai-nexus-organization-settings

**Primary Key:**
- organization_id (HASH) - S
- setting_type (RANGE) - S

**Global Secondary Indexes:**
- org-updated-index:
  - organization_id (HASH)
  - updated_at (RANGE)
- setting-updated-index:
  - setting_type (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-project-memberships

**Primary Key:**
- project_id (HASH) - S
- user_id (RANGE) - S

**Global Secondary Indexes:**
- project-role-index:
  - project_id (HASH)
  - project_role (RANGE)
- user-role-index:
  - user_id (HASH)
  - joined_at (RANGE)

### dev-ai-nexus-projects

**Primary Key:**
- project_id (HASH) - S

**Global Secondary Indexes:**
- organization-updated-index:
  - organization_id (HASH)
  - updated_at (RANGE)
- organization-created-index:
  - organization_id (HASH)
  - created_at (RANGE)
- owner-updated-index:
  - owner_user_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-prompts-library

**Primary Key:**
- prompt_id (HASH) - S

**Global Secondary Indexes:**
- organization-updated-index:
  - organization_id (HASH)
  - updated_at (RANGE)
- owner-updated-index:
  - owner_user_id (HASH)
  - updated_at (RANGE)
- tag-updated-index:
  - tag (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-quiz-results

**Primary Key:**
- user_id (HASH) - S
- quiz_id (RANGE) - S

**Global Secondary Indexes:**
- user-submitted-index:
  - user_id (HASH)
  - submitted_at (RANGE)
- quiz-submitted-index:
  - quiz_id (HASH)
  - submitted_at (RANGE)

### dev-ai-nexus-quizzes

**Primary Key:**
- quiz_id (HASH) - S

**Global Secondary Indexes:**
- course-lesson-index:
  - course_id (HASH)
  - lesson_id (RANGE)

### dev-ai-nexus-reactions

**Primary Key:**
- entity_id (HASH) - S
- user_id (RANGE) - S

**Global Secondary Indexes:**
- user-entity-index:
  - user_id (HASH)
  - entity_id (RANGE)
- entity-type-index:
  - entity_id (HASH)
  - reaction_type (RANGE)

### dev-ai-nexus-role-permissions

**Primary Key:**
- role_name (HASH) - S
- permission_key (RANGE) - S

**Global Secondary Indexes:**
- role-resource-index:
  - role_name (HASH)
  - resource_type (RANGE)

### dev-ai-nexus-roles

**Primary Key:**
- role_id (HASH) - S

**Global Secondary Indexes:**
- organization-created-index:
  - organization_id (HASH)
  - created_at (RANGE)
- type-created-index:
  - role_type (HASH)
  - created_at (RANGE)

### dev-ai-nexus-subscription-billing

**Primary Key:**
- organization_id (HASH) - S
- billing_period (RANGE) - S

**Global Secondary Indexes:**
- org-created-index:
  - organization_id (HASH)
  - created_at (RANGE)
- tier-period-index:
  - subscription_tier (HASH)
  - billing_period (RANGE)

### dev-ai-nexus-subscription-limits

**Primary Key:**
- user_id (HASH) - S
- limit_type (RANGE) - S

**Global Secondary Indexes:**
- tier-period-index:
  - subscription_tier (HASH)
  - period_start (RANGE)
- user-period-index:
  - user_id (HASH)
  - period_start (RANGE)

### dev-ai-nexus-system-logs

**Primary Key:**
- log_id (HASH) - S
- timestamp (RANGE) - S

**Global Secondary Indexes:**
- daily-logs-index:
  - date (HASH)
  - timestamp (RANGE)
- user-logs-index:
  - user_id (HASH)
  - timestamp (RANGE)
- event-type-index:
  - event_type (HASH)
  - timestamp (RANGE)

### dev-ai-nexus-team-memberships

**Primary Key:**
- organization_id (HASH) - S
- user_id (RANGE) - S

**Global Secondary Indexes:**
- user-joined-index:
  - user_id (HASH)
  - joined_at (RANGE)
- org-status-index:
  - organization_id (HASH)
  - status (RANGE)
- org-role-index:
  - organization_id (HASH)
  - role (RANGE)

### dev-ai-nexus-toolset-items

**Primary Key:**
- tool_id (HASH) - S

**Global Secondary Indexes:**
- created-at-index:
  - category (HASH)
  - created_at (RANGE)
- category-tools-index:
  - category (HASH)
  - name (RANGE)

### dev-ai-nexus-user-content-metadata

**Primary Key:**
- content_id (HASH) - S

**Global Secondary Indexes:**
- organization-content-index:
  - organization_id (HASH)
  - created_at (RANGE)
- content-type-index:
  - content_type (HASH)
  - created_at (RANGE)
- user-content-index:
  - user_id (HASH)
  - created_at (RANGE)

### dev-ai-nexus-user-permissions

**Primary Key:**
- user_id (HASH) - S
- permission (RANGE) - S

**Global Secondary Indexes:**
- permission-granted-index:
  - permission (HASH)
  - granted_at (RANGE)
- granted-by-index:
  - granted_by (HASH)
  - granted_at (RANGE)

### dev-ai-nexus-user-profiles

**Primary Key:**
- user_id (HASH) - S

**Global Secondary Indexes:**
- organization-index:
  - organization_id (HASH)
  - created_at (RANGE)
- email-index:
  - email (HASH)

### dev-ai-nexus-user-progress

**Primary Key:**
- user_id (HASH) - S
- course_id (RANGE) - S

**Global Secondary Indexes:**
- course-progress-index:
  - course_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-user-quotas

**Primary Key:**
- user_id (HASH) - S
- quota_type (RANGE) - S

**Global Secondary Indexes:**
- organization-quota-index:
  - organization_id (HASH)
  - quota_type (RANGE)
- user-updated-index:
  - user_id (HASH)
  - updated_at (RANGE)

### dev-ai-nexus-user-sessions

**Primary Key:**
- session_id (HASH) - S

**Global Secondary Indexes:**
- user-sessions-index:
  - user_id (HASH)
  - created_at (RANGE)

### dev-ai-nexus-users

**Primary Key:**
- user_id (HASH) - S

**Global Secondary Indexes:**
- organization-role-index:
  - organization_id (HASH)
  - role (RANGE)
- organization-login-index:
  - organization_id (HASH)
  - last_login_at (RANGE)
- subscription-created-index:
  - subscription_tier (HASH)
  - created_at (RANGE)
- email-index:
  - email (HASH)

### dev-ai-nexus-workspace-memberships

**Primary Key:**
- workspace_id (HASH) - S
- user_id (RANGE) - S

**Global Secondary Indexes:**
- user-role-index:
  - user_id (HASH)
  - workspace_role (RANGE)

### dev-ai-nexus-workspaces

**Primary Key:**
- workspace_id (HASH) - S

**Global Secondary Indexes:**
- organization-updated-index:
  - organization_id (HASH)
  - updated_at (RANGE)
- owner-updated-index:
  - owner_user_id (HASH)
  - updated_at (RANGE)

