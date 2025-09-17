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
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { join } from 'path';

export interface AILabCoreStackProps extends StackProps {
  environment: 'dev' | 'staging' | 'prod';
  domainName?: string;
  enableWaf?: boolean;
  enableDetailedLogging?: boolean;
  corsOrigins?: string[];
}

export class AILabCoreStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly api: apigateway.RestApi;
  public readonly entitiesTable: dynamodb.Table;
  public readonly usageTable: dynamodb.Table;
  public readonly tenantsTable: dynamodb.Table;
  public readonly artifactsBucket: s3.Bucket;
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: AILabCoreStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const resourcePrefix = `ainexus-${environment}`;

    // ================================================================================
    // AUTHENTICATION & AUTHORIZATION
    // ================================================================================

    // Cognito User Pool with custom attributes for tenant management
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
        plan: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 16, 
          mutable: true 
        }),
        features: new cognito.StringAttribute({ 
          minLen: 2, 
          maxLen: 1000, 
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
      removalPolicy: environment === 'prod' ? undefined : cognito.UserPoolDomainOptions.DESTROY,
    });

    // User Pool Client for frontend application
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${resourcePrefix}-client`,
      generateSecret: false, // Public client for SPA
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

    // Pre Token Generation Lambda for JWT enrichment
    const preTokenLambda = new lambdaNodejs.NodejsFunction(this, 'PreTokenLambda', {
      functionName: `${resourcePrefix}-pre-token`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/auth/pre-token-generation.ts'),
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        NODE_ENV: environment,
        TENANTS_TABLE_NAME: '', // Will be set after table creation
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    // Add Pre Token Generation trigger to User Pool
    this.userPool.addTrigger(cognito.UserPoolOperation.PRE_TOKEN_GENERATION, preTokenLambda);

    // ================================================================================
    // DATA LAYER - DYNAMODB TABLES
    // ================================================================================

    // Main entities table
    this.entitiesTable = new dynamodb.Table(this, 'EntitiesTable', {
      tableName: `${resourcePrefix}-entities`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    // Add GSIs for efficient querying
    this.entitiesTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    this.entitiesTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });

    // Usage events table with TTL
    this.usageTable = new dynamodb.Table(this, 'UsageTable', {
      tableName: `${resourcePrefix}-usage`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_IMAGES_ONLY,
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    // Add GSI for daily aggregation queries
    this.usageTable.addGlobalSecondaryIndex({
      indexName: 'DailyMeterGSI',
      partitionKey: { name: 'DayMeterPK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Usage daily aggregates table
    const usageDailyTable = new dynamodb.Table(this, 'UsageDailyTable', {
      tableName: `${resourcePrefix}-usage-daily`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    // Tenant configuration table
    this.tenantsTable = new dynamodb.Table(this, 'TenantsTable', {
      tableName: `${resourcePrefix}-tenants`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    // Update Pre Token Lambda environment with table name
    preTokenLambda.addEnvironment('TENANTS_TABLE_NAME', this.tenantsTable.tableName);

    // ================================================================================
    // STORAGE LAYER - S3 BUCKET
    // ================================================================================

    this.artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      bucketName: `${resourcePrefix}-artifacts-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'LogsTransition',
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
          ],
        },
      ],
      removalPolicy: environment === 'prod' ? undefined : s3.RemovalPolicy.DESTROY,
    });

    // ================================================================================
    // EVENT-DRIVEN ARCHITECTURE
    // ================================================================================

    this.eventBus = new events.EventBus(this, 'EventBus', {
      eventBusName: `${resourcePrefix}-events`,
    });

    // Usage aggregation Lambda
    const usageAggregatorLambda = new lambdaNodejs.NodejsFunction(this, 'UsageAggregatorLambda', {
      functionName: `${resourcePrefix}-usage-aggregator`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/usage/aggregator.ts'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        NODE_ENV: environment,
        USAGE_TABLE_NAME: this.usageTable.tableName,
        USAGE_DAILY_TABLE_NAME: usageDailyTable.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
      },
      bundling: {
        minify: true,
        sourceMap: props.enableDetailedLogging || false,
        target: 'node18',
      },
    });

    // EventBridge rule for usage aggregation
    new events.Rule(this, 'UsageAggregationRule', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['ai-nexus.usage'],
        detailType: ['Usage Event'],
      },
      targets: [new targets.LambdaFunction(usageAggregatorLambda)],
    });

    // ================================================================================
    // API LAYER
    // ================================================================================

    // CloudWatch Log Group for API Gateway
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/${resourcePrefix}-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: environment === 'prod' ? undefined : logs.RemovalPolicy.DESTROY,
    });

    // Main API Lambda function
    const apiLambda = new lambdaNodejs.NodejsFunction(this, 'ApiLambda', {
      functionName: `${resourcePrefix}-api`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/api/handler.ts'),
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: environment,
        ENTITIES_TABLE_NAME: this.entitiesTable.tableName,
        USAGE_TABLE_NAME: this.usageTable.tableName,
        USAGE_DAILY_TABLE_NAME: usageDailyTable.tableName,
        TENANTS_TABLE_NAME: this.tenantsTable.tableName,
        ARTIFACTS_BUCKET_NAME: this.artifactsBucket.bucketName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        USER_POOL_ID: this.userPool.userPoolId,
        CORS_ORIGINS: JSON.stringify(props.corsOrigins || ['*']),
      },
      bundling: {
        minify: true,
        sourceMap: props.enableDetailedLogging || false,
        target: 'node18',
        externalModules: ['aws-sdk'],
      },
    });

    // REST API with Cognito authorizer
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${resourcePrefix}-api`,
      description: 'AI Nexus Workbench - AI Lab Backend API',
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
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['*'],
            conditions: {
              IpAddress: {
                'aws:sourceIp': ['0.0.0.0/0'], // Restrict in production
              },
            },
          }),
        ],
      }),
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: 'CognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // API Gateway integration with Lambda
    const lambdaIntegration = new apigateway.LambdaIntegration(apiLambda, {
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

    // Webhooks resource (no auth required)
    const webhooksResource = v1Resource.addResource('webhooks');
    webhooksResource.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // ================================================================================
    // IAM PERMISSIONS
    // ================================================================================

    // Grant DynamoDB permissions to API Lambda
    this.entitiesTable.grantReadWriteData(apiLambda);
    this.usageTable.grantReadWriteData(apiLambda);
    usageDailyTable.grantReadWriteData(apiLambda);
    this.tenantsTable.grantReadWriteData(apiLambda);

    // Grant S3 permissions to API Lambda
    this.artifactsBucket.grantReadWrite(apiLambda);

    // Grant EventBridge permissions to API Lambda
    this.eventBus.grantPutEventsTo(apiLambda);

    // Grant DynamoDB permissions to Pre Token Lambda
    this.tenantsTable.grantReadData(preTokenLambda);

    // Grant DynamoDB permissions to Usage Aggregator Lambda
    this.usageTable.grantReadData(usageAggregatorLambda);
    usageDailyTable.grantReadWriteData(usageAggregatorLambda);

    // Tenant isolation IAM policy for API Lambda
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
          ],
          resources: [
            this.entitiesTable.tableArn,
            `${this.entitiesTable.tableArn}/index/*`,
            this.usageTable.tableArn,
            `${this.usageTable.tableArn}/index/*`,
            this.tenantsTable.tableArn,
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
          ],
          resources: [`${this.artifactsBucket.bucketArn}/tenants/*`],
        }),
      ],
    });

    apiLambda.role?.attachInlinePolicy(tenantIsolationPolicy);

    // ================================================================================
    // SECRETS MANAGEMENT
    // ================================================================================

    // Stripe API secret
    const stripeSecret = new secretsmanager.Secret(this, 'StripeSecret', {
      secretName: `${resourcePrefix}/stripe/secret`,
      description: 'Stripe API secret key for billing integration',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ webhook_secret: '' }),
        generateStringKey: 'api_key',
        excludeCharacters: '"@/\\',
      },
    });

    // OpenAI API secret
    const openaiSecret = new secretsmanager.Secret(this, 'OpenAISecret', {
      secretName: `${resourcePrefix}/openai/key`,
      description: 'OpenAI API key for LLM provider integration',
    });

    // Grant API Lambda access to secrets
    stripeSecret.grantRead(apiLambda);
    openaiSecret.grantRead(apiLambda);

    // ================================================================================
    // WAF (OPTIONAL)
    // ================================================================================

    if (props.enableWaf) {
      const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
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
            name: 'RateLimitRule',
            priority: 2,
            action: { block: {} },
            statement: {
              rateBasedStatement: {
                limit: 2000,
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
          metricName: 'webACL',
        },
      });

      // Associate WAF with API Gateway
      new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
        resourceArn: this.api.arnForExecuteApi(),
        webAclArn: webAcl.attrArn,
      });
    }

    // ================================================================================
    // OUTPUTS
    // ================================================================================

    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${resourcePrefix}-user-pool-id`,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${resourcePrefix}-user-pool-client-id`,
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

    new CfnOutput(this, 'ArtifactsBucketName', {
      value: this.artifactsBucket.bucketName,
      description: 'S3 Artifacts Bucket Name',
      exportName: `${resourcePrefix}-artifacts-bucket`,
    });

    new CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge Event Bus Name',
      exportName: `${resourcePrefix}-event-bus`,
    });

    new CfnOutput(this, 'StripeSecretName', {
      value: stripeSecret.secretName,
      description: 'Stripe Secret Name in Secrets Manager',
      exportName: `${resourcePrefix}-stripe-secret-name`,
    });

    new CfnOutput(this, 'OpenAISecretName', {
      value: openaiSecret.secretName,
      description: 'OpenAI Secret Name in Secrets Manager',
      exportName: `${resourcePrefix}-openai-secret-name`,
    });
  }
}
