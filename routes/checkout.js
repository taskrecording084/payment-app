const express = require('express');
const Stripe = require('stripe');
const { randomUUID } = require('crypto');

function checkoutRouter(db) {
  const router = express.Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  router.get('/config', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  });

  // Creates a Stripe PaymentIntent and an "order" doc in Mongo with status
  // "pending". Nothing in this codebase ever flips that status to "paid" —
  // that's the bug this app is used to reproduce.
  router.post('/create-payment-intent', async (req, res) => {
    try {
      const { amount = 2000, currency = 'usd' } = req.body || {};

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
      });

      const orderId = randomUUID();
      await db.collection('orders').insertOne({
        orderId,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        status: 'pending',
        createdAt: new Date(),
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        orderId,
      });
    } catch (err) {
      console.error('Error creating payment intent', err);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  });

  router.get('/orders/:orderId', async (req, res) => {
    const order = await db
      .collection('orders')
      .findOne({ orderId: req.params.orderId });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  });

  return router;
}

module.exports = checkoutRouter;
