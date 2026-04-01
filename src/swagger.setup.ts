import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * OpenAPI (Swagger UI) — solo documentación; no altera rutas ni lógica.
 * El plugin en nest-cli.json enriquece esquemas desde DTOs (class-validator).
 */
export function setupSwagger(
  app: INestApplication,
  _options: { port: number; env: string },
): void {
  const description = `
## Flujo recomendado (frontend)

1. **Login:** \`POST /auth/login\` → recibes \`token\` y \`user\`.
2. **Authorize:** en Swagger, botón **Authorize** → pega solo el token (sin \`Bearer \`).
3. **Rutas protegidas:** casi todas requieren JWT; además **roles** (\`admin\` / \`bartender\`). Si el rol no alcanza → \`403\`.

## Roles

| Rol | Uso típico |
|-----|------------|
| \`admin\` | CRUD de eventos, barras, listas de precios, productos, reportes |
| \`bartender\` | POS: carrito (\`/bartender\`), tickets, consultas de productos/barras/eventos según ruta |

## Listas de precios y barras (importante)

- **Un producto del catálogo solo puede estar en una lista de precios** (no se duplica entre listas).
- Las ventas usan la lista asignada a la barra; cada ticket guarda **snapshot** (\`priceListId\`, \`priceListName\`).

### Dos formas válidas de enlazar barra ↔ lista

| | Qué haces |
|---|-----------|
| **Opción 1** | La lista **ya existe**. Al **crear o editar la barra** (\`POST /bars\`, \`PATCH /bars/:id\`) envías \`priceListId\`. |
| **Opción 2** | Creas o editas la **lista** y envías \`barId\` en \`POST /price-lists\` o \`PATCH /price-lists/:id\`. El backend asigna \`priceListId\` en esa barra. Si no mandas \`eventId\` en el POST de la lista, se toma el de la barra. |

- **GET** \`/price-lists/meta/unassigned-product-ids\`: productos del catálogo que aún no están en ninguna lista.

## Errores habituales

| Código | Significado |
|--------|-------------|
| \`400\` | Validación (body/query); revisa \`errors[]\` |
| \`401\` | Token ausente o inválido |
| \`403\` | Rol insuficiente |
| \`404\` | Recurso no existe |
| \`409\` | Conflicto (ej. producto ya en otra lista) |

## Convención de datos

- IDs suelen ser **UUID** (string).
- Fechas en query/body como **ISO 8601** cuando aplique.
- Header: \`Authorization: Bearer <token>\`.

## Mapa de prefijos

| Prefijo | Contenido |
|---------|-----------|
| \`/auth\` | Login, registro, usuarios (admin) |
| \`/events\` | Eventos |
| \`/bars\` | Barras; **opción 1:** \`priceListId\` al crear/editar barra; \`.../sales-summary\` reporte |
| \`/price-lists\` | Listas; **opción 2:** \`barId\` en POST/PATCH; \`meta/unassigned-product-ids\`; \`:id/items\` |
| \`/products\` | Catálogo; \`?bar_id=\` y \`?keys_only=true\` |
| \`/tickets\` | Tickets, búsqueda, stats, impresión |
| \`/bartender\` | Input código+qty, carrito, confirmar venta |
| \`/expenses\` | Gastos |
| \`/stock\` | Stock, movimientos, informes |
| \`/employees\` | Empleados / asignaciones (legacy) |
| \`/admin\` | Dashboard, reportes, auditoría, ajustes |
| \`/admin/printer\` | Impresora térmica |
`.trim();

  const config = new DocumentBuilder()
    .setTitle('Sistema de Barras — API REST')
    .setDescription(description)
    .setVersion('1.0')
    .addServer(
      '/',
      'Mismo host y puerto donde corre la API (usa Try it out desde /docs)',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token en el JSON de `POST /auth/login` o `POST /auth/register` (campo `token`). No incluyas la palabra Bearer al pegar en Authorize.',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Login, registro y gestión de usuarios')
    .addTag('App', 'Comprobación de API viva')
    .addTag('events', 'Eventos')
    .addTag('bars', 'Barras y reporte de ventas por barra')
    .addTag('price-lists', 'Listas de precios (líneas por producto)')
    .addTag('products', 'Catálogo y teclas rápidas')
    .addTag('tickets', 'Tickets, cobros e impresión')
    .addTag('bartender', 'Carrito e input del bartender (POS)')
    .addTag('expenses', 'Gastos')
    .addTag('stock', 'Stock y movimientos')
    .addTag('employees', 'Empleados y asignaciones')
    .addTag('admin', 'Panel: métricas, reportes, auditoría, exportaciones')
    .addTag('printer', 'Impresora térmica (ruta /admin/printer)')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
      syntaxHighlight: { activate: true, theme: 'monokai' },
      displayRequestDuration: true,
    },
    customSiteTitle: 'API · Sistema de Barras',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 1.75rem; }
      .swagger-ui .info .markdown p { margin: 0.5em 0; }
    `,
  });
}
