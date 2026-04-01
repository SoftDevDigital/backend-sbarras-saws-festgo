# SISTEMA DE BARRAS GROOVE - DOCUMENTACIÓN PARA FRONTEND

## MÓDULO DE AUTENTICACIÓN

### INFORMACIÓN GENERAL
- **Base URL**: http://localhost:3001 (o la URL de tu servidor)
- **Ruta base**: /auth
- **Autenticación**: JWT Bearer Token

### ENDPOINTS DISPONIBLES

#### 1. REGISTRO DE USUARIO
- **Método**: POST
- **URL**: /auth/register
- **Descripción**: Crea una nueva cuenta de usuario en el sistema
- **Headers requeridos**:
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "name": "Nombre Usuario"
}
```

**Campos del body**:
- `email` (string, requerido): Email válido del usuario
- `password` (string, requerido): Mínimo 6 caracteres
- `name` (string, requerido): Mínimo 2 caracteres
- `role` (string, opcional): Por defecto se asigna "user"

**Respuesta exitosa (201 Created)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errores posibles**:
- **400 Bad Request - Datos inválidos**:
```json
{
  "statusCode": 400,
  "message": {
    "message": "Validation failed",
    "errors": [
      {
        "property": "email",
        "value": "invalid-email",
        "constraints": {"isEmail": "email must be an email"}
      },
      {
        "property": "password",
        "value": "123",
        "constraints": {"minLength": "password must be longer than or equal to 6 characters"}
      }
    ]
  }
}
```

- **409 Conflict - Usuario ya existe**:
```json
{
  "statusCode": 409,
  "message": "User with this email already exists"
}
```

#### 2. INICIO DE SESIÓN
- **Método**: POST
- **URL**: /auth/login
- **Descripción**: Autentica un usuario existente y devuelve token de acceso
- **Headers requeridos**:
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta exitosa (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errores posibles**:
- **401 Unauthorized - Credenciales incorrectas**:
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

#### 3. GESTIÓN DE USUARIOS (Solo Admin)

##### 3.1. LISTAR USUARIOS
- **Método**: GET
- **URL**: /auth/users
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Query Parameters (opcionales)**:
  - `search`: string - Buscar por email o nombre
  - `role`: string - Filtrar por rol (user, admin, bartender, manager, cashier)

**Respuesta exitosa (200 OK)**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

##### 3.2. OBTENER USUARIO POR ID
- **Método**: GET
- **URL**: /auth/users/{id}
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}

##### 3.3. CAMBIAR ROL DE USUARIO
- **Método**: PATCH
- **URL**: /auth/users/{id}/role
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "role": "bartender"
}
```

**Roles disponibles**: `user`, `admin`, `bartender`, `manager`, `cashier`

**Respuesta exitosa (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "usuario@ejemplo.com",
  "name": "Nombre Usuario",
  "role": "bartender",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

##### 3.4. ELIMINAR USUARIO
- **Método**: DELETE
- **URL**: /auth/users/{id}
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Respuesta exitosa (204 No Content)**

### MANEJO DE TOKENS
- **Almacenamiento del Token**: Guardar el token en localStorage o sessionStorage
- **Uso**: El token contiene información del usuario (id, email, role)
- **Header**: `Authorization: Bearer {token}` para rutas protegidas

### ESTRUCTURA DEL TOKEN JWT
```json
{
  "sub": "user-id",
  "email": "usuario@ejemplo.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### ROLES DE USUARIO
- **user**: Usuario normal (registro por defecto)
- **admin**: Administrador completo
- **bartender**: Empleado de barra
- **manager**: Gerente
- **cashier**: Cajero

### NOTAS IMPORTANTES
- **Validación**: Todos los campos son validados en el backend
- **Seguridad**: Las contraseñas se encriptan con bcrypt
- **Tokens**: Los tokens JWT tienen tiempo de expiración configurado
- **Errores**: Siempre manejar los errores de respuesta del servidor
- **CORS**: Asegúrate de que el servidor tenga CORS configurado para tu dominio frontend

### CÓDIGOS DE ESTADO HTTP
- **200 OK**: Login exitoso, operaciones exitosas
- **201 Created**: Registro exitoso
- **204 No Content**: Eliminación exitosa
- **400 Bad Request**: Datos de entrada inválidos
- **401 Unauthorized**: Credenciales incorrectas o token inválido
- **403 Forbidden**: Sin permisos suficientes
- **409 Conflict**: Usuario ya existe
- **500 Internal Server Error**: Error del servidor

---

## MÓDULO DE EMPLEADOS

### INFORMACIÓN GENERAL
- **Base URL**: http://localhost:3001 (o la URL de tu servidor)
- **Ruta base**: /employees
- **Autenticación**: JWT Bearer Token requerido
- **Roles permitidos**:
  - **admin**: Acceso completo
  - **bartender, manager, cashier**: Acceso limitado (ver empleados específicos y asignaciones)

### ENDPOINTS DISPONIBLES

#### 1. CREAR EMPLEADO
- **Método**: POST
- **URL**: /employees
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "name": "Juan Pérez",
  "document": "12345678",
  "contact": "juan@email.com",
  "role": "bartender"
}
```

**Campos del body**:
- `name` (string, requerido): Nombre del empleado, mínimo 2 caracteres
- `document` (string, requerido): Documento de identidad, 7-15 dígitos
- `contact` (string, requerido): Email de contacto válido
- `role` (string, requerido): Rol del empleado - valores: "bartender", "manager", "cashier"

**Respuesta exitosa (201 Created)**:
```json
{
  "id": "a1e6befa-3df9-4dad-b6d4-9caec38b412b",
  "name": "Juan Pérez",
  "document": "12345678",
  "contact": "juan@email.com",
  "role": "bartender",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errores posibles**:
- **400 Bad Request - Validación fallida**:
```json
{
  "statusCode": 400,
  "message": {
    "message": "Validation failed",
    "errors": [
      {
        "property": "document",
        "value": "123",
        "constraints": {"matches": "Document must be 7-15 digits only"}
      }
    ]
  }
}
```

- **409 Conflict - Documento ya existe**:
```json
{
  "statusCode": 409,
  "message": "Employee with document '12345678' already exists. Please use a different document."
}
```

#### 2. LISTAR EMPLEADOS
- **Método**: GET
- **URL**: /employees
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}

**Respuesta exitosa (200 OK)**:
```json
[
  {
    "id": "a1e6befa-3df9-4dad-b6d4-9caec38b412b",
    "name": "Juan Pérez",
    "document": "12345678",
    "contact": "juan@email.com",
    "role": "bartender",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### 3. OBTENER EMPLEADO POR ID
- **Método**: GET
- **URL**: /employees/{id}
- **Permisos**: admin, bartender, manager, cashier
- **Headers requeridos**:
  - Authorization: Bearer {token}

#### 4. ACTUALIZAR EMPLEADO
- **Método**: PATCH
- **URL**: /employees/{id}
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON) - Todos los campos opcionales**:
```json
{
  "name": "Juan Carlos Pérez",
  "contact": "juancarlos@email.com",
  "role": "manager"
}
```

#### 5. ELIMINAR EMPLEADO
- **Método**: DELETE
- **URL**: /employees/{id}
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Respuesta exitosa (204 No Content)**

#### 6. BÚSQUEDA UNIFICADA
- **Método**: GET
- **URL**: /employees/search
- **Permisos**: admin, bartender, manager, cashier
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Query Parameters (opcionales)**:
  - `role`: string - Filtrar por rol (bartender, manager, cashier)
  - `eventId`: string - Buscar empleados asignados a un evento
  - `barId`: string - Buscar empleados asignados a una barra
  - `status`: string - Filtrar por estado de asignación (active, completed)

**Ejemplos de uso**:
```
GET /employees/search
GET /employees/search?role=bartender
GET /employees/search?eventId=event-123
GET /employees/search?barId=bar-456
GET /employees/search?eventId=event-123&status=active
```

**Respuesta exitosa (200 OK)**:
```json
[
  {
    "id": "a1e6befa-3df9-4dad-b6d4-9caec38b412b",
    "name": "Juan Pérez",
    "document": "12345678",
    "contact": "juan@email.com",
    "role": "bartender",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### 7. ASIGNAR EMPLEADO
- **Método**: POST
- **URL**: /employees/{id}/assign
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "eventId": "event-123",
  "barId": "bar-456",
  "shift": "morning"
}
```

**Campos del body**:
- `eventId` (string, requerido): ID del evento
- `barId` (string, requerido): ID de la barra
- `shift` (string, requerido): Turno - valores: "morning", "afternoon", "night"

**Respuesta exitosa (201 Created)**:
```json
{
  "id": "b2f7c9ea-4e0a-5eeb-c7f5-1bdf48e9f2c3",
  "employeeId": "a1e6befa-3df9-4dad-b6d4-9caec38b412b",
  "eventId": "event-123",
  "barId": "bar-456",
  "shift": "morning",
  "assignedAt": "2024-01-01T00:00:00.000Z",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 8. ACTUALIZAR ASIGNACIÓN
- **Método**: PATCH
- **URL**: /employees/assign/{assignmentId}
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON) - Todos los campos opcionales**:
```json
{
  "barId": "bar-789",
  "shift": "afternoon",
  "status": "completed"
}
```

#### 9. ELIMINAR ASIGNACIÓN
- **Método**: DELETE
- **URL**: /employees/assign/{assignmentId}
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Respuesta exitosa (204 No Content)**

### CONCEPTOS IMPORTANTES

#### ASIGNACIONES
Las asignaciones son cuando un empleado se asigna a trabajar en un evento específico, en una barra específica, durante un turno específico.

**Ejemplo**:
```
Juan (bartender) → Asignado a → Evento "Fiesta 2024" → Barra "Principal" → Turno "noche"
```

**Datos de una asignación**:
- **Empleado** (ID del empleado)
- **Evento** (ID del evento)
- **Barra** (ID de la barra)
- **Turno** (mañana/tarde/noche)
- **Estado** (activo/completado)

#### TURNOS DISPONIBLES
- **morning**: Turno matutino
- **afternoon**: Turno vespertino
- **night**: Turno nocturno

#### ROLES DE EMPLEADOS
- **bartender**: Empleado de barra
- **manager**: Gerente
- **cashier**: Cajero

### ROLES Y PERMISOS

| Endpoint | Admin | Manager | Bartender | Cashier | Usuario Normal |
|----------|-------|---------|-----------|---------|----------------|
| `POST /employees` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /employees` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /employees/{id}` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `PATCH /employees/{id}` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `DELETE /employees/{id}` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /employees/search` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /employees/{id}/assign` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `PATCH /employees/assign/{id}` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `DELETE /employees/assign/{id}` | ✅ | ❌ | ❌ | ❌ | ❌ |

### NOTAS IMPORTANTES
- **Validación**: Todos los campos son validados en el backend
- **Documentos únicos**: No pueden existir dos empleados con el mismo documento
- **Asignaciones únicas**: Un empleado no puede tener múltiples asignaciones activas en el mismo turno
- **Errores**: Siempre manejar los errores de respuesta del servidor
- **Relaciones**: Las asignaciones requieren que el evento y la barra existan

### CÓDIGOS DE ESTADO HTTP
- **200 OK**: Operación exitosa
- **201 Created**: Empleado o asignación creada exitosamente
- **204 No Content**: Eliminación exitosa
- **400 Bad Request**: Datos de entrada inválidos
- **401 Unauthorized**: Token inválido o faltante
- **403 Forbidden**: Sin permisos suficientes
- **404 Not Found**: Empleado o asignación no encontrado
- **409 Conflict**: Datos en conflicto (documento duplicado, asignación duplicada)
- **500 Internal Server Error**: Error del servidor

---

## MÓDULO DE PRODUCTOS

### INFORMACIÓN GENERAL
- **Base URL**: http://localhost:3001 (o la URL de tu servidor)
- **Ruta base**: /products
- **Autenticación**: JWT Bearer Token requerido
- **Roles permitidos**:
  - **admin**: Acceso completo
  - **bartender, manager, cashier**: Solo lectura y teclas rápidas

### ENDPOINTS DISPONIBLES

#### 1. CREAR PRODUCTO
- **Método**: POST
- **URL**: /products
- **Descripción**: Crea un nuevo producto en el inventario del sistema
- **Permisos**: Solo administradores
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON) - Campos requeridos**:
```json
{
  "name": "Cerveza Corona",
  "price": 15.00
}
```

- **Body (JSON) - Campos opcionales completos**:
```json
{
  "name": "Cerveza Corona",
  "description": "Cerveza mexicana premium 355ml",
  "price": 15.00,
  "cost": 10.00,
  "quickKey": "C1",
  "category": "Bebidas",
  "unit": "botella",
  "stock": 50,
  "minStock": 10,
  "barcode": "123456789",
  "taxRate": 16,
  "available": true,
  "active": true
}
```

**Campos del body**:
- `name` (string, requerido): Nombre del producto, máximo 100 caracteres
- `description` (string, opcional): Descripción del producto, máximo 500 caracteres
- `price` (number, requerido): Precio de venta, debe ser positivo
- `cost` (number, opcional): Costo del producto, debe ser positivo
- `quickKey` (string, opcional): Tecla rápida para POS, máximo 10 caracteres, solo A-Z y 0-9
- `category` (string, opcional): Categoría del producto, máximo 50 caracteres (default: "General")
- `unit` (string, opcional): Unidad de medida, máximo 20 caracteres (default: "unidad")
- `stock` (number, opcional): Cantidad en inventario, debe ser positivo (default: 0)
- `minStock` (number, opcional): Stock mínimo para alertas, debe ser positivo (default: 0)
- `barcode` (string, opcional): Código de barras, máximo 50 caracteres
- `taxRate` (number, opcional): Porcentaje de impuesto, 0-100 (default: 0)
- `available` (boolean, opcional): Disponible para venta (default: true)
- `active` (boolean, opcional): Activo en el sistema (default: true)

**Respuesta exitosa (201 Created)**:
```json
{
  "id": "a1e6befa-3df9-4dad-b6d4-9caec38b412b",
  "name": "Cerveza Corona",
  "description": "Cerveza mexicana premium 355ml",
  "price": 15,
  "cost": 10,
  "quickKey": "C1",
  "category": "Bebidas",
  "unit": "botella",
  "stock": 50,
  "minStock": 10,
  "barcode": "123456789",
  "taxRate": 16,
  "available": true,
  "active": true,
  "createdAt": "2025-10-03T03:39:24.958Z",
  "updatedAt": "2025-10-03T03:39:24.958Z"
}
```

**Errores posibles**:
- **400 Bad Request - Validación fallida**:
```json
{
  "statusCode": 400,
  "message": "Product name and price are required"
}
```

- **409 Conflict - Tecla rápida ya existe**:
```json
{
  "statusCode": 409,
  "message": "Quick key 'C1' is already in use by product 'Cerveza Corona'"
}
```

#### 2. LISTAR PRODUCTOS
- **Método**: GET
- **URL**: /products
- **Descripción**: Obtiene lista de productos con filtros y paginación
- **Permisos**: Administradores y empleados
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Query Parameters disponibles**:
  - `status` (string, opcional): Filtrar por estado - valores: "active", "inactive", "all"
  - `active` (boolean, opcional): Filtro de compatibilidad - valores: true, false
  - `category` (string, opcional): Filtrar por categoría
  - `search` (string, opcional): Buscar por nombre o tecla rápida
  - `low_stock` (boolean, opcional): Solo productos con stock bajo - valores: true
  - `out_of_stock` (boolean, opcional): Solo productos sin stock - valores: true
  - `sort_by` (string, opcional): Campo de ordenamiento - valores: "name", "price", "created_at", "updated_at", "stock", "category"
  - `sort_order` (string, opcional): Dirección del ordenamiento - valores: "asc", "desc"
  - `limit` (number, opcional): Límite de resultados, rango: 1-1000
  - `offset` (number, opcional): Desplazamiento, debe ser ≥ 0
  - `keys_only` (string, opcional): Solo teclas rápidas para POS - valores: "true"

**Ejemplos de URLs**:
```
/products
/products?status=active
/products?category=Bebidas&sort_by=price&sort_order=desc
/products?low_stock=true
/products?search=Corona
/products?limit=10&offset=5
/products?keys_only=true
```

**Respuesta exitosa (200 OK) - Lista normal**:
```json
[
  {
    "id": "a1e6befa-3df9-4dad-b6d4-9caec38b412b",
    "name": "Cerveza Corona",
    "description": "Cerveza mexicana premium 355ml",
    "price": 15,
    "cost": 10,
    "quickKey": "C1",
    "category": "Bebidas",
    "unit": "botella",
    "stock": 50,
    "minStock": 10,
    "barcode": "123456789",
    "taxRate": 16,
    "available": true,
    "active": true,
    "createdAt": "2025-10-03T03:39:24.958Z",
    "updatedAt": "2025-10-03T03:39:24.958Z"
  }
]
```

**Respuesta exitosa (200 OK) - Con keys_only=true**:
```json
[
  {
    "productId": "a1e6befa-3df9-4dad-b6d4-9caec38b412b",
    "productName": "Cerveza Corona",
    "price": 15,
    "quickKey": "C1",
    "stock": 50,
    "available": true
  }
]
```

#### 3. OBTENER PRODUCTO POR ID
- **Método**: GET
- **URL**: /products/{id}
- **Descripción**: Obtiene los detalles completos de un producto específico
- **Permisos**: Administradores y empleados
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Path Parameters**:
  - `id` (string, requerido): ID único del producto (UUID)

#### 4. ACTUALIZAR PRODUCTO
- **Método**: PATCH
- **URL**: /products/{id}
- **Descripción**: Modifica información de un producto existente
- **Permisos**: Solo administradores
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json

#### 5. ACTUALIZAR STOCK
- **Método**: PATCH
- **URL**: /products/{id}/stock
- **Descripción**: Modifica la cantidad de stock de un producto
- **Permisos**: Solo administradores
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "quantity": 25,
  "type": "add",
  "reason": "Restock inicial"
}
```

**Campos del body**:
- `quantity` (number, requerido): Cantidad a procesar, debe ser positivo
- `type` (string, requerido): Tipo de operación - valores: "add", "subtract", "set"
- `reason` (string, opcional): Razón del cambio, máximo 200 caracteres

**Tipos de operación**:
- **add**: Agrega cantidad al stock actual
- **subtract**: Resta cantidad del stock actual
- **set**: Establece stock a cantidad exacta

#### 6. ELIMINAR PRODUCTO
- **Método**: DELETE
- **URL**: /products/{id}
- **Descripción**: Elimina permanentemente un producto del sistema
- **Permisos**: Solo administradores
- **Headers requeridos**:
  - Authorization: Bearer {token}

#### 7. ESTADÍSTICAS DE PRODUCTOS
- **Método**: GET
- **URL**: /products/stats/summary
- **Descripción**: Obtiene resumen estadístico del inventario
- **Permisos**: Solo administradores
- **Headers requeridos**:
  - Authorization: Bearer {token}

**Respuesta exitosa (200 OK)**:
```json
{
  "total": 150,
  "active": 120,
  "inactive": 30,
  "withKeys": 80,
  "lowStock": 15,
  "outOfStock": 5,
  "totalStockValue": 25000.00
}
```

#### 8. ALERTAS DE STOCK
- **Método**: GET
- **URL**: /products/stock/alerts
- **Descripción**: Obtiene productos con alertas de stock
- **Permisos**: Solo administradores
- **Headers requeridos**:
  - Authorization: Bearer {token}

### CONCEPTOS IMPORTANTES

#### TECLAS RÁPIDAS
Son códigos cortos (máximo 10 caracteres, solo A-Z y 0-9) para venta rápida en POS
- **Ejemplos**: "C1" para Corona, "V2" para Vodka, "B3" para Bebida
- **Deben ser únicas** en el sistema

#### STOCK MÍNIMO
Cantidad por debajo de la cual el sistema genera alertas
- **Ejemplo**: Si stock mínimo es 5, alerta cuando llegue a 5 o menos

#### CATEGORIZACIÓN
Organización por tipos: "Bebidas", "Comida", "Snacks", etc.
- **Permite filtrar** y organizar el inventario

#### SISTEMA DE IMPUESTOS
Porcentaje de impuesto por producto (0-100%)
- **Útil para calcular** precio final con impuestos

#### ALERTAS DE STOCK
Sistema detecta automáticamente:
- **Productos sin stock** (stock = 0)
- **Productos con stock bajo** (stock ≤ stock mínimo)

### ROLES DE USUARIO
- **admin**: Acceso completo (crear, editar, eliminar, ver estadísticas)
- **bartender, manager, cashier**: Solo lectura y acceso a teclas rápidas para ventas

### NOTAS IMPORTANTES
- **Validación**: Todos los campos son validados en el backend
- **Stock**: No se puede restar más stock del disponible
- **Teclas Rápidas**: Deben ser únicas en el sistema
- **Eliminación**: No se puede eliminar productos con ventas asociadas
- **Errores**: Siempre manejar los errores de respuesta del servidor

### CÓDIGOS DE ESTADO HTTP
- **200 OK**: Operación exitosa
- **201 Created**: Producto creado exitosamente
- **400 Bad Request**: Datos de entrada inválidos
- **401 Unauthorized**: Token inválido o faltante
- **403 Forbidden**: Sin permisos suficientes
- **404 Not Found**: Producto no encontrado
- **409 Conflict**: Datos en conflicto (tecla rápida duplicada, etc.)
- **500 Internal Server Error**: Error del servidor

---

## MÓDULO DE EVENTOS Y BARS

### MÓDULO DE EVENTOS
- **Ruta base**: /events

#### 1. CREAR EVENTO
- **Método**: POST
- **URL**: /events
- **Controlador**: EventController
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "name": "Evento de Prueba",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-02T00:00:00.000Z"
}
```

**Validaciones**:
- `name`: String, mínimo 2 caracteres, requerido
- `startDate`: Fecha ISO 8601, requerido
- `endDate`: Fecha ISO 8601, requerido
- `endDate` debe ser posterior a `startDate`

**Respuesta exitosa (201 Created)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Evento de Prueba",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-02T00:00:00.000Z",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. LISTAR EVENTOS
- **Método**: GET
- **URL**: /events
- **Controlador**: EventController
- **Permisos**: admin y empleados
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Query Parameters (opcionales)**:
  - `status`: active | closed - Filtrar por estado
  - `search`: string - Buscar por nombre

**Ejemplos de URL**:
```
/events
/events?status=active
/events?search=verano
```

#### 3. OBTENER EVENTO POR ID
- **Método**: GET
- **URL**: /events/{id}
- **Controlador**: EventController
- **Permisos**: admin y empleados
- **Headers requeridos**:
  - Authorization: Bearer {token}

#### 4. EDITAR EVENTO
- **Método**: PATCH
- **URL**: /events/{id}
- **Controlador**: EventController
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json

#### 5. CAMBIAR ESTADO DE EVENTO
- **Método**: PATCH
- **URL**: /events/{id}/status/{status}
- **Controlador**: EventController
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Path Parameters**:
  - `id`: string - ID del evento
  - `status`: active | closed - Nuevo estado

#### 6. ELIMINAR EVENTO
- **Método**: DELETE
- **URL**: /events/{id}
- **Controlador**: EventController
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}

### MÓDULO DE BARS
- **Ruta base**: /bars

#### 1. CREAR BAR
- **Método**: POST
- **URL**: /bars
- **Controlador**: BarController
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "name": "Bar Principal",
  "eventId": "123e4567-e89b-12d3-a456-426614174000",
  "printer": "Epson_TM-T20"
}
```

**Validaciones**:
- `name`: String, mínimo 2 caracteres, requerido
- `eventId`: String, debe existir en la base de datos, requerido
- `printer`: String, requerido

#### 2. LISTAR BARS
- **Método**: GET
- **URL**: /bars
- **Controlador**: BarController
- **Permisos**: admin y empleados
- **Headers requeridos**:
  - Authorization: Bearer {token}
- **Query Parameters (opcionales)**:
  - `eventId`: string - Filtrar por evento
  - `status`: active | closed - Filtrar por estado
  - `search`: string - Buscar por nombre

#### 3. OBTENER BAR POR ID
- **Método**: GET
- **URL**: /bars/{id}
- **Controlador**: BarController
- **Permisos**: admin y empleados
- **Headers requeridos**:
  - Authorization: Bearer {token}

#### 4. EDITAR BAR
- **Método**: PATCH
- **URL**: /bars/{id}
- **Controlador**: BarController
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}
  - Content-Type: application/json

#### 5. CAMBIAR ESTADO DE BAR
- **Método**: PATCH
- **URL**: /bars/{id}/status/{status}
- **Controlador**: BarController
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}

#### 6. ELIMINAR BAR
- **Método**: DELETE
- **URL**: /bars/{id}
- **Controlador**: BarController
- **Permisos**: Solo admin
- **Headers requeridos**:
  - Authorization: Bearer {token}

### CÓDIGOS DE ESTADO HTTP
- **200 OK**: Operación exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Datos de entrada inválidos
- **401 Unauthorized**: Token no válido o expirado
- **403 Forbidden**: Sin permisos para la acción
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflicto (recurso duplicado)
- **500 Internal Server Error**: Error del servidor

### NOTAS IMPORTANTES
- **Autenticación**: Todos los endpoints requieren token JWT válido
- **Roles**:
  - **admin**: Acceso completo a todos los endpoints
  - **bartender, manager, cashier**: Solo lectura (GET endpoints)
- **Validaciones**: Todos los campos son validados en el backend
- **Fechas**: Usar formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- **IDs**: Los IDs son UUIDs generados automáticamente
- **Relaciones**: Los bars deben tener un eventId válido que exista en la base de datos