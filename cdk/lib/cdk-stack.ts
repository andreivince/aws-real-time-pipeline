import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from 'path'
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const tickTable = new dynamodb.Table(this, 'TickTable', {
      partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY // During development, change when goes to prod
    })

    const ingestLambda = new NodejsFunction(this, "IngestTickFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../lambdas/ingest-tick.ts"), // Portable and works in all dev env
      handler: "handler", // Name of the file + Handler
      environment: {
        TICK_TABLE_NAME: tickTable.tableName,
      },
    });
    tickTable.grantWriteData(ingestLambda)

    const api = new apigateway.RestApi(this, 'TickAPI', {
      restApiName: 'Tick Ingest Service',
    })

    api.root.addResource('ingest').addMethod('POST', new apigateway.LambdaIntegration(ingestLambda))
  }
}
