import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from 'path'
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as destinations from 'aws-cdk-lib/aws-lambda-destinations';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
export class MarketStream extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tickTable = new dynamodb.Table(this, "TickTable", {
      partitionKey: { name: "symbol", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // During development, change when goes to prod
    });

    const dedupTable = new dynamodb.Table(this, "DedupTable", {
      partitionKey: { name: "dedupeKey", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // During development, change when goes to prod or no I think I'm fine with that
      timeToLiveAttribute: "ttl", // Automatically delete items after a certain time
    });


    const fanoutLambda = new NodejsFunction(this, "FanoutLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../lambdas/fanout-tick.ts"),
      handler: "handler", // Name of the file + Handler
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: {
        DEDUP_TABLE_NAME: dedupTable.tableName,
      }
    });
    tickTable.grantStreamRead(fanoutLambda); // Grant the Lambda function read access to the DynamoDB stream
    dedupTable.grantWriteData(fanoutLambda); // Grant the Lambda function write access to the deduplication table

    fanoutLambda.addEventSource(
      new DynamoEventSource(tickTable, {
        startingPosition: lambda.StartingPosition.LATEST, // Start reading from the latest records
        batchSize: 100, // It's not min, it's the max, if only 23 records are available, it will only process those
        retryAttempts: 2, // Retry on failure
        bisectBatchOnError: true, // Split batch on error and eventually isolate the problem
      })
    );
    dedupTable.grantWriteData(fanoutLambda);

    const fanoutQueue = new sqs.Queue(this, "FanoutQueue", {
      retentionPeriod: cdk.Duration.days(3), // Retain messages for 3 days,
      visibilityTimeout: cdk.Duration.seconds(30), // Visibility timeout for processing messages
    });
    fanoutQueue.grantSendMessages(fanoutLambda); // Grant the Lambda function permission to send messages to the queue  
    fanoutLambda.addEnvironment("FANOUT_QUEUE_URL", fanoutQueue.queueUrl); // Pass the queue URL to the Lambda function
    
    
    const dlq = new sqs.Queue(this, "IngestDQL", {
      retentionPeriod: cdk.Duration.days(3),
    });

    // Create a Lambda function for ingesting ticks
    // This function will be triggered by the API Gateway
    // and will write data to the DynamoDB table
    const ingestLambda = new NodejsFunction(this, "IngestTickFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../lambdas/ingest-tick.ts"), // Portable and works in all dev env
      handler: "handler", // Name of the file + Handler
      retryAttempts: 2, // Retry on failure
      onFailure: new destinations.SqsDestination(dlq), // Send to DLQ on failure
      environment: {
        TICK_TABLE_NAME: tickTable.tableName,
      },
    });
    tickTable.grantWriteData(ingestLambda);

    // Create an API Gateway HTTP API for ingesting ticks
    const ingestAPI = new apigatewayv2.HttpApi(this, "TickAPI", {
      apiName: "Tick Ingest Service",
    });

    ingestAPI.addRoutes({
      path: "/ingest",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "IngestIntegration",
        ingestLambda
      ),
    });

    // Create a Lambda function for querying ticks
    // This function will be triggered by the API Gateway
    // and will read data from the DynamoDB table
    const queryLambda = new NodejsFunction(this, "QueryLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../lambdas/query-tick.ts"), // Portable and works in all dev env
      handler: "handler", // Name of the file + Handler
      retryAttempts: 2, // Retry on failure
      onFailure: new destinations.SqsDestination(dlq), // Send to DLQ on failure
    });
    tickTable.grantReadData(queryLambda);

    const queryAPI = new apigateway.RestApi(this, "QueryRestAPI", {
      restApiName: "Query Rest API",
    });

    queryAPI.root
      .addResource("query")
      .addMethod("GET", new apigateway.LambdaIntegration(queryLambda));
  }
}
