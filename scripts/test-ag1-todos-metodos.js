/**
 * Prueba ag1 (Agua) con todos los métodos de pago en localhost:3001.
 * Uso: node scripts/test-ag1-todos-metodos.js
 */

const BASE = process.env.BASE_URL || 'http://localhost:3001';

const TOKEN_ADMIN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxOWU3MDM4MS1kZGYyLTQxNWYtODY5ZS0xNDM2ZmI0ZDhhNDEiLCJlbWFpbCI6ImFkbWluQGdyb292ZWJhci5jb20iLCJuYW1lIjoiQWRtaW5Vc2VyIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcwMTYyNTk4LCJleHAiOjE3NzA3NjczOTh9.9Ea_nbLazgmivATBOWcPmHS4AFrqY5ShPZ-WYK_DFQk';

const TOKEN_VENDEDOR =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDYxYTRmMi0zNmJkLTRhM2EtYmNkYy1lZWNjZjk3NWU2ZjgiLCJlbWFpbCI6ImVzdGFuaXNsYW92YWxkZXo3OEBnbWFpbC5jb20iLCJuYW1lIjoiZXN0YW5pc2xhbyIsInJvbGUiOiJiYXJ0ZW5kZXIiLCJpYXQiOjE3NzAxNjI1NzIsImV4cCI6MTc3MDc2NzM3Mn0.SCzJRUoOMJfTZrEN5eNdtKx-kpr3XcPelGb2Db5glso';

const METODOS_PAGO = ['cash', 'card', 'transfer', 'administrator', 'dj'];

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
  console.log('Base URL:', BASE);
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

  for (const metodo of METODOS_PAGO) {
    console.log(`\n=== 2. Método: ${metodo.toUpperCase()} — agregar ag1 y facturar ===`);
    const inputRes = await request('POST', '/bartender/input', { input: 'ag1', eventId }, TOKEN_VENDEDOR);
    if (!inputRes.success) {
      console.log('  Input: FALLO', inputRes.error || inputRes.message);
      continue;
    }
    console.log('  Input: OK', inputRes.message);

    const confirmRes = await request(
      'POST',
      '/bartender/cart/confirm',
      { barId, paymentMethod: metodo, customerName: 'Cliente' },
      TOKEN_VENDEDOR
    );
    if (!confirmRes.success) {
      console.log('  Confirm: FALLO', confirmRes.error || confirmRes.message);
      continue;
    }
    console.log('  Confirm: OK — Ticket', confirmRes.ticketId);
  }

  console.log('\n=== 3. Resumen de ventas Barra 5 (admin) ===');
  const summary = await request('GET', `/bars/${barId}/sales-summary`, null, TOKEN_ADMIN);
  const productsSold = summary?.productsSold || [];
  const salesByMethod = summary?.salesByPaymentMethod || {};
  const totalSales = summary?.totalSales ?? 0;
  const totalTickets = summary?.totalTickets ?? 0;

  console.log('Total tickets:', totalTickets);
  console.log('Ventas (paid):', totalSales);
  console.log('Productos vendidos:', productsSold.length);
  console.log('Productos:', productsSold.map((p) => ({ name: p.productName, quantitySold: p.quantitySold, revenue: p.revenue })));
  console.log('Ventas por método:', salesByMethod);

  const todosOk = METODOS_PAGO.every((m) => (salesByMethod[m] ?? 0) > 0);
  const hasAgua = productsSold.some((p) => (p.productName || '').toLowerCase().includes('agua'));

  if (todosOk && hasAgua) {
    console.log('\n--- OK: Agua vendida con todos los métodos y visible en el resumen del admin.');
  } else if (!todosOk) {
    console.log('\n--- Revisar: algún método de pago no tiene venta en el resumen.');
  } else {
    console.log('\n--- Revisar: Agua no aparece en productos vendidos.');
  }
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
