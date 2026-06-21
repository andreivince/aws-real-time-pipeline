import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MarketStream } from '../lib/cdk-stack';

test('creates ingestion, fanout, and query resources', () => {
  const app = new cdk.App();
  const stack = new MarketStream(app, 'TestMarketStream');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Lambda::Function', 3);
  template.resourceCountIs('AWS::DynamoDB::Table', 2);
  template.resourceCountIs('AWS::SQS::Queue', 2);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamViewType: 'NEW_IMAGE',
    },
  });
  template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
    RouteKey: 'POST /ingest',
  });
});
