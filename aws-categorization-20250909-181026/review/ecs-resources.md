# ECS Resources - REVIEW

## Current State
- 1 ECS Cluster: aws-devops-dev-cluster
- Services: Need to check if actively used

## Analysis Required
1. Check if cluster has active services
2. Determine if cluster is needed for current architecture
3. If unused, can be safely removed

## Data
-----------------------------------------------------------------------
|                            ListClusters                             |
+---------------------------------------------------------------------+
|  arn:aws:ecs:us-east-2:313476888312:cluster/aws-devops-dev-cluster  |
+---------------------------------------------------------------------+

## Services

----------------------------------------------------------------------------------------------
|                                        ListServices                                        |
+--------------------------------------------------------------------------------------------+
|  arn:aws:ecs:us-east-2:313476888312:service/aws-devops-dev-cluster/aws-devops-dev-service  |
+--------------------------------------------------------------------------------------------+
