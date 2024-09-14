/**
 * @file README.md
 * @description Creating a detailed README.md file content as described by the user.
 */

/**
 * @module AWS Lambda with PostgreSQL (RDS) Integration Guide
 * @description This guide walks through how to configure an AWS Lambda function that interacts with a PostgreSQL database hosted on Amazon RDS. It covers essential AWS services such as RDS, VPC, Security Groups, IAM Roles, API Gateway, and more, focusing on console-based setup.
 */

/**
 * @section Project Overview
 * @description The Lambda function performs the following:
 * - Create Table: Creates a `users` table if it doesn't exist.
 * - Insert Data: Inserts dummy user data into the table if the table is empty.
 * - HTTP API Integration: The Lambda function exposes API endpoints to add users and retrieve all users.
 */

/**
 * @subsection Key AWS Services Used
 * - Amazon RDS (PostgreSQL)
 * - AWS Lambda
 * - Amazon VPC
 * - Security Groups
 * - IAM Role
 * - API Gateway
 * - Environment Variables in AWS Lambda
 */

/**
 * @section 1. Amazon RDS (PostgreSQL) Setup
 * @description
 * 1. Go to the RDS Dashboard in AWS.
 * 2. Create a new RDS instance:
 *    - Select PostgreSQL as the database engine.
 *    - Configure the instance (choose instance type, storage, etc.).
 *    - Set up a master username and password.
 * 3. In the VPC Security Group, create or use an existing security group:
 *    - Allow inbound traffic for PostgreSQL (port 5432) to let the Lambda function connect.
 * 4. After the RDS instance is created, note down the Endpoint (host) and Port.
 */

/**
 * @section 2. VPC Configuration
 * @description
 * 1. Go to the VPC Dashboard.
 * 2. Either create a new VPC or use an existing one.
 * 3. Make sure your RDS instance is part of this VPC:
 *    - Assign subnets to the RDS instance from your VPC.
 * 4. Attach the same VPC to the Lambda function:
 *    - Ensure that security groups allow communication between Lambda and RDS.
 */

/**
 * @section 3. Lambda Configuration
 * @description
 * 1. Go to the Lambda Dashboard in AWS.
 * 2. Create a new Lambda function:
 *    - Choose Node.js as the runtime.
 * 3. In the Network settings, attach the VPC and corresponding subnets and security groups.
 * 4. Add the following Environment Variables to the Lambda:
 *    - DB_HOST: The RDS endpoint.
 *    - DB_PORT: PostgreSQL default is 5432.
 *    - DB_NAME: The database name.
 *    - DB_USER: The master username.
 *    - DB_PASSWORD: The RDS password.
 */

/**
 * @section 4. IAM Role for Lambda
 * @description
 * 1. Go to the IAM Dashboard.
 * 2. Create a new IAM Role:
 *    - Attach the AWSLambdaVPCAccessExecutionRole to allow Lambda access to your VPC.
 *    - Optionally, attach AmazonRDSFullAccess for broader RDS access.
 *    - If it not workes you can create a more broader Execution & Lambda & EC2 & VPC & RDS fullAccess role and assign it to Lambda.
 *    - Attach the IAM role to your Lambda under the Execution role section.
 */

/**
 * @section 5. API Gateway & Function URL
 * @description
 * Option 1: Using API Gateway
 * 1. Go to API Gateway.
 * 2. Create a new HTTP API or REST API:
 *    - Configure routes like /users or /insert that invoke the Lambda function.
 *    - Set the integration to trigger your Lambda.
 *    - Deploy the API and note down the Invoke URL.
 * Option 2: Using Lambda Function URLs
 * - Enable Function URL for your Lambda function.
 * - This provides a URL to directly access your Lambda without an API Gateway.
 */

/**
 * @section 6. Security Groups
 * @description
 * - RDS Security Group:
 *   - Allow inbound traffic on port 5432 from Lambda's VPC or specific IP ranges.
 * - Lambda Security Group:
 *   - Allow outbound traffic to RDS.
 */

/**
 * @section 7. Optional: RDS Proxy (Optional)
 * @description
 * 1. Go to RDS Proxy in the AWS Console.
 * 2. Create a new proxy for your RDS instance.
 * 3. Use the proxy endpoint as the DB_HOST environment variable in Lambda for better connection handling.
 */

/**
 * @section 8. Full Code Example
 * @description
 * ```javascript
 * import pg from 'pg';
 * const { Client } = pg;
 *
 * const dbConfigWriter = {
 *   host: process.env.DB_HOST,
 *   port: process.env.DB_PORT,
 *   database: process.env.DB_NAME,
 *   user: process.env.DB_USER,
 *   password: process.env.DB_PASSWORD,
 *   ssl: {
 *     rejectUnauthorized: false
 *   }
 * };
 *
 * const dbConfigReader = {
 *   host: process.env.DB_HOST_READ,
 *   port: process.env.DB_PORT,
 *   database: process.env.DB_NAME,
 *   user: process.env.DB_USER,
 *   password: process.env.DB_PASSWORD,
 *   ssl: {
 *     rejectUnauthorized: false
 *   }
 * };
 *
 * async function createTableIfNotExists(client) {
 *   const createTableQuery = `
 *     CREATE TABLE IF NOT EXISTS users (
 *       id SERIAL PRIMARY KEY,
 *       name VARCHAR(100) NOT NULL,
 *       email VARCHAR(100) UNIQUE NOT NULL,
 *       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 *     )
 *   `;
 *   await client.query(createTableQuery);
 * }
 *
 * async function insertDummyDataIfEmpty(client) {
 *   const countQuery = 'SELECT COUNT(*) FROM users';
 *   const countResult = await client.query(countQuery);
 *
 *   if (parseInt(countResult.rows[0].count) === 0) {
 *     const dummyData = [
 *       { name: 'John Doe', email: 'john@example.com' },
 *       { name: 'Jane Smith', email: 'jane@example.com' },
 *       { name: 'Bob Johnson', email: 'bob@example.com' },
 *     ];
 *
 *     for (const user of dummyData) {
 *       const insertQuery = 'INSERT INTO users (name, email) VALUES ($1, $2)';
 *       await client.query(insertQuery, [user.name, user.email]);
 *     }
 *
 *     console.log('Dummy data inserted successfully');
 *   }
 * }
 *
 * export const handler = async (event) => {
 *   console.log('Received event:', JSON.stringify(event, null, 2));
 *   let clientWriter;
 *   let clientReader;
 *   let body;
 *   let statusCode = '200';
 *   const headers = {
 *     'Content-Type': 'application/json',
 *   };
 *
 *   try {
 *     const httpMethod = event.httpMethod || event.requestContext?.http?.method;
 *     console.log('HTTP Method:', httpMethod);
 *
 *     const path = event.path || event.rawPath || '/';
 *     console.log('Path:', path);
 *
 *     clientWriter = new Client(dbConfigWriter);
 *     await clientWriter.connect();
 *     await createTableIfNotExists(clientWriter);
 *     await insertDummyDataIfEmpty(clientWriter);
 *
 *     switch (httpMethod) {
 *       case 'POST':
 *         if (path === "/insert") {
 *           const { name, email } = JSON.parse(event.body);
 *           const query = 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *';
 *           const values = [name, email];
 *           const result = await clientWriter.query(query, values);
 *           body = { message: "User inserted successfully", user: result.rows[0] };
 *         } else {
 *           throw new Error(`Unsupported path "${path}" for POST method`);
 *         }
 *         break;
 *       case 'GET':
 *         if (path === "/users") {
 *           clientReader = new Client(dbConfigReader);
 *           await clientReader.connect();
 *           const result = await clientReader.query('SELECT * FROM users');
 *           body = { users: result.rows };
 *         } else {
 *           throw new Error(`Unsupported path "${path}" for GET method`);
 *         }
 *         break;
 *       default:
 *         throw new Error(`Unsupported method "${httpMethod}"`);
 *     }
 *   } catch (err) {
 *     console.error('Error:', err);
 *     statusCode = '400';
 *     body = err.message;
 *   } finally {
 *     if (clientWriter) {
 *       await clientWriter.end();
 *     }
 *     if (clientReader) {
 *       await clientReader.end();
 *     }
 *     body = JSON.stringify(body);
 *   }
 *
 *   return {
 *     statusCode,
 *     body,
 *     headers,
 *   };
 * };
 * ```
 *
 * This setup ensures a secure connection between AWS Lambda and your RDS instance, with best practices for environment variables, VPC, and API exposure.
 */
