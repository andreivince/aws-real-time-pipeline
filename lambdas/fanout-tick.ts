import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const DEDUP_TABLE = process.env.DEDUP_TABLE_NAME!;

const sqs = new SQSClient({});
const FANOUT_QUEUE_URL = process.env.FANOUT_QUEUE_URL!;

export const handler = async (event: any) => {
  try {
    console.log("Received batch:", event.Records.length);
    for (const record of event.Records) {
      try {
        if (!record.dynamodb?.NewImage) continue; // Skip if no NewImage is present

        const { symbol, timestamp } = record.dynamodb.NewImage;

        const symbolValue = symbol?.S;
        const timestampValue = Number(timestamp?.N);

        if (!symbolValue || !timestampValue) {
          console.warn("Missing symbol or timestamp in record:", record);
          continue;
        }

        const dedupeKey = `ws_${symbolValue}_${timestampValue}`;
        console.log("Processing dedupe key:", dedupeKey);

        // Check if the dedupe key already exists
        const existing = await ddb.send(
          new GetCommand({
            TableName: DEDUP_TABLE,
            Key: { dedupeKey },
          })
        );
        if (existing.Item) {
          console.log("Dedupe key already exists, skipping:", dedupeKey);
          continue; // Skip processing if the key already exists
        }

        await ddb.send(
          new PutCommand({
            TableName: DEDUP_TABLE,
            Item: {
              dedupeKey,
              ttl: Math.floor(Date.now() / 1000) + 300, // Set TTL for 5 minutes
            },
            ConditionExpression: "attribute_not_exists(dedupeKey)", // Ensure no overwriting
          })
        );
          console.log("Dedupe key added:", dedupeKey);
          

        await sqs.send(
          new SendMessageCommand({
            QueueUrl: FANOUT_QUEUE_URL,
            MessageBody: JSON.stringify({
              symbol: symbolValue,
                timestamp: timestampValue,
              dedupeKey
            }),
          })
        );
        console.log("Message sent to SQS:", dedupeKey);
      } catch (err) {
        console.error("Failed to process tick:", err);
        continue;
      }
    }
  } catch (error) {
    console.error("Error processing batch:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Batch processing failed" }),
    };
  }
};
