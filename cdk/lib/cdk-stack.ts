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
