let stripe, elements, orderId;

async function initialize() {
  const configRes = await fetch('/api/config');
  const { publishableKey } = await configRes.json();
  stripe = Stripe(publishableKey);

  const intentRes = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 2000 }),
  });
  const { clientSecret, orderId: newOrderId } = await intentRes.json();
  orderId = newOrderId;

  elements = stripe.elements({ clientSecret });
  const paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');
}

async function handleSubmit(event) {
  event.preventDefault();
  setLoading(true);

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: window.location.href },
    redirect: 'if_required',
  });

  if (error) {
    showMessage(error.message);
  } else {
    // The customer sees this the instant Stripe confirms the charge
    // client-side — regardless of whether the backend ever hears about it.
    showMessage(`Payment successful! Order ${orderId} is being processed.`);
  }

  setLoading(false);
}

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

function setLoading(isLoading) {
  document.getElementById('submit').disabled = isLoading;
}

document.addEventListener('DOMContentLoaded', () => {
  initialize();
  document.getElementById('payment-form').addEventListener('submit', handleSubmit);
});
