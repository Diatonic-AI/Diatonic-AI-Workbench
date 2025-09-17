import { Duration, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as quicksight from 'aws-cdk-lib/aws-quicksight';
import { join } from 'path';

export interface ObservatoryCoreStackProps extends StackProps {
  environment: 'dev' | 'staging' | 'prod';
  enableRealTimeAnalytics?: boolean;
  enableDataLake?: boolean;
  retentionDays?: number;
  corsOrigins?: string[];
  communityUserPoolId?: string; // Reference to Community stack User Pool
}

export class ObservatoryCoreStack extends Stack {
  public readonly api: apigateway.RestApi;
  public readonly metricsTable: dynamodb.Table;
  public readonly aggregatesTable: dynamodb.Table;
  public readonly sessionsTable: dynamodb.Table;
  public readonly eventsTable: dynamodb.Table;
  public readonly analyticsStream: kinesis.Stream;
  public readonly dataLakeBucket: s3.Bucket;
  public readonly eventBus: events.EventBus;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: ObservatoryCoreStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const resourcePrefix = `ainexus-observatory-${environment}`;
    const retentionDays = props.retentionDays || (environment === 'prod' ? 90 : 30);

    // ================================================================================
    // AUTHENTICATION (Reference Community User Pool)
    // ================================================================================

    let userPool: cognito.IUserPool | undefined;
    if (props.communityUserPoolId) {
      userPool = cognito.UserPool.fromUserPoolId(
        this, 
        'ImportedCommunityUserPool', 
        props.communityUserPoolId
      );
    }

    // ================================================================================
    // ANALYTICS DATA LAYER - DYNAMODB TABLES
    // ================================================================================

    // Real-time metrics table (high-frequency writes)
    this.metricsTable = new dynamodb.Table(this, 'MetricsTable', {
      tableName: `${resourcePrefix}-metrics`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING }, // metric_type#tenant_id
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING }, // timestamp#user_id
      timeToLiveAttribute: 'ttl', // Auto-expire old metrics
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    // Metrics GSIs for efficient querying
    this.metricsTable.addGlobalSecondaryIndex({
      indexName: 'TenantMetricsIndex',
      partitionKey: { name: 'tenant_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    this.metricsTable.addGlobalSecondaryIndex({
      indexName: 'MetricTypeIndex',
      partitionKey: { name: 'metric_type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    this.metricsTable.addGlobalSecondaryIndex({
      indexName: 'UserActivityIndex',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Pre-aggregated metrics table (for reporting)
    this.aggregatesTable = new dynamodb.Table(this, 'AggregatesTable', {
      tableName: `${resourcePrefix}-aggregates`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING }, // aggregation_type#period
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING }, // tenant_id#timestamp
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    this.aggregatesTable.addGlobalSecondaryIndex({
      indexName: 'TenantAggregatesIndex',
      partitionKey: { name: 'tenant_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'period_start', type: dynamodb.AttributeType.STRING },
    });

    this.aggregatesTable.addGlobalSecondaryIndex({
      indexName: 'AggregationTypeIndex',
      partitionKey: { name: 'aggregation_type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'period_start', type: dynamodb.AttributeType.STRING },
    });

    // User sessions tracking
    this.sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: `${resourcePrefix}-sessions`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'session_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updated_at', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    this.sessionsTable.addGlobalSecondaryIndex({
      indexName: 'UserSessionsIndex',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'started_at', type: dynamodb.AttributeType.STRING },
    });

    // Events table for custom event tracking
    this.eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: `${resourcePrefix}-events`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING }, // event_type#date
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING }, // timestamp#event_id
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: environment === 'prod' ? undefined : dynamodb.RemovalPolicy.DESTROY,
    });

    this.eventsTable.addGlobalSecondaryIndex({
      indexName: 'TenantEventsIndex',
      partitionKey: { name: 'tenant_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // ================================================================================
    // REAL-TIME ANALYTICS STREAM (OPTIONAL)
    // ================================================================================

    if (props.enableRealTimeAnalytics) {
      this.analyticsStream = new kinesis.Stream(this, 'AnalyticsStream', {
        streamName: `${resourcePrefix}-analytics`,
        shardCount: environment === 'prod' ? 3 : 1,
        retentionPeriod: Duration.days(1), // Keep data for 24 hours
      });
    }

    // ================================================================================
    // DATA LAKE AND ANALYTICS (OPTIONAL)
    // ================================================================================

    if (props.enableDataLake) {
      // S3 Data Lake for long-term analytics storage
      this.dataLakeBucket = new s3.Bucket(this, 'ObservatoryDataLake', {
        bucketName: `${resourcePrefix}-datalake-${this.account}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        versioned: false,
        lifecycleRules: [
          {
            id: 'DataLakeLifecycle',
            enabled: true,
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
        removalPolicy: environment === 'prod' ? undefined : s3.RemovalPolicy.DESTROY,
      });

      // Kinesis Data Firehose for streaming data to S3
      if (this.analyticsStream) {
        const firehoseRole = new iam.Role(this, 'FirehoseRole', {
          assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
        });

        this.dataLakeBucket.grantWrite(firehoseRole);

        new firehose.CfnDeliveryStream(this, 'AnalyticsFirehose', {
          deliveryStreamName: `${resourcePrefix}-firehose`,
          deliveryStreamType: 'KinesisStreamAsSource',
          kinesisStreamSourceConfiguration: {
            kinesisStreamArn: this.analyticsStream.streamArn,
            roleArn: firehoseRole.roleArn,
          },
          s3DestinationConfiguration: {
            bucketArn: this.dataLakeBucket.bucketArn,
            prefix: 'year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/',
            errorOutputPrefix: 'errors/',
            bufferingHints: {
              sizeInMBs: 1,
              intervalInSeconds: 60,
            },
            compressionFormat: 'GZIP',
            roleArn: firehoseRole.roleArn,
          },
        });
      }

      // Glue Catalog for data discovery
      const analyticsDatabase = new glue.CfnDatabase(this, 'AnalyticsDatabase', {
        catalogId: this.account,
        databaseInput: {
          name: `${resourcePrefix.replace(/-/g, '_')}_analytics`,
          description: 'Observatory Analytics Database',
        },
      });

      // Glue Table for analytics data
      new glue.CfnTable(this, 'AnalyticsTable', {
        catalogId: this.account,
        databaseName: analyticsDatabase.ref,
        tableInput: {
          name: 'analytics_events',
          description: 'Analytics events from Kinesis Firehose',
          storageDescriptor: {
            location: `s3://${this.dataLakeBucket.bucketName}/`,
            inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
            outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
            serdeInfo: {
              serializationLibrary: 'org.openx.data.jsonserde.JsonSerDe',
            },
            columns: [
              { name: 'timestamp', type: 'string' },
              { name: 'event_type', type: 'string' },
              { name: 'tenant_id', type: 'string' },
              { name: 'user_id', type: 'string' },
              { name: 'session_id', type: 'string' },
              { name: 'properties', type: 'string' },
            ],
          },
          partitionKeys: [
            { name: 'year', type: 'string' },
            { name: 'month', type: 'string' },
            { name: 'day', type: 'string' },
            { name: 'hour', type: 'string' },
          ],
        },
      });
    }

    // ================================================================================
    // EVENT-DRIVEN ARCHITECTURE
    // ================================================================================

    this.eventBus = new events.EventBus(this, 'ObservatoryEventBus', {
      eventBusName: `${resourcePrefix}-events`,
    });

    // ================================================================================
    // LAMBDA FUNCTIONS
    // ================================================================================

    // Main Observatory API Lambda
    const observatoryApiLambda = new lambdaNodejs.NodejsFunction(this, 'ObservatoryApiLambda', {
      functionName: `${resourcePrefix}-api`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/observatory-api/handler.ts'),
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment: {
        NODE_ENV: environment,
        METRICS_TABLE_NAME: this.metricsTable.tableName,
        AGGREGATES_TABLE_NAME: this.aggregatesTable.tableName,
        SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
        EVENTS_TABLE_NAME: this.eventsTable.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        ...(this.analyticsStream && { ANALYTICS_STREAM_NAME: this.analyticsStream.streamName }),
        ...(this.dataLakeBucket && { DATA_LAKE_BUCKET: this.dataLakeBucket.bucketName }),
        CORS_ORIGINS: JSON.stringify(props.corsOrigins || ['*']),
        RETENTION_DAYS: retentionDays.toString(),
      },
      bundling: {
        minify: true,
        target: 'node18',
        externalModules: ['aws-sdk'],
      },
    });

    // Metrics Aggregation Lambda (runs periodically)
    const aggregationLambda = new lambdaNodejs.NodejsFunction(this, 'MetricsAggregationLambda', {
      functionName: `${resourcePrefix}-aggregation`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../../lambda/observatory-api/aggregation.ts'),
      timeout: Duration.minutes(5),
      memorySize: 1024,
      environment: {
        NODE_ENV: environment,
        METRICS_TABLE_NAME: this.metricsTable.tableName,
        AGGREGATES_TABLE_NAME: this.aggregatesTable.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
      },
      bundling: {
        minify: true,
        target: 'node18',
      },
    });

    // Stream Processor Lambda (for real-time analytics)
    if (this.analyticsStream) {
      const streamProcessorLambda = new lambdaNodejs.NodejsFunction(this, 'StreamProcessorLambda', {
        functionName: `${resourcePrefix}-stream-processor`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'handler',
        entry: join(__dirname, '../../lambda/observatory-api/stream-processor.ts'),
        timeout: Duration.minutes(5),
        memorySize: 512,
        environment: {
          NODE_ENV: environment,
          METRICS_TABLE_NAME: this.metricsTable.tableName,
          AGGREGATES_TABLE_NAME: this.aggregatesTable.tableName,
          EVENT_BUS_NAME: this.eventBus.eventBusName,
        },
        bundling: {
          minify: true,
          target: 'node18',
        },
      });

      // Connect stream to processor
      streamProcessorLambda.addEventSource(
        new lambda.KinesisEventSource(this.analyticsStream, {
          batchSize: 100,
          maxBatchingWindow: Duration.seconds(5),
          startingPosition: lambda.StartingPosition.LATEST,
          retryAttempts: 2,
        })
      );

      // Grant stream permissions
      this.analyticsStream.grantReadWrite(streamProcessorLambda);
      this.metricsTable.grantReadWriteData(streamProcessorLambda);
      this.aggregatesTable.grantReadWriteData(streamProcessorLambda);
    }

    // Scheduled aggregation rule
    new events.Rule(this, 'AggregationScheduleRule', {
      schedule: events.Schedule.rate(Duration.hours(1)),
      targets: [new targets.LambdaFunction(aggregationLambda)],
    });

    // EventBridge rules for metrics processing
    new events.Rule(this, 'MetricsProcessingRule', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['ai-nexus.observatory'],
        detailType: ['Metric Recorded', 'Event Tracked'],
      },
      targets: [new targets.LambdaFunction(aggregationLambda)],
    });

    // ================================================================================
    // API GATEWAY SETUP
    // ================================================================================

    // CloudWatch Log Group
    const apiLogGroup = new logs.LogGroup(this, 'ObservatoryApiLogGroup', {
      logGroupName: `/aws/apigateway/${resourcePrefix}-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: environment === 'prod' ? undefined : logs.RemovalPolicy.DESTROY,
    });

    // REST API
    this.api = new apigateway.RestApi(this, 'ObservatoryApi', {
      restApiName: `${resourcePrefix}-api`,
      description: 'AI Nexus Observatory Backend API',
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
        dataTraceEnabled: false,
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
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

    // API Gateway integration
    const lambdaIntegration = new apigateway.LambdaIntegration(observatoryApiLambda, {
      proxy: true,
      allowTestInvoke: true,
    });

    // v1 API resource
    const v1Resource = this.api.root.addResource('v1');

    // Authorization (optional - if Community User Pool is provided)
    let authorizer: apigateway.CognitoUserPoolsAuthorizer | undefined;
    if (userPool) {
      authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ObservatoryAuthorizer', {
        cognitoUserPools: [userPool],
        authorizerName: 'ObservatoryAuthorizer',
        identitySource: 'method.request.header.Authorization',
      });
    }

    // Proxy all requests to Lambda
    v1Resource.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
      defaultMethodOptions: authorizer ? {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      } : undefined,
    });

    // Health check endpoint (no auth required)
    const healthResource = v1Resource.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration);

    // ================================================================================
    // CLOUDWATCH DASHBOARD
    // ================================================================================

    this.dashboard = new cloudwatch.Dashboard(this, 'ObservatoryDashboard', {
      dashboardName: `${resourcePrefix}-dashboard`,
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Request Count',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            dimensionsMap: {
              ApiName: this.api.restApiName,
            },
            statistic: 'Sum',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: 'API Latency',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: {
              ApiName: this.api.restApiName,
            },
            statistic: 'Average',
          }),
        ],
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            dimensionsMap: {
              TableName: this.metricsTable.tableName,
            },
            statistic: 'Sum',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            dimensionsMap: {
              TableName: this.metricsTable.tableName,
            },
            statistic: 'Sum',
          }),
        ],
      })
    );

    if (this.analyticsStream) {
      this.dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Kinesis Stream Metrics',
          left: [
            new cloudwatch.Metric({
              namespace: 'AWS/Kinesis',
              metricName: 'IncomingRecords',
              dimensionsMap: {
                StreamName: this.analyticsStream.streamName,
              },
              statistic: 'Sum',
            }),
          ],
        })
      );
    }

    // ================================================================================
    // IAM PERMISSIONS
    // ================================================================================

    // Grant DynamoDB permissions
    this.metricsTable.grantReadWriteData(observatoryApiLambda);
    this.aggregatesTable.grantReadWriteData(observatoryApiLambda);
    this.sessionsTable.grantReadWriteData(observatoryApiLambda);
    this.eventsTable.grantReadWriteData(observatoryApiLambda);

    this.metricsTable.grantReadWriteData(aggregationLambda);
    this.aggregatesTable.grantReadWriteData(aggregationLambda);

    // Grant EventBridge permissions
    this.eventBus.grantPutEventsTo(observatoryApiLambda);
    this.eventBus.grantPutEventsTo(aggregationLambda);

    // Grant Kinesis permissions (if enabled)
    if (this.analyticsStream) {
      this.analyticsStream.grantWrite(observatoryApiLambda);
    }

    // Grant S3 permissions (if data lake enabled)
    if (this.dataLakeBucket) {
      this.dataLakeBucket.grantRead(observatoryApiLambda);
    }

    // ================================================================================
    // OUTPUTS
    // ================================================================================

    new CfnOutput(this, 'ObservatoryApiEndpoint', {
      value: this.api.url,
      description: 'Observatory API Gateway endpoint URL',
      exportName: `${resourcePrefix}-api-endpoint`,
    });

    new CfnOutput(this, 'MetricsTableName', {
      value: this.metricsTable.tableName,
      description: 'DynamoDB Metrics Table Name',
      exportName: `${resourcePrefix}-metrics-table`,
    });

    new CfnOutput(this, 'AggregatesTableName', {
      value: this.aggregatesTable.tableName,
      description: 'DynamoDB Aggregates Table Name',
      exportName: `${resourcePrefix}-aggregates-table`,
    });

    new CfnOutput(this, 'SessionsTableName', {
      value: this.sessionsTable.tableName,
      description: 'DynamoDB Sessions Table Name',
      exportName: `${resourcePrefix}-sessions-table`,
    });

    new CfnOutput(this, 'EventsTableName', {
      value: this.eventsTable.tableName,
      description: 'DynamoDB Events Table Name',
      exportName: `${resourcePrefix}-events-table`,
    });

    if (this.analyticsStream) {
      new CfnOutput(this, 'AnalyticsStreamName', {
        value: this.analyticsStream.streamName,
        description: 'Kinesis Analytics Stream Name',
        exportName: `${resourcePrefix}-analytics-stream`,
      });
    }

    if (this.dataLakeBucket) {
      new CfnOutput(this, 'DataLakeBucketName', {
        value: this.dataLakeBucket.bucketName,
        description: 'S3 Data Lake Bucket Name',
        exportName: `${resourcePrefix}-datalake-bucket`,
      });
    }

    new CfnOutput(this, 'ObservatoryEventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge Observatory Event Bus Name',
      exportName: `${resourcePrefix}-event-bus`,
    });

    new CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
      exportName: `${resourcePrefix}-dashboard-url`,
    });
  }
}
