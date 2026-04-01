# ANÁLISIS DE PERMISOS - MÓDULO TICKETS

## RUTAS ACTUALES Y PERMISOS RECOMENDADOS

### 1. POST /tickets - Crear Ticket
**Función:** Crear un nuevo ticket de venta
**Permisos Actuales:** `bartender`, `manager`, `cashier`
**Permisos Recomendados:** `bartender`, `cashier` ✅
**Justificación:** Solo bartenders y cashiers crean tickets. Los managers supervisan pero no crean.

### 2. GET /tickets/search - Buscar Tickets
**Función:** Buscar y filtrar tickets
**Permisos Actuales:** `admin`, `bartender`, `manager`, `cashier`
**Permisos Recomendados:** `admin`, `manager`, `cashier` ✅
**Justificación:** Bartenders solo ven sus propios tickets, no todos.

### 3. GET /tickets/stats - Estadísticas
**Función:** Ver estadísticas de ventas
**Permisos Actuales:** `admin`, `manager`
**Permisos Recomendados:** `admin`, `manager` ✅
**Justificación:** Solo administradores y gerentes necesitan estadísticas.

### 4. GET /tickets/:id - Ver Ticket Específico
**Función:** Ver detalles de un ticket específico
**Permisos Actuales:** `admin`, `bartender`, `manager`, `cashier`
**Permisos Recomendados:** `admin`, `manager`, `cashier` + lógica de autorización
**Justificación:** Bartenders solo pueden ver sus propios tickets.

### 5. PATCH /tickets/:id - Actualizar Ticket
**Función:** Actualizar ticket, agregar productos, procesar pagos
**Permisos Actuales:** `bartender`, `manager`, `cashier`
**Permisos Recomendados:** `bartender`, `cashier` + validaciones específicas
**Justificación:** 
- Bartenders: Agregar productos, actualizar notas
- Cashiers: Procesar pagos, agregar productos
- Managers: No deberían modificar tickets activos

### 6. DELETE /tickets/:id - Eliminar Ticket
**Función:** Eliminar ticket o items específicos
**Permisos Actuales:** `bartender`, `manager`, `cashier`
**Permisos Recomendados:** `bartender`, `cashier` + validaciones
**Justificación:** Solo quien creó el ticket puede eliminarlo (si está abierto).

### 7. GET /tickets/:id/print - Obtener Formato de Impresión
**Función:** Obtener formato para imprimir ticket
**Permisos Actuales:** `admin`, `bartender`, `manager`, `cashier`
**Permisos Recomendados:** `admin`, `bartender`, `manager`, `cashier` ✅
**Justificación:** Todos pueden imprimir tickets que tienen acceso.

### 8. PATCH /tickets/:id/print - Marcar como Impreso
**Función:** Marcar ticket como impreso
**Permisos Actuales:** `bartender`, `manager`, `cashier`
**Permisos Recomendados:** `bartender`, `cashier` ✅
**Justificación:** Solo quien imprime marca como impreso.

## MATRIZ DE PERMISOS RECOMENDADA

| Ruta | admin | manager | bartender | cashier | user |
|------|-------|---------|-----------|---------|------|
| POST /tickets | ✅ | ❌ | ✅ | ✅ | ❌ |
| GET /tickets/search | ✅ | ✅ | 🔒* | ✅ | ❌ |
| GET /tickets/stats | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /tickets/:id | ✅ | ✅ | 🔒* | ✅ | ❌ |
| PATCH /tickets/:id | ✅ | ❌ | ✅ | ✅ | ❌ |
| DELETE /tickets/:id | ✅ | ❌ | ✅ | ✅ | ❌ |
| GET /tickets/:id/print | ✅ | ✅ | ✅ | ✅ | ❌ |
| PATCH /tickets/:id/print | ✅ | ❌ | ✅ | ✅ | ❌ |

*🔒 = Acceso restringido (solo tickets propios)

## VALIDACIONES ADICIONALES RECOMENDADAS

### Para Bartenders:
- Solo pueden ver/modificar sus propios tickets
- No pueden procesar pagos (solo agregar productos)
- No pueden ver estadísticas globales

### Para Cashiers:
- Pueden ver todos los tickets de su barra
- Pueden procesar pagos
- No pueden ver estadísticas globales

### Para Managers:
- Pueden ver todos los tickets de su evento/barra
- Pueden ver estadísticas
- No deberían modificar tickets activos (solo supervisar)

### Para Admins:
- Acceso total sin restricciones
