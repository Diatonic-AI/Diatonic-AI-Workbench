#!/usr/bin/env node

/**
 * Seed script to initialize DynamoDB tables with default permission system data
 * 
 * This script populates the newly created permission tables with:
 * - Default roles and their permissions
 * - Cognito group mappings
 * - Subscription tier configurations
 * - Initial admin users
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-2';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Table name prefixes
const TABLE_PREFIX = ENVIRONMENT === 'production' ? 'ai-nexus-prod' : 'ai-nexus-dev';

const TABLES = {
  USERS: `${TABLE_PREFIX}-users`,
  USER_PERMISSIONS: `${TABLE_PREFIX}-user-permissions`,
  ROLES: `${TABLE_PREFIX}-roles`,
  ROLE_PERMISSIONS: `${TABLE_PREFIX}-role-permissions`,
  COGNITO_GROUP_MAPPINGS: `${TABLE_PREFIX}-cognito-group-mappings`,
  ORGANIZATION_SETTINGS: `${TABLE_PREFIX}-organization-settings`,
  TEAM_MEMBERSHIPS: `${TABLE_PREFIX}-team-memberships`
};

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

// Permission definitions by feature area
const PERMISSIONS_BY_FEATURE = {
  EDUCATION: [
    'education.view_courses',
    'education.view_premium_courses',
    'education.track_progress',
    'education.download_materials',
    'education.offline_access',
    'education.custom_learning_paths',
    'education.team_training_programs',
    'education.enterprise_training'
  ],
  STUDIO: [
    'studio.view_templates',
    'studio.use_basic_templates',
    'studio.use_premium_templates',
    'studio.create_agents',
    'studio.save_agents',
    'studio.export_agents',
    'studio.share_agents_public',
    'studio.share_agents_private',
    'studio.basic_visual_builder',
    'studio.advanced_visual_builder',
    'studio.professional_builder_suite',
    'studio.enterprise_builder_platform',
    'studio.debug_mode',
    'studio.version_control',
    'studio.git_integration',
    'studio.enterprise_git_integration',
    'studio.custom_integrations',
    'studio.advanced_integrations',
    'studio.white_label_export',
    'studio.custom_branding'
  ],
  LAB: [
    'lab.run_basic_experiments',
    'lab.run_advanced_experiments',
    'lab.save_experiments',
    'lab.export_results',
    'lab.multi_format_export',
    'lab.custom_model_training',
    'lab.dedicated_model_training',
    'lab.basic_execution_time',
    'lab.extended_execution_time',
    'lab.maximum_execution_time',
    'lab.unlimited_execution_time',
    'lab.basic_analytics',
    'lab.advanced_analytics',
    'lab.real_time_analytics',
    'lab.enterprise_analytics',
    'lab.ab_testing',
    'lab.enterprise_testing_suite'
  ],
  COMMUNITY: [
    'community.view_public_content',
    'community.create_posts',
    'community.join_public_groups',
    'community.join_private_groups',
    'community.create_groups',
    'community.moderate_content',
    'community.advanced_moderation'
  ],
  OBSERVATORY: [
    'observatory.basic_analytics',
    'observatory.advanced_insights',
    'observatory.real_time_dashboard',
    'observatory.enterprise_analytics',
    'observatory.custom_dashboards',
    'observatory.data_export',
    'observatory.advanced_reporting'
  ],
  TEAM: [
    'team.collaborate_basic',
    'team.collaborate_advanced',
    'team.invite_members',
    'team.manage_permissions',
    'team.unlimited_members'
  ],
  CORE: [
    'dashboard.access',
    'profile.manage',
    'profile.billing'
  ],
  API: [
    'api.basic_access',
    'api.standard_access',
    'api.unlimited_access',
    'api.enterprise_access'
  ],
  STORAGE: [
    'storage.basic_quota',
    'storage.standard_quota',
    'storage.extended_quota',
    'storage.unlimited_quota'
  ],
  SUPPORT: [
    'support.community',
    'support.email',
    'support.priority',
    'support.dedicated_team',
    'support.sla_guarantees'
  ],
  SECURITY: [
    'security.basic_features',
    'security.advanced_features',
    'security.enterprise_compliance',
    'security.custom_policies'
  ],
  INTERNAL: [
    'internal.content_management',
    'internal.user_management',
    'internal.system_administration',
    'internal.billing_management',
    'internal.analytics_full_access',
    'internal.debug_all_users',
    'internal.impersonate_users',
    'internal.feature_flags',
    'internal.system_monitoring',
    'internal.database_access'
  ]
};

// Role definitions with their permissions
const ROLE_DEFINITIONS = {
  // Subscription tiers
  free: {
    name: 'Free User',
    type: 'subscription',
    permissions: [
      ...PERMISSIONS_BY_FEATURE.CORE,
      'education.view_courses',
      'studio.view_templates',
      'studio.use_basic_templates',
      'studio.create_agents',
      'studio.share_agents_public',
      'studio.basic_visual_builder',
      'community.view_public_content',
      'support.community',
      'storage.basic_quota',
      'security.basic_features'
    ]
  },
  basic: {
    name: 'Basic User',
    type: 'subscription',
    permissions: [
      ...PERMISSIONS_BY_FEATURE.CORE,
      'education.view_courses',
      'education.track_progress',
      'studio.view_templates',
      'studio.use_basic_templates',
      'studio.create_agents',
      'studio.save_agents',
      'studio.share_agents_private',
      'studio.advanced_visual_builder',
      'studio.export_agents',
      'lab.run_basic_experiments',
      'lab.save_experiments',
      'lab.basic_execution_time',
      'lab.basic_analytics',
      'lab.export_results',
      'community.view_public_content',
      'community.create_posts',
      'team.collaborate_basic',
      'api.basic_access',
      'storage.standard_quota',
      'support.email',
      'profile.billing',
      'security.basic_features'
    ]
  },
  pro: {
    name: 'Pro User',
    type: 'subscription',
    permissions: [
      ...PERMISSIONS_BY_FEATURE.CORE,
      'education.view_courses',
      'education.view_premium_courses',
      'education.track_progress',
      'education.download_materials',
      'education.custom_learning_paths',
      'studio.view_templates',
      'studio.use_basic_templates',
      'studio.use_premium_templates',
      'studio.create_agents',
      'studio.save_agents',
      'studio.export_agents',
      'studio.share_agents_public',
      'studio.share_agents_private',
      'studio.advanced_visual_builder',
      'studio.professional_builder_suite',
      'studio.version_control',
      'studio.custom_integrations',
      'studio.debug_mode',
      'lab.run_basic_experiments',
      'lab.run_advanced_experiments',
      'lab.save_experiments',
      'lab.custom_model_training',
      'lab.extended_execution_time',
      'lab.advanced_analytics',
      'lab.multi_format_export',
      'community.view_public_content',
      'community.create_posts',
      'community.join_public_groups',
      'community.join_private_groups',
      'team.collaborate_basic',
      'team.collaborate_advanced',
      'team.invite_members',
      'observatory.basic_analytics',
      'observatory.advanced_insights',
      'observatory.data_export',
      'api.standard_access',
      'storage.extended_quota',
      'support.priority',
      'security.advanced_features'
    ]
  },
  extreme: {
    name: 'Extreme User',
    type: 'subscription',
    permissions: [
      // All pro permissions plus extreme-specific ones
      ...PERMISSIONS_BY_FEATURE.CORE,
      ...PERMISSIONS_BY_FEATURE.EDUCATION.filter(p => p !== 'education.enterprise_training'),
      ...PERMISSIONS_BY_FEATURE.STUDIO.filter(p => p !== 'studio.enterprise_git_integration'),
      ...PERMISSIONS_BY_FEATURE.LAB.filter(p => !p.includes('enterprise')),
      ...PERMISSIONS_BY_FEATURE.COMMUNITY,
      'team.collaborate_basic',
      'team.collaborate_advanced',
      'team.invite_members',
      'team.manage_permissions',
      'observatory.basic_analytics',
      'observatory.advanced_insights',
      'observatory.real_time_dashboard',
      'observatory.custom_dashboards',
      'observatory.advanced_reporting',
      'api.unlimited_access',
      'storage.unlimited_quota',
      'support.dedicated_team',
      'security.enterprise_compliance'
    ]
  },
  enterprise: {
    name: 'Enterprise User',
    type: 'subscription',
    permissions: Object.values(PERMISSIONS_BY_FEATURE).flat().filter(p => !p.startsWith('internal.'))
  },
  // Internal roles
  internal_dev: {
    name: 'Internal Developer',
    type: 'internal',
    permissions: Object.values(PERMISSIONS_BY_FEATURE).flat() // All permissions
  },
  internal_admin: {
    name: 'Internal Administrator',
    type: 'internal',
    permissions: Object.values(PERMISSIONS_BY_FEATURE).flat() // All permissions
  },
  internal_manager: {
    name: 'Internal Manager',
    type: 'internal',
    permissions: Object.values(PERMISSIONS_BY_FEATURE).flat().filter(p => 
      !['internal.debug_all_users', 'internal.impersonate_users', 'internal.database_access'].includes(p)
    )
  }
};

// Cognito group to role mappings
const COGNITO_MAPPINGS = [
  { cognito_group: 'InternalDev', role: 'internal_dev' },
  { cognito_group: 'InternalAdmin', role: 'internal_admin' },
  { cognito_group: 'InternalManager', role: 'internal_manager' },
  { cognito_group: 'InternalAnonTest', role: 'internal_anon_test' },
  { cognito_group: 'InternalBasicUser', role: 'internal_basic_user' },
  { cognito_group: 'InternalProUser', role: 'internal_pro_user' },
  { cognito_group: 'InternalExtremeUser', role: 'internal_extreme_user' },
  { cognito_group: 'InternalEnterpriseUser', role: 'internal_enterprise_user' },
  { cognito_group: 'FreeTier', role: 'free' },
  { cognito_group: 'BasicTier', role: 'basic' },
  { cognito_group: 'ProTier', role: 'pro' },
  { cognito_group: 'ExtremeTier', role: 'extreme' },
  { cognito_group: 'EnterpriseTier', role: 'enterprise' },
  // Legacy mappings for backwards compatibility
  { cognito_group: 'Testing', role: 'internal_dev' },
  { cognito_group: 'Development', role: 'internal_dev' },
  { cognito_group: 'OrgUsers', role: 'pro' },
  { cognito_group: 'BasicUsers', role: 'basic' }
];

/**
 * Helper function to batch write items to DynamoDB
 */
async function batchWrite(tableName, items) {
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const writeRequests = chunk.map(item => ({
      PutRequest: { Item: item }
    }));

    try {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: writeRequests
        }
      }));
      console.log(`✅ Wrote ${chunk.length} items to ${tableName}`);
    } catch (error) {
      console.error(`❌ Error writing to ${tableName}:`, error);
      throw error;
    }
  }
}

/**
 * Helper function to determine feature area from permission name
 */
function getFeatureArea(permission) {
  for (const [area, permissions] of Object.entries(PERMISSIONS_BY_FEATURE)) {
    if (permissions.includes(permission)) {
      return area.toLowerCase();
    }
  }
  return 'general';
}

/**
 * Seed roles table
 */
async function seedRoles() {
  console.log('🌱 Seeding roles table...');
  
  const now = new Date().toISOString();
  const roleItems = Object.entries(ROLE_DEFINITIONS).map(([roleId, config]) => ({
    role_id: roleId,
    role_name: config.name,
    role_type: config.type,
    description: `Default ${config.type} role: ${config.name}`,
    is_active: true,
    created_at: now,
    updated_at: now,
    created_by: 'seed-script'
  }));

  await batchWrite(TABLES.ROLES, roleItems);
}

/**
 * Seed role permissions table
 */
async function seedRolePermissions() {
  console.log('🌱 Seeding role permissions table...');
  
  const rolePermissionItems = [];
  
  for (const [roleId, config] of Object.entries(ROLE_DEFINITIONS)) {
    for (const permission of config.permissions) {
      rolePermissionItems.push({
        role_id: roleId,
        permission: permission,
        feature_area: getFeatureArea(permission)
      });
    }
  }

  await batchWrite(TABLES.ROLE_PERMISSIONS, rolePermissionItems);
}

/**
 * Seed Cognito group mappings table
 */
async function seedCognitoGroupMappings() {
  console.log('🌱 Seeding Cognito group mappings table...');
  
  const now = new Date().toISOString();
  const mappingItems = COGNITO_MAPPINGS.map(mapping => ({
    cognito_group: mapping.cognito_group,
    role: mapping.role,
    description: `Maps Cognito group ${mapping.cognito_group} to role ${mapping.role}`,
    is_active: true,
    updated_at: now
  }));

  await batchWrite(TABLES.COGNITO_GROUP_MAPPINGS, mappingItems);
}

/**
 * Create default organization settings
 */
async function seedOrganizationSettings() {
  console.log('🌱 Seeding organization settings...');
  
  const defaultOrgId = 'default-org';
  const now = new Date().toISOString();
  
  const settingsItems = [
    {
      organization_id: defaultOrgId,
      setting_type: 'subscription_limits',
      setting_value: {
        max_users: 'unlimited',
        max_ai_agents: 'unlimited',
        max_storage_gb: 'unlimited',
        api_rate_limit: 'unlimited'
      },
      updated_at: now
    },
    {
      organization_id: defaultOrgId,
      setting_type: 'feature_flags',
      setting_value: {
        advanced_analytics: true,
        custom_branding: true,
        enterprise_integrations: true,
        beta_features: true
      },
      updated_at: now
    },
    {
      organization_id: defaultOrgId,
      setting_type: 'security_policies',
      setting_value: {
        require_2fa: false,
        session_timeout_minutes: 480,
        password_complexity: 'standard',
        audit_logging: true
      },
      updated_at: now
    }
  ];

  await batchWrite(TABLES.ORGANIZATION_SETTINGS, settingsItems);
}

/**
 * Create sample admin users (for development/testing)
 */
async function seedSampleUsers() {
  if (ENVIRONMENT === 'production') {
    console.log('⏭️  Skipping sample users creation in production');
    return;
  }

  console.log('🌱 Seeding sample users (development only)...');
  
  const now = new Date().toISOString();
  const defaultOrgId = 'default-org';
  
  const sampleUsers = [
    {
      user_id: 'dev-admin-001',
      email: 'dev.admin@ai-nexus.local',
      cognito_sub: 'dev-admin-001-sub',
      organization_id: defaultOrgId,
      role: 'internal_admin',
      subscription_tier: 'enterprise',
      display_name: 'Development Admin',
      status: 'active',
      created_at: now,
      updated_at: now,
      email_verified: true,
      onboarding_completed: true
    },
    {
      user_id: 'dev-manager-001',
      email: 'dev.manager@ai-nexus.local',
      cognito_sub: 'dev-manager-001-sub',
      organization_id: defaultOrgId,
      role: 'internal_manager',
      subscription_tier: 'enterprise',
      display_name: 'Development Manager',
      status: 'active',
      created_at: now,
      updated_at: now,
      email_verified: true,
      onboarding_completed: true
    },
    {
      user_id: 'test-pro-001',
      email: 'test.pro@ai-nexus.local',
      cognito_sub: 'test-pro-001-sub',
      organization_id: defaultOrgId,
      role: 'pro',
      subscription_tier: 'pro',
      display_name: 'Test Pro User',
      status: 'active',
      created_at: now,
      updated_at: now,
      email_verified: true,
      onboarding_completed: true
    }
  ];

  await batchWrite(TABLES.USERS, sampleUsers);

  // Add team memberships for these users
  const teamMemberships = sampleUsers.map(user => ({
    organization_id: user.organization_id,
    user_id: user.user_id,
    role: user.role,
    status: 'active',
    joined_at: now,
    updated_at: now
  }));

  await batchWrite(TABLES.TEAM_MEMBERSHIPS, teamMemberships);
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🚀 Starting permission system database seeding...');
  console.log(`📍 Environment: ${ENVIRONMENT}`);
  console.log(`📍 Region: ${REGION}`);
  console.log(`📍 Table prefix: ${TABLE_PREFIX}`);
  
  try {
    await seedRoles();
    await seedRolePermissions();
    await seedCognitoGroupMappings();
    await seedOrganizationSettings();
    await seedSampleUsers();
    
    console.log('✅ All seeding operations completed successfully!');
    console.log('🎯 Permission system database is ready for use.');
    
    // Display summary
    const totalRoles = Object.keys(ROLE_DEFINITIONS).length;
    const totalPermissions = Object.values(PERMISSIONS_BY_FEATURE).flat().length;
    const totalMappings = COGNITO_MAPPINGS.length;
    
    console.log('\n📊 Seeding Summary:');
    console.log(`   • ${totalRoles} roles created`);
    console.log(`   • ${totalPermissions} unique permissions defined`);
    console.log(`   • ${totalMappings} Cognito group mappings created`);
    console.log(`   • Organization settings configured`);
    if (ENVIRONMENT !== 'production') {
      console.log(`   • 3 sample users created for development`);
    }
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  seedRoles,
  seedRolePermissions,
  seedCognitoGroupMappings,
  seedOrganizationSettings,
  seedSampleUsers,
  ROLE_DEFINITIONS,
  PERMISSIONS_BY_FEATURE,
  COGNITO_MAPPINGS
};
