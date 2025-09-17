#!/usr/bin/env tsx
/**
 * AWS Cognito Test Users Setup Script
 * 
 * Creates test users for different subscription tiers and internal roles
 * for testing subdomain-based access control in production environment.
 */

import { 
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminSetUserPasswordCommand,
  CreateGroupCommand,
  ListUsersCommand,
  ListGroupsCommand,
  AdminListGroupsForUserCommand,
  AdminDeleteUserCommand
} from '@aws-sdk/client-cognito-identity-provider';

// Configuration
const COGNITO_CONFIG = {
  region: process.env.VITE_AWS_REGION || 'us-east-2',
  userPoolId: process.env.VITE_AWS_COGNITO_USER_POOL_ID,
  clientId: process.env.VITE_AWS_COGNITO_USER_POOL_CLIENT_ID
};

// Test user configurations matching the permission system
const TEST_USERS = [
  {
    email: 'test.anonymous@diatonic.ai',
    role: 'anonymous',
    cognitoGroups: [], // No groups = anonymous
    description: 'Anonymous user (not signed in) - used for testing logged out state',
    skipCreation: true // This is just for reference - anonymous users aren't created
  },
  {
    email: 'test.free@diatonic.ai',
    role: 'free',
    cognitoGroups: ['FreeTier'],
    description: 'Free tier user - access to education and community only',
    password: 'TestPass123!',
    firstName: 'Free',
    lastName: 'User'
  },
  {
    email: 'test.basic@diatonic.ai',
    role: 'basic',
    cognitoGroups: ['BasicTier'],
    description: 'Basic subscription user - limited premium features',
    password: 'TestPass123!',
    firstName: 'Basic',
    lastName: 'User'
  },
  {
    email: 'test.pro@diatonic.ai',
    role: 'pro',
    cognitoGroups: ['ProTier'],
    description: 'Pro subscription user - full premium features',
    password: 'TestPass123!',
    firstName: 'Pro',
    lastName: 'User'
  },
  {
    email: 'test.extreme@diatonic.ai',
    role: 'extreme',
    cognitoGroups: ['ExtremeTier'],
    description: 'Extreme subscription user - unlimited features',
    password: 'TestPass123!',
    firstName: 'Extreme',
    lastName: 'User'
  },
  {
    email: 'test.enterprise@diatonic.ai',
    role: 'enterprise',
    cognitoGroups: ['EnterpriseTier'],
    description: 'Enterprise subscription user - all features + enterprise',
    password: 'TestPass123!',
    firstName: 'Enterprise',
    lastName: 'User'
  },
  {
    email: 'internal.dev@diatonic.ai',
    role: 'internal_dev',
    cognitoGroups: ['InternalDev'],
    description: 'Internal developer - full access to all features + debugging',
    password: 'DevPass123!',
    firstName: 'Internal',
    lastName: 'Developer'
  },
  {
    email: 'internal.admin@diatonic.ai',
    role: 'internal_admin',
    cognitoGroups: ['InternalAdmin'],
    description: 'Internal administrator - system administration access',
    password: 'AdminPass123!',
    firstName: 'Internal',
    lastName: 'Admin'
  },
  {
    email: 'internal.manager@diatonic.ai',
    role: 'internal_manager',
    cognitoGroups: ['InternalManager'],
    description: 'Internal manager - management access without debug privileges',
    password: 'MgrPass123!',
    firstName: 'Internal',
    lastName: 'Manager'
  }
] as const;

// Cognito groups configuration
const COGNITO_GROUPS = [
  {
    GroupName: 'FreeTier',
    Description: 'Free tier users with access to community and education features'
  },
  {
    GroupName: 'BasicTier',
    Description: 'Basic subscription tier users with limited premium features'
  },
  {
    GroupName: 'ProTier',
    Description: 'Pro subscription tier users with full premium features'
  },
  {
    GroupName: 'ExtremeTier',
    Description: 'Extreme subscription tier users with unlimited features'
  },
  {
    GroupName: 'EnterpriseTier',
    Description: 'Enterprise subscription tier users with all features'
  },
  {
    GroupName: 'InternalDev',
    Description: 'Internal developers with full system access'
  },
  {
    GroupName: 'InternalAdmin',
    Description: 'Internal administrators with system administration access'
  },
  {
    GroupName: 'InternalManager',
    Description: 'Internal managers with limited administrative access'
  }
] as const;

class CognitoTestUserManager {
  private client: CognitoIdentityProviderClient;

  constructor() {
    if (!COGNITO_CONFIG.userPoolId) {
      throw new Error('VITE_AWS_COGNITO_USER_POOL_ID environment variable is required');
    }

    this.client = new CognitoIdentityProviderClient({
      region: COGNITO_CONFIG.region
    });
  }

  /**
   * Create all required Cognito groups
   */
  async createGroups(): Promise<void> {
    console.log('🔧 Creating Cognito groups...');

    // List existing groups
    const existingGroups = await this.client.send(new ListGroupsCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId
    }));

    const existingGroupNames = existingGroups.Groups?.map(g => g.GroupName) || [];

    for (const group of COGNITO_GROUPS) {
      if (existingGroupNames.includes(group.GroupName)) {
        console.log(`  ✅ Group already exists: ${group.GroupName}`);
        continue;
      }

      try {
        await this.client.send(new CreateGroupCommand({
          UserPoolId: COGNITO_CONFIG.userPoolId,
          GroupName: group.GroupName,
          Description: group.Description
        }));
        console.log(`  ✅ Created group: ${group.GroupName}`);
      } catch (error) {
        console.error(`  ❌ Failed to create group ${group.GroupName}:`, error);
      }
    }
  }

  /**
   * Create test users
   */
  async createTestUsers(): Promise<void> {
    console.log('👥 Creating test users...');

    // List existing users to avoid duplicates
    const existingUsers = await this.client.send(new ListUsersCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId
    }));

    const existingEmails = existingUsers.Users?.map(u => 
      u.Attributes?.find(attr => attr.Name === 'email')?.Value
    ).filter(Boolean) || [];

    for (const user of TEST_USERS) {
      if (user.skipCreation) {
        console.log(`  ⏭️  Skipping: ${user.email} (${user.description})`);
        continue;
      }

      if (existingEmails.includes(user.email)) {
        console.log(`  ✅ User already exists: ${user.email}`);
        
        // Ensure user is in correct groups
        await this.ensureUserGroups(user.email, user.cognitoGroups);
        continue;
      }

      try {
        // Create user
        const createUserResult = await this.client.send(new AdminCreateUserCommand({
          UserPoolId: COGNITO_CONFIG.userPoolId,
          Username: user.email,
          UserAttributes: [
            { Name: 'email', Value: user.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'given_name', Value: user.firstName },
            { Name: 'family_name', Value: user.lastName }
          ],
          TemporaryPassword: user.password,
          MessageAction: 'SUPPRESS' // Don't send welcome email
        }));

        // Set permanent password
        await this.client.send(new AdminSetUserPasswordCommand({
          UserPoolId: COGNITO_CONFIG.userPoolId,
          Username: user.email,
          Password: user.password,
          Permanent: true
        }));

        // Add user to groups
        for (const groupName of user.cognitoGroups) {
          await this.client.send(new AdminAddUserToGroupCommand({
            UserPoolId: COGNITO_CONFIG.userPoolId,
            Username: user.email,
            GroupName: groupName
          }));
        }

        console.log(`  ✅ Created user: ${user.email} (${user.role}) - Groups: ${user.cognitoGroups.join(', ')}`);
      } catch (error) {
        console.error(`  ❌ Failed to create user ${user.email}:`, error);
      }
    }
  }

  /**
   * Ensure user is in correct groups
   */
  private async ensureUserGroups(email: string, requiredGroups: readonly string[]): Promise<void> {
    try {
      const userGroups = await this.client.send(new AdminListGroupsForUserCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Username: email
      }));

      const currentGroups = userGroups.Groups?.map(g => g.GroupName) || [];
      
      for (const groupName of requiredGroups) {
        if (!currentGroups.includes(groupName)) {
          await this.client.send(new AdminAddUserToGroupCommand({
            UserPoolId: COGNITO_CONFIG.userPoolId,
            Username: email,
            GroupName: groupName
          }));
          console.log(`    ➕ Added ${email} to group: ${groupName}`);
        }
      }
    } catch (error) {
      console.error(`  ⚠️  Could not verify groups for ${email}:`, error);
    }
  }

  /**
   * List all test users and their current status
   */
  async listTestUsers(): Promise<void> {
    console.log('📋 Current test users status:');
    console.log('');

    for (const user of TEST_USERS) {
      if (user.skipCreation) {
        console.log(`🔄 ${user.email} (${user.role})`);
        console.log(`   ${user.description}`);
        console.log(`   Status: Virtual user (no Cognito account)`);
        console.log('');
        continue;
      }

      try {
        const userGroups = await this.client.send(new AdminListGroupsForUserCommand({
          UserPoolId: COGNITO_CONFIG.userPoolId,
          Username: user.email
        }));

        const currentGroups = userGroups.Groups?.map(g => g.GroupName) || [];
        const hasCorrectGroups = user.cognitoGroups.every(g => currentGroups.includes(g));

        console.log(`${hasCorrectGroups ? '✅' : '⚠️'} ${user.email} (${user.role})`);
        console.log(`   ${user.description}`);
        console.log(`   Expected Groups: ${user.cognitoGroups.join(', ')}`);
        console.log(`   Current Groups: ${currentGroups.join(', ')}`);
        console.log(`   Login: ${user.email} / ${user.password}`);
        console.log('');

      } catch (error) {
        console.log(`❌ ${user.email} (${user.role})`);
        console.log(`   ${user.description}`);
        console.log(`   Status: User not found in Cognito`);
        console.log('');
      }
    }
  }

  /**
   * Delete all test users (for cleanup)
   */
  async deleteTestUsers(): Promise<void> {
    console.log('🗑️  Deleting test users...');
    
    const confirmed = process.argv.includes('--confirm-delete');
    if (!confirmed) {
      console.log('❌ Add --confirm-delete flag to actually delete users');
      return;
    }

    for (const user of TEST_USERS) {
      if (user.skipCreation) continue;

      try {
        await this.client.send(new AdminDeleteUserCommand({
          UserPoolId: COGNITO_CONFIG.userPoolId,
          Username: user.email
        }));
        console.log(`  ✅ Deleted user: ${user.email}`);
      } catch (error) {
        if ((error as any).name === 'UserNotFoundException') {
          console.log(`  ⏭️  User not found: ${user.email}`);
        } else {
          console.error(`  ❌ Failed to delete user ${user.email}:`, error);
        }
      }
    }
  }

  /**
   * Generate test users documentation
   */
  generateTestUsersDoc(): string {
    const doc = `# Test Users for Subdomain Access Control

This document contains test user credentials for testing different subscription tiers and access levels across the diatonic.ai platform subdomains.

## 🔒 Security Notice
These are test accounts for development and staging environments only. Do not use these credentials in production.

## 🌐 Subdomain Access Matrix

| Subdomain | URL | Access Level | Purpose |
|-----------|-----|--------------|---------|
| **Main** | https://diatonic.ai | Mixed | Full platform with all features (premium requires subscription) |
| **App** | https://app.diatonic.ai | Paid | Premium AI tools (Toolset, Lab, Observatory) - Basic+ required |
| **Education** | https://edu.diatonic.ai | Free | AI learning and tutorials - Free access |
| **Community** | https://fam.diatonic.ai | Free | Community discussions and sharing - Free access |

## 👥 Test User Accounts

${TEST_USERS.filter(u => !u.skipCreation).map(user => `
### ${user.firstName} ${user.lastName} (${user.role})
- **Email:** \`${user.email}\`
- **Password:** \`${user.password}\`
- **Role:** ${user.role}
- **Groups:** ${user.cognitoGroups.join(', ')}
- **Description:** ${user.description}
- **App Subdomain Access:** ${(['basic', 'pro', 'extreme', 'enterprise', 'internal_dev', 'internal_admin', 'internal_manager'].includes(user.role)) ? '✅ Yes' : '❌ No'}
`).join('')}

## 🧪 Testing Scenarios

### 1. Free Tier User Testing
- **User:** test.free@diatonic.ai
- **Can Access:** edu.diatonic.ai, fam.diatonic.ai, diatonic.ai (free features only)
- **Cannot Access:** app.diatonic.ai (should redirect to pricing)

### 2. Basic Subscription Testing
- **User:** test.basic@diatonic.ai
- **Can Access:** All subdomains with basic premium features
- **Premium Features:** Limited agents, basic visual builder, email support

### 3. Pro Subscription Testing
- **User:** test.pro@diatonic.ai
- **Can Access:** All subdomains with full premium features
- **Premium Features:** Team collaboration, advanced builder, priority support

### 4. Internal Staff Testing
- **User:** internal.dev@diatonic.ai
- **Can Access:** All subdomains with full privileges
- **Special Features:** Debug modes, admin panels, all internal tools

## 🛠️ Development Testing

For local development, use URL parameters to simulate subdomains:
- Main: \`http://localhost:8080/?subdomain=main\`
- App: \`http://localhost:8080/?subdomain=app\`
- Education: \`http://localhost:8080/?subdomain=edu\`
- Community: \`http://localhost:8080/?subdomain=fam\`

## 📝 Test Checklist

- [ ] Free users cannot access app.diatonic.ai
- [ ] Basic users can access app.diatonic.ai with limited features
- [ ] Pro users have full premium access
- [ ] All users can access edu.diatonic.ai and fam.diatonic.ai
- [ ] Internal users have full access to all features
- [ ] Proper error messages shown for denied access
- [ ] Upgrade prompts shown for insufficient permissions

## 🔄 Updating Test Users

To recreate or update test users, run:
\`\`\`bash
# Create/update all test users
npm run setup-test-users

# List current test users status
npm run setup-test-users -- --list

# Delete all test users (requires confirmation)
npm run setup-test-users -- --delete --confirm-delete
\`\`\`

---
*Generated automatically by setup-test-users.ts script*
`;

    return doc;
  }
}

// CLI interface
async function main() {
  const manager = new CognitoTestUserManager();
  
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--delete')) {
      await manager.deleteTestUsers();
    } else if (args.includes('--list')) {
      await manager.listTestUsers();
    } else if (args.includes('--doc')) {
      const doc = manager.generateTestUsersDoc();
      console.log(doc);
    } else {
      // Default: create groups and users
      await manager.createGroups();
      await manager.createTestUsers();
      console.log('');
      console.log('✅ Test users setup completed!');
      console.log('');
      console.log('📋 To see all test users and their credentials:');
      console.log('npm run setup-test-users -- --list');
      console.log('');
      console.log('📖 To generate documentation:');
      console.log('npm run setup-test-users -- --doc > TEST_USERS.md');
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Only run if this file is being executed directly
if (require.main === module) {
  main();
}

export { CognitoTestUserManager, TEST_USERS, COGNITO_GROUPS };