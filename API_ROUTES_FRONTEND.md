# SISTEMA DE BARRAS GROOVE - DOCUMENTACIÓN API PARA FRONTEND

## INFORMACIÓN GENERAL

- **Base URL:** http://localhost:3001
- **Autenticación:** JWT Bearer Token en header `Authorization: Bearer {token}`
- **Roles de autenticación:** `admin`, `bartender`
- **Formato de fechas:** ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- **IDs:** UUIDs generados automáticamente
- **Moneda:** ARS (Pesos Argentinos)

## ESTRUCTURA DEL TOKEN JWT

```json
{
  "sub": "user-id",
  "email": "user@email.com",
  "name": "User Name",
  "role": "admin" | "bartender",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## MÓDULO DE AUTENTICACIÓN

**Prefix:** `/auth`

### POST /auth/register
Registrar nuevo usuario (público, no requiere token)

**Body:**
```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "Nombre Usuario",
  "role": "admin" | "bartender",
  "document": "12345678",
  "contact": "contact@example.com",
  "employeeRole": "bartender" | "manager" | "cashier"
}
```

**Campos obligatorios:** `email`, `password`, `name`  
**Campos opcionales:** `role` (default: bartender), `document`, `contact`, `employeeRole`

**Respuesta 201 Created:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nombre Usuario",
    "role": "bartender",
    "document": "12345678",
    "contact": "contact@example.com",
    "employeeRole": "bartender",
    "createdAt": "2025-10-08T00:00:00.000Z",
    "updatedAt": "2025-10-08T00:00:00.000Z"
  }
}
```

**Errores:**
- 400: Validación fallida
- 409: Email ya existe

---

### POST /auth/login
Iniciar sesión (público)

**Body:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Respuesta 200 OK:** Igual a `/auth/register`

**Errores:**
- 401: Credenciales incorrectas

---

### GET /auth/users
Listar usuarios (admin)

**Roles:** `admin`

**Query params:**
- `search?: string` - Buscar por nombre o email
- `role?: "admin" | "bartender"` - Filtrar por rol

**Respuesta 200 OK:** Array de `Omit<IUser, "password">[]`

---

### GET /auth/users/:id
Obtener usuario por ID (admin)

**Roles:** `admin`

**Respuesta 200 OK:** `Omit<IUser, "password">`

---

### PATCH /auth/users/:id/role
Actualizar rol de usuario (admin)

**Roles:** `admin`

**Body:**
```json
{
  "role": "admin" | "bartender"
}
```

**Respuesta 200 OK:** `Omit<IUser, "password">`

---

### DELETE /auth/users/:id
Eliminar usuario (admin)

**Roles:** `admin`

**Respuesta:** 204 No Content

---

## MÓDULO DE PRODUCTOS

**Prefix:** `/products`

### POST /products
Crear producto (admin)

**Roles:** `admin`

**Body:**
```json
{
  "name": "Coca Cola 500ml",
  "description": "Bebida gaseosa",
  "price": 2500,
  "cost": 1500,
  "quickKey": "C1",
  "code": "CCC",
  "stock": 100,
  "minStock": 10,
  "unit": "unidad",
  "category": "bebidas",
  "barcode": "7790001234567",
  "taxRate": 0,
  "available": true,
  "active": true
}
```

**Campos obligatorios:** `name`, `price`, `code`  
**Campos opcionales:** resto (tienen valores por defecto)

**Validaciones:**
- `code`: 2-3 letras mayúsculas (ej: CC, CCC)
- `price`, `cost`: números >= 0 con max 2 decimales
- `stock`, `minStock`: enteros >= 0

**Respuesta 201 Created:** `IProduct`

---

### GET /products
Listar productos (admin, bartender)

**Roles:** `admin`, `bartender`

**Query params:**
- `event_id?: string`
- `bar_id?: string`
- `active?: boolean`
- `search?: string` - Buscar por nombre/descripción
- `keys_only?: "true" | "false"` - Si "true" devuelve solo `IProductKey[]`
- `status?: "active" | "inactive" | "all"`
- `sort_by?: "name" | "price" | "created_at" | "updated_at" | "stock" | "category"`
- `sort_order?: "asc" | "desc"`
- `limit?: number` (1-1000)
- `offset?: number`
- `category?: string`
- `low_stock?: boolean`
- `out_of_stock?: boolean`

**Respuesta 200 OK:**
- Si `keys_only="true"`: `IProductKey[]`
- Si no: `IProduct[]`

---

### GET /products/:id
Obtener producto por ID (admin, bartender)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `IProduct`

**Errores:**
- 404: Producto no encontrado

---

### GET /products/stats/summary
Estadísticas de productos (admin)

**Roles:** `admin`

**Respuesta 200 OK:**
```json
{
  "total": 50,
  "active": 45,
  "inactive": 5,
  "withKeys": 30,
  "lowStock": 8,
  "outOfStock": 2,
  "totalStockValue": 500000
}
```

---

### GET /products/stock/alerts
Alertas de stock bajo (admin)

**Roles:** `admin`

**Respuesta 200 OK:** `IProductStockAlert[]`

---

### PATCH /products/:id
Actualizar producto (admin)

**Roles:** `admin`

**Body:** Cualquier campo de `UpdateProductDto` (todos opcionales)

**Respuesta 200 OK:** `IProduct`

---

### PATCH /products/:id/stock
Actualizar stock de producto (admin)

**Roles:** `admin`

**Body EXACTO:**
```json
{
  "quantity": 150,
  "type": "add" | "subtract" | "set",
  "reason": "Motivo opcional"
}
```

**Validaciones:**
- `quantity` >= 0
- `type` debe ser: "add", "subtract" o "set"
- Si `type="subtract"` y stock insuficiente → error 400

**Respuesta 200 OK:** `IProduct` con stock actualizado

**Errores:**
- 400: Validación fallida o stock insuficiente

---

### DELETE /products/:id
Eliminar producto (admin)

**Roles:** `admin`

**Respuesta 200 OK:**
```json
{
  "message": "Product deleted successfully",
  "deletedProduct": { /* IProduct */ }
}
```

---

## MÓDULO DE EVENTOS

**Prefix:** `/events`

### POST /events
Crear evento (admin)

**Roles:** `admin`

**Body:**
```json
{
  "name": "Fiesta de Halloween",
  "startDate": "2025-10-31T20:00:00.000Z",
  "endDate": "2025-11-01T04:00:00.000Z"
}
```

**Respuesta 201 Created:** `IEvent`

---

### GET /events
Listar eventos (admin, bartender)

**Roles:** `admin`, `bartender`

**Query params:**
- `status?: "active" | "closed"`
- `search?: string`

**Respuesta 200 OK:** `IEvent[]`

---

### GET /events/active
Obtener eventos activos (admin, bartender)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `IEvent[]`

---

### GET /events/closed
Obtener eventos cerrados (admin, bartender)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `IEvent[]`

---

### GET /events/status/:status
Obtener eventos por estado (admin, bartender)

**Roles:** `admin`, `bartender`

**Params:** `status = "active" | "closed"`

**Respuesta 200 OK:** `IEvent[]`

---

### GET /events/:id
Obtener evento por ID (admin, bartender)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `IEvent`

---

### PATCH /events/:id
Actualizar evento (admin)

**Roles:** `admin`

**Body (todos opcionales):**
```json
{
  "name": "string",
  "startDate": "ISO",
  "endDate": "ISO",
  "status": "active" | "closed"
}
```

**Respuesta 200 OK:** `IEvent`

---

### PATCH /events/:id/status/:status
Cambiar estado de evento (admin)

**Roles:** `admin`

**Params:** `status = "active" | "closed"`

**Respuesta 200 OK:** `IEvent`

---

### DELETE /events/:id
Eliminar evento (admin)

**Roles:** `admin`

**Respuesta 200 OK:**
```json
{
  "message": "Event deleted successfully",
  "deletedEvent": { /* IEvent */ }
}
```

---

## MÓDULO DE BARRAS

**Prefix:** `/bars`

### POST /bars
Crear barra (admin)

**Roles:** `admin`

**Body:**
```json
{
  "name": "Barra Principal",
  "eventId": "event-uuid",
  "printer": "Epson_TM-T20"
}
```

**Respuesta 201 Created:** `IBar`

---

### GET /bars
Listar barras (admin, bartender)

**Roles:** `admin`, `bartender`

**Query params:**
- `eventId?: string`
- `status?: "active" | "closed"`
- `search?: string`

**Respuesta 200 OK:** `IBar[]`

---

### GET /bars/event/:eventId
Obtener barras de un evento (admin, bartender)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `IBar[]`

---

### GET /bars/status/:status
Obtener barras por estado (admin, bartender)

**Roles:** `admin`, `bartender`

**Params:** `status = "active" | "closed"`

**Respuesta 200 OK:** `IBar[]`

---

### GET /bars/:id/sales-summary
**NUEVO** - Resumen completo de ventas de una barra (admin)

**Roles:** `admin`

**Descripción:** Obtiene estadísticas detalladas de ventas, productos vendidos, ventas por bartender, métodos de pago y distribución horaria. Los productos vendidos se muestran tanto en total como desglosados por método de pago (cash, card, transfer, administrator, dj).

**Respuesta 200 OK:**
```json
{
  "bar": {
    "id": "uuid",
    "name": "Barra Principal",
    "eventId": "uuid",
    "printer": "Epson_TM-T20",
    "status": "active"
  },
  "totalSales": 25,
  "totalTickets": 30,
  "totalRevenue": 150000,
  "averageTicketValue": 5000,
  "productsSold": [
    {
      "productId": "uuid",
      "productName": "Cerveza Corona",
      "quantitySold": 45,
      "revenue": 180000,
      "percentage": 45.5
    }
  ],
  "productsSoldByPaymentMethod": {
    "cash": [
      {
        "productId": "uuid",
        "productName": "Cerveza Corona",
        "quantitySold": 30,
        "revenue": 120000,
        "percentage": 50.0
      }
    ],
    "card": [
      {
        "productId": "uuid",
        "productName": "Cerveza Corona",
        "quantitySold": 10,
        "revenue": 40000,
        "percentage": 40.0
      }
    ],
    "transfer": [
      {
        "productId": "uuid",
        "productName": "Cerveza Corona",
        "quantitySold": 5,
        "revenue": 20000,
        "percentage": 50.0
      }
    ],
    "administrator": [
      {
        "productId": "uuid",
        "productName": "Cerveza Corona",
        "quantitySold": 3,
        "revenue": 12000,
        "percentage": 60.0
      }
    ]
  },
  "salesByUser": [
    {
      "userId": "uuid",
      "userName": "Bartender Nuevo",
      "ticketCount": 20,
      "totalSales": 100000
    }
  ],
  "salesByPaymentMethod": {
    "cash": 90000,
    "card": 50000,
    "transfer": 10000,
    "administrator": 20000
  },
  "hourlyDistribution": [
    {
      "hour": "20:00",
      "ticketCount": 8,
      "revenue": 40000
    },
    {
      "hour": "21:00",
      "ticketCount": 12,
      "revenue": 60000
    }
  ]
}
```

---

### GET /bars/:id
Obtener barra por ID (admin, bartender)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `IBar`

---

### PATCH /bars/:id
Actualizar barra (admin)

**Roles:** `admin`

**Body (todos opcionales):**
```json
{
  "name": "string",
  "printer": "string",
  "status": "active" | "closed"
}
```

**Respuesta 200 OK:** `IBar`

---

### PATCH /bars/:id/status/:status
Cambiar estado de barra (admin)

**Roles:** `admin`

**Params:** `status = "active" | "closed"`

**Respuesta 200 OK:** `IBar`

---

### DELETE /bars/:id
Eliminar barra (admin)

**Roles:** `admin`

**Respuesta 200 OK:**
```json
{
  "message": "Bar deleted successfully",
  "deletedBar": { /* IBar */ }
}
```

---

## MÓDULO DE TICKETS

**Prefix:** `/tickets`

### POST /tickets
Crear ticket manualmente (admin, bartender)

**Roles:** `admin`, `bartender`

**Body:**
```json
{
  "barId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ],
  "customerName": "Cliente",
  "paymentMethod": "cash" | "card" | "transfer" | "administrator" | "dj",
  "notes": "Observaciones"
}
```

**Respuesta 201 Created:** `ITicket` con items incluidos

---

### GET /tickets/search
Buscar tickets (admin, bartender)

**Roles:** `admin`, `bartender`  
**Nota:** Bartenders solo ven sus propios tickets automáticamente

**Query params:**
- `userId?: uuid` - Filtrar por usuario (admin puede filtrar por cualquiera, bartender solo ve los suyos)
- `barId?: uuid`
- `eventId?: uuid`
- `status?: "open" | "paid" | "cancelled" | "refunded"`
- `paymentMethod?: "cash" | "card" | "transfer" | "administrator" | "dj"`
- `dateFrom?: ISO`
- `dateTo?: ISO`
- `printed?: boolean`
- `search?: string` - Buscar por nombre de usuario o barra

**Respuesta 200 OK:** `ITicket[]` con items incluidos

---

### GET /tickets/stats
Estadísticas de tickets (admin)

**Roles:** `admin`

**Query params:** `TicketStatsQueryDto` (userId?, barId?, eventId?, dateFrom?, dateTo?, topProducts?)

**Respuesta 200 OK:** `ITicketStats`

---

### GET /tickets/:id
Obtener ticket por ID (admin, bartender solo propios)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `ITicket` con items

**Errores:**
- 400: Bartender intentando acceder a ticket ajeno
- 404: Ticket no encontrado

---

### PATCH /tickets/:id
Actualizar ticket / Agregar item / Procesar pago (admin, bartender solo propios)

**Roles:** `admin`, `bartender`

**Body (operación depende de los campos enviados):**

**Opción 1 - Procesar pago:**
```json
{
  "paymentMethod": "cash",
  "paidAmount": 15000
}
```

**Opción 2 - Agregar item:**
```json
{
  "productId": "uuid",
  "quantity": 2
}
```

**Opción 3 - Actualizar ticket:**
```json
{
  "notes": "string",
  "status": "open" | "paid" | "cancelled" | "refunded"
}
```

**Respuesta 200 OK:** `ITicket` o `ITicketItem` según operación

---

### DELETE /tickets/:id
Eliminar ticket o item (admin, bartender solo propios)

**Roles:** `admin`, `bartender`

**Query params:**
- `itemId?: uuid` - Si se proporciona, elimina solo ese item del ticket

**Respuesta:** 204 No Content

---

### GET /tickets/:id/print
Obtener formato de impresión (admin, bartender solo propios)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `ITicketPrintFormat` con toda la info formateada

---

### PATCH /tickets/:id/print
Marcar ticket como impreso (admin, bartender solo propios)

**Roles:** `admin`, `bartender`

**Respuesta:** 200 OK (vacío)

---

## MÓDULO DE CARRITO (BARTENDER)

**Prefix:** `/bartender`

**Descripción:** Sistema simplificado para que bartenders ingresen códigos de productos y generen tickets.

### POST /bartender/input
Agregar o actualizar producto en el carrito por código

**Roles:** `bartender`

**Body:**
```json
{
  "input": "CCC2",
  "eventId": "event-uuid"
}
```

**Formato de input:** `CODIGO + CANTIDAD` (ej: CCC2 = 2 Coca Colas, PAP1 = 1 Papas)

**IMPORTANTE:** Si el producto ya existe en el carrito, **REEMPLAZA** la cantidad (no suma). Esto facilita el uso: si el cliente cambia de opinión, el bartender solo pone la cantidad nueva sin pensar en lo que ya había.

**Respuesta 200 OK (éxito):**
```json
{
  "success": true,
  "message": "2x Coca Cola 500ml agregado al carrito",
  "product": {
    "name": "Coca Cola 500ml",
    "code": "CCC",
    "price": 2500,
    "quantity": 2,
    "total": 5000
  },
  "cartSummary": {
    "totalItems": 2,
    "totalQuantity": 5,
    "subtotal": 15000,
    "tax": 0,
    "total": 15000,
    "items": [ /* ICartItem[] */ ]
  }
}
```

**Respuesta 200 OK (error pero devuelve carrito):**
```json
{
  "success": false,
  "message": "Producto con código XXX no encontrado",
  "error": "Producto con código XXX no encontrado",
  "cartSummary": {
    "totalItems": 2,
    "totalQuantity": 5,
    "subtotal": 15000,
    "tax": 0,
    "total": 15000,
    "items": [ /* ICartItem[] */ ]
  }
}
```

**Nota importante:** Aunque haya error (código inválido, stock insuficiente, etc.), **siempre devuelve el carrito actual** para que el bartender vea qué tiene agregado.

**Errores:**
- 400: Formato inválido o stock insuficiente
- 404: Producto con ese código no encontrado

---

### GET /bartender/cart
Ver carrito actual del bartender

**Roles:** `bartender`

**Descripción:** Cada bartender tiene su propio carrito identificado por su token JWT. El carrito está en memoria y se pierde al reiniciar el servidor.

**Respuesta 200 OK:**
```json
{
  "totalItems": 3,
  "totalQuantity": 6,
  "subtotal": 17500,
  "tax": 0,
  "total": 17500,
  "items": [
    {
      "productId": "uuid",
      "productName": "Coca Cola 500ml",
      "productCode": "CCC",
      "price": 2500,
      "quantity": 2,
      "total": 5000,
      "unit": "unidad"
    }
  ]
}
```

---

### DELETE /bartender/cart/item
**NUEVO** - Eliminar un item específico del carrito

**Roles:** `bartender`

**Descripción:** Permite eliminar un producto del carrito si el cliente se arrepiente.

**Body:**
```json
{
  "productId": "uuid"
}
```

**Respuesta 200 OK:**
```json
{
  "success": true,
  "message": "Coca Cola 500ml eliminado del carrito",
  "cartSummary": {
    "totalItems": 1,
    "totalQuantity": 3,
    "subtotal": 7500,
    "tax": 0,
    "total": 7500,
    "items": [ /* ICartItem[] */ ]
  }
}
```

**Notas:**
- Si el carrito queda vacío después de eliminar, se elimina automáticamente
- Devuelve el resumen actualizado del carrito

**Errores:**
- 404: Carrito no encontrado o producto no está en el carrito

---

### POST /bartender/cart/confirm
**ACTUALIZADO** - Confirmar carrito y generar ticket (devuelve formato de impresión)

**Roles:** `bartender`

**Body:**
```json
{
  "barId": "bar-uuid",
  "customerName": "Maria Gonzalez",
  "paymentMethod": "cash" | "card" | "transfer" | "administrator" | "dj",
  "notes": "Sin hielo en las bebidas"
}
```

**Campo obligatorio:** `barId`  
**Campos opcionales:** `customerName` (default: "Cliente"), `paymentMethod` (default: "cash"), `notes`

**Respuesta 201 Created:**
```json
{
  "success": true,
  "ticketId": "uuid",
  "message": "Ticket generado, impreso y stock actualizado correctamente",
  "printFormat": {
    "header": {
      "businessName": "GROOVE BAR SYSTEM",
      "businessAddress": "Av. Principal 123, Ciudad",
      "businessPhone": "+1 (555) 123-4567",
      "businessTaxId": "RUC: 12345678901",
      "businessEmail": "info@groovebar.com"
    },
    "ticket": {
      "ticketNumber": "TKT-ABC123",
      "userName": "Bartender Nuevo",
      "barName": "Barra Principal",
      "eventName": "Fiesta de Halloween",
      "date": "08/10/2025",
      "time": "04:15",
      "currency": "ARS"
    },
    "items": [
      {
        "name": "Cerveza Corona",
        "quantity": 3,
        "unitPrice": 4000,
        "subtotal": 12000,
        "taxRate": 0,
        "tax": 0
      }
    ],
    "totals": {
      "subtotal": 12000,
      "tax": 0,
      "total": 12000,
      "currency": "ARS"
    },
    "payment": {
      "method": "EFECTIVO",
      "paidAmount": 0,
      "changeAmount": 0,
      "currency": "ARS"
    },
    "footer": {
      "thankYouMessage": "¡Gracias por su compra!",
      "businessWebsite": "www.groovebar.com",
      "receiptFooter": "Sistema de Barras Groove"
    },
    "printerSettings": {
      "paperWidth": 80,
      "fontSize": 12,
      "fontFamily": "monospace"
    }
  }
}
```

**Efectos secundarios:**
- Genera el ticket en la base de datos
- Descuenta stock de los productos
- Marca el ticket como impreso
- Limpia el carrito del bartender

**Errores:**
- 400: Carrito vacío o stock insuficiente

---

### DELETE /bartender/cart
Limpiar carrito del bartender

**Roles:** `bartender`

**Respuesta 200 OK:**
```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

---

### GET /bartender/test
Endpoint de prueba para verificar autenticación

**Roles:** `bartender`

**Respuesta 200 OK:**
```json
{
  "message": "Bartender endpoint working",
  "timestamp": "ISO",
  "userId": "uuid"
}
```

---

## MÓDULO DE GASTOS

**Prefix:** `/expenses`

### POST /expenses
Crear gasto (admin)

**Roles:** `admin`

**Body:**
```json
{
  "eventId": "uuid",
  "type": "supplies" | "staff" | "equipment" | "other",
  "amount": 5000,
  "description": "Compra de bebidas"
}
```

**Respuesta 201 Created:** `IExpense`

---

### GET /expenses
Listar gastos (admin, bartender)

**Roles:** `admin`, `bartender`

**Query params:**
- `eventId?: string`
- `type?: "supplies" | "staff" | "equipment" | "other"`
- `search?: string`
- `dateFrom?: ISO`
- `dateTo?: ISO`
- `sort_by?: "amount" | "type" | "createdAt" | "updatedAt"`
- `sort_order?: "asc" | "desc"`
- `limit?: number`
- `offset?: number`

**Respuesta 200 OK:** `IExpense[]`

---

### GET /expenses/stats
Estadísticas de gastos (admin)

**Roles:** `admin`

**Query params:**
- `eventId?: string`

**Respuesta 200 OK:**
```json
{
  "total": 100,
  "totalAmount": 500000,
  "averageAmount": 5000,
  "byType": {
    "supplies": { "count": 50, "totalAmount": 300000 },
    "staff": { "count": 30, "totalAmount": 150000 },
    "equipment": { "count": 15, "totalAmount": 40000 },
    "other": { "count": 5, "totalAmount": 10000 }
  }
}
```

---

### GET /expenses/:id
Obtener gasto por ID (admin)

**Roles:** `admin`

**Respuesta 200 OK:** `IExpense`

---

### PATCH /expenses/:id
Actualizar gasto (admin)

**Roles:** `admin`

**Body (todos opcionales):**
```json
{
  "amount": 6000,
  "description": "string",
  "type": "supplies" | "staff" | "equipment" | "other"
}
```

**Respuesta 200 OK:** `IExpense`

---

### DELETE /expenses/:id
Eliminar gasto (admin)

**Roles:** `admin`

**Respuesta 200 OK:**
```json
{
  "message": "Expense deleted successfully"
}
```

---

## MÓDULO DE STOCK

**Prefix:** `/stock`

**Descripción:** Gestión de stock por barras, movimientos, transferencias y alertas.

### POST /stock/assign
Asignar stock a una barra (admin)

**Roles:** `admin`

**Body:**
```json
{
  "productId": "uuid",
  "barId": "uuid",
  "eventId": "uuid",
  "type": "initial" | "replenish" | "transfer" | "adjustment",
  "quantity": 50,
  "reason": "Stock inicial"
}
```

**Respuesta 201 Created:** `IStockMovement`

---

### POST /stock/move
Mover stock entre barras (admin)

**Roles:** `admin`

**Body:** `CreateStockTransferDto`

**Respuesta 201 Created:** `IStockTransfer`

---

### GET /stock/search
Búsqueda unificada de stock (admin, bartender)

**Roles:** `admin`, `bartender`

**Descripción:** Endpoint multipropósito que retorna diferentes tipos de datos según los parámetros.

**Query params:**
- `type?: "movements" | "alerts" | "transfers"` - Tipo de búsqueda
- `barId?: uuid`
- `eventId?: uuid`
- `productId?: uuid`
- `status?: string`
- `lowStock?: boolean`
- `outOfStock?: boolean`
- `transferId?: uuid`
- `alertId?: uuid`

**Respuesta 200 OK:** `IBarStock[]` | `IStockMovement[]` | `IStockAlert[]` | `IStockTransfer[]`

**Lógica de respuesta:**
- Si `transferId` → retorna transferencias
- Si `alertId` → retorna alertas  
- Si `type="movements"` → retorna movimientos
- Si `type="alerts"` → retorna alertas
- Si `type="transfers"` → retorna transferencias
- Por defecto → retorna stock por barra

---

### GET /stock/info
Información agregada de stock (admin, bartender)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:** `IStockReport` o `IStockStats`

---

### PATCH /stock/:id
Actualizar movimiento de stock (admin)

**Roles:** `admin`

**Body:** `UpdateStockMovementDto`

**Respuesta 200 OK:** `IStockMovement`

---

### DELETE /stock/:id
Eliminar movimiento de stock (admin)

**Roles:** `admin`

**Respuesta:** 200 OK con mensaje

---

### POST /stock/bulk
Operaciones masivas de stock (admin)

**Roles:** `admin`

**Body:**
```json
{
  "operation": "assign" | "replenish" | "adjust" | "close",
  "eventId": "uuid",
  "barId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 50,
      "reason": "string"
    }
  ]
}
```

**Respuesta 201 Created:** Resultado de operaciones

---

## MÓDULO ADMINISTRATIVO

**Prefix:** `/admin`

### GET /admin/dashboard
Dashboard con métricas generales (admin)

**Roles:** `admin`

**Query params:**
- `period?: "today" | "week" | "month" | "quarter" | "year"`
- `dateFrom?: ISO`
- `dateTo?: ISO`
- `eventId?: string`

**Respuesta 200 OK:** `IDashboardMetrics`

---

### GET /admin/reports
Generar reportes (admin)

**Roles:** `admin`

**Query params:**
- `type?: string`
- `format?: string`
- `dateFrom?: string`
- `dateTo?: string`
- `eventId?: string`
- `userId?: string`
- `status?: string`

**Respuesta 200 OK:** `IReport`

---

### GET /admin/audit
Logs de auditoría (admin)

**Roles:** `admin`

**Query params:**
- `userId?: string`
- `action?: string`
- `resource?: string`
- `dateFrom?: ISO`
- `dateTo?: ISO`
- `limit?: number`
- `offset?: number`

**Respuesta 200 OK:** `IAuditLog[]`

---

### GET /admin/settings
Obtener configuraciones del sistema (admin)

**Roles:** `admin`

**Query params:**
- `category?: "general" | "notifications" | "backup" | "security" | "business"`
- `key?: string`

**Respuesta 200 OK:** `ISystemSettings[]`

---

### PATCH /admin/settings
Actualizar configuraciones (admin)

**Roles:** `admin`

**Body:**
```json
{
  "key": "currency",
  "value": "ARS",
  "description": "Moneda del sistema"
}
```

**Respuesta 200 OK:** `ISystemSettings`

---

### POST /admin/backup
Crear backup (admin)

**Roles:** `admin`

**Body:**
```json
{
  "type": "full" | "incremental",
  "description": "Backup mensual"
}
```

**Respuesta 201 Created:** `IBackupInfo`

---

### POST /admin/restore
Restaurar backup (admin)

**Roles:** `admin`

**Body:**
```json
{
  "backupId": "string",
  "confirmRestore": true
}
```

**Respuesta 200 OK:**
```json
{
  "message": "Backup restoration initiated"
}
```

---

### POST /admin/export
Exportar datos (admin)

**Roles:** `admin`

**Body:**
```json
{
  "format": "excel" | "pdf" | "csv" | "json",
  "entity": "tickets" | "expenses" | "employees" | "products" | "events" | "audit",
  "dateFrom": "ISO",
  "dateTo": "ISO",
  "eventId": "string",
  "userId": "string",
  "status": "string",
  "fields": ["field1", "field2"]
}
```

**Respuesta 201 Created:** `IExportRequest`

---

### POST /admin/notify
Crear notificación (admin)

**Roles:** `admin`

**Body:**
```json
{
  "type": "email" | "sms" | "push" | "system",
  "recipient": "user@example.com",
  "subject": "Asunto",
  "message": "Mensaje",
  "priority": "low" | "medium" | "high" | "urgent",
  "scheduledAt": "ISO"
}
```

**Respuesta 201 Created:** `INotification`

---

### GET /admin/health
Estado del sistema (admin, bartender)

**Roles:** `admin`, `bartender`

**Respuesta 200 OK:**
```json
{
  "status": "healthy" | "warning" | "critical",
  "uptime": 123456,
  "memory": {
    "used": 123456,
    "total": 234567,
    "percentage": 52.5
  },
  "database": {
    "status": "connected",
    "responseTime": 45
  },
  "services": [
    {
      "name": "DynamoDB",
      "status": "up",
      "responseTime": 50
    }
  ],
  "lastBackup": "ISO",
  "activeUsers": 5,
  "timestamp": "ISO"
}
```

---

## MÓDULO DE IMPRESORAS

**Prefix:** `/admin/printer`

**Roles:** Todas las rutas requieren `admin`

### GET /admin/printer/status
Estado de impresoras configuradas

**Respuesta 200 OK:**
```json
{
  "success": true,
  "printers": [
    {
      "id": "printer-1",
      "name": "Epson TM-T20",
      "connected": true,
      "vendorId": 1234,
      "productId": 5678
    }
  ],
  "totalConnected": 1,
  "totalConfigured": 2,
  "timestamp": "ISO"
}
```

---

### GET /admin/printer/available
Impresoras disponibles en el sistema

**Respuesta 200 OK:**
```json
{
  "success": true,
  "printers": [ /* PrinterConfig[] */ ],
  "timestamp": "ISO"
}
```

---

### POST /admin/printer/test
Imprimir página de prueba

**Body:**
```json
{
  "printerId": "printer-1"
}
```

**Respuesta 200 OK:**
```json
{
  "success": true,
  "message": "Test page printed successfully",
  "printerId": "printer-1",
  "timestamp": "ISO"
}
```

---

### POST /admin/printer/test/:printerId
Imprimir página de prueba en impresora específica

**Respuesta 200 OK:** Igual a `/admin/printer/test`

---

### POST /admin/printer/reconnect
Reconectar todas las impresoras

**Respuesta 200 OK:**
```json
{
  "success": true,
  "message": "All printers reconnected successfully",
  "timestamp": "ISO"
}
```

---

### POST /admin/printer/reconnect/:printerId
Reconectar impresora específica

**Respuesta 200 OK:**
```json
{
  "success": true,
  "message": "Printer reconnected successfully",
  "printerId": "printer-1",
  "timestamp": "ISO"
}
```

---

### POST /admin/printer/add
Agregar configuración de impresora

**Body:**
```json
{
  "name": "Epson TM-T20 Barra 2",
  "vendorId": 1234,
  "productId": 5678,
  "barId": "uuid",
  "active": true
}
```

**Respuesta 200 OK:**
```json
{
  "success": true,
  "message": "Printer configuration added successfully",
  "printerId": "printer-id",
  "timestamp": "ISO"
}
```

---

### POST /admin/printer/remove/:printerId
Eliminar configuración de impresora

**Respuesta 200 OK:**
```json
{
  "success": true,
  "message": "Printer removed successfully",
  "printerId": "printer-1",
  "timestamp": "ISO"
}
```

---

## CÓDIGOS DE ESTADO HTTP

- **200 OK:** Operación exitosa
- **201 Created:** Recurso creado exitosamente
- **204 No Content:** Eliminación exitosa sin respuesta (DELETE users, employees, assignments, tickets)
- **400 Bad Request:** Validación fallida
- **401 Unauthorized:** Token inválido, expirado o ausente
- **403 Forbidden:** Sin permisos para la operación (rol insuficiente)
- **404 Not Found:** Recurso no encontrado
- **409 Conflict:** Conflicto (email/document duplicado, asignación activa existente)
- **500 Internal Server Error:** Error del servidor

---

## ESTRUCTURA DE ERRORES

### Error de validación (400):
```json
{
  "statusCode": 400,
  "timestamp": "2025-10-08T00:00:00.000Z",
  "path": "/products",
  "method": "POST",
  "message": {
    "message": "Validation failed",
    "errors": [
      {
        "property": "price",
        "value": -100,
        "constraints": {
          "min": "Price must be positive"
        }
      }
    ],
    "statusCode": 400
  }
}
```

### Error de negocio (400, 404, 409):
```json
{
  "statusCode": 409,
  "timestamp": "2025-10-08T00:00:00.000Z",
  "path": "/auth/register",
  "method": "POST",
  "message": {
    "message": "User with this email already exists",
    "errorId": "ERR-1759956858169-abc123"
  }
}
```

### Error de autenticación (401):
```json
{
  "statusCode": 401,
  "message": "Access denied. Invalid authentication token. Please log in again.",
  "error": "Unauthorized"
}
```

---

## NOTAS IMPORTANTES

### Autenticación y Seguridad
- Todos los endpoints (excepto `/auth/login` y `/auth/register`) requieren token JWT válido
- Los tokens incluyen: `sub` (userId), `email`, `name`, `role`
- Tokens expiran según configuración (default: 7d)
- Bartenders solo pueden ver/modificar sus propios tickets

### Roles del Sistema
- **admin:** Acceso completo a todas las funcionalidades
- **bartender:** Acceso limitado (cart, ver productos, ver propios tickets)

### Roles de Empleado
Los roles de empleado (`employeeRole`) son diferentes a los roles de autenticación:
- **bartender:** Empleado que atiende la barra
- **manager:** Supervisor de empleados
- **cashier:** Cajero del evento

**IMPORTANTE:** Los usuarios ahora tienen campos de empleado integrados. Ya no es necesario crear empleados separados.

### Sistema de Carrito
- Cada bartender tiene UN carrito activo en memoria
- El carrito se identifica automáticamente por el `userId` del token JWT
- **Comportamiento al agregar productos:**
  - Si el producto NO está en el carrito → lo agrega
  - Si el producto YA está en el carrito → REEMPLAZA la cantidad (no suma)
  - Siempre devuelve el carrito actual, incluso si hay error
- Al confirmar el carrito:
  - Se genera el ticket
  - Se descuenta stock automáticamente
  - Se marca como impreso
  - Se limpia el carrito
  - **Se devuelve el formato de impresión completo**
- Los carritos se pierden al reiniciar el servidor (están en memoria)

### Códigos de Productos
- Formato: 2-3 letras mayúsculas (CCC, PAP, COR)
- Input del bartender: CODIGO+CANTIDAD (CCC2, PAP1)
- Deben ser únicos en el sistema

### Validaciones Importantes
- **Email:** Formato válido de email
- **Password:** Mínimo 6 caracteres
- **Document:** 7-15 dígitos numéricos
- **Code (producto):** 2-3 letras mayúsculas
- **Quantity:** >= 0
- **Price/Cost:** >= 0 con máximo 2 decimales

### Relaciones de Datos
- Los tickets están vinculados a: usuario (bartender), barra, evento
- Las barras pertenecen a eventos
- El stock se asigna a barras específicas
- Los productos tienen códigos únicos para input rápido

### Paginación
- La mayoría de endpoints NO implementan paginación
- Retornan todos los registros disponibles
- Algunos aceptan `limit` y `offset` (products, expenses)

### Filtros y Búsquedas
- Múltiples endpoints aceptan query parameters para filtrar
- El parámetro `search` hace búsqueda por texto en campos relevantes
- Los filtros se aplican en el backend, el frontend solo pasa los parámetros

---

## FLUJO TÍPICO DE USO

### Flujo de Venta (Bartender):

1. **Login** → `POST /auth/login`
2. **Agregar productos al carrito** → `POST /bartender/input` (repetir por cada producto)
3. **Ver resumen del carrito** (opcional) → `GET /bartender/cart`
4. **Confirmar y generar ticket** → `POST /bartender/cart/confirm` (devuelve ticket + formato de impresión)
5. **Frontend imprime** usando el `printFormat` recibido

### Flujo Administrativo:

1. **Login admin** → `POST /auth/login`
2. **Crear evento** → `POST /events`
3. **Crear barras** → `POST /bars`
4. **Crear productos** → `POST /products`
5. **Asignar stock a barras** → `POST /stock/assign`
6. **Ver resumen de ventas por barra** → `GET /bars/:id/sales-summary`
7. **Ver estadísticas** → `GET /products/stats/summary`, `GET /tickets/stats`, `GET /expenses/stats`

---

## CAMBIOS RECIENTES (Octubre 2025)

### Sistema Simplificado de Usuarios
- ✅ **Ya no hay tabla de Employees separada**
- ✅ Los usuarios tienen campos de empleado integrados (`document`, `contact`, `employeeRole`)
- ✅ `employeeId` reemplazado por `userId` en todo el sistema
- ✅ Al registrar un bartender, ya tiene toda la info de empleado
- ✅ El token JWT incluye el `name` del usuario

### Mejoras en Carrito
- ✅ Al confirmar carrito, devuelve **formato de impresión completo**
- ✅ Requiere `barId` en el request de confirmación
- ✅ Descuenta stock automáticamente
- ✅ Marca ticket como impreso automáticamente

### Nuevos Endpoints
- ✅ `GET /bars/:id/sales-summary` - Resumen completo de ventas por barra
- ✅ `GET /events/active` - Eventos activos
- ✅ `GET /events/closed` - Eventos cerrados

### Moneda
- ✅ Sistema configurado para **ARS (Pesos Argentinos)** por defecto
- Modificable en business config

---

## EJEMPLOS DE cURL

### Registro y Login:
```bash
# Registrar bartender
curl -X POST "http://localhost:3001/auth/register" \
  -H "Content-Type: application/json" \
  --data '{"email":"bartender@bar.com","password":"123456","name":"Juan Perez","role":"bartender","document":"12345678","employeeRole":"bartender"}'

# Login
curl -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  --data '{"email":"bartender@bar.com","password":"123456"}'
```

### Flujo de Venta:
```bash
# Agregar producto (reemplaza cantidad si ya existe)
curl -X POST "http://localhost:3001/bartender/input" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  --data '{"input":"CCC2","eventId":"{eventId}"}'

# Ver carrito
curl -X GET "http://localhost:3001/bartender/cart" \
  -H "Authorization: Bearer {token}"

# Actualizar cantidad de un item
curl -X POST "http://localhost:3001/bartender/cart/item/update" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  --data '{"productId":"{productId}","quantity":4}'

# Eliminar un item del carrito
curl -X DELETE "http://localhost:3001/bartender/cart/item" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  --data '{"productId":"{productId}"}'

# Confirmar y obtener ticket formateado
curl -X POST "http://localhost:3001/bartender/cart/confirm" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  --data '{"barId":"{barId}","customerName":"Cliente","paymentMethod":"cash","notes":"Sin hielo"}'
```

### Administración:
```bash
# Resumen de ventas de una barra
curl -X GET "http://localhost:3001/bars/{barId}/sales-summary" \
  -H "Authorization: Bearer {adminToken}"

# Actualizar stock
curl -X PATCH "http://localhost:3001/products/{productId}/stock" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  --data '{"quantity":50,"type":"add","reason":"Reposición"}'
```

---

## ACTUALIZACIONES RECIENTES - Octubre 10, 2025

### Mejoras en Sistema de Carrito (Octubre 10, 2025)

#### POST /bartender/input - COMPORTAMIENTO MODIFICADO
- **Antes:** Sumaba cantidades si el producto ya estaba en el carrito
- **Ahora:** REEMPLAZA la cantidad (más intuitivo para el bartender)
- **Nuevo:** Siempre devuelve el carrito actual, incluso si hay error

#### POST /bartender/cart/item/update - NUEVA RUTA
- Actualizar cantidad de un item ya en el carrito
- Recalcula automáticamente todos los totales
- Si cantidad = 0, elimina el item

#### DELETE /bartender/cart/item - NUEVA RUTA
- Eliminar un item específico del carrito
- Útil cuando el cliente se arrepiente de un producto
- Devuelve carrito actualizado

### Rutas Modificadas (Octubre 8, 2025):

#### POST /auth/register
- Ahora acepta campos: `document`, `contact`, `employeeRole`
- Ya no es necesario crear empleados en `/employees`

#### POST /bartender/cart/confirm
- **Nuevo campo obligatorio:** `barId`
- **Nueva respuesta:** Incluye `printFormat` completo listo para imprimir
- Ya no necesitas llamar a `GET /tickets/:id/print` después

### Rutas Nuevas (Octubre 8, 2025):

#### GET /bars/:id/sales-summary
- Resumen completo de ventas por barra
- Incluye: productos vendidos, ventas por bartender, métodos de pago, distribución horaria

#### GET /events/active
- Obtener solo eventos activos

#### GET /events/closed
- Obtener solo eventos cerrados

### Cambios en Nombres de Campos:

- `employeeId` → `userId`
- `employeeName` → `userName`
- `bartenderId` → `userId`
- `bartenderName` → `userName`

### Otros Cambios:

- Token JWT ahora incluye el campo `name`
- Moneda por defecto: ARS (antes USD)
- Validación de documentos duplicados en registro

---

**Versión del documento:** 2.1  
**Última actualización:** Octubre 10, 2025  
**Sistema:** Backend NestJS + DynamoDB + AWS
