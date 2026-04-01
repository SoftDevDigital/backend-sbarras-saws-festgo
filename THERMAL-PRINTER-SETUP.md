# Configuración de Impresoras Térmicas USB Múltiples

## Descripción
Este documento explica cómo configurar múltiples impresoras térmicas USB (como la Gadnic IT1050) para que impriman automáticamente los tickets generados por el sistema, con soporte para múltiples barras.

## Características de las Impresoras
- **Modelo**: Gadnic IT1050 (y similares)
- **Tipo**: Impresora térmica
- **Ancho**: 90mm
- **Velocidad**: 90mm/s
- **Protocolo**: ESC/POS
- **Conexión**: USB
- **Soporte**: Múltiples impresoras simultáneas

## Configuración USB

### 1. Conectar Impresoras USB
1. Conecta cada impresora térmica a un puerto USB del servidor
2. Asegúrate de que cada impresora esté encendida
3. Instala los drivers de la impresora Gadnic IT1050
4. Verifica que Windows reconozca las impresoras

### 2. Encontrar el Nombre de la Impresora
Para cada impresora, necesitas encontrar su nombre exacto en el sistema:

#### En Windows:
1. Ve a **"Configuración > Dispositivos > Impresoras y escáneres"**
2. Busca tu impresora Gadnic IT1050
3. Anota el nombre exacto que aparece (ej: "Gadnic IT1050")
4. También puedes verificar en **"Panel de control > Dispositivos e impresoras"**

#### En Linux/Mac:
```bash
lpstat -p
# o
lpinfo -v
```

### 3. Configuración Típica para Gadnic IT1050
```javascript
// Configuración por defecto para Gadnic IT1050
{
  id: 'printer-1',
  name: 'Impresora Barra Principal',
  printerName: 'Gadnic IT1050', // Nombre exacto en el sistema
  barId: 'default_bar',
  active: true,
}
```

**Importante**: El campo `printerName` debe coincidir exactamente con el nombre de la impresora en tu sistema operativo.

## Configuración del Sistema

### 1. Configuración de Impresoras
El sistema viene preconfigurado con 2 impresoras:

```typescript
// En thermal-printer.service.ts
const printerConfigs = [
  {
    id: 'printer-1',
    name: 'Impresora Barra Principal',
    vendorId: 0x04b8,
    productId: 0x0202,
    barId: 'default_bar',
    active: true,
  },
  {
    id: 'printer-2', 
    name: 'Impresora Barra Secundaria',
    vendorId: 0x04b8,
    productId: 0x0202,
    barId: 'bar-2',
    active: true,
  }
];
```

### 2. Asociar Impresoras con Barras
- Cada impresora puede estar asociada a una barra específica
- Si no hay impresora específica, se usa la primera disponible
- Esto permite que cada barra tenga su propia impresora

### 3. Probar Conexión
```bash
# Ejecutar script de prueba
node scripts/test-usb-printers.js
```

## Endpoints de Administración

### GET /admin/printer/status
Obtiene el estado de todas las impresoras.

**Respuesta:**
```json
{
  "success": true,
  "printers": [
    {
      "id": "printer-1",
      "name": "Impresora Barra Principal",
      "connected": true,
      "barId": "default_bar"
    },
    {
      "id": "printer-2", 
      "name": "Impresora Barra Secundaria",
      "connected": false,
      "barId": "bar-2",
      "lastError": "Printer not connected"
    }
  ],
  "totalConnected": 1,
  "totalConfigured": 2
}
```

### GET /admin/printer/available
Obtiene la configuración de impresoras disponibles.

**Respuesta:**
```json
{
  "success": true,
  "printers": [
    {
      "id": "printer-1",
      "name": "Impresora Barra Principal",
      "vendorId": 1208,
      "productId": 514,
      "barId": "default_bar",
      "active": true
    }
  ]
}
```

### POST /admin/printer/test
Imprime página de prueba en impresora por defecto.

**Body:**
```json
{
  "printerId": "printer-1"  // Opcional
}
```

### POST /admin/printer/test/:printerId
Imprime página de prueba en impresora específica.

### POST /admin/printer/reconnect
Reconecta todas las impresoras.

### POST /admin/printer/reconnect/:printerId
Reconecta impresora específica.

### POST /admin/printer/add
Agrega nueva configuración de impresora.

**Body:**
```json
{
  "name": "Impresora Barra Nueva",
  "vendorId": 1208,
  "productId": 514,
  "barId": "bar-3",
  "active": true
}
```

### POST /admin/printer/remove/:printerId
Elimina configuración de impresora.

## Formato de Tickets

Los tickets se imprimen automáticamente con el siguiente formato:

```
        GROOVE BAR
========================
Ticket #: ticket-123
Fecha: 01/01/2024 12:00:00
Cliente: Cliente Test
Empleado: Juan Pérez
------------------------
Coca Cola 500ml
  2 x $1000.00 = $2000.00
Fernet Branca
  1 x $5000.00 = $5000.00
------------------------
                Subtotal: $7000.00
                 Impuesto: $0.00
                 TOTAL: $7000.00
------------------------
Método de pago: cash
Notas: Sin hielo
========================
      ¡Gracias por su compra!
        www.groovebar.com
```

## Solución de Problemas

### Error: "Printer not connected"
- Verifica que la impresora esté conectada por USB
- Verifica que la impresora esté encendida
- Verifica que el Vendor ID y Product ID sean correctos
- Ejecuta el script de prueba para verificar conectividad

### Error: "Cannot find module 'escpos-usb'"
- Ejecuta: `npm install escpos-usb escpos-network escpos-serialport`

### Impresora no responde
- Verifica que no haya otro programa usando la impresora
- Reinicia la impresora
- Usa el endpoint `/admin/printer/reconnect/:printerId`

### Tickets no se imprimen automáticamente
- Verifica que al menos una impresora esté conectada
- Revisa los logs del servidor para errores
- Prueba la conexión con `/admin/printer/status`

### Múltiples impresoras del mismo modelo
- Cada impresora necesita su propia configuración
- Usa diferentes `barId` para asociar cada impresora
- El sistema seleccionará automáticamente la impresora correcta

## Configuración Avanzada

### Agregar Nueva Impresora
1. Conecta la impresora USB
2. Encuentra su Vendor ID y Product ID
3. Usa el endpoint `/admin/printer/add` para agregarla
4. Asocia la impresora con una barra específica

### Configurar Impresora por Barra
```typescript
// En el servicio, modifica printerConfigs
{
  id: 'printer-3',
  name: 'Impresora Barra VIP',
  vendorId: 0x04b8,
  productId: 0x0203,
  barId: 'vip_bar',  // Asociar con barra específica
  active: true,
}
```

### Mantenimiento de Impresoras
- Limpia regularmente el cabezal de impresión
- Verifica que el papel térmico esté bien colocado
- Revisa que no haya papel atascado
- Cambia el rollo cuando sea necesario

## Soporte Técnico

Si tienes problemas con la configuración:

1. Ejecuta `node scripts/test-usb-printers.js`
2. Verifica los Vendor ID y Product ID
3. Revisa los logs del servidor
4. Usa los endpoints de administración para diagnóstico
5. Contacta al soporte técnico con los detalles del error

## Notas Importantes

- **Permisos USB**: En Linux, puede ser necesario agregar tu usuario al grupo `lp` o `dialout`
- **Drivers**: La mayoría de impresoras térmicas funcionan con drivers genéricos
- **Concurrencia**: El sistema maneja múltiples impresoras simultáneamente
- **Fallback**: Si una impresora falla, el sistema usa la siguiente disponible
- **Escalabilidad**: Puedes agregar tantas impresoras como necesites