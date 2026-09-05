async function handleClick() {
  const button = document.getElementById('checkout-button');
  button.disabled = true;

  try {
    const res = await fetch('/api/create-checkout-session', { method: 'POST' });
    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Failed to start checkout');
    }

    // Redirect to Stripe's hosted Checkout page.
    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    alert('Something went wrong starting checkout. Check the server logs.');
    button.disabled = false;
  }
}

function formatAmount(order) {
  return `$${(order.amount / 100).toFixed(2)} ${order.currency.toUpperCase()}`;
}

async function loadOrders() {
  const res = await fetch('/api/orders');
  const orders = await res.json();

  const table = document.getElementById('orders-table');
  const empty = document.getElementById('orders-empty');
  const body = document.getElementById('orders-body');

  if (!orders.length) {
    table.hidden = true;
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  table.hidden = false;
  body.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td title="${order.orderId}">${order.orderId.slice(0, 8)}…</td>
          <td>${formatAmount(order)}</td>
          <td class="status-${order.status}">${order.status}</td>
          <td>${new Date(order.createdAt).toLocaleString()}</td>
        </tr>
      `
    )
    .join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('checkout-button').addEventListener('click', handleClick);
  document.getElementById('refresh-orders').addEventListener('click', loadOrders);
  loadOrders();
});
