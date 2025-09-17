# AWS Infrastructure Audit Summary

**Generated**: 2025-09-09 23:07:54 UTC
**AWS Account**: 313476888312
**AWS Region**: us-east-2

## 🔍 Audit Results

### Core Services
- **CloudFront Distributions**: 0
0 distributions found
- **Amplify Applications**: 2 applications found
- **S3 Buckets**: 1 buckets found

### Compute & Container Services  
- **EC2 Instances**: 0
0 instances found
- **ECS Clusters**: 1 clusters found
- **ECS Services**: 1 services found
- **Lambda Functions**: 1 functions found

### Networking
- **VPCs**: 1 VPCs found
- **Load Balancers**: 3 ALBs + 0
0 CLBs found
- **Elastic IPs**: 1 addresses found

### Event & API Services
- **EventBridge Rules**: 1 rules found
- **API Gateway APIs**: 1 REST + 1 V2 APIs found

### Storage & Security
- **EBS Volumes**: 0
0 volumes found
- **ECR Repositories**: 0
0 repositories found
- **Key Pairs**: 0
0 key pairs found

## 📁 Detailed Reports

All detailed reports are available in this directory:
- `cloudfront-*.txt` - CloudFront distribution details
- `amplify-*.txt` - Amplify application and branch details  
- `ecs-*.txt` - ECS clusters, services, and task definitions
- `s3-*.txt` - S3 bucket information
- `vpc-*.txt`, `subnets.txt`, `security-groups.txt` - Network resources
- `ec2-*.txt`, `load-balancers.txt` - Compute resources
- `eventbridge-*.txt` - Event-driven architecture resources
- `lambda-functions.txt`, `api-gateway-*.txt` - Serverless resources

## 🎯 Next Steps

1. **Review Reports**: Examine each detailed report to understand resource usage
2. **Categorize Resources**: Classify resources as KEEP, REMOVE, or REVIEW
3. **Create Cleanup Plan**: Generate safe deletion scripts with dependency checking
4. **Execute Cleanup**: Run cleanup scripts in dry-run mode first, then execute

## ⚠️ Safety Notes

- Always backup critical data before deletion
- Check resource dependencies before removing anything
- Start with unused/orphaned resources
- Verify Amplify and MinIO S3 resources are preserved
- Test remaining infrastructure after cleanup

