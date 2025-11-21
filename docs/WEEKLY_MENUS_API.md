# API de Menús Semanales - Documentación

## Base URL
```
/api/weekly-menus
```

## Autenticación
- **Public**: No requiere token
- **Private**: Requiere header `Authorization: Bearer <token>`
- **Admin**: Requiere token de usuario con rol `admin`

---

## ENDPOINTS PÚBLICOS

### 1. Listar todos los menús
```http
GET /api/weekly-menus
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| active | boolean | Filtrar por menús activos/inactivos |
| from_date | date | Fecha inicial (YYYY-MM-DD) |
| to_date | date | Fecha final (YYYY-MM-DD) |
| available | boolean | Solo menús disponibles para reservar |

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": {
    "menus": [
      {
        "menu_id": "uuid",
        "menu_date": "2025-11-25",
        "entry_description": "Ensalada César",
        "main_course_description": "Lomo saltado con arroz",
        "drink_description": "Chicha morada",
        "dessert_description": "Mazamorra morada",
        "description": "Menú del Lunes",
        "price": "8.50",
        "reservation_deadline": "2025-11-23T23:59:59",
        "max_reservations": 30,
        "current_reservations": 15,
        "is_active": true,
        "can_reserve": true
      }
    ]
  }
}
```

### 2. Obtener menús de la semana actual
```http
GET /api/weekly-menus/current-week
```

### 3. Obtener menú por ID
```http
GET /api/weekly-menus/:id
```

---

## ENDPOINTS USUARIO AUTENTICADO

### 4. Crear reservación
```http
POST /api/weekly-menus/:id/reservations
```

**Body:**
```json
{
  "quantity": 1,
  "notes": "Sin picante por favor"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "reservation": {
      "reservation_id": "uuid",
      "menu_id": "uuid",
      "user_id": "uuid",
      "quantity": 1,
      "total_amount": "8.50",
      "status": "pending",
      "reserved_at": "2025-11-21T10:30:00"
    }
  }
}
```

**Errores posibles:**
- `400` - Ya tienes una reservación para este menú
- `400` - Plazo de reserva vencido
- `400` - No hay cupos disponibles

### 5. Mis reservaciones
```http
GET /api/weekly-menus/user/my-reservations
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| status | string | pending, confirmed, cancelled, delivered |

### 6. Cancelar reservación
```http
PATCH /api/weekly-menus/reservations/:reservationId/cancel
```

**Body:**
```json
{
  "reason": "No podré asistir"
}
```

### 7. Agregar a lista de espera
```http
POST /api/weekly-menus/:id/waitlist
```

**Body:**
```json
{
  "quantity": 1,
  "notes": "Avísenme si hay cupo"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Agregado a la lista de espera. Te notificaremos si hay disponibilidad.",
  "data": {
    "waitlist": {
      "waitlist_id": "uuid",
      "menu_id": "uuid",
      "quantity": 1,
      "status": "waiting"
    }
  }
}
```

### 8. Mi lista de espera
```http
GET /api/weekly-menus/user/my-waitlist
```

### 9. Cancelar entrada en lista de espera
```http
DELETE /api/weekly-menus/waitlist/:waitlistId
```

---

## ENDPOINTS ADMIN

### 10. Crear menú
```http
POST /api/weekly-menus
```

**Body:**
```json
{
  "menu_date": "2025-11-25",
  "entry_description": "Ensalada César con crutones caseros",
  "main_course_description": "Lomo saltado con arroz blanco y papas fritas",
  "drink_description": "Chicha morada",
  "dessert_description": "Mazamorra morada",
  "description": "Menú del Lunes - Clásico peruano",
  "price": 8.50,
  "reservation_deadline": "2025-11-23T23:59:59",
  "max_reservations": 30
}
```

**Notas:**
- Si no se proporciona `reservation_deadline`, se calcula automáticamente 2 días antes
- `max_reservations` es opcional, si no se proporciona es ilimitado

### 11. Actualizar menú
```http
PUT /api/weekly-menus/:id
```

**Body:** (campos opcionales)
```json
{
  "entry_description": "Nueva entrada",
  "price": 9.00,
  "max_reservations": 40
}
```

### 12. Eliminar menú (soft delete)
```http
DELETE /api/weekly-menus/:id
```

### 13. Descargar plantilla Excel
```http
GET /api/weekly-menus/template
```

**Response:** Descarga archivo `plantilla_menus_semanales.xlsx`

### 14. Importar menús desde Excel
```http
POST /api/weekly-menus/import
Content-Type: multipart/form-data
```

**Form Data:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| file | File | Archivo Excel (.xlsx) |
| default_max_reservations | number | Cupo por defecto (default: 30) |
| hours_before_deadline | number | Horas antes para deadline (default: 48) |
| skip_existing | boolean | Omitir fechas existentes (default: true) |

**Formato del Excel:**
| menu_date | entry_description | main_course_description | drink_description | dessert_description | description | price | max_reservations |
|-----------|-------------------|------------------------|-------------------|---------------------|-------------|-------|------------------|
| 2025-11-25 | Ensalada César | Lomo saltado | Chicha morada | Mazamorra | Menú Lunes | 8.50 | 30 |

**Response:**
```json
{
  "success": true,
  "message": "Importación completada: 5 menús creados",
  "data": {
    "total": 5,
    "successful": 5,
    "failed": 0,
    "skipped": 0,
    "errors": [],
    "createdMenus": [...]
  }
}
```

### 15. Ver reservaciones de un menú
```http
GET /api/weekly-menus/:id/reservations
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| status | string | Filtrar por estado |

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": {
    "reservations": [...],
    "stats": {
      "pending_count": 5,
      "confirmed_count": 8,
      "delivered_count": 2,
      "cancelled_count": 0,
      "total_quantity": 15,
      "total_revenue": "127.50"
    }
  }
}
```

### 16. Estadísticas de un menú
```http
GET /api/weekly-menus/:id/stats
```

### 17. Actualizar estado de reservación
```http
PATCH /api/weekly-menus/reservations/:reservationId/status
```

**Body:**
```json
{
  "status": "confirmed",
  "reason": "Opcional, para cancelaciones"
}
```

**Estados válidos:** `pending`, `confirmed`, `delivered`, `cancelled`

### 18. Ver lista de espera de un menú
```http
GET /api/weekly-menus/:id/waitlist
```

### 19. Ver demanda de un menú
```http
GET /api/weekly-menus/:id/demand
```

**Response:**
```json
{
  "success": true,
  "data": {
    "demand": {
      "menu_id": "uuid",
      "menu_date": "2025-11-25",
      "max_reservations": 30,
      "current_reservations": 30,
      "spots_available": 0,
      "waitlist_count": 5,
      "waitlist_quantity": 7,
      "total_demand": 37,
      "unmet_demand": 7,
      "demand_status": "full_with_demand"
    }
  }
}
```

**Estados de demanda:**
- `unlimited` - Sin límite de cupos
- `available` - Hay cupos disponibles
- `full` - Lleno, sin lista de espera
- `full_with_demand` - Lleno con demanda no satisfecha

### 20. Reporte de demanda general
```http
GET /api/weekly-menus/demand/report
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| from_date | date | Fecha inicial |
| to_date | date | Fecha final |
| unmet_only | boolean | Solo menús con demanda no satisfecha |

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": {
    "report": [
      {
        "menu_id": "uuid",
        "menu_date": "2025-11-25",
        "entry_description": "...",
        "main_course_description": "...",
        "max_reservations": 30,
        "current_reservations": 30,
        "waitlist_count": 5,
        "waitlist_quantity": 7,
        "total_demand": 37,
        "unmet_demand": 7,
        "occupancy_percentage": 100.0
      }
    ]
  }
}
```

### 21. Aumentar cupo de un menú
```http
PATCH /api/weekly-menus/:id/capacity
```

**Body:**
```json
{
  "max_reservations": 40,
  "notify_waitlist": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cupo actualizado a 40. 5 personas notificadas.",
  "data": {
    "menu": {...},
    "newSpotsAvailable": 10,
    "notifiedUsers": [
      {
        "user_id": "uuid",
        "email": "usuario@email.com",
        "full_name": "Juan Pérez",
        "quantity": 1
      }
    ]
  }
}
```

---

## Códigos de Error Comunes

| Código | Descripción |
|--------|-------------|
| 400 | Datos inválidos o restricción de negocio |
| 401 | No autenticado |
| 403 | Sin permisos suficientes |
| 404 | Recurso no encontrado |

---

## Flujo de Uso Típico

### Para Usuarios:
1. Ver menús disponibles: `GET /api/weekly-menus?available=true`
2. Reservar menú: `POST /api/weekly-menus/:id/reservations`
3. Si está lleno, unirse a lista de espera: `POST /api/weekly-menus/:id/waitlist`
4. Ver mis reservaciones: `GET /api/weekly-menus/user/my-reservations`

### Para Admin:
1. Crear menús de la semana: `POST /api/weekly-menus` o importar Excel
2. Ver demanda: `GET /api/weekly-menus/demand/report`
3. Si hay demanda no satisfecha, aumentar cupo: `PATCH /api/weekly-menus/:id/capacity`
4. Confirmar reservaciones: `PATCH /api/weekly-menus/reservations/:id/status`
5. Marcar como entregado: `PATCH /api/weekly-menus/reservations/:id/status`
