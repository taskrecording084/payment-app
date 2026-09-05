const express = require('express');
const Stripe = require('stripe');
const { randomUUID } = require('crypto');

function checkoutRouter(db) {
  const router = express.Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Creates a Stripe Checkout Session (hosted payment page) and an "order"
  // doc in Mongo with status "pending". Nothing in this codebase ever flips
  // that status to "paid" — that's the bug this app is used to reproduce.
  router.post('/create-checkout-session', async (req, res) => {
    try {
      const orderId = randomUUID();
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: 'Test item' },
              unit_amount: 2000,
            },
            quantity: 1,
          },
        ],
        // Checkout doesn't create the PaymentIntent until the customer
        // actually pays, so we can't know its id yet. Stamping orderId onto
        // it here lets the webhook map payment_intent.succeeded back to
        // this order once it exists.
        payment_intent_data: {
          metadata: { orderId },
        },
        success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/`,
      });

      await db.collection('orders').insertOne({
        orderId,
        checkoutSessionId: session.id,
        paymentIntentId: null,
        amount: 2000,
        currency: 'usd',
        status: 'pending',
        createdAt: new Date(),
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Error creating checkout session', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  router.get('/orders', async (req, res) => {
    const orders = await db
      .collection('orders')
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.json(orders);
  });

  router.get('/orders/by-session/:sessionId', async (req, res) => {
    const order = await db
      .collection('orders')
      .findOne({ checkoutSessionId: req.params.sessionId });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
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
