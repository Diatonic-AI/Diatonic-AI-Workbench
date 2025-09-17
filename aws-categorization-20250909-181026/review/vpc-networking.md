# VPC and Networking Resources - REVIEW

## Analysis Required
Found 1 VPCs that need evaluation:
1. Identify default VPC (usually keep)
2. Identify custom VPCs and their usage
3. Check for unused subnets, security groups, and gateways

## Cleanup Strategy
1. Start with unused security groups (check dependencies)
2. Remove unused subnets (check for attached resources)
3. Remove unused VPCs last (after all resources removed)

## Data
### VPCs
----------------------------------------------------------------------
|                            DescribeVpcs                            |
+----------------+------------+------------+-------------------------+
|    CidrBlock   | IsDefault  |   State    |          VpcId          |
+----------------+------------+------------+-------------------------+
|  10.1.0.0/16   |  False     |  available |  vpc-01e885e91c54deb46  |
|  10.1.0.0/16   |  False     |  available |  vpc-0afa64bf5579542eb  |
|  10.0.0.0/16   |  False     |  available |  vpc-06d0d2402de4b1ff4  |
|  172.31.0.0/16 |  True      |  available |  vpc-0496b2572d51844a0  |
+----------------+------------+------------+-------------------------+

### Subnets  
---------------------------------------------------------------------------------------------
|                                      DescribeSubnets                                      |
+------------------+-----------------+----------------------------+-------------------------+
| AvailabilityZone |    CidrBlock    |         SubnetId           |          VpcId          |
+------------------+-----------------+----------------------------+-------------------------+
|  us-east-2b      |  172.31.16.0/20 |  subnet-03a0f3ce980bd5221  |  vpc-0496b2572d51844a0  |
|  us-east-2a      |  10.1.1.0/24    |  subnet-080cf74da64560622  |  vpc-0afa64bf5579542eb  |
|  us-east-2a      |  10.1.20.0/24   |  subnet-0d84262befa6a8c16  |  vpc-0afa64bf5579542eb  |
|  us-east-2a      |  10.1.20.0/24   |  subnet-05c95a35b8209d251  |  vpc-01e885e91c54deb46  |
|  us-east-2a      |  10.1.10.0/24   |  subnet-0d23209f1df0b670c  |  vpc-0afa64bf5579542eb  |
|  us-east-2c      |  10.0.12.0/24   |  subnet-053773bbee905acd1  |  vpc-06d0d2402de4b1ff4  |
|  us-east-2c      |  10.1.3.0/24    |  subnet-0f84a07372535f731  |  vpc-01e885e91c54deb46  |
|  us-east-2b      |  10.1.2.0/24    |  subnet-0241f37e8bb913cd5  |  vpc-01e885e91c54deb46  |
|  us-east-2c      |  10.0.22.0/24   |  subnet-03a3f2171fc95eabf  |  vpc-06d0d2402de4b1ff4  |
|  us-east-2a      |  10.1.10.0/24   |  subnet-0dcd89e32d1a458c6  |  vpc-01e885e91c54deb46  |
|  us-east-2a      |  10.0.20.0/24   |  subnet-01c4c314d611fa8c6  |  vpc-06d0d2402de4b1ff4  |
|  us-east-2c      |  10.1.22.0/24   |  subnet-097d3941682c5892b  |  vpc-0afa64bf5579542eb  |
|  us-east-2a      |  172.31.0.0/20  |  subnet-0f53a0a0bfcda39ff  |  vpc-0496b2572d51844a0  |
|  us-east-2c      |  10.1.12.0/24   |  subnet-0cc9192f2fb15c084  |  vpc-0afa64bf5579542eb  |
|  us-east-2c      |  10.1.12.0/24   |  subnet-09ffebac7f8d23640  |  vpc-01e885e91c54deb46  |

### Security Groups
----------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                                 DescribeSecurityGroups                                                                 |
+-----------------------------------------------+-----------------------+-------------------------------------------------------+------------------------+
|                  Description                  |        GroupId        |                       GroupName                       |         VpcId          |
+-----------------------------------------------+-----------------------+-------------------------------------------------------+------------------------+
|  default VPC security group                   |  sg-018ac2cc9bf10d3b7 |  default                                              |  vpc-0496b2572d51844a0 |
|  Security group for ECS tasks                 |  sg-0091fb1d25d8df706 |  aws-devops-dev-ecs-tasks-20250825080944217500000001  |  vpc-01e885e91c54deb46 |
|  Security group for ECS tasks                 |  sg-064f39209eb112e1b |  aws-devops-dev-ecs-tasks-20250907175608023400000006  |  vpc-0afa64bf5579542eb |
|  default VPC security group                   |  sg-0536af950215cb3b9 |  default                                              |  vpc-06d0d2402de4b1ff4 |
|  Security group for Application Load Balancer |  sg-09ad9b1143bc2d650 |  aws-devops-dev-alb-20250825080608445400000001        |  vpc-01e885e91c54deb46 |
|  default VPC security group                   |  sg-02e6fecbba4f6f614 |  default                                              |  vpc-01e885e91c54deb46 |
|  Security group for Application Load Balancer |  sg-002c3495354348261 |  aws-devops-dev-alb-20250907175605324700000005        |  vpc-0afa64bf5579542eb |
|  default VPC security group                   |  sg-0fd4a2ce75caaf9b1 |  default                                              |  vpc-0afa64bf5579542eb |
+-----------------------------------------------+-----------------------+-------------------------------------------------------+------------------------+
