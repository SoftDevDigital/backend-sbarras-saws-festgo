/**
 * Agrega Agua (ag1) al carrito, factura en Barra 5 y muestra el resumen del admin.
 * Uso: node scripts/venta-agua-barra5.js
 */

const BASE = 'https://api.festgogest.com';

const TOKEN_VENDEDOR =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDYxYTRmMi0zNmJkLTRhM2EtYmNkYy1lZWNjZjk3NWU2ZjgiLCJlbWFpbCI6ImVzdGFuaXNsYW92YWxkZXo3OEBnbWFpbC5jb20iLCJuYW1lIjoiZXN0YW5pc2xhbyIsInJvbGUiOiJiYXJ0ZW5kZXIiLCJpYXQiOjE3NzAxNTk4NTgsImV4cCI6MTc3MDI0NjI1OH0.HBjuCrMmNM01KnmoG3kbszHP3AXHJD6IHrcz-w5LnWY';

const TOKEN_ADMIN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxOWU3MDM4MS1kZGYyLTQxNWYtODY5ZS0xNDM2ZmI0ZDhhNDEiLCJlbWFpbCI6ImFkbWluQGdyb292ZWJhci5jb20iLCJuYW1lIjoiQWRtaW5Vc2VyIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcwMTU5OTg5LCJleHAiOjE3NzAyNDYzODl9.p063np9S4cmB6pFfGBXJQU8FLnQeHrhcTS1OwC0I22U';

async function request(method, path, body, token) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('=== 1. Obtener Barra 5 (admin) ===');
  const bars = await request('GET', '/bars', null, TOKEN_ADMIN);
  const barra5 = Array.isArray(bars) && bars.find((b) => (b.name || '').toLowerCase().includes('barra 5'));
  if (!barra5) {
    console.log('Barras:', bars?.map((b) => ({ id: b.id, name: b.name })));
    throw new Error('No se encontró "Barra 5".');
  }
  const barId = barra5.id;
  const eventId = barra5.eventId;
  console.log('Barra 5:', { barId, name: barra5.name });

  console.log('\n=== 2. Agregar ag1 (Agua) al carrito (vendedor) ===');
  const inputRes = await request('POST', '/bartender/input', { input: 'ag1', eventId }, TOKEN_VENDEDOR);
  if (!inputRes.success) {
    throw new Error(inputRes.error || inputRes.message || 'Error agregando al carrito');
  }
  console.log('OK:', inputRes.message);

  console.log('\n=== 3. Facturar en Barra 5 - efectivo (vendedor) ===');
  const confirmRes = await request(
    'POST',
    '/bartender/cart/confirm',
    { barId, paymentMethod: 'cash', customerName: 'Cliente' },
    TOKEN_VENDEDOR
  );
  if (!confirmRes.success) {
    throw new Error(confirmRes.error || confirmRes.message || 'Error al facturar');
  }
  console.log('OK:', confirmRes.message);
  console.log('Ticket ID:', confirmRes.ticketId);

  console.log('\n=== 4. Resumen de ventas Barra 5 (admin) ===');
  const summary = await request('GET', `/bars/${barId}/sales-summary`, null, TOKEN_ADMIN);
  const productsSold = summary?.productsSold || [];
  const hasAgua = productsSold.some((p) => (p.productName || '').toLowerCase().includes('agua'));

  console.log('Total tickets:', summary?.totalTickets);
  console.log('Ventas (paid):', summary?.totalSales);
  console.log('Productos vendidos:', productsSold.length);
  if (productsSold.length > 0) {
    console.log('Productos:', productsSold.map((p) => ({ name: p.productName, quantitySold: p.quantitySold, revenue: p.revenue })));
  }

  if (hasAgua) {
    console.log('\n--- OK: Agua aparece en el resumen de ventas de Barra 5.');
  } else {
    console.log('\n--- Agua no aparece aún en el listado (puede ser paginación o caché). Revisa el dashboard del admin.');
  }
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
