#!/bin/bash
# Script to migrate users from old pool to new pool

set -euo pipefail

OLD_POOL_ID="us-east-2_xkNeOGMu1"
NEW_POOL_ID="us-east-2_S9gdn0Gj7"
REGION="us-east-2"

echo "📋 Migrating users from old pool to new pool..."

# Export users from old pool
aws cognito-idp list-users --user-pool-id $OLD_POOL_ID --region $REGION --output json > users-to-migrate.json

# Process each user
jq -r '.Users[] | @base64' users-to-migrate.json | while read user; do
    USER_DATA=$(echo $user | base64 --decode)
    USERNAME=$(echo $USER_DATA | jq -r '.Username')
    EMAIL=$(echo $USER_DATA | jq -r '.Attributes[] | select(.Name=="email") | .Value')
    
    echo "Migrating user: $USERNAME ($EMAIL)"
    
    # Create user in new pool (admin create)
    aws cognito-idp admin-create-user \
        --user-pool-id $NEW_POOL_ID \
        --username "$EMAIL" \
        --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
        --message-action SUPPRESS \
        --region $REGION || echo "Warning: Failed to migrate $EMAIL (may already exist)"
    
    echo "✅ User $EMAIL migration attempted"
done

echo "✅ User migration completed"
