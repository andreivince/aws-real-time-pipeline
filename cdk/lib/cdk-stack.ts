import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from 'path'
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as destinations from 'aws-cdk-lib/aws-lambda-destinations';
export class MarketStream extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const tickTable = new dynamodb.Table(this, 'TickTable', {
      partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY // During development, change when goes to prod
    })
    
    const dlq = new sqs.Queue(this, 'IngestDQL', {
      retentionPeriod: cdk.Duration.days(3),
    });

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
    tickTable.grantWriteData(ingestLambda)

    const api = new apigateway.RestApi(this, 'TickAPI', {
      restApiName: 'Tick Ingest Service',
    });

    api.root.addResource('ingest').addMethod('POST', new apigateway.LambdaIntegration(ingestLambda))
  }
}
