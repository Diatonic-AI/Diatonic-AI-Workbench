import { Duration, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { join } from 'path';

export interface CommunityCoreStackProps extends StackProps {
  environment: 'dev' | 'staging' | 'prod';
  domainName?: string;
  enableWaf?: boolean;
  enableDetailedLogging?: boolean;
  corsOrigins?: string[];
}

export class CommunityCoreStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly api: apigateway.RestApi;
  public readonly postsTable: dynamodb.Table;
  public readonly groupsTable: dynamodb.Table;
  public readonly interactionsTable: dynamodb.Table;
  public readonly moderationTable: dynamodb.Table;
  public readonly contentBucket: s3.Bucket;
  public readonly eventBus: events.EventBus;
  public readonly notificationTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: CommunityCoreStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const resourcePrefix = `ainexus-community-${environment}`;

    // ================================================================================
    // AUTHENTICATION & AUTHORIZATION
    // ================================================================================

    // Reference existing Cognito User Pool or create new one
    this.userPool = new cognito.UserPool(this, 'CommunityUserPool', {
      userPoolName: `${resourcePrefix}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        tenant_id: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 64, 
          mutable: false 
        }),
        role: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 32, 
          mutable: true 
        }),
        reputation_score: new cognito.NumberAttribute({
          min: 0,
          max: 10000,
          mutable: true,
        }),
        community_level: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 20,
          mutable: true,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod' ? undefined : cognito.UserPoolDomainOptions.DESTROY,
    });

    // User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'CommunityUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${resourcePrefix}-client`,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        custom: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.corsOrigins || ['http://localhost:3000'],
        logoutUrls: props.corsOrigins || ['http://localhost:3000'],
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
    });

    // ================================================================================
    // DATA LAYER - DYNAMODB TABLES
    // ================================================================================

    // Posts table with comprehensive indexing
    this.postsTable = new dynamodb.Table(this, 'PostsTable', {
      tableName: `${resourcePrefix}-posts`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    // GSIs for efficient querying
    this.postsTable.addGlobalSecondaryIndex({
      indexName: 'TenantTimeIndex',
      partitionKey: { name: 'tenant_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    });

    this.postsTable.addGlobalSecondaryIndex({
      indexName: 'AuthorPostsIndex',
      partitionKey: { name: 'author_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    });

    this.postsTable.addGlobalSecondaryIndex({
      indexName: 'CategoryPostsIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    });

    this.postsTable.addGlobalSecondaryIndex({
      indexName: 'TrendingIndex',
      partitionKey: { name: 'tenant_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'engagement_score', type: dynamodb.AttributeType.NUMBER },
    });

    // Groups table
    this.groupsTable = new dynamodb.Table(this, 'GroupsTable', {
      tableName: `${resourcePrefix}-groups`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    this.groupsTable.addGlobalSecondaryIndex({
      indexName: 'TenantGroupsIndex',
      partitionKey: { name: 'tenant_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    });

    this.groupsTable.addGlobalSecondaryIndex({
      indexName: 'GroupTypeIndex',
      partitionKey: { name: 'group_type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'member_count', type: dynamodb.AttributeType.NUMBER },
    });

    // Interactions table (likes, follows, comments, etc.)
    this.interactionsTable = new dynamodb.Table(this, 'InteractionsTable', {
      tableName: `${resourcePrefix}-interactions`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl', // For temporary interactions
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    this.interactionsTable.addGlobalSecondaryIndex({
      indexName: 'UserInteractionsIndex',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    });

    this.interactionsTable.addGlobalSecondaryIndex({
      indexName: 'ContentInteractionsIndex',
      partitionKey: { name: 'content_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'interaction_type', type: dynamodb.AttributeType.STRING },
    });

    // Content moderation table
    this.moderationTable = new dynamodb.Table(this, 'ModerationTable', {
      tableName: `${resourcePrefix}-moderation`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    this.moderationTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    });

    // ================================================================================
    // STORAGE LAYER - S3 BUCKET FOR USER CONTENT
    // ================================================================================

    this.contentBucket = new s3.Bucket(this, 'CommunityContentBucket', {
      bucketName: `${resourcePrefix}-content-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'ContentLifecycle',
          enabled: true,
          prefix: 'community/',
          transitions: [
            {
              storageClass: s3.StorageClass.STANDARD_IA,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
          ],
        },
      ],
      cors: [
        {
          allowedOrigins: props.corsOrigins || ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: environment === 'prod' ? undefined : s3.RemovalPolicy.DESTROY,
    });

    // ================================================================================
    // EVENT-DRIVEN ARCHITECTURE
    // ================================================================================

    this.eventBus = new events.EventBus(this, 'CommunityEventBus', {
      eventBusName: `${resourcePrefix}-events`,
    });

    // SNS Topic for notifications
    this.notificationTopic = new sns.Topic(this, 'CommunityNotifications', {
      topicName: `${resourcePrefix}-notifications`,
      displayName: 'Community Notifications',
    });

    // SQS Queue for content moderation
    const moderationQueue = new sqs.Queue(this, 'ModerationQueue', {
      queueName: `${resourcePrefix}-moderation`,
      visibilityTimeout: Duration.minutes(5),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, 'ModerationDLQ', {
          queueName: `${resourcePrefix}-moderation-dlq`,
        }),
      },
    });

    // ================================================================================
    // SECRETS MANAGEMENT
    // ================================================================================

    // Stripe API secret for billing integration
    const stripeSecret = new secretsmanager.Secret(this, 'CommunityStripeSecret', {
      secretName: `/ai-nexus/diatonicvisuals/stripe/secret_key`,
      description: 'Stripe API secret key for billing integration',
      secretStringTemplate: JSON.stringify({ 
        webhook_secret: 'whsec_placeholder',
        publishable_key: 'pk_placeholder'
      }),
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          webhook_secret: 'whsec_placeholder',
          publishable_key: 'pk_placeholder'
        }),
        generateStringKey: 'secret_key',
        excludeCharacters: '"@/\\',
        excludeNumbers: false,
        excludePunctuation: false,
        excludeUppercase: false,
        excludeLowercase: false,
      },
    });

    // Stripe webhook signing secret
    const stripeWebhookSecret = new secretsmanager.Secret(this, 'CommunityStripeWebhookSecret', {
      secretName: `/ai-nexus/diatonicvisuals/stripe/webhook_signing_secret`,
      description: 'Stripe webhook signing secret for webhook verification',
    });

    // ================================================================================
    // LAMBDA FUNCTIONS
    // ================================================================================

    // Main Community API Lambda
    const communityApiLambda = new lambdaNodejs.NodejsFunction(this, 'CommunityApiLambda', {
      functionName: `${resourcePrefix}-api`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/community-api/handler.ts'),
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment: {
        NODE_ENV: environment,
        POSTS_TABLE_NAME: this.postsTable.tableName,
        GROUPS_TABLE_NAME: this.groupsTable.tableName,
        INTERACTIONS_TABLE_NAME: this.interactionsTable.tableName,
        MODERATION_TABLE_NAME: this.moderationTable.tableName,
        CONTENT_BUCKET_NAME: this.contentBucket.bucketName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        NOTIFICATION_TOPIC_ARN: this.notificationTopic.topicArn,
        USER_POOL_ID: this.userPool.userPoolId,
        CORS_ORIGINS: JSON.stringify(props.corsOrigins || ['*']),
        // Stripe integration
        STRIPE_SECRET_ARN: stripeSecret.secretArn,
        STRIPE_WEBHOOK_SECRET_ARN: stripeWebhookSecret.secretArn,
        // Application URLs
        APP_BASE_URL: `https://${environment === 'prod' ? 'app' : environment}.ainexus.dev`,
        API_BASE_URL: 'https://api.example.com', // Will be updated post-deployment
        // Feature flags
        ENABLE_TAX: 'true',
        ENABLE_PROMOTION_CODES: 'true',
      },
      bundling: {
        minify: true,
        sourceMap: props.enableDetailedLogging || false,
        target: 'node18',
        externalModules: ['aws-sdk'],
      },
    });

    // Content Moderation Lambda
    const moderationLambda = new lambdaNodejs.NodejsFunction(this, 'ModerationLambda', {
      functionName: `${resourcePrefix}-moderation`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/community-api/moderation.ts'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        NODE_ENV: environment,
        MODERATION_TABLE_NAME: this.moderationTable.tableName,
        NOTIFICATION_TOPIC_ARN: this.notificationTopic.topicArn,
      },
      bundling: {
        minify: true,
        sourceMap: props.enableDetailedLogging || false,
        target: 'node18',
      },
    });

    // Connect moderation queue to Lambda
    moderationLambda.addEventSource(
      new lambda.SqsEventSource(moderationQueue, {
        batchSize: 10,
        maxBatchingWindow: Duration.seconds(5),
      })
    );

    // Engagement Analytics Lambda
    const engagementLambda = new lambdaNodejs.NodejsFunction(this, 'EngagementLambda', {
      functionName: `${resourcePrefix}-engagement`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/community-api/engagement.ts'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        NODE_ENV: environment,
        POSTS_TABLE_NAME: this.postsTable.tableName,
        INTERACTIONS_TABLE_NAME: this.interactionsTable.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
      },
      bundling: {
        minify: true,
        sourceMap: props.enableDetailedLogging || false,
        target: 'node18',
      },
    });

    // EventBridge rules for engagement calculation
    new events.Rule(this, 'EngagementRule', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['ai-nexus.community'],
        detailType: ['Post Created', 'Interaction Added', 'Comment Added'],
      },
      targets: [new targets.LambdaFunction(engagementLambda)],
    });

    // ================================================================================
    // API GATEWAY SETUP
    // ================================================================================

    // CloudWatch Log Group
    const apiLogGroup = new logs.LogGroup(this, 'CommunityApiLogGroup', {
      logGroupName: `/aws/apigateway/${resourcePrefix}-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: environment === 'prod' ? undefined : logs.RemovalPolicy.DESTROY,
    });

    // REST API
    this.api = new apigateway.RestApi(this, 'CommunityApi', {
      restApiName: `${resourcePrefix}-api`,
      description: 'AI Nexus Community Backend API',
      deployOptions: {
        stageName: environment,
        loggingLevel: props.enableDetailedLogging 
          ? apigateway.MethodLoggingLevel.INFO 
          : apigateway.MethodLoggingLevel.ERROR,
        dataTraceEnabled: props.enableDetailedLogging || false,
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: props.corsOrigins || ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Request-ID',
        ],
        allowCredentials: true,
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CommunityAuthorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: 'CommunityAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // API Gateway integration
    const lambdaIntegration = new apigateway.LambdaIntegration(communityApiLambda, {
      proxy: true,
      allowTestInvoke: true,
    });

    // v1 API resource
    const v1Resource = this.api.root.addResource('v1');

    // Proxy all requests to Lambda with authorization
    v1Resource.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });

    // Health check endpoint (no auth required)
    const healthResource = v1Resource.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration);

    // ================================================================================
    // IAM PERMISSIONS
    // ================================================================================

    // Grant table permissions
    this.postsTable.grantReadWriteData(communityApiLambda);
    this.groupsTable.grantReadWriteData(communityApiLambda);
    this.interactionsTable.grantReadWriteData(communityApiLambda);
    this.moderationTable.grantReadWriteData(communityApiLambda);
    
    // Grant secrets access
    stripeSecret.grantRead(communityApiLambda);
    stripeWebhookSecret.grantRead(communityApiLambda);

    // Grant S3 permissions
    this.contentBucket.grantReadWrite(communityApiLambda);

    // Grant EventBridge permissions
    this.eventBus.grantPutEventsTo(communityApiLambda);
    this.eventBus.grantPutEventsTo(engagementLambda);

    // Grant SNS permissions
    this.notificationTopic.grantPublish(communityApiLambda);
    this.notificationTopic.grantPublish(moderationLambda);

    // Grant permissions for moderation lambda
    this.moderationTable.grantReadWriteData(moderationLambda);
    this.postsTable.grantReadWriteData(engagementLambda);
    this.interactionsTable.grantReadWriteData(engagementLambda);

    // ================================================================================
    // WAF (OPTIONAL)
    // ================================================================================

    if (props.enableWaf) {
      const webAcl = new wafv2.CfnWebACL(this, 'CommunityWebAcl', {
        scope: 'REGIONAL',
        defaultAction: { allow: {} },
        rules: [
          {
            name: 'AWSManagedRulesCommonRuleSet',
            priority: 1,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                vendorName: 'AWS',
                name: 'AWSManagedRulesCommonRuleSet',
              },
            },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'CommonRuleSetMetric',
            },
          },
          {
            name: 'CommunityRateLimitRule',
            priority: 2,
            action: { block: {} },
            statement: {
              rateBasedStatement: {
                limit: 1000, // Lower limit for community features
                aggregateKeyType: 'IP',
              },
            },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'CommunityRateLimitMetric',
            },
          },
        ],
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'communityWebACL',
        },
      });

      // Associate WAF with API Gateway
      new wafv2.CfnWebACLAssociation(this, 'CommunityWebAclAssociation', {
        resourceArn: this.api.arnForExecuteApi(),
        webAclArn: webAcl.attrArn,
      });
    }

    // ================================================================================
    // OUTPUTS
    // ================================================================================

    new CfnOutput(this, 'CommunityUserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Community Cognito User Pool ID',
      exportName: `${resourcePrefix}-user-pool-id`,
    });

    new CfnOutput(this, 'CommunityUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Community Cognito User Pool Client ID',
      exportName: `${resourcePrefix}-user-pool-client-id`,
    });

    new CfnOutput(this, 'CommunityApiEndpoint', {
      value: this.api.url,
      description: 'Community API Gateway endpoint URL',
      exportName: `${resourcePrefix}-api-endpoint`,
    });

    new CfnOutput(this, 'PostsTableName', {
      value: this.postsTable.tableName,
      description: 'DynamoDB Posts Table Name',
      exportName: `${resourcePrefix}-posts-table`,
    });

    new CfnOutput(this, 'GroupsTableName', {
      value: this.groupsTable.tableName,
      description: 'DynamoDB Groups Table Name',
      exportName: `${resourcePrefix}-groups-table`,
    });

    new CfnOutput(this, 'InteractionsTableName', {
      value: this.interactionsTable.tableName,
      description: 'DynamoDB Interactions Table Name',
      exportName: `${resourcePrefix}-interactions-table`,
    });

    new CfnOutput(this, 'CommunityContentBucketName', {
      value: this.contentBucket.bucketName,
      description: 'S3 Community Content Bucket Name',
      exportName: `${resourcePrefix}-content-bucket`,
    });

    new CfnOutput(this, 'CommunityEventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge Community Event Bus Name',
      exportName: `${resourcePrefix}-event-bus`,
    });

    new CfnOutput(this, 'NotificationTopicArn', {
      value: this.notificationTopic.topicArn,
      description: 'SNS Community Notification Topic ARN',
      exportName: `${resourcePrefix}-notification-topic`,
    });

    new CfnOutput(this, 'StripeSecretArn', {
      value: stripeSecret.secretArn,
      description: 'Stripe Secret ARN for billing integration',
      exportName: `${resourcePrefix}-stripe-secret-arn`,
    });

    new CfnOutput(this, 'StripeWebhookSecretArn', {
      value: stripeWebhookSecret.secretArn,
      description: 'Stripe Webhook Secret ARN for webhook verification',
      exportName: `${resourcePrefix}-stripe-webhook-secret-arn`,
    });
  }
}
