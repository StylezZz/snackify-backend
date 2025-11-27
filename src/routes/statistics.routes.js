const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { protect, restrictTo } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol de admin
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard principal (todos los datos en una sola llamada)
router.get('/dashboard', statisticsController.getDashboard);

// Resumen general
router.get('/summary', statisticsController.getSalesSummary);

// Productos y categorías
router.get('/top-products', statisticsController.getTopProducts);
router.get('/top-categories', statisticsController.getTopCategories);
router.get('/top-menus', statisticsController.getTopWeeklyMenus);

// Ventas por tiempo
router.get('/sales-by-day', statisticsController.getSalesByDay);
router.get('/sales-by-hour', statisticsController.getSalesByHour);
router.get('/sales-trend', statisticsController.getSalesTrend);

// Clientes
router.get('/top-customers', statisticsController.getTopCustomers);

// Métodos de pago
router.get('/payment-methods', statisticsController.getPaymentMethodsStats);

// Tiempos de entrega
router.get('/delivery-times', statisticsController.getDeliveryTimeStats);

// Reporte completo
router.get('/complete-report', statisticsController.getCompleteReport);

module.exports = router;
