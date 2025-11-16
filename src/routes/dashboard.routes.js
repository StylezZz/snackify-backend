const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol de admin
router.use(protect, restrictTo('admin'));

router.get('/summary', dashboardController.getDashboardSummary);
router.get('/daily-sales', dashboardController.getDailySales);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/orders-by-status', dashboardController.getOrdersByStatus);
router.get('/revenue-by-payment', dashboardController.getRevenueByPayment);
router.get('/alerts', dashboardController.getSystemAlerts);

module.exports = router;