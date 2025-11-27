# 📚 Documentación de Endpoints - Snackify Backend

## 📋 Tabla de Contenidos
- [Autenticación](#-autenticación)
- [Usuarios](#-usuarios)
- [Productos](#-productos)
- [Categorías](#-categorías)
- [Órdenes](#-órdenes)
- [Crédito](#-crédito)
- [Estadísticas](#-estadísticas-nuevo)
- [Dashboard](#-dashboard)
- [Menús Semanales](#-menús-semanales)

---

## 🔐 Autenticación

### Base URL: `/api/auth`

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| POST | `/register` | Registrar nuevo usuario | Público |
| POST | `/login` | Iniciar sesión | Público |
| GET | `/me` | Obtener perfil del usuario autenticado | Privado |
| POST | `/logout` | Cerrar sesión | Privado |
| POST | `/forgot-password` | Solicitar reseteo de contraseña | Público |
| POST | `/reset-password/:token` | Resetear contraseña | Público |

---

## 👤 Usuarios

### Base URL: `/api/users`

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| GET | `/` | Obtener todos los usuarios | Admin |
| GET | `/:id` | Obtener usuario por ID | Admin |
| PATCH | `/:id` | Actualizar usuario | Admin |
| DELETE | `/:id` | Eliminar usuario | Admin |
| PATCH | `/me/update` | Actualizar mi perfil | Privado |
| PATCH | `/me/password` | Cambiar mi contraseña | Privado |
| POST | `/:id/suspend` | Suspender cuenta de usuario | Admin |
| POST | `/:id/activate` | Activar cuenta de usuario | Admin |

---

## 🍕 Productos

### Base URL: `/api/products`

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| GET | `/` | Listar todos los productos | Público |
| GET | `/available` | Obtener productos disponibles | Público |
| GET | `/category/:categoryId` | Productos por categoría | Público |
| GET | `/:id` | Obtener producto por ID | Público |
| POST | `/` | Crear nuevo producto | Admin |
| PATCH | `/:id` | Actualizar producto | Admin |
| DELETE | `/:id` | Eliminar producto | Admin |
| PATCH | `/:id/stock` | Actualizar stock | Admin |
| PATCH | `/:id/availability` | Cambiar disponibilidad | Admin |
| POST | `/:id/upload-image` | Subir imagen del producto | Admin |

---

## 📦 Categorías

### Base URL: `/api/categories`

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| GET | `/` | Listar todas las categorías | Público |
| GET | `/:id` | Obtener categoría por ID | Público |
| POST | `/` | Crear nueva categoría | Admin |
| PATCH | `/:id` | Actualizar categoría | Admin |
| DELETE | `/:id` | Eliminar categoría | Admin |

---

## 🛒 Órdenes

### Base URL: `/api/orders`

### Endpoints para Clientes

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| POST | `/` | **Crear nuevo pedido** | Privado |
| GET | `/my-orders` | Mis pedidos | Privado |
| GET | `/my-history` | Mi historial (paginado) | Privado |
| GET | `/my-active` | Mis pedidos activos | Privado |
| GET | `/my-stats` | Mis estadísticas | Privado |
| GET | `/:id` | Ver detalle de mi pedido | Privado |
| POST | `/:id/reorder` | Repetir pedido anterior | Privado |
| DELETE | `/:id` | Cancelar mi pedido | Privado |

### Endpoints para Administrador

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| GET | `/` | Todas las órdenes | Admin |
| GET | `/paginated` | Órdenes paginadas | Admin |
| GET | `/active` | Órdenes activas | Admin |
| GET | `/today` | Órdenes del día | Admin |
| GET | `/customer/:customerId` | Órdenes de un cliente | Admin |
| PATCH | `/:id/status` | Cambiar estado de pedido | Admin |
| PATCH | `/:id/notes` | Actualizar notas | Admin |
| PATCH | `/:id/estimated-time` | Actualizar tiempo estimado | Admin |
| POST | `/validate-qr` | Validar código QR | Admin |
| GET | `/search/:orderNumber` | Buscar por número de orden | Admin |

### 📝 Crear Pedido (POST `/api/orders`)

**Body:**
```json
{
  "payment_method": "credit",  // cash, card, credit, yape, plin
  "notes": "Sin picante por favor",
  "estimated_ready_time": "2024-11-27T15:30:00Z",  // Opcional
  "items": [
    {
      "product_id": "uuid-del-producto",
      "quantity": 2,
      "customizations": "Sin cebolla"  // Opcional
    },
    {
      "product_id": "uuid-del-producto-2",
      "quantity": 1
    }
  ]
}
```

### ⚠️ Validación de Límite de Crédito

Cuando se crea un pedido con `payment_method: "credit"`, el sistema verifica:

1. ✅ Usuario tiene cuenta de crédito activada
2. ✅ Cuenta de usuario está activa (no suspendida)
3. ✅ El monto del pedido no excede el crédito disponible

**Ejemplo de validación:**
- Límite de crédito: S/100.00
- Deuda actual: S/93.00
- Crédito disponible: S/7.00
- Pedido de S/17.00 → ❌ **BLOQUEADO**

**Mensaje de error:**
```json
{
  "success": false,
  "error": "Crédito insuficiente. Tu límite de crédito es S/100.00, debes actualmente S/93.00, y este pedido es de S/17.00. Solo tienes S/7.00 disponibles. Paga tu deuda para poder realizar más pedidos."
}
```

---

## 💳 Crédito

### Base URL: `/api/credits`

### Endpoints para Clientes

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| GET | `/my-account` | Ver mi estado de cuenta | Privado |
| GET | `/history/:userId` | Mi historial de crédito | Privado |
| POST | `/check-availability` | Verificar crédito disponible | Privado |

### Endpoints para Administrador

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| POST | `/enable/:userId` | Activar cuenta de crédito | Admin |
| POST | `/disable/:userId` | Desactivar cuenta de crédito | Admin |
| PATCH | `/update-limit/:userId` | Actualizar límite de crédito | Admin |
| POST | `/payment` | Registrar pago de deuda | Admin |
| GET | `/payments/:userId` | Historial de pagos | Admin |
| GET | `/users-with-debt` | Usuarios con deuda | Admin |
| GET | `/debt-report` | Reporte de deudas | Admin |
| POST | `/adjust-debt/:userId` | Ajustar deuda manualmente | Admin |
| GET | `/monthly-summary` | Resumen mensual | Admin |

---

## 📊 Estadísticas ⭐ **NUEVO**

### Base URL: `/api/statistics`

Todos los endpoints requieren autenticación y rol de **Admin**.

### 🎯 Dashboard Principal

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/dashboard` | **Dashboard completo** - Todos los datos en una sola llamada |

**Query Parameters opcionales:**
- `date_from` - Fecha inicio (formato ISO)
- `date_to` - Fecha fin (formato ISO)

**Respuesta incluye:**
- Resumen general de ventas
- Top 5 productos más vendidos
- Top 5 categorías
- Ventas de los últimos 7 días
- Ventas por hora del día
- Métodos de pago más usados
- Top 5 clientes
- Estadísticas de tiempo de entrega

---

### 📈 Endpoints Específicos

#### 1. Resumen General

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/summary` | Resumen general de ventas |

**Respuesta incluye:**
- Total de órdenes (todas, entregadas, canceladas, activas)
- Ingresos totales y valor promedio de orden
- Órdenes por método de pago (cantidad y monto)
- Clientes únicos
- Total de items vendidos

---

#### 2. Productos

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| GET | `/top-products` | Productos más vendidos | `limit`, `date_from`, `date_to` |

**Datos por producto:**
- Nombre y foto
- Categoría
- Cantidad total vendida
- Veces ordenado
- Ingresos generados
- Precio promedio

---

#### 3. Categorías

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| GET | `/top-categories` | Categorías más vendidas | `limit`, `date_from`, `date_to` |

**Datos por categoría:**
- Nombre y descripción
- Veces ordenado
- Items vendidos
- Ingresos generados
- Cantidad de productos en la categoría

---

#### 4. Menús Semanales

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| GET | `/top-menus` | Menús más vendidos | `limit`, `date_from`, `date_to` |

**Datos por menú:**
- Nombre del menú
- Semana y año
- Veces ordenado
- Items vendidos
- Ingresos generados

---

#### 5. Ventas por Tiempo

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| GET | `/sales-by-day` | Días con más ventas | `limit`, `date_from`, `date_to` |
| GET | `/sales-by-hour` | Ventas por hora del día | `date_from`, `date_to` |
| GET | `/sales-trend` | Tendencia mensual de ventas | `months` (default: 12) |

**Ventas por día incluye:**
- Fecha y nombre del día
- Total de órdenes
- Ingresos totales
- Valor promedio de orden
- Ingresos por cada método de pago

**Ventas por hora incluye:**
- Hora del día (0-23)
- Total de órdenes
- Ingresos totales
- Valor promedio

---

#### 6. Clientes

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| GET | `/top-customers` | Clientes más frecuentes | `limit`, `date_from`, `date_to` |

**Datos por cliente:**
- Nombre, email, teléfono
- Total de órdenes
- Total gastado
- Valor promedio de orden
- Fecha de última orden
- Estado de cuenta de crédito
- Deuda actual

---

#### 7. Métodos de Pago

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| GET | `/payment-methods` | Estadísticas de métodos de pago | `date_from`, `date_to` |

**Datos por método:**
- Método de pago
- Total de órdenes
- Ingresos generados
- Valor promedio de orden
- Porcentaje del total

---

#### 8. Tiempos de Entrega

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| GET | `/delivery-times` | Estadísticas de tiempos de entrega | `date_from`, `date_to` |

**Datos incluyen:**
- Tiempo promedio de entrega (minutos)
- Tiempo mínimo
- Tiempo máximo
- Mediana
- Total de órdenes entregadas

---

#### 9. Reporte Completo

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| GET | `/complete-report` | Reporte completo para exportar | `date_from`, `date_to` |

**Incluye todos los datos:**
- Resumen general
- Top productos (5)
- Top clientes (5)
- Top categorías (5)
- Ventas de últimos 7 días
- Métodos de pago
- Estadísticas de entrega
- Periodo del reporte
- Fecha de generación

---

### 📊 Ejemplos de Uso

#### Ejemplo 1: Dashboard del mes actual
```bash
GET /api/statistics/dashboard?date_from=2024-11-01&date_to=2024-11-30
```

#### Ejemplo 2: Top 20 productos de la semana
```bash
GET /api/statistics/top-products?limit=20&date_from=2024-11-20&date_to=2024-11-27
```

#### Ejemplo 3: Ventas de hoy por hora
```bash
GET /api/statistics/sales-by-hour?date_from=2024-11-27T00:00:00Z&date_to=2024-11-27T23:59:59Z
```

#### Ejemplo 4: Tendencia de los últimos 6 meses
```bash
GET /api/statistics/sales-trend?months=6
```

#### Ejemplo 5: Reporte completo del año
```bash
GET /api/statistics/complete-report?date_from=2024-01-01&date_to=2024-12-31
```

---

## 📊 Dashboard

### Base URL: `/api/dashboard`

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| GET | `/overview` | Vista general del dashboard | Admin |
| GET | `/recent-activity` | Actividad reciente | Admin |

---

## 🍽️ Menús Semanales

### Base URL: `/api/weekly-menus`

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| GET | `/` | Listar todos los menús | Público |
| GET | `/current` | Menú de la semana actual | Público |
| GET | `/:id` | Obtener menú por ID | Público |
| POST | `/` | Crear nuevo menú semanal | Admin |
| PATCH | `/:id` | Actualizar menú | Admin |
| DELETE | `/:id` | Eliminar menú | Admin |
| POST | `/:id/items` | Agregar items al menú | Admin |
| DELETE | `/:id/items/:itemId` | Quitar item del menú | Admin |

---

## 🔑 Autenticación

Todos los endpoints privados requieren un token JWT en el header:

```
Authorization: Bearer {token}
```

El token se obtiene al iniciar sesión con `POST /api/auth/login`.

---

## 👥 Roles de Usuario

- **customer**: Usuario normal (puede crear pedidos, ver su cuenta)
- **admin**: Administrador (acceso completo a todos los endpoints)

---

## 📝 Estados de Pedidos

- `pending` - Pendiente de confirmación
- `confirmed` - Confirmado
- `preparing` - En preparación
- `ready` - Listo para entrega
- `delivered` - Entregado
- `cancelled` - Cancelado

---

## 💰 Métodos de Pago

- `cash` - Efectivo
- `card` - Tarjeta
- `credit` - Fiado (requiere cuenta de crédito activada)
- `yape` - Yape
- `plin` - Plin

---

## ✅ Estados de Pago

- `pending` - Pendiente (pedidos a crédito)
- `partial` - Pago parcial (pedidos a crédito con abonos)
- `paid` - Pagado

---

## 📌 Notas Importantes

1. **Límite de Crédito**: Los usuarios deben tener su cuenta de crédito activada por un admin para poder hacer pedidos fiados.

2. **Validación Automática**: Al crear un pedido a crédito, el sistema automáticamente valida que el usuario tenga crédito disponible suficiente.

3. **Suspensión Automática**: Los usuarios con deudas muy altas pueden ser suspendidos automáticamente.

4. **QR Codes**: Cada pedido genera un código QR único para validación.

5. **Historial Completo**: Todos los movimientos de crédito quedan registrados en el historial para auditoría.

6. **Estadísticas en Tiempo Real**: Los endpoints de estadísticas usan datos actualizados y permiten filtros personalizados.

7. **Reportes Exportables**: El endpoint `/complete-report` genera reportes listos para exportar a PDF o Excel.

---

## 🚀 Base URL

```
http://localhost:5000
```

O la URL de producción configurada en las variables de entorno.

---

## 📞 Soporte

Para más información o soporte técnico, contacta al equipo de desarrollo.

**Versión**: 1.0.0
**Última actualización**: 2024-11-27
