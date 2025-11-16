const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas de usuario
router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/:id', orderController.getOrder);
router.delete('/:id', orderController.cancelOrder);

// Rutas de admin
router.get('/', restrictTo('admin'), orderController.getAllOrders);
router.patch('/:id/status', restrictTo('admin'), orderController.updateOrderStatus);
router.get('/stats/summary', restrictTo('admin'), orderController.getOrderStats);

module.exports = router;