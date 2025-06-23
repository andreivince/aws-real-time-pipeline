import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({}); // Create connection with Dynamo DB

export const handler = async (event: any) => {
    try {
        const { symbol, timestamp, price } = JSON.parse(event.body)
        const command = new PutItemCommand({
            TableName: process.env.TICK_TABLE_NAME,
            Item: {
                symbol: { S: symbol },
                timestamp: { N: timestamp.toString() },
                price: { N: price.toString() },
            }
        })

        await client.send(command)
    
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Stored: Success' })
        }
        
    } catch (error) {
        console.error('Error', error)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Stored: Failed" })
        }
    }
}