/**
 * Crea el producto "Agua" con código "AG" para usarlo en la barra (input "ag1" = 1 unidad).
 * Uso: node scripts/create-product-agua.js
 *      ADMIN_TOKEN=tu_token node scripts/create-product-agua.js  (para API remota)
 */

const BASE = process.env.BASE_URL || 'https://api.festgogest.com';
const ADMIN_TOKEN =
  process.env.ADMIN_TOKEN ||
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
  console.log('Creando producto Agua (código AG) para input "ag1" en la barra...');
  console.log('Base URL:', BASE);

  const product = {
    name: 'Agua',
    code: 'AG',
    description: 'Agua',
    price: 500,
    cost: 0,
    category: 'Bebidas',
    unit: 'unidad',
    stock: 100,
    minStock: 5,
    taxRate: 0,
    available: true,
    active: true,
  };

  const created = await request('POST', '/products', product, ADMIN_TOKEN);
  console.log('Producto creado:', created.id, created.name, 'código:', created.code);
  console.log('En la barra usa: ag1 (1 unidad), ag2 (2 unidades), etc.');
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
