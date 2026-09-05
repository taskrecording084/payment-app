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

Open http://localhost:4242 and complete a payment using a
[Stripe test card](https://stripe.com/docs/testing) (e.g. `4242 4242 4242 4242`,
any future expiry, any CVC).

## Known issue (main branch)

`main` only implements the checkout flow:

1. `POST /api/create-payment-intent` creates a Stripe `PaymentIntent` and an
   `orders` document in MongoDB with `status: "pending"`.
2. The client confirms the payment with Stripe.js and shows a success
   message as soon as Stripe confirms the charge.

There is no `/webhooks/stripe` endpoint, so the backend is never notified
when the `PaymentIntent` actually succeeds. The order stays `pending`
forever even though Stripe shows the payment as `succeeded` and the
customer sees a success message.

See the `webhook-handler` branch for the fix (adds Stripe webhook handling
that listens for `payment_intent.succeeded` and updates the matching order's
`status` to `paid`).
