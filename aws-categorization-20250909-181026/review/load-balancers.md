# Load Balancers - REVIEW

## Current Load Balancers
- aws-devops-dev-alb: Application Load Balancer in VPC vpc-0afa64bf5579542eb

## Analysis Required
1. Check if ALB has active targets
2. Determine if ALB is routing traffic to active services
3. If no active backends, ALB can be removed
4. If ALB is removed, related EventBridge rule can also be removed

## Data
----------------------------------------------------------------------------------------------------------------------------------
|                                                      DescribeLoadBalancers                                                     |
+------------------+-------------------------------------------------------------------------------------------------------------+
|  LoadBalancerArn |  arn:aws:elasticloadbalancing:us-east-2:313476888312:loadbalancer/app/aws-devops-dev-alb/a8207a0a72ffb6e1   |
|  LoadBalancerName|  aws-devops-dev-alb                                                                                         |
|  State           |  active                                                                                                     |
|  Type            |  application                                                                                                |
|  VpcId           |  vpc-0afa64bf5579542eb                                                                                      |
+------------------+-------------------------------------------------------------------------------------------------------------+
