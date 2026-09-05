# payment-app

Minimal Node.js checkout service (Express + Stripe + MongoDB) used to
reproduce and fix a reported payment bug:

> Customers complete payment successfully and see a success message, but
> their order status in the database never updates from `pending` to `paid`.

## Setup

```bash
npm install
cp .env.example .env   # fill in Stripe test keys + Mongo connection string
npm run dev
```

Open http://localhost:4242, click **Pay with Stripe Checkout**, and complete
the payment on Stripe's hosted page using a
[Stripe test card](https://stripe.com/docs/testing) (e.g. `4242 4242 4242 4242`,
any future expiry, any CVC, any ZIP).

## Known issue (main branch) / fix (this branch)

`main` only implements the checkout flow:

1. `POST /api/create-checkout-session` creates a Stripe Checkout Session
   and an `orders` document in MongoDB with `status: "pending"`. The
   session's `PaymentIntent` doesn't exist yet at this point, so the
   order's `orderId` is stamped onto it via `payment_intent_data.metadata`
   for later lookup.
2. The browser redirects to Stripe's hosted Checkout page. On completion,
   Stripe redirects back to `success.html`, which shows a success message
   and displays the order's current status — pulled live from the backend,
   not assumed.

There is no `/webhooks/stripe` endpoint on `main`, so the backend is never
notified when the `PaymentIntent` actually succeeds. The order stays
`pending` forever even though Stripe shows the payment as `succeeded` and
the customer sees a success message.

This branch (`webhook-handler`) adds `POST /webhooks/stripe`:

- Verifies the Stripe signature on every request using
  `STRIPE_WEBHOOK_SECRET` (rejects anything that doesn't verify).
- Listens for `payment_intent.succeeded`, reads `orderId` back out of the
  PaymentIntent's metadata, and updates the matching order to
  `status: "paid"` (also backfilling `paymentIntentId` now that it's known).

To test locally, forward events with the Stripe CLI:

```bash
stripe listen --forward-to localhost:4242/webhooks/stripe
```

Copy the `whsec_...` signing secret it prints into `STRIPE_WEBHOOK_SECRET`
in `.env`.
