import pg from 'pg';
const { Client } = pg;

const dbConfigWriter = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

const dbConfigReader = {
  host: process.env.DB_HOST_READ,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

async function createTableIfNotExists(client) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await client.query(createTableQuery);
}

async function insertDummyDataIfEmpty(client) {
  const countQuery = 'SELECT COUNT(*) FROM users';
  const countResult = await client.query(countQuery);
  
  if (parseInt(countResult.rows[0].count) === 0) {
    const dummyData = [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' },
      { name: 'Bob Johnson', email: 'bob@example.com' },
    ];

    for (const user of dummyData) {
      const insertQuery = 'INSERT INTO users (name, email) VALUES ($1, $2)';
      await client.query(insertQuery, [user.name, user.email]);
    }

    console.log('Dummy data inserted successfully');
  }
}

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let clientWriter;
  let clientReader;
  let body;
  let statusCode = '200';
  const headers = {
    'Content-Type': 'application/json',
  };
  
  try {
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    console.log('HTTP Method:', httpMethod);

    // Path'i doğru şekilde al
    const path = event.path || event.rawPath || '/';
    console.log('Path:', path);

    clientWriter = new Client(dbConfigWriter);
    await clientWriter.connect();
    await createTableIfNotExists(clientWriter);
    await insertDummyDataIfEmpty(clientWriter);

    switch (httpMethod) {
      case 'POST':
        if (path === "/insert") {
          const { name, email } = JSON.parse(event.body);
          const query = 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *';
          const values = [name, email];
          const result = await clientWriter.query(query, values);
          body = { message: "User inserted successfully", user: result.rows[0] };
        } else {
          throw new Error(`Unsupported path "${path}" for POST method`);
        }
        break;
      case 'GET':
        if (path === "/users") {
          clientReader = new Client(dbConfigReader);
          await clientReader.connect();
          const result = await clientReader.query('SELECT * FROM users');
          body = { users: result.rows };
        } else {
          throw new Error(`Unsupported path "${path}" for GET method`);
        }
        break;
      default:
        throw new Error(`Unsupported method "${httpMethod}"`);
    }
  } catch (err) {
    console.error('Error:', err);
    statusCode = '400';
    body = err.message;
  } finally {
    if (clientWriter) {
      await clientWriter.end();
    }
    if (clientReader) {
      await clientReader.end();
    }
    body = JSON.stringify(body);
  }
  
  return {
    statusCode,
    body,
    headers,
  };
};