# Sistema de Gestión de Barras para Eventos

Backend desarrollado con NestJS, DynamoDB y arquitectura MVC para la gestión de barras en eventos.

## Características

- ✅ Autenticación JWT
- ✅ Base de datos DynamoDB
- ✅ Arquitectura MVC modular
- ✅ Manejo de variables de entorno con dotenv
- ✅ Validación de datos con class-validator
- ✅ Impresión térmica ESC/POS
- ✅ Generación de reportes PDF/Excel
- ✅ Sistema de roles (Admin/Usuario de Barra)
- ✅ Configuración centralizada
- ✅ Validación de configuración en producción

## Tecnologías

- **NestJS** - Framework de Node.js
- **DynamoDB** - Base de datos NoSQL de AWS
- **JWT** - Autenticación
- **TypeScript** - Lenguaje de programación
- **dotenv** - Manejo de variables de entorno
- **class-validator** - Validación de datos
- **AWS SDK** - Cliente para servicios de AWS

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Windows
copy env.example .env

# Linux/Mac
cp env.example .env
```

Edita el archivo `.env` con tus valores:

```env
# Application Configuration
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRES_IN=7d

# Database Configuration (DynamoDB)
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_PREFIX=bar_system

# Printer Configuration
DEFAULT_PRINTER_NAME=Epson_TM-T20
PRINTER_TIMEOUT=5000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

**⚠️ Importante**: 
- Cambia `JWT_SECRET` en producción
- Las variables de AWS son obligatorias en producción
- Para desarrollo local, usa `DYNAMODB_ENDPOINT` para DynamoDB Local

### 2. Configuración de AWS

1. Crea una cuenta en AWS
2. Configura DynamoDB en tu región preferida
3. Crea las siguientes tablas en DynamoDB:

#### Tablas requeridas:
- `users` - Gestión de usuarios
- `events` - Gestión de eventos
- `bars` - Gestión de barras
- `products` - Gestión de productos
- `employees` - Gestión de empleados
- `employee_assignments` - Asignaciones de empleados
- `tickets` - Gestión de tickets
- `expenses` - Gestión de gastos
- `stock` - Gestión de stock

#### Índices GSI requeridos:
- `GSI1` - Para consultas por estado/rol
- `GSI2` - Para consultas por fecha/estado

### 3. Instalación

```bash
npm install
```

### 4. Scripts Disponibles

```bash
npm run start:dev    # Desarrollo con auto-reload
npm run start:debug  # Desarrollo con debug
npm run build        # Compilar proyecto
npm run start:prod   # Producción
npm run lint         # Linter
npm run test         # Pruebas
npm run format       # Formatear código
```

### 5. Desarrollo

```bash
npm run start:dev
```

### 6. Producción

```bash
npm run build
npm run start:prod
```

## Estructura del Proyecto

```
src/
├── auth/                    # Módulo de autenticación
│   ├── controllers/         # Controladores de auth
│   ├── services/           # Servicios de auth
│   ├── dto/                # DTOs de auth
│   ├── guards/             # Guards JWT
│   └── auth.module.ts      # Módulo de auth
├── shared/                 # Módulo compartido
│   ├── config/             # Configuración DynamoDB
│   ├── interfaces/         # Interfaces TypeScript
│   ├── models/             # Modelos de datos
│   ├── services/           # Servicios compartidos
│   └── shared.module.ts    # Módulo compartido
├── events/                 # Módulo de eventos
├── bars/                   # Módulo de barras
├── products/               # Módulo de productos
├── employees/              # Módulo de empleados
├── tickets/                # Módulo de tickets
├── expenses/               # Módulo de gastos
├── stock/                  # Módulo de stock
├── reports/                # Módulo de reportes
└── app.module.ts           # Módulo principal
```

## API Endpoints

### Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registrar usuario (solo Admin)

### Eventos
- `POST /events` - Crear evento
- `GET /events` - Listar eventos
- `PUT /events/:id` - Actualizar evento
- `DELETE /events/:id` - Eliminar evento
- `POST /events/:id/close` - Cerrar evento

### Barras
- `POST /bars` - Crear barra
- `GET /bars?event_id=:id` - Listar barras
- `PUT /bars/:id` - Actualizar barra
- `DELETE /bars/:id` - Eliminar barra
- `POST /bars/:id/close` - Cerrar barra

### Productos
- `POST /products` - Crear producto
- `GET /products` - Listar productos
- `GET /products/keys?bar_id=:id` - Teclas rápidas por barra
- `PUT /products/:id` - Actualizar producto
- `DELETE /products/:id` - Eliminar producto

### Empleados
- `POST /employees` - Crear empleado
- `GET /employees` - Listar empleados
- `PUT /employees/:id` - Actualizar empleado
- `DELETE /employees/:id` - Eliminar empleado
- `POST /assignments` - Asignar empleado
- `GET /assignments` - Listar asignaciones
- `PUT /assignments/:id` - Actualizar asignación
- `DELETE /assignments/:id` - Eliminar asignación

### Tickets
- `POST /tickets` - Crear ticket
- `POST /tickets/:id/reprint` - Reimprimir ticket
- `GET /tickets` - Listar tickets

### Gastos
- `POST /expenses` - Crear gasto
- `GET /expenses` - Listar gastos
- `PUT /expenses/:id` - Actualizar gasto
- `DELETE /expenses/:id` - Eliminar gasto

### Stock
- `POST /stock` - Registrar stock
- `GET /stock` - Listar stock

### Reportes
- `GET /reports/bar/:id` - Reporte de barra
- `GET /reports/event/:id` - Reporte de evento

## Roles

### Admin
- Acceso completo a todas las funcionalidades
- Puede crear usuarios
- Puede gestionar eventos, barras, productos y empleados
- Acceso a reportes y estadísticas

### Usuario de Barra
- Puede crear tickets
- Puede reimprimir tickets
- Puede registrar stock final
- Acceso limitado a consultas

## Próximos Pasos

1. ✅ Configuración inicial y dependencias
2. ✅ Estructura MVC y modelos base
3. ✅ Autenticación JWT
4. ✅ Reorganización en módulos
5. 🔄 Implementación de módulos restantes (Events, Bars, Products, etc.)
6. ⏳ Configuración de DynamoDB en AWS
7. ⏳ Implementación de impresión térmica
8. ⏳ Generación de reportes
9. ⏳ Testing y documentación