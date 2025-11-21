const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// =====================================================
// RUTAS DE CLIENTE (Customer)
// =====================================================

// Crear nuevo pedido
router.post('/', orderController.createOrder);

// Obtener mis pedidos (lista simple)
router.get('/my-orders', orderController.getMyOrders);

// Obtener mi historial de pedidos con paginación
router.get('/my-history', orderController.getMyOrderHistory);

// Obtener mis órdenes activas (pending, confirmed, preparing, ready)
router.get('/my-active', orderController.getMyActiveOrders);

// Obtener mis estadísticas de pedidos
router.get('/my-stats', orderController.getMyOrderStats);

// Reordenar (crear nueva orden basada en una anterior)
router.post('/:id/reorder', orderController.reorder);

// Obtener detalle de un pedido específico
router.get('/:id', orderController.getOrder);

// Cancelar mi pedido
router.delete('/:id', orderController.cancelOrder);

// =====================================================
// RUTAS DE ADMINISTRADOR (Admin)
// =====================================================

// Obtener todos los pedidos (lista simple)
router.get('/', restrictTo('admin'), orderController.getAllOrders);

// Obtener pedidos con paginación y filtros avanzados
router.get('/paginated', restrictTo('admin'), orderController.getOrdersPaginated);

// Obtener órdenes activas (para panel de preparación)
router.get('/active', restrictTo('admin'), orderController.getActiveOrders);

// Obtener órdenes del día
router.get('/today', restrictTo('admin'), orderController.getTodayOrders);

// Obtener estadísticas de pedidos
router.get('/stats/summary', restrictTo('admin'), orderController.getOrderStats);

// Buscar pedido por número de orden
router.get('/search/:orderNumber', restrictTo('admin'), orderController.searchByOrderNumber);

// Obtener órdenes de un cliente específico
router.get('/customer/:customerId', restrictTo('admin'), orderController.getCustomerOrders);

// Validar código QR de orden
router.post('/validate-qr', restrictTo('admin'), orderController.validateQR);

// Actualizar estado del pedido
router.patch('/:id/status', restrictTo('admin'), orderController.updateOrderStatus);

// Actualizar notas del pedido
router.patch('/:id/notes', restrictTo('admin'), orderController.updateOrderNotes);

// Actualizar tiempo estimado de preparación
router.patch('/:id/estimated-time', restrictTo('admin'), orderController.updateEstimatedTime);

module.exports = router;
