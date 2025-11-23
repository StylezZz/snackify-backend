# API de Sistema de Crédito

## Descripción General

Sistema completo de crédito para pedidos fiados con límites configurables, historial detallado, reportes y pagos mediante múltiples métodos (Yape, Plin, efectivo, tarjeta). Incluye generación de reportes en PDF para mayor facilidad de lectura y descarga.

## Tabla de Contenidos

- [Endpoints de Cliente](#endpoints-de-cliente)
- [Endpoints de PDF (Cliente)](#endpoints-de-pdf-cliente)
- [Endpoints de Administrador](#endpoints-de-administrador)
- [Endpoints de PDF (Admin)](#endpoints-de-pdf-admin)
- [Usuarios de Prueba](#usuarios-de-prueba)
- [Flujo de Trabajo](#flujo-de-trabajo)

---

## Endpoints de Cliente

### 1. Obtener Mi Estado de Cuenta

**Endpoint:** `GET /api/credit/my-account`
**Autenticación:** Requerida (Cliente)
**Descripción:** Obtiene el estado actual de la cuenta de crédito del cliente autenticado.

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "account": {
      "credit_limit": 200.00,
      "current_balance": 50.00,
      "available_credit": 150.00,
      "usage_percent": "25.00"
    },
    "pending_orders": [
      {
        "order_id": "uuid",
        "order_number": "ORD-001",
        "total_amount": 25.50,
        "credit_paid_amount": 0,
        "remaining_amount": 25.50,
        "payment_status": "pending",
        "created_at": "2025-11-23T10:00:00Z"
      }
    ],
    "recent_history": [...]
  }
}
```

---

### 2. Verificar Disponibilidad de Crédito

**Endpoint:** `POST /api/credit/check-availability`
**Autenticación:** Requerida (Cliente)
**Descripción:** Verifica si el cliente puede realizar un pedido fiado por cierto monto.

**Body:**
```json
{
  "order_amount": 45.50
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "canOrder": true,
    "current_balance": 50.00,
    "credit_limit": 200.00,
    "available_credit": 150.00,
    "order_amount": 45.50,
    "remaining_after_order": 104.50
  }
}
```

**Respuesta si NO puede ordenar:**
```json
{
  "success": true,
  "data": {
    "canOrder": false,
    "reason": "Límite de crédito alcanzado (95.0%)",
    "current_balance": 190.00,
    "credit_limit": 200.00,
    "available_credit": 10.00
  }
}
```

---

### 3. Pagar Mi Deuda

**Endpoint:** `POST /api/credit/my-payment`
**Autenticación:** Requerida (Cliente)
**Descripción:** Permite al cliente registrar un pago de su deuda.

**Body:**
```json
{
  "amount": 25.50,
  "payment_method": "yape",
  "order_id": "uuid-opcional",
  "transaction_reference": "123456789",
  "notes": "Pago vía Yape"
}
```

**Métodos de pago aceptados:**
- `cash` - Efectivo
- `card` - Tarjeta
- `yape` - Yape
- `plin` - Plin
- `transfer` - Transferencia bancaria

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Pago registrado correctamente",
  "data": {
    "payment": {
      "payment_id": "uuid",
      "user_id": "uuid",
      "amount": 25.50,
      "payment_method": "yape",
      "balance_before": 50.00,
      "balance_after": 24.50,
      "transaction_reference": "123456789",
      "created_at": "2025-11-23T10:00:00Z"
    }
  }
}
```

---

### 4. Obtener Mi Historial Crediticio

**Endpoint:** `GET /api/credit/my-history?limit=50`
**Autenticación:** Requerida (Cliente)
**Descripción:** Obtiene el historial completo de movimientos de crédito.

**Query Parameters:**
- `limit` (opcional): Número de registros a retornar (default: 100)

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 15,
  "data": {
    "history": [
      {
        "history_id": "uuid",
        "transaction_type": "charge",
        "amount": 25.50,
        "balance_before": 24.50,
        "balance_after": 50.00,
        "order_number": "ORD-001",
        "description": "Pedido fiado realizado",
        "created_at": "2025-11-23T10:00:00Z"
      },
      {
        "history_id": "uuid",
        "transaction_type": "payment",
        "amount": 10.00,
        "balance_before": 50.00,
        "balance_after": 40.00,
        "description": "Pago realizado vía yape",
        "created_at": "2025-11-23T09:00:00Z"
      }
    ]
  }
}
```

**Tipos de transacción:**
- `charge` - Cargo por pedido fiado
- `payment` - Pago realizado
- `adjustment` - Ajuste manual (solo admin)
- `limit_change` - Cambio de límite de crédito

---

### 5. Obtener Mis Pedidos Fiados Pendientes

**Endpoint:** `GET /api/credit/my-pending-orders`
**Autenticación:** Requerida (Cliente)
**Descripción:** Obtiene todos los pedidos fiados pendientes de pago.

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 2,
  "data": {
    "orders": [
      {
        "order_id": "uuid",
        "order_number": "ORD-001",
        "total_amount": 25.50,
        "credit_paid_amount": 10.00,
        "remaining_amount": 15.50,
        "payment_status": "partial",
        "created_at": "2025-11-23T10:00:00Z"
      }
    ]
  }
}
```

---

### 6. Obtener Mi Reporte de Gastos Fiados

**Endpoint:** `GET /api/credit/my-report?period=monthly`
**Autenticación:** Requerida (Cliente)
**Descripción:** Genera un reporte detallado de gastos fiados por período.

**Query Parameters:**
- `period`: `daily`, `weekly`, `monthly` (default: monthly)
- `start_date` (opcional): Fecha de inicio (YYYY-MM-DD)
- `end_date` (opcional): Fecha de fin (YYYY-MM-DD)

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "orders": {
      "count": 5,
      "total": 150.00,
      "items": [
        {
          "order_id": "uuid",
          "order_number": "ORD-001",
          "total_amount": 25.50,
          "credit_paid_amount": 0,
          "remaining_amount": 25.50,
          "payment_status": "pending",
          "created_at": "2025-11-23T10:00:00Z",
          "items": [
            {
              "product_name": "Café Latte",
              "quantity": 2,
              "unit_price": 5.00,
              "subtotal": 10.00
            }
          ]
        }
      ]
    },
    "payments": {
      "count": 3,
      "total": 75.00,
      "items": [
        {
          "payment_id": "uuid",
          "amount": 25.00,
          "payment_method": "yape",
          "created_at": "2025-11-20T10:00:00Z",
          "notes": "Pago vía Yape",
          "order_number": "ORD-001"
        }
      ]
    },
    "summary": {
      "total_ordered": 150.00,
      "total_paid": 75.00,
      "total_pending": 75.00
    }
  }
}
```

---

## Endpoints de PDF (Cliente)

### 1. Descargar Reporte de Crédito en PDF

**Endpoint:** `GET /api/credit/my-report/pdf?period=monthly`
**Autenticación:** Requerida (Cliente)
**Descripción:** Descarga un reporte de crédito en formato PDF.

**Query Parameters:**
- `period`: `daily`, `weekly`, `monthly` (default: monthly)
- `start_date` (opcional): Fecha de inicio (YYYY-MM-DD)
- `end_date` (opcional): Fecha de fin (YYYY-MM-DD)

**Respuesta:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="reporte-credito-[nombre]-[timestamp].pdf"`

**El PDF incluye:**
- Información del cliente
- Estado de cuenta actual (límite, deuda, disponible)
- Resumen del período
- Lista detallada de pedidos fiados con items
- Lista de pagos realizados
- Totales y balance

**Ejemplo de uso:**
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/credit/my-report/pdf?period=monthly" \
     --output reporte-credito.pdf
```

---

### 2. Descargar Estado de Cuenta en PDF

**Endpoint:** `GET /api/credit/my-account/pdf`
**Autenticación:** Requerida (Cliente)
**Descripción:** Descarga el estado de cuenta actual en formato PDF.

**Respuesta:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="estado-cuenta-[nombre]-[timestamp].pdf"`

**El PDF incluye:**
- Información del cliente
- Estado de cuenta destacado
- Pedidos pendientes de pago
- Historial reciente de movimientos

**Ejemplo de uso:**
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/credit/my-account/pdf" \
     --output estado-cuenta.pdf
```

---

## Endpoints de Administrador

### 1. Registrar Pago por el Cliente

**Endpoint:** `POST /api/credit/payment`
**Autenticación:** Requerida (Admin)
**Descripción:** El admin registra un pago realizado por un cliente.

**Body:**
```json
{
  "user_id": "uuid",
  "amount": 50.00,
  "payment_method": "cash",
  "order_id": "uuid-opcional",
  "notes": "Pago registrado en caja"
}
```

---

### 2. Obtener Historial de Pagos de un Usuario

**Endpoint:** `GET /api/credit/payments/:userId?limit=50`
**Autenticación:** Requerida (Admin)

---

### 3. Obtener Historial Crediticio de un Usuario

**Endpoint:** `GET /api/credit/history/:userId?limit=100`
**Autenticación:** Requerida (Admin)

---

### 4. Obtener Pedidos Pendientes de un Usuario

**Endpoint:** `GET /api/credit/pending-orders/:userId`
**Autenticación:** Requerida (Admin)

---

### 5. Obtener Todos los Usuarios con Deuda

**Endpoint:** `GET /api/credit/users-with-debt`
**Autenticación:** Requerida (Admin)

---

### 6. Generar Reporte de Deudas

**Endpoint:** `GET /api/credit/debt-report?min_debt=50&account_status=active`
**Autenticación:** Requerida (Admin)

**Query Parameters:**
- `min_debt` (opcional): Deuda mínima a filtrar
- `account_status` (opcional): Estado de cuenta (active, suspended, inactive)

---

### 7. Obtener Resumen Mensual

**Endpoint:** `GET /api/credit/monthly-summary?year=2025&month=11`
**Autenticación:** Requerida (Admin)

---

### 8. Obtener Reporte de un Usuario Específico

**Endpoint:** `GET /api/credit/user-report/:userId?period=monthly`
**Autenticación:** Requerida (Admin)
**Descripción:** Genera reporte de gastos fiados de cualquier usuario.

---

### 9. Activar Cuenta de Crédito

**Endpoint:** `POST /api/credit/enable/:userId`
**Autenticación:** Requerida (Admin)

**Body:**
```json
{
  "credit_limit": 200.00
}
```

---

### 10. Desactivar Cuenta de Crédito

**Endpoint:** `POST /api/credit/disable/:userId`
**Autenticación:** Requerida (Admin)

---

### 11. Actualizar Límite de Crédito

**Endpoint:** `PATCH /api/credit/update-limit/:userId`
**Autenticación:** Requerida (Admin)

**Body:**
```json
{
  "new_limit": 300.00
}
```

---

### 12. Ajustar Deuda Manualmente

**Endpoint:** `POST /api/credit/adjust-debt/:userId`
**Autenticación:** Requerida (Admin)

**Body:**
```json
{
  "amount": -10.00,
  "reason": "Descuento por promoción"
}
```

---

## Endpoints de PDF (Admin)

### 1. Descargar Reporte de Usuario en PDF

**Endpoint:** `GET /api/credit/user-report/:userId/pdf?period=monthly`
**Autenticación:** Requerida (Admin)
**Descripción:** Descarga el reporte de crédito de cualquier usuario en formato PDF.

**Path Parameters:**
- `userId`: ID del usuario

**Query Parameters:**
- `period`: `daily`, `weekly`, `monthly` (default: monthly)
- `start_date` (opcional): Fecha de inicio (YYYY-MM-DD)
- `end_date` (opcional): Fecha de fin (YYYY-MM-DD)

**Respuesta:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="reporte-credito-[nombre]-[timestamp].pdf"`

**El PDF incluye:**
- Información del usuario
- Estado de cuenta completo
- Resumen del período
- Todos los pedidos fiados con items detallados
- Todos los pagos realizados
- Gráficos y totales

**Ejemplo de uso:**
```bash
curl -H "Authorization: Bearer <admin-token>" \
     "http://localhost:3000/api/credit/user-report/[userId]/pdf?period=monthly" \
     --output reporte-usuario.pdf
```

**Casos de uso:**
- Auditorías de crédito
- Reportes mensuales para contabilidad
- Análisis de comportamiento de pago
- Documentación para cobranza

---

## Usuarios de Prueba

Ejecutar seed de usuarios con crédito:
```bash
npm run seed:credit
```

### Usuarios Creados:

1. **Pedro Sánchez** - `pedro.sanchez@uni.edu`
   - Límite: S/ 200.00
   - Deuda: S/ 50.00
   - Estado: ✅ Puede hacer pedidos

2. **Sofía Torres** - `sofia.torres@uni.edu`
   - Límite: S/ 150.00
   - Deuda: S/ 120.00 (80% usado)
   - Estado: ⚠️ Cerca del límite

3. **Roberto Díaz** - `roberto.diaz@uni.edu`
   - Límite: S/ 100.00
   - Deuda: S/ 100.00 (100% usado)
   - Estado: 🚫 **NO PUEDE HACER MÁS PEDIDOS**

4. **Carmen Vega** - `carmen.vega@uni.edu`
   - Límite: S/ 250.00
   - Deuda: S/ 0.00
   - Estado: ✅ Sin deuda

5. **Diego Ruiz** - `diego.ruiz@uni.edu`
   - Límite: S/ 180.00
   - Deuda: S/ 0.00
   - Estado: ✅ Pagó su deuda recientemente

**Password para todos:** `password123`

---

## Flujo de Trabajo

### Flujo de Pedido Fiado (Cliente)

1. Cliente verifica disponibilidad: `POST /api/credit/check-availability`
2. Si tiene crédito disponible, crea pedido: `POST /api/orders` con `payment_method: "credit"`
3. El sistema automáticamente:
   - Incrementa el `current_balance` del usuario
   - Registra el movimiento en `credit_history`
   - Valida que no exceda el límite

### Flujo de Pago de Deuda (Cliente)

1. Cliente consulta su deuda: `GET /api/credit/my-account`
2. Cliente ve pedidos pendientes: `GET /api/credit/my-pending-orders`
3. Cliente registra pago: `POST /api/credit/my-payment` con método de pago (Yape/Plin/etc)
4. El sistema automáticamente:
   - Reduce el `current_balance`
   - Actualiza el `credit_paid_amount` del pedido
   - Registra el pago en `credit_payments` y `credit_history`

### Flujo de Reportes

1. Cliente/Admin solicita reporte: `GET /api/credit/my-report?period=monthly`
2. Obtiene detalle completo de:
   - Pedidos fiados del período
   - Pagos realizados
   - Totales y balance

---

## Validaciones de Seguridad

- Usuario con `current_balance >= credit_limit * 0.9` (90%) no puede hacer más pedidos
- Usuario con `account_status != 'active'` no puede hacer pedidos fiados
- Usuario sin `has_credit_account = true` no puede usar método de pago "credit"
- Pagos no pueden exceder la deuda actual
- Solo admin puede ajustar deudas manualmente
- Clientes solo pueden pagar sus propias deudas

---

## Variables de Entorno

```env
DEFAULT_CREDIT_LIMIT=100.00
MAX_CREDIT_LIMIT=500.00
CREDIT_BLOCK_THRESHOLD=0.90
```

- `CREDIT_BLOCK_THRESHOLD`: Porcentaje del límite al que se bloquean nuevos pedidos (default: 0.90 = 90%)
