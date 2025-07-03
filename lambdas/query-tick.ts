import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const symbol = event.queryStringParameters?.symbol;
    const rawLimit = event.queryStringParameters?.limit ?? "10";

    // Validate symbol
    if (!symbol || typeof symbol !== "string" || symbol.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing or invalid 'symbol' parameter.",
        }),
      };
    }

    // Validate limit
    const parsedLimit = Math.min(Number(rawLimit), 100);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "'limit' must be a number between 1 and 100.",
        }),
      };
    }


    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Query validated successfully",
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
