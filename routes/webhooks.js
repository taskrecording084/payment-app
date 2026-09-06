const express = require('express');
const Stripe = require('stripe');

function webhooksRouter(db) {
  const router = express.Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Stripe requires the raw request body to verify the signature, so this
  // route must NOT go through express.json() — it's mounted before the
  // global JSON body parser in server.js.
  router.post(
    '/stripe',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.error('Webhook signature verification failed', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata && paymentIntent.metadata.orderId;

        if (!orderId) {
          console.error(
            'payment_intent.succeeded with no orderId metadata',
            paymentIntent.id
          );
          return res.json({ received: true });
        }

        try {
          await db.collection('orders').updateOne(
            { orderId },
            {
              $set: {
                status: 'paid',
                paymentIntentId: paymentIntent.id,
                paidAt: new Date(),
              },
            }
          );
        } catch (err) {
          console.error('Failed to update order status', err);
          return res.status(500).send('Internal error updating order');
        }
      }

      res.json({ received: true });
    }
  );

  return router;
}

module.exports = webhooksRouter;
