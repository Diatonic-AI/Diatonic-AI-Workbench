# AWS Infrastructure Cleanup Execution Plan

## 🎯 PRIORITY ORDER (Execute in this sequence)

### Phase 1: Safe Removal of Unused Resources (LOW RISK)
1. **Unassociated Elastic IPs** - Remove immediately (cost savings)
2. **Unused Lambda Functions** - After verifying no dependencies  
3. **Old S3 Development Buckets** - After backing up any critical data
4. **Orphaned EventBridge Rules** - After confirming no active targets

### Phase 2: Infrastructure Cleanup (MEDIUM RISK)
1. **Unused ECS Services** - Stop services first, then delete
2. **Unused ECS Clusters** - After all services removed
3. **Unused Load Balancers** - After confirming no traffic
4. **Unused Security Groups** - After checking dependencies

### Phase 3: Network Cleanup (HIGHER RISK)
1. **Unused Subnets** - After all resources removed from them
2. **Unused VPCs** - Only after all dependent resources removed
3. **Unused Internet Gateways** - After VPCs removed

## ⚠️ CRITICAL - DO NOT REMOVE

### Production Resources (NEVER DELETE)
- All `diatonic-prod-*` S3 buckets
- All `minio-standalone-dev-*` S3 buckets  
- `aws-devops-terraform-state-unified-xewhyolb` (Terraform state)
- Both Amplify applications (development and staging)
- `amplify-ainexusworkbench-dev-7627f-deployment` bucket

### Infrastructure State
- Terraform state bucket (contains infrastructure definitions)
- Any resources currently used by Amplify applications
- Default VPC (unless explicitly unused)

## 🔧 Execution Strategy

### Pre-Cleanup
1. **Backup Critical Data**: Export any important data from resources to be deleted
2. **Document Current State**: Save current resource configurations
3. **Test Dependencies**: Verify removing each resource won't break others
4. **Dry Run**: Use AWS CLI dry-run options where available

### During Cleanup
1. **One Resource Type at a Time**: Don't mix different resource types in same operation
2. **Verify Each Step**: Confirm each resource is successfully removed
3. **Monitor Applications**: Check that www.diatonic.ai and apps remain functional
4. **Document Actions**: Log each deletion for audit trail

### Post-Cleanup
1. **Test All Applications**: Verify Amplify apps still deploy and function
2. **Check Costs**: Monitor AWS billing for cost reduction
3. **Update Documentation**: Reflect new infrastructure state
4. **Set Up Monitoring**: Ensure remaining resources have appropriate monitoring

## 💰 Expected Cost Savings

### Immediate Savings
- Unassociated Elastic IPs: ~$3.65/month each
- Unused Load Balancers: ~$22.50/month each  
- Unused ECS Services: Variable based on resource allocation

### Long-term Savings
- Reduced S3 storage costs from removing duplicate dev buckets
- Reduced data transfer costs from unused resources
- Simplified billing and cost monitoring

## 🚨 Emergency Rollback

If issues occur during cleanup:
1. **Stop Cleanup Process**: Don't delete more resources
2. **Check Application Status**: Verify www.diatonic.ai and Amplify apps
3. **Review Dependencies**: Check if deleted resource was actually needed
4. **Recreate if Necessary**: Use Terraform or AWS CLI to recreate critical resources

## ✅ Success Criteria

Cleanup is successful when:
- [ ] www.diatonic.ai remains fully functional
- [ ] Amplify applications deploy and run correctly
- [ ] AWS monthly costs reduced by >20%
- [ ] All production data preserved and accessible
- [ ] Infrastructure remains manageable and well-documented
