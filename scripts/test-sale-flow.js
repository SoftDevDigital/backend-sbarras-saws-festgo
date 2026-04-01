/**
 * Script para probar el flujo de venta con TODOS los métodos de pago.
 * Uso: node scripts/test-sale-flow.js
 *
 * Para cada método (cash, card, transfer, administrator, dj):
 *   - Agrega ft1 al carrito, confirma con ese método
 *   - Luego verifica en el resumen de la barra que la venta cuenta
 */

const BASE = 'https://api.festgogest.com';

const TOKEN_VENDEDOR =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDYxYTRmMi0zNmJkLTRhM2EtYmNkYy1lZWNjZjk3NWU2ZjgiLCJlbWFpbCI6ImVzdGFuaXNsYW92YWxkZXo3OEBnbWFpbC5jb20iLCJuYW1lIjoiZXN0YW5pc2xhbyIsInJvbGUiOiJiYXJ0ZW5kZXIiLCJpYXQiOjE3NzAxNTk4NTgsImV4cCI6MTc3MDI0NjI1OH0.HBjuCrMmNM01KnmoG3kbszHP3AXHJD6IHrcz-w5LnWY';

const TOKEN_ADMIN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxOWU3MDM4MS1kZGYyLTQxNWYtODY5ZS0xNDM2ZmI0ZDhhNDEiLCJlbWFpbCI6ImFkbWluQGdyb292ZWJhci5jb20iLCJuYW1lIjoiQWRtaW5Vc2VyIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcwMTU5OTg5LCJleHAiOjE3NzAyNDYzODl9.p063np9S4cmB6pFfGBXJQU8FLnQeHrhcTS1OwC0I22U';

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

  const resultados = [];

  for (const metodo of METODOS_PAGO) {
    console.log(`\n=== 2. Método de pago: ${metodo.toUpperCase()} ===`);
    const inputRes = await request('POST', '/bartender/input', { input: 'ft1', eventId }, TOKEN_VENDEDOR);
    if (!inputRes.success) {
      console.log('  Input: FALLO', inputRes.error || inputRes.message);
      resultados.push({ metodo, venta: false, confirm: false, error: inputRes.error || inputRes.message });
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
      resultados.push({ metodo, venta: true, confirm: false, error: confirmRes.error || confirmRes.message });
      continue;
    }
    console.log('  Confirm: OK — Ticket', confirmRes.ticketId);
    resultados.push({ metodo, venta: true, confirm: true, ticketId: confirmRes.ticketId });
  }

  console.log('\n=== 3. Resumen de ventas Barra 5 (admin) ===');
  const summary = await request('GET', `/bars/${barId}/sales-summary`, null, TOKEN_ADMIN);
  const productsSold = summary?.productsSold || [];
  const salesByMethod = summary?.salesByPaymentMethod || {};
  const totalSales = summary?.totalSales ?? 0;
  const totalTickets = summary?.totalTickets ?? 0;

  console.log('  Total tickets:', totalTickets);
  console.log('  Ventas (paid):', totalSales);
  console.log('  Productos vendidos:', productsSold.length);
  console.log('  Ventas por método:', salesByMethod);

  console.log('\n=== 4. Verificación por método ===');
  let todosOk = true;
  for (const r of resultados) {
    if (!r.confirm) {
      console.log(`  ${r.metodo}: FALLO (no se confirmó)`);
      todosOk = false;
      continue;
    }
    const revenue = salesByMethod[r.metodo];
    const ok = typeof revenue === 'number' && revenue > 0;
    if (!ok) {
      todosOk = false;
      console.log(`  ${r.metodo}: FALLO — no aparece venta en resumen (revenue: ${revenue})`);
    } else {
      console.log(`  ${r.metodo}: OK — revenue ${revenue}`);
    }
  }

  if (productsSold.length === 0) {
    console.log('\n  FALLO: No hay productos vendidos en el resumen.');
    todosOk = false;
  }

  if (todosOk) {
    console.log('\n--- TODOS LOS MÉTODOS DE PAGO FUNCIONAN: las ventas aparecen en el resumen de la barra.');
  } else {
    console.log('\n--- ALGUNOS MÉTODOS FALLARON: revisar arriba.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
