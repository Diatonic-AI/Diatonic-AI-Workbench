# EventBridge Rules - REVIEW

## Current Rules
- aws-devops-dev-alb-ssl-certificate-renewal: ACM certificate expiration monitoring

## Analysis
This rule monitors SSL certificate expiration for load balancer.
If we have active load balancers, this should be kept.
If no active ALBs, this can be removed.

## Data
-------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                                         ListRules                                                                         |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------+
|  EventPattern      |  {"detail":{"DaysToExpiry":[{"numeric":["<=",30]}]},"detail-type":["ACM Certificate Approaching Expiration"],"source":["aws.acm"]}   |
|  Name              |  aws-devops-dev-alb-ssl-certificate-renewal                                                                                          |
|  ScheduleExpression|  None                                                                                                                                |
|  State             |  ENABLED                                                                                                                             |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------+
