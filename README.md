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

## Known issue (main branch)

`main` only implements the checkout flow:

1. `POST /api/create-checkout-session` creates a Stripe Checkout Session
   (which creates a `PaymentIntent` under the hood) and an `orders` document
   in MongoDB with `status: "pending"`, storing the `paymentIntentId`.
2. The browser redirects to Stripe's hosted Checkout page. On completion,
   Stripe redirects back to `success.html`, which shows a success message
   purely because the redirect happened — it never asks the backend whether
   the order was actually marked `paid`.

There is no `/webhooks/stripe` endpoint, so the backend is never notified
when the `PaymentIntent` actually succeeds. The order stays `pending`
forever even though Stripe shows the payment as `succeeded` and the
customer sees a success message.

See the `webhook-handler` branch for the fix (adds Stripe webhook handling
that listens for `payment_intent.succeeded` and updates the matching order's
`status` to `paid`).
