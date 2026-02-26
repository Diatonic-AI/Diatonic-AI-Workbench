import { Duration, Stack, StackProps, CfnOutput, RemovalPolicy, Tags } from 'aws-cdk-lib';
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
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { join } from 'path';

export interface DiatomicAILabStackProps extends StackProps {
  environment: 'dev' | 'staging' | 'prod';
  domainName?: string;
  enableWaf?: boolean;
  enableDetailedLogging?: boolean;
  enableXRayTracing?: boolean;
  corsOrigins?: string[];
  alertEmail?: string;
}

export class DiatomicAILabStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly api: apigateway.RestApi;
  public readonly entitiesTable: dynamodb.Table;
  public readonly usageTable: dynamodb.Table;
  public readonly tenantsTable: dynamodb.Table;
  public readonly analyticsTable: dynamodb.Table;
  public readonly artifactsBucket: s3.Bucket;
  public readonly modelsBucket: s3.Bucket;
  public readonly eventBus: events.EventBus;
  public readonly apiLambda: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: DiatomicAILabStackProps) {
    super(scope, id, props);

    const { environment, enableWaf = true, enableDetailedLogging = false, enableXRayTracing = true } = props;
    const resourcePrefix = `diatonic-ai-${environment}`;

    // Add common tags
    Tags.of(this).add('Project', 'diatonic-ai-workbench');
    Tags.of(this).add('Environment', environment);
    Tags.of(this).add('Component', 'backend-api');

    // ================================================================================
    // AUTHENTICATION & AUTHORIZATION
    // ================================================================================

    // Cognito User Pool with enhanced configuration
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${resourcePrefix}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      signInCaseSensitive: false,
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
        phoneNumber: {
          required: false,
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
        plan: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 16, 
          mutable: true 
        }),
        permissions: new cognito.StringAttribute({ 
          minLen: 2, 
          maxLen: 2000, 
          mutable: true 
        }),
        onboarding_completed: new cognito.StringAttribute({
          minLen: 4,
          maxLen: 5,
          mutable: true
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
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: false,
      },
      deletionProtection: environment === 'prod',
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // User Pool Groups for role management
    const roleGroups = [
      'FreeTier', 'BasicTier', 'ProTier', 'ExtremeTier', 'EnterpriseTier',
      'InternalDev', 'InternalAdmin', 'InternalManager', 
      'InternalBasicUser', 'InternalProUser', 'InternalExtremeUser', 'InternalEnterpriseUser'
    ];

    roleGroups.forEach(groupName => {
      new cognito.CfnUserPoolGroup(this, `${groupName}Group`, {
        userPoolId: this.userPool.userPoolId,
        groupName,
        description: `${groupName} role group`,
      });
    });

    // User Pool Client for web application
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${resourcePrefix}-web-client`,
      generateSecret: false, // Public client for SPA
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        custom: true,
        userPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.corsOrigins || ['http://localhost:8080'],
        logoutUrls: props.corsOrigins || ['http://localhost:8080'],
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      enableTokenRevocation: true,
    });

    // Identity Pool for temporary AWS credentials
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `${resourcePrefix}_identity_pool`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName,
      }],
    });

    // ================================================================================
    // DATA LAYER - DYNAMODB TABLES
    // ================================================================================

    // Main entities table with optimized structure
    this.entitiesTable = new dynamodb.Table(this, 'EntitiesTable', {
      tableName: `${resourcePrefix}-entities`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: environment === 'prod',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      deletionProtection: environment === 'prod',
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // GSI1: Query by tenant and type
    this.entitiesTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI2: Query by user and creation date
    this.entitiesTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI3: Query by status and updated date
    this.entitiesTable.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
    });

    // Usage events table with TTL
    this.usageTable = new dynamodb.Table(this, 'UsageTable', {
      tableName: `${resourcePrefix}-usage`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_IMAGES_ONLY,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // GSI for daily usage aggregation
    this.usageTable.addGlobalSecondaryIndex({
      indexName: 'DailyUsageGSI',
      partitionKey: { name: 'DayTenantPK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // GSI for resource-based usage queries
    this.usageTable.addGlobalSecondaryIndex({
      indexName: 'ResourceUsageGSI',
      partitionKey: { name: 'ResourcePK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Tenants configuration table
    this.tenantsTable = new dynamodb.Table(this, 'TenantsTable', {
      tableName: `${resourcePrefix}-tenants`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: environment === 'prod',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      deletionProtection: environment === 'prod',
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // Analytics aggregation table
    this.analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
      tableName: `${resourcePrefix}-analytics`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    this.analyticsTable.addGlobalSecondaryIndex({
      indexName: 'DateRangeGSI',
      partitionKey: { name: 'MetricType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'DateRange', type: dynamodb.AttributeType.STRING },
    });

    // ================================================================================
    // STORAGE LAYER - S3 BUCKETS
    // ================================================================================

    // Artifacts bucket for general file storage
    this.artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      bucketName: `${resourcePrefix}-artifacts-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: props.corsOrigins || ['*'],
        allowedHeaders: ['*'],
        maxAge: 86400,
      }],
      lifecycleRules: [
        {
          id: 'MultipartUploadCleanup',
          enabled: true,
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
        {
          id: 'TransitionToIA',
          enabled: true,
          prefix: 'tenants/',
          transitions: [
            {
              storageClass: s3.StorageClass.STANDARD_IA,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: Duration.days(365),
            },
          ],
        },
      ],
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // ML Models bucket with specialized lifecycle rules
    this.modelsBucket = new s3.Bucket(this, 'ModelsBucket', {
      bucketName: `${resourcePrefix}-models-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'ModelArchival',
          enabled: true,
          prefix: 'models/',
          transitions: [
            {
              storageClass: s3.StorageClass.STANDARD_IA,
              transitionAfter: Duration.days(7),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(30),
            },
          ],
        },
      ],
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // ================================================================================
    // EVENT-DRIVEN ARCHITECTURE
    // ================================================================================

    this.eventBus = new events.EventBus(this, 'EventBus', {
      eventBusName: `${resourcePrefix}-events`,
    });

    // Dead letter queue for failed events
    const eventDLQ = new sqs.Queue(this, 'EventDLQ', {
      queueName: `${resourcePrefix}-event-dlq`,
      retentionPeriod: Duration.days(14),
    });

    // ================================================================================
    // SECRETS MANAGEMENT
    // ================================================================================

    // Stripe API secret
    const stripeSecret = new secretsmanager.Secret(this, 'StripeSecret', {
      secretName: `${resourcePrefix}/stripe`,
      description: 'Stripe API keys and webhook secrets',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          webhook_secret: '',
          publishable_key: '',
          price_ids: {}
        }),
        generateStringKey: 'secret_key',
        excludeCharacters: '"@/\\',
      },
    });

    // OpenAI API secret
    const openaiSecret = new secretsmanager.Secret(this, 'OpenAISecret', {
      secretName: `${resourcePrefix}/openai`,
      description: 'OpenAI API configuration',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          organization_id: '',
          project_id: ''
        }),
        generateStringKey: 'api_key',
        excludeCharacters: '"@/\\',
      },
    });

    // Other provider secrets
    const providersSecret = new secretsmanager.Secret(this, 'ProvidersSecret', {
      secretName: `${resourcePrefix}/providers`,
      description: 'Third-party AI provider API keys',
      secretObjectValue: {
        anthropic_api_key: cognito.UserPool.fromUserPoolId(this, 'DummyUserPool', 'dummy').userPoolId, // Placeholder
        huggingface_api_key: cognito.UserPool.fromUserPoolId(this, 'DummyUserPool2', 'dummy2').userPoolId,
        cohere_api_key: cognito.UserPool.fromUserPoolId(this, 'DummyUserPool3', 'dummy3').userPoolId,
      },
    });

    // ================================================================================
    // LAMBDA FUNCTIONS
    // ================================================================================

    // Pre-token generation Lambda for JWT enrichment
    const preTokenLambda = new lambdaNodejs.NodejsFunction(this, 'PreTokenLambda', {
      functionName: `${resourcePrefix}-pre-token`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/auth/pre-token-generation.ts'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        NODE_ENV: environment,
        TENANTS_TABLE_NAME: this.tenantsTable.tableName,
        POWERTOOLS_SERVICE_NAME: 'pre-token-generation',
        POWERTOOLS_METRICS_NAMESPACE: 'DiatomicAI',
      },
      bundling: {
        minify: true,
        sourceMap: enableDetailedLogging,
        target: 'node20',
        externalModules: ['@aws-sdk/*'],
      },
      tracing: enableXRayTracing ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
    });

    // Main API Lambda function
    this.apiLambda = new lambdaNodejs.NodejsFunction(this, 'ApiLambda', {
      functionName: `${resourcePrefix}-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/api/handler.ts'),
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment: {
        NODE_ENV: environment,
        ENTITIES_TABLE_NAME: this.entitiesTable.tableName,
        USAGE_TABLE_NAME: this.usageTable.tableName,
        TENANTS_TABLE_NAME: this.tenantsTable.tableName,
        ANALYTICS_TABLE_NAME: this.analyticsTable.tableName,
        ARTIFACTS_BUCKET_NAME: this.artifactsBucket.bucketName,
        MODELS_BUCKET_NAME: this.modelsBucket.bucketName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        USER_POOL_ID: this.userPool.userPoolId,
        CORS_ORIGINS: JSON.stringify(props.corsOrigins || ['*']),
        STRIPE_SECRET_NAME: stripeSecret.secretName,
        OPENAI_SECRET_NAME: openaiSecret.secretName,
        PROVIDERS_SECRET_NAME: providersSecret.secretName,
        POWERTOOLS_SERVICE_NAME: 'diatonic-ai-api',
        POWERTOOLS_METRICS_NAMESPACE: 'DiatomicAI',
      },
      bundling: {
        minify: true,
        sourceMap: enableDetailedLogging,
        target: 'node20',
        externalModules: ['@aws-sdk/*'],
        commandHooks: {
          beforeBundling: (inputDir: string, outputDir: string) => [
            `echo "Bundling API Lambda function..."`,
          ],
          beforeInstall: () => [],
          afterBundling: () => [],
        },
      },
      tracing: enableXRayTracing ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      reservedConcurrentExecutions: environment === 'prod' ? 100 : undefined,
    });

    // Usage aggregator Lambda for analytics
    const usageAggregatorLambda = new lambdaNodejs.NodejsFunction(this, 'UsageAggregatorLambda', {
      functionName: `${resourcePrefix}-usage-aggregator`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/usage/aggregator.ts'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        NODE_ENV: environment,
        USAGE_TABLE_NAME: this.usageTable.tableName,
        ANALYTICS_TABLE_NAME: this.analyticsTable.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        POWERTOOLS_SERVICE_NAME: 'usage-aggregator',
        POWERTOOLS_METRICS_NAMESPACE: 'DiatomicAI',
      },
      bundling: {
        minify: true,
        sourceMap: enableDetailedLogging,
        target: 'node20',
        externalModules: ['@aws-sdk/*'],
      },
      tracing: enableXRayTracing ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      deadLetterQueue: eventDLQ,
      retryAttempts: 2,
    });

    // Billing processor Lambda for Stripe integration
    const billingProcessorLambda = new lambdaNodejs.NodejsFunction(this, 'BillingProcessorLambda', {
      functionName: `${resourcePrefix}-billing-processor`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/billing/processor.ts'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        NODE_ENV: environment,
        TENANTS_TABLE_NAME: this.tenantsTable.tableName,
        USAGE_TABLE_NAME: this.usageTable.tableName,
        STRIPE_SECRET_NAME: stripeSecret.secretName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        POWERTOOLS_SERVICE_NAME: 'billing-processor',
        POWERTOOLS_METRICS_NAMESPACE: 'DiatomicAI',
      },
      bundling: {
        minify: true,
        sourceMap: enableDetailedLogging,
        target: 'node20',
        externalModules: ['@aws-sdk/*'],
      },
      tracing: enableXRayTracing ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      deadLetterQueue: eventDLQ,
      retryAttempts: 2,
    });

    // ================================================================================
    // EVENT RULES & TARGETS
    // ================================================================================

    // Usage events aggregation rule
    new events.Rule(this, 'UsageAggregationRule', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['diatonic-ai.usage'],
        detailType: ['Usage Event', 'Quota Event'],
      },
      targets: [new targets.LambdaFunction(usageAggregatorLambda)],
    });

    // Billing events rule
    new events.Rule(this, 'BillingEventsRule', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['diatonic-ai.billing', 'stripe.webhook'],
        detailType: ['Subscription Event', 'Payment Event', 'Invoice Event'],
      },
      targets: [new targets.LambdaFunction(billingProcessorLambda)],
    });

    // User Pool triggers
    this.userPool.addTrigger(cognito.UserPoolOperation.PRE_TOKEN_GENERATION, preTokenLambda);

    // ================================================================================
    // API GATEWAY
    // ================================================================================

    // CloudWatch Log Group for API Gateway
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/${resourcePrefix}`,
      retention: environment === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // REST API with enhanced configuration
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${resourcePrefix}-api`,
      description: `Diatonic AI Workbench API - ${environment}`,
      deployOptions: {
        stageName: environment,
        loggingLevel: enableDetailedLogging 
          ? apigateway.MethodLoggingLevel.INFO 
          : apigateway.MethodLoggingLevel.ERROR,
        dataTraceEnabled: enableDetailedLogging,
        metricsEnabled: true,
        cachingEnabled: environment === 'prod',
        cacheClusterEnabled: environment === 'prod',
        cacheClusterSize: environment === 'prod' ? '0.5' : undefined,
        cacheTtl: Duration.minutes(5),
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
          requestId: true,
          extendedRequestId: true,
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
          'X-Correlation-ID',
        ],
        allowCredentials: true,
        maxAge: Duration.hours(1),
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      binaryMediaTypes: ['multipart/form-data', 'application/octet-stream'],
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: 'DiatomicAIAuthorizer',
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: Duration.minutes(5),
    });

    // API Gateway integration with Lambda
    const lambdaIntegration = new apigateway.LambdaIntegration(this.apiLambda, {
      proxy: true,
      allowTestInvoke: true,
      timeout: Duration.seconds(29),
    });

    // v1 API resource
    const v1Resource = this.api.root.addResource('v1');

    // Proxy all requests to Lambda with authorization
    const proxyResource = v1Resource.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.header.X-Request-ID': false,
        },
      },
    });

    // Health check endpoint (no auth required)
    const healthResource = v1Resource.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration);

    // Webhooks resource (no auth required)
    const webhooksResource = v1Resource.addResource('webhooks');
    webhooksResource.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // ================================================================================
    // IAM PERMISSIONS
    // ================================================================================

    // Grant permissions to API Lambda
    this.entitiesTable.grantReadWriteData(this.apiLambda);
    this.usageTable.grantReadWriteData(this.apiLambda);
    this.tenantsTable.grantReadWriteData(this.apiLambda);
    this.analyticsTable.grantReadWriteData(this.apiLambda);
    this.artifactsBucket.grantReadWrite(this.apiLambda);
    this.modelsBucket.grantReadWrite(this.apiLambda);
    this.eventBus.grantPutEventsTo(this.apiLambda);
    stripeSecret.grantRead(this.apiLambda);
    openaiSecret.grantRead(this.apiLambda);
    providersSecret.grantRead(this.apiLambda);

    // Grant permissions to Pre Token Lambda
    this.tenantsTable.grantReadData(preTokenLambda);

    // Grant permissions to Usage Aggregator Lambda
    this.usageTable.grantReadWriteData(usageAggregatorLambda);
    this.analyticsTable.grantReadWriteData(usageAggregatorLambda);
    this.eventBus.grantPutEventsTo(usageAggregatorLambda);

    // Grant permissions to Billing Processor Lambda
    this.tenantsTable.grantReadWriteData(billingProcessorLambda);
    this.usageTable.grantReadData(billingProcessorLambda);
    stripeSecret.grantRead(billingProcessorLambda);
    this.eventBus.grantPutEventsTo(billingProcessorLambda);

    // Tenant isolation policy for API Lambda
    const tenantIsolationPolicy = new iam.Policy(this, 'TenantIsolationPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:Query',
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:BatchGetItem',
            'dynamodb:BatchWriteItem',
          ],
          resources: [
            this.entitiesTable.tableArn,
            `${this.entitiesTable.tableArn}/index/*`,
            this.usageTable.tableArn,
            `${this.usageTable.tableArn}/index/*`,
            this.analyticsTable.tableArn,
            `${this.analyticsTable.tableArn}/index/*`,
          ],
          conditions: {
            'ForAllValues:StringLike': {
              'dynamodb:LeadingKeys': ['TENANT#*'],
            },
          },
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
            's3:ListBucket',
          ],
          resources: [
            `${this.artifactsBucket.bucketArn}/tenants/*`,
            `${this.modelsBucket.bucketArn}/tenants/*`,
            this.artifactsBucket.bucketArn,
            this.modelsBucket.bucketArn,
          ],
          conditions: {
            StringLike: {
              's3:prefix': ['tenants/*'],
            },
          },
        }),
      ],
    });

    this.apiLambda.role?.attachInlinePolicy(tenantIsolationPolicy);

    // ================================================================================
    // WEB APPLICATION FIREWALL (WAF)
    // ================================================================================

    if (enableWaf) {
      const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
        scope: 'REGIONAL',
        defaultAction: { allow: {} },
        name: `${resourcePrefix}-api-waf`,
        description: 'WAF for Diatonic AI API',
        rules: [
          {
            name: 'AWSManagedRulesCommonRuleSet',
            priority: 1,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                vendorName: 'AWS',
                name: 'AWSManagedRulesCommonRuleSet',
                excludedRules: [
                  { name: 'SizeRestrictions_BODY' },
                  { name: 'GenericRFI_BODY' },
                ],
              },
            },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'CommonRuleSetMetric',
            },
          },
          {
            name: 'AWSManagedRulesKnownBadInputsRuleSet',
            priority: 2,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                vendorName: 'AWS',
                name: 'AWSManagedRulesKnownBadInputsRuleSet',
              },
            },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'KnownBadInputsMetric',
            },
          },
          {
            name: 'RateLimitRule',
            priority: 3,
            action: { block: {} },
            statement: {
              rateBasedStatement: {
                limit: environment === 'prod' ? 2000 : 10000,
                aggregateKeyType: 'IP',
              },
            },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'RateLimitMetric',
            },
          },
        ],
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'DiatomicAIWebAcl',
        },
        tags: [
          { key: 'Environment', value: environment },
          { key: 'Project', value: 'diatonic-ai-workbench' },
        ],
      });

      // Associate WAF with API Gateway
      new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
        resourceArn: this.api.arnForExecuteApi(),
        webAclArn: webAcl.attrArn,
      });
    }

    // ================================================================================
    // MONITORING & ALERTING
    // ================================================================================

    // SNS topic for critical alerts
    const alertsTopic = new sns.Topic(this, 'AlertsTopic', {
      topicName: `${resourcePrefix}-alerts`,
      displayName: 'Diatonic AI Critical Alerts',
    });

    // Subscribe email if provided
    if (props.alertEmail) {
      alertsTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // API Gateway 4xx/5xx alarms
    const apiErrorsAlarm = new cloudwatch.Alarm(this, 'ApiErrorsAlarm', {
      alarmName: `${resourcePrefix}-api-errors`,
      alarmDescription: 'API Gateway 4xx/5xx errors',
      metric: this.api.metricClientError().with({ 
        statistic: 'Sum',
        period: Duration.minutes(5)
      }).plus(this.api.metricServerError().with({
        statistic: 'Sum', 
        period: Duration.minutes(5)
      })),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    apiErrorsAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Lambda function errors alarm
    const lambdaErrorsAlarm = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      alarmName: `${resourcePrefix}-lambda-errors`,
      alarmDescription: 'Lambda function errors',
      metric: this.apiLambda.metricErrors({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    lambdaErrorsAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Lambda function duration alarm
    const lambdaDurationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      alarmName: `${resourcePrefix}-lambda-duration`,
      alarmDescription: 'Lambda function high duration',
      metric: this.apiLambda.metricDuration({
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 20000, // 20 seconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    lambdaDurationAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // ================================================================================
    // OUTPUTS
    // ================================================================================

    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${resourcePrefix}-user-pool-id`,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${resourcePrefix}-user-pool-client-id`,
    });

    new CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID',
      exportName: `${resourcePrefix}-identity-pool-id`,
    });

    new CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${resourcePrefix}-api-endpoint`,
    });

    new CfnOutput(this, 'EntitiesTableName', {
      value: this.entitiesTable.tableName,
      description: 'DynamoDB Entities Table Name',
      exportName: `${resourcePrefix}-entities-table`,
    });

    new CfnOutput(this, 'UsageTableName', {
      value: this.usageTable.tableName,
      description: 'DynamoDB Usage Events Table Name',
      exportName: `${resourcePrefix}-usage-table`,
    });

    new CfnOutput(this, 'TenantsTableName', {
      value: this.tenantsTable.tableName,
      description: 'DynamoDB Tenants Table Name',
      exportName: `${resourcePrefix}-tenants-table`,
    });

    new CfnOutput(this, 'AnalyticsTableName', {
      value: this.analyticsTable.tableName,
      description: 'DynamoDB Analytics Table Name',
      exportName: `${resourcePrefix}-analytics-table`,
    });

    new CfnOutput(this, 'ArtifactsBucketName', {
      value: this.artifactsBucket.bucketName,
      description: 'S3 Artifacts Bucket Name',
      exportName: `${resourcePrefix}-artifacts-bucket`,
    });

    new CfnOutput(this, 'ModelsBucketName', {
      value: this.modelsBucket.bucketName,
      description: 'S3 ML Models Bucket Name',
      exportName: `${resourcePrefix}-models-bucket`,
    });

    new CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge Event Bus Name',
      exportName: `${resourcePrefix}-event-bus`,
    });

    new CfnOutput(this, 'StripeSecretName', {
      value: stripeSecret.secretName,
      description: 'Stripe Secret Name in Secrets Manager',
      exportName: `${resourcePrefix}-stripe-secret`,
    });

    new CfnOutput(this, 'AlertsTopicArn', {
      value: alertsTopic.topicArn,
      description: 'SNS Topic ARN for alerts',
      exportName: `${resourcePrefix}-alerts-topic`,
    });

    // Configuration summary output for easy frontend integration
    new CfnOutput(this, 'FrontendConfig', {
      value: JSON.stringify({
        region: this.region,
        userPoolId: this.userPool.userPoolId,
        userPoolClientId: this.userPoolClient.userPoolClientId,
        identityPoolId: this.identityPool.ref,
        apiEndpoint: this.api.url,
        environment: environment,
      }),
      description: 'Frontend configuration JSON',
      exportName: `${resourcePrefix}-frontend-config`,
    });
  }
}