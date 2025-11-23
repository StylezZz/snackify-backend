# API de Ordenes - Snackify Backend

Base URL: `/api/orders`

Todas las rutas requieren autenticación mediante token JWT en el header:
```
Authorization: Bearer <token>
```

---

## ENDPOINTS PARA CLIENTES (Customer)

### 1. Crear Pedido
**POST** `/api/orders`

Crea un nuevo pedido.

**Request Body:**
```json
{
  "payment_method": "cash | card | credit | yape | plin",
  "notes": "Sin cebolla por favor",
  "estimated_ready_time": "2024-01-15T14:30:00Z",
  "items": [
    {
      "product_id": "uuid-del-producto",
      "quantity": 2,
      "customizations": "Sin salsa"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "order": {
      "order_id": "uuid",
      "order_number": "ORD-2024-001",
      "user_id": "uuid",
      "total_amount": 25.50,
      "status": "pending",
      "payment_method": "cash",
      "payment_status": "paid",
      "is_credit_order": false,
      "qr_code": "data:image/png;base64,...",
      "created_at": "2024-01-15T12:00:00Z",
      "items": [...]
    }
  }
}
```

---

### 2. Obtener Mis Pedidos (Lista Simple)
**GET** `/api/orders/my-orders`

**Query Parameters:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| status | string | pending, confirmed, preparing, ready, delivered, cancelled |
| payment_method | string | cash, card, credit, yape, plin |

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": {
    "orders": [
      {
        "order_id": "uuid",
        "order_number": "ORD-2024-001",
        "total_amount": 25.50,
        "status": "delivered",
        "payment_method": "cash",
        "payment_status": "paid",
        "created_at": "2024-01-15T12:00:00Z",
        "estimated_ready_time": null,
        "is_credit_order": false
      }
    ]
  }
}
```

---

### 3. Historial de Mis Pedidos (Con Paginacion)
**GET** `/api/orders/my-history`

**Query Parameters:**
| Param | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| page | number | 1 | Numero de pagina |
| limit | number | 10 | Cantidad por pagina |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 4. Mis Ordenes Activas
**GET** `/api/orders/my-active`

Obtiene ordenes con estado: pending, confirmed, preparing, ready.

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": {
    "orders": [
      {
        "order_id": "uuid",
        "order_number": "ORD-2024-001",
        "status": "preparing",
        "total_amount": 15.00,
        "estimated_ready_time": "2024-01-15T14:30:00Z",
        "customer_name": "Juan Perez",
        "customer_email": "juan@email.com",
        "customer_phone": "+1234567890"
      }
    ]
  }
}
```

---

### 5. Mis Estadisticas de Pedidos
**GET** `/api/orders/my-stats`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_orders": 25,
      "completed_orders": 22,
      "cancelled_orders": 3,
      "total_spent": 450.75,
      "avg_order_value": 20.49
    }
  }
}
```

---

### 6. Obtener Detalle de Pedido
**GET** `/api/orders/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "order_id": "uuid",
      "order_number": "ORD-2024-001",
      "user_id": "uuid",
      "customer_name": "Juan Perez",
      "customer_email": "juan@email.com",
      "total_amount": 25.50,
      "status": "preparing",
      "payment_method": "cash",
      "payment_status": "paid",
      "is_credit_order": false,
      "credit_paid_amount": 0,
      "estimated_ready_time": "2024-01-15T14:30:00Z",
      "confirmed_at": "2024-01-15T12:05:00Z",
      "ready_at": null,
      "delivered_at": null,
      "notes": "Sin cebolla",
      "qr_code": "data:image/png;base64,...",
      "created_at": "2024-01-15T12:00:00Z",
      "items": [
        {
          "order_item_id": "uuid",
          "product_id": "uuid",
          "product_name": "Hamburguesa Clasica",
          "quantity": 2,
          "unit_price": 12.75,
          "subtotal": 25.50,
          "customizations": "Sin salsa",
          "image_url": "https://...",
          "thumbnail_url": "https://..."
        }
      ]
    }
  }
}
```

---

### 7. Reordenar (Repetir Pedido Anterior)
**POST** `/api/orders/:id/reorder`

Crea un nuevo pedido basado en uno anterior.

**Response (201):**
```json
{
  "success": true,
  "message": "Pedido creado exitosamente",
  "data": {
    "order": {
      "order_id": "nuevo-uuid",
      "order_number": "ORD-2024-002",
      "notes": "Reorden de: ORD-2024-001",
      "...": "..."
    }
  }
}
```

---

### 8. Cancelar Pedido
**DELETE** `/api/orders/:id`

Solo se puede cancelar si el estado es `pending` o `confirmed`.

**Request Body:**
```json
{
  "reason": "Ya no lo necesito"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Pedido cancelado correctamente",
  "data": {
    "order": {
      "order_id": "uuid",
      "status": "cancelled",
      "cancellation_reason": "Ya no lo necesito"
    }
  }
}
```

---

## ENDPOINTS PARA ADMINISTRADORES (Admin)

### 9. Obtener Todos los Pedidos
**GET** `/api/orders`

**Query Parameters:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| status | string | Filtrar por estado |
| payment_method | string | Filtrar por metodo de pago |
| date_from | date | Fecha desde |
| date_to | date | Fecha hasta |

**Response (200):**
```json
{
  "success": true,
  "count": 50,
  "data": {
    "orders": [...]
  }
}
```

---

### 10. Pedidos con Paginacion y Filtros Avanzados
**GET** `/api/orders/paginated`

**Query Parameters:**
| Param | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| page | number | 1 | Numero de pagina |
| limit | number | 20 | Cantidad por pagina |
| status | string | - | pending, confirmed, preparing, ready, delivered, cancelled |
| payment_method | string | - | cash, card, credit, yape, plin |
| payment_status | string | - | pending, paid, partial, overdue |
| is_credit_order | boolean | - | true / false |
| date_from | date | - | Fecha desde (ISO 8601) |
| date_to | date | - | Fecha hasta (ISO 8601) |
| user_id | uuid | - | Filtrar por usuario |
| search | string | - | Buscar por numero de orden, nombre o email |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "order_id": "uuid",
        "order_number": "ORD-2024-001",
        "customer_name": "Juan Perez",
        "customer_email": "juan@email.com",
        "customer_phone": "+1234567890",
        "total_amount": 25.50,
        "status": "preparing",
        "payment_method": "cash",
        "payment_status": "paid",
        "is_credit_order": false,
        "created_at": "2024-01-15T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 11. Ordenes Activas (Panel de Preparacion)
**GET** `/api/orders/active`

Retorna ordenes ordenadas por prioridad: ready > preparing > confirmed > pending.

**Response (200):**
```json
{
  "success": true,
  "count": 8,
  "data": {
    "orders": [...]
  }
}
```

---

### 12. Ordenes del Dia
**GET** `/api/orders/today`

**Response (200):**
```json
{
  "success": true,
  "count": 25,
  "data": {
    "orders": [...]
  }
}
```

---

### 13. Estadisticas de Pedidos
**GET** `/api/orders/stats/summary`

**Query Parameters:**
| Param | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| date_from | date | 30 dias atras | Fecha desde |
| date_to | date | hoy | Fecha hasta |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_orders": 150,
      "delivered_orders": 140,
      "cancelled_orders": 10,
      "credit_orders": 25,
      "total_revenue": 3500.00,
      "credit_revenue": 625.00,
      "avg_order_value": 25.00
    },
    "period": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-01-31T23:59:59Z"
    }
  }
}
```

---

### 14. Buscar por Numero de Orden
**GET** `/api/orders/search/:orderNumber`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "order_id": "uuid",
      "order_number": "ORD-2024-001",
      "items": [...],
      "...": "..."
    }
  }
}
```

---

### 15. Ordenes de un Cliente Especifico
**GET** `/api/orders/customer/:customerId`

**Query Parameters:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| status | string | Filtrar por estado |

**Response (200):**
```json
{
  "success": true,
  "count": 15,
  "data": {
    "orders": [...]
  }
}
```

---

### 16. Validar Codigo QR
**POST** `/api/orders/validate-qr`

**Request Body:**
```json
{
  "qr_code": "data:image/png;base64,..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "order_id": "uuid",
      "order_number": "ORD-2024-001",
      "status": "ready",
      "items": [...],
      "...": "..."
    }
  }
}
```

---

### 17. Actualizar Estado del Pedido
**PATCH** `/api/orders/:id/status`

**Request Body:**
```json
{
  "status": "confirmed | preparing | ready | delivered | cancelled"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "order_id": "uuid",
      "status": "preparing",
      "confirmed_at": "2024-01-15T12:05:00Z"
    }
  }
}
```

**Flujo de Estados:**
```
pending -> confirmed -> preparing -> ready -> delivered
    |          |
    v          v
cancelled  cancelled
```

---

### 18. Actualizar Notas del Pedido
**PATCH** `/api/orders/:id/notes`

**Request Body:**
```json
{
  "notes": "Cliente solicito entrega en puerta principal"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "order_id": "uuid",
      "notes": "Cliente solicito entrega en puerta principal"
    }
  }
}
```

---

### 19. Actualizar Tiempo Estimado
**PATCH** `/api/orders/:id/estimated-time`

**Request Body:**
```json
{
  "estimated_ready_time": "2024-01-15T14:45:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "order_id": "uuid",
      "estimated_ready_time": "2024-01-15T14:45:00Z"
    }
  }
}
```

---

## ESTADOS DE ORDEN

| Estado | Descripcion |
|--------|-------------|
| pending | Pedido recibido, pendiente de confirmacion |
| confirmed | Pedido confirmado por el admin |
| preparing | Pedido en preparacion |
| ready | Pedido listo para entrega/recogida |
| delivered | Pedido entregado |
| cancelled | Pedido cancelado |

## METODOS DE PAGO

| Metodo | Descripcion |
|--------|-------------|
| cash | Pago en efectivo |
| card | Pago con tarjeta |
| credit | Pago a credito (fiado) |
| yape | Pago con Yape |
| plin | Pago con Plin |

## ESTADOS DE PAGO

| Estado | Descripcion |
|--------|-------------|
| pending | Pago pendiente (solo para credito) |
| paid | Pagado completamente |
| partial | Pago parcial |
| overdue | Pago vencido |

## CODIGOS DE ERROR

| Codigo | Descripcion |
|--------|-------------|
| 400 | Bad Request - Datos invalidos |
| 401 | Unauthorized - Token invalido o expirado |
| 403 | Forbidden - Sin permisos para esta accion |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error |
