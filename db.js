const { MongoClient } = require('mongodb');

let client;
let db;

async function connectToDatabase() {
  if (db) return db;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'payments-app';

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  console.log(`Connected to MongoDB database "${dbName}"`);
  return db;
}

module.exports = { connectToDatabase };
