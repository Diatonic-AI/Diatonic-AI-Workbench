# Lambda Functions - REVIEW

## Analysis Required
Found 1 Lambda functions that need individual review:
1. Identify which are part of active Amplify applications
2. Identify which are part of active API Gateway endpoints
3. Determine which are orphaned and can be removed

## Action Plan
- Cross-reference with Amplify and API Gateway resources
- Check last invocation dates
- Remove unused functions

## Data
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                                                  ListFunctions                                                                                  |
+-----------------------------------------------+-------------------------------+-----------------------------------------------------------------------------------+-------------+
|                 FunctionName                  |         LastModified          |                                       Role                                        |   Runtime   |
+-----------------------------------------------+-------------------------------+-----------------------------------------------------------------------------------+-------------+
|  aws-devops-dev-education-api                 |  2025-09-08T03:04:37.032+0000 |  arn:aws:iam::313476888312:role/aws-devops-dev-comprehensive-backend-lambda-role  |  nodejs18.x |
|  ai-nexus-dev-stripe-get-subscription-status  |  2025-09-08T06:34:57.249+0000 |  arn:aws:iam::313476888312:role/ai-nexus-dev-stripe-lambda-execution-role         |  nodejs20.x |
|  amplify-login-create-auth-challenge-270079a5 |  2025-09-09T07:22:29.382+0000 |  arn:aws:iam::313476888312:role/amplify-login-lambda-270079a5                     |  nodejs20.x |
|  diatonic-prod-cognito-triggers               |  2025-08-25T12:10:04.711+0000 |  arn:aws:iam::313476888312:role/diatonic-prod-lambda-execution                    |  nodejs20.x |
|  ai-nexus-dev-stripe-update-subscription      |  2025-09-08T06:34:45.726+0000 |  arn:aws:iam::313476888312:role/ai-nexus-dev-stripe-lambda-execution-role         |  nodejs20.x |
|  aws-devops-dev-auth-post-authentication      |  2025-09-07T23:38:30.547+0000 |  arn:aws:iam::313476888312:role/aws-devops-dev-lambda-execution-role              |  python3.9  |
|  ai-nexus-dev-stripe-list-invoices            |  2025-09-08T06:34:51.484+0000 |  arn:aws:iam::313476888312:role/ai-nexus-dev-stripe-lambda-execution-role         |  nodejs20.x |
|  aws-devops-dev-user-registration             |  2025-09-07T23:38:18.945+0000 |  arn:aws:iam::313476888312:role/aws-devops-dev-lambda-execution-role              |  python3.9  |
|  amplify-login-verify-auth-challenge-270079a5 |  2025-09-09T07:22:28.728+0000 |  arn:aws:iam::313476888312:role/amplify-login-lambda-270079a5                     |  nodejs20.x |
|  amplify-login-define-auth-challenge-270079a5 |  2025-09-09T07:22:29.076+0000 |  arn:aws:iam::313476888312:role/amplify-login-lambda-270079a5                     |  nodejs20.x |
|  ai-nexus-dev-stripe-cancel-subscription      |  2025-09-08T06:35:14.584+0000 |  arn:aws:iam::313476888312:role/ai-nexus-dev-stripe-lambda-execution-role         |  nodejs20.x |
|  ai-nexus-dev-stripe-stripe-webhook-handler   |  2025-09-08T06:51:29.000+0000 |  arn:aws:iam::313476888312:role/ai-nexus-dev-stripe-lambda-execution-role         |  nodejs20.x |
|  aws-devops-dev-user-profile-management       |  2025-09-07T23:38:24.740+0000 |  arn:aws:iam::313476888312:role/aws-devops-dev-lambda-execution-role              |  python3.9  |
|  ai-nexus-dev-stripe-create-checkout-session  |  2025-09-08T06:35:26.064+0000 |  arn:aws:iam::313476888312:role/ai-nexus-dev-stripe-lambda-execution-role         |  nodejs20.x |
|  diatonic-prod-api-handler                    |  2025-08-25T12:14:06.000+0000 |  arn:aws:iam::313476888312:role/diatonic-prod-lambda-execution                    |  nodejs20.x |
|  ai-nexus-dev-stripe-create-setup-intent      |  2025-09-08T06:35:02.989+0000 |  arn:aws:iam::313476888312:role/ai-nexus-dev-stripe-lambda-execution-role         |  nodejs20.x |
|  amplify-login-custom-message-270079a5        |  2025-09-09T07:22:29.683+0000 |  arn:aws:iam::313476888312:role/amplify-login-lambda-270079a5                     |  nodejs20.x |
|  ai-nexus-dev-stripe-create-portal-session    |  2025-09-08T06:35:20.305+0000 |  arn:aws:iam::313476888312:role/ai-nexus-dev-stripe-lambda-execution-role         |  nodejs20.x |
|  aws-devops-dev-main-api                      |  2025-09-08T11:40:36.000+0000 |  arn:aws:iam::313476888312:role/aws-devops-dev-main-api-lambda-role               |  nodejs18.x |
+-----------------------------------------------+-------------------------------+-----------------------------------------------------------------------------------+-------------+
