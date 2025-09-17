#!/bin/bash
# Script to clean up old ai-nexus Cognito resources after successful migration

set -euo pipefail

OLD_POOL_ID="us-east-2_xkNeOGMu1"
REGION="us-east-2"

echo "⚠️  WARNING: This will permanently delete the old ai-nexus Cognito resources!"
echo "Make sure you've tested the new diatonic-ai pools before running this."
echo ""
echo "Resources to be deleted:"
echo "  - User Pool: $OLD_POOL_ID (ai-nexus-workbench-dev-user-pool)"
echo "  - All associated user pool clients"
echo "  - All users in the old pool"
echo ""
read -p "Are you sure you want to proceed? (type 'DELETE' to confirm): " confirmation

if [ "$confirmation" != "DELETE" ]; then
    echo "❌ Deletion cancelled"
    exit 0
fi

echo "🗑️  Starting cleanup of old Cognito resources..."

# List and delete user pool clients
echo "Deleting user pool clients..."
aws cognito-idp list-user-pool-clients --user-pool-id $OLD_POOL_ID --region $REGION --query "UserPoolClients[].ClientId" --output text | while read client_id; do
    if [ -n "$client_id" ]; then
        echo "  Deleting client: $client_id"
        aws cognito-idp delete-user-pool-client --user-pool-id $OLD_POOL_ID --client-id $client_id --region $REGION
    fi
done

# Delete the user pool (this will also delete all users)
echo "Deleting user pool: $OLD_POOL_ID"
aws cognito-idp delete-user-pool --user-pool-id $OLD_POOL_ID --region $REGION

echo "✅ Old Cognito resources cleaned up successfully!"
echo "The following resources remain active:"
echo "  ✅ New Pool: us-east-2_S9gdn0Gj7 (diatonic-ai-dev-user-pool)"
echo "  ✅ New Identity Pool: us-east-2:a2e34991-8c53-4a48-82ad-3e6cac24bf6e"
echo "  ✅ IAM Roles: diatonic-ai-dev-auth-role, diatonic-ai-dev-unauth-role"

