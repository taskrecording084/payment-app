require('dotenv').config();

const express = require('express');
const path = require('path');
const { connectToDatabase } = require('./db');
const checkoutRouter = require('./routes/checkout');
const webhooksRouter = require('./routes/webhooks');

async function main() {
  const db = await connectToDatabase();

  const app = express();

  app.use(express.static(path.join(__dirname, 'public')));

  // Mounted before express.json() — Stripe signature verification needs
  // the raw, unparsed request body.
  app.use('/webhooks', webhooksRouter(db));

  app.use(express.json());
  app.use('/api', checkoutRouter(db));

  const port = process.env.PORT || 4242;
  app.listen(port, () => {
    console.log(`payment-app listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
