# Education Backend Deployment Guide

This guide covers deploying the enhanced education backend Lambda function with module management capabilities.

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Node.js 18+** installed
3. **Access to the existing infrastructure** (DynamoDB, API Gateway, Cognito)

## Current Infrastructure (us-east-2)

### Existing Resources
- **API Gateway**: `aiworkbench-prod-api` (REST API)
- **DynamoDB**: `aiworkbench-education-prod` table with GSI
- **Cognito User Pool**: `aiworkbench-prod`
- **S3 Bucket**: `aiworkbench-education-content-prod`

### Lambda Function Details
- **Function Name**: `aiworkbench-education-backend-prod`
- **Runtime**: Node.js 18.x
- **Memory**: 1024 MB
- **Timeout**: 30 seconds

## Deployment Steps

### 1. Package the Lambda Function

Create a deployment package from the Lambda code:

```bash
# Navigate to the Lambda function directory
cd /path/to/education-lambda-handler

# Install dependencies
npm install

# Create deployment package
zip -r education-backend-deployment.zip . -x "*.zip" "node_modules/.cache/*" "*.log"
```

### 2. Update Lambda Function Code

```bash
# Update the Lambda function with new code
aws lambda update-function-code \
  --function-name aiworkbench-education-backend-prod \
  --zip-file fileb://education-backend-deployment.zip \
  --region us-east-2
```

### 3. Update Environment Variables

```bash
# Set required environment variables
aws lambda update-function-configuration \
  --function-name aiworkbench-education-backend-prod \
  --environment Variables='{
    "DYNAMODB_TABLE_NAME":"aiworkbench-education-prod",
    "S3_BUCKET_NAME":"aiworkbench-education-content-prod",
    "COGNITO_USER_POOL_ID":"us-east-2_XXXXXXXXX",
    "NODE_ENV":"production",
    "LOG_LEVEL":"info"
  }' \
  --region us-east-2
```

### 4. Verify API Gateway Integration

Check that the API Gateway routes are properly configured:

```bash
# List API Gateway resources
aws apigateway get-resources \
  --rest-api-id YOUR_API_ID \
  --region us-east-2

# Example expected routes:
# GET    /education/modules
# POST   /education/modules
# GET    /education/modules/{moduleId}
# PUT    /education/modules/{moduleId}
# DELETE /education/modules/{moduleId}
# POST   /education/modules/{moduleId}/upload-url
```

### 5. Test the Deployment

Test the Lambda function with a sample event:

```bash
# Create test event
cat > test-event.json << 'EOF'
{
  "httpMethod": "GET",
  "path": "/education/modules",
  "headers": {
    "Authorization": "Bearer YOUR_TEST_TOKEN",
    "Content-Type": "application/json"
  },
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-id",
        "custom:tenant": "test-tenant",
        "custom:role": "instructor"
      }
    }
  },
  "body": null
}
EOF

# Invoke the function
aws lambda invoke \
  --function-name aiworkbench-education-backend-prod \
  --payload fileb://test-event.json \
  --region us-east-2 \
  response.json

# Check the response
cat response.json
```

## Frontend Configuration

### 1. Update Environment Variables

Make sure the frontend has the correct API endpoint:

```bash
# .env.production or .env.local
VITE_AWS_API_GATEWAY_ENDPOINT=https://your-api-id.execute-api.us-east-2.amazonaws.com/prod
VITE_AWS_REGION=us-east-2
VITE_AWS_COGNITO_USER_POOL_ID=us-east-2_XXXXXXXXX
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=your-client-id
```

### 2. Test Frontend Integration

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Education page** and switch to "Manage Modules" tab

3. **Test module operations**:
   - Create a new module
   - Upload content to a module
   - Edit module details
   - Delete a module

## Monitoring and Troubleshooting

### CloudWatch Logs

Monitor Lambda function logs:

```bash
# View recent logs
aws logs tail /aws/lambda/aiworkbench-education-backend-prod \
  --region us-east-2 \
  --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/aiworkbench-education-backend-prod \
  --filter-pattern "ERROR" \
  --region us-east-2
```

### Common Issues

1. **CORS Errors**: Ensure API Gateway has proper CORS configuration
2. **Authentication Failures**: Verify Cognito integration and JWT validation
3. **DynamoDB Access**: Check Lambda execution role permissions
4. **S3 Upload Issues**: Verify S3 bucket policy and presigned URL generation

### Debug Commands

```bash
# Check Lambda function configuration
aws lambda get-function-configuration \
  --function-name aiworkbench-education-backend-prod \
  --region us-east-2

# Check DynamoDB table
aws dynamodb describe-table \
  --table-name aiworkbench-education-prod \
  --region us-east-2

# Test S3 bucket access
aws s3 ls s3://aiworkbench-education-content-prod/ --region us-east-2
```

## Security Considerations

### IAM Permissions

The Lambda execution role should have:

1. **DynamoDB Permissions**:
   - `dynamodb:Query`
   - `dynamodb:GetItem`
   - `dynamodb:PutItem`
   - `dynamodb:UpdateItem`
   - `dynamodb:DeleteItem`

2. **S3 Permissions**:
   - `s3:GetObject`
   - `s3:PutObject`
   - `s3:GeneratePresignedPost`

3. **CloudWatch Permissions**:
   - `logs:CreateLogGroup`
   - `logs:CreateLogStream`
   - `logs:PutLogEvents`

### Data Protection

1. **Tenant Isolation**: All operations filtered by `tenantId`
2. **Content Validation**: File type and size validation
3. **Access Control**: Role-based permissions (instructor/admin required)

## Performance Optimization

### Recommendations

1. **Provisioned Concurrency**: Consider for consistent performance
2. **Connection Pooling**: Reuse database connections
3. **Caching**: Implement Redis for frequently accessed data
4. **CDN**: Use CloudFront for S3 content delivery

### Monitoring Metrics

- Lambda Duration
- Lambda Invocations
- Lambda Errors
- DynamoDB Throttles
- API Gateway 4xx/5xx Errors

## Rollback Plan

If issues arise after deployment:

```bash
# Rollback to previous version
aws lambda update-function-code \
  --function-name aiworkbench-education-backend-prod \
  --zip-file fileb://previous-version.zip \
  --region us-east-2

# Or use version management
aws lambda publish-version \
  --function-name aiworkbench-education-backend-prod \
  --region us-east-2

# Update alias to point to stable version
aws lambda update-alias \
  --function-name aiworkbench-education-backend-prod \
  --name LIVE \
  --function-version 1 \
  --region us-east-2
```

## Next Steps

After successful deployment:

1. **Set up monitoring alerts** in CloudWatch
2. **Configure automated backups** for DynamoDB
3. **Implement CI/CD pipeline** for future updates
4. **Add integration tests** for API endpoints
5. **Document API endpoints** for frontend team

## Contact

For deployment issues or questions, contact the infrastructure team or check:
- CloudWatch logs for Lambda function
- API Gateway execution logs
- DynamoDB CloudWatch metrics