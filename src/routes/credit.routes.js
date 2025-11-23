const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditController');
const { protect, restrictTo } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// =====================================================
// RUTAS DE CLIENTE
// =====================================================

// Obtener mi estado de cuenta de crédito
router.get('/my-account', creditController.getMyAccount);

// Verificar disponibilidad de crédito antes de hacer un pedido
router.post('/check-availability', creditController.checkCreditAvailability);

// Obtener mi historial crediticio completo
router.get('/my-history', creditController.getCreditHistory);

// Obtener mis pedidos fiados pendientes
router.get('/my-pending-orders', creditController.getPendingOrders);

// Pagar mi deuda (nuevo)
router.post('/my-payment', creditController.payMyDebt);

// Obtener mi reporte de gastos fiados (nuevo)
router.get('/my-report', creditController.getMyCreditReport);

// =====================================================
// RUTAS DE ADMINISTRADOR
// =====================================================
router.use(restrictTo('admin'));

// Registrar pago de deuda (admin registra por el cliente)
router.post('/payment', creditController.registerPayment);

// Obtener historial de pagos de un usuario
router.get('/payments/:userId', creditController.getPaymentHistory);

// Obtener historial crediticio de un usuario
router.get('/history/:userId', creditController.getCreditHistory);

// Obtener pedidos fiados pendientes de un usuario
router.get('/pending-orders/:userId', creditController.getPendingOrders);

// Obtener todos los usuarios con deuda
router.get('/users-with-debt', creditController.getUsersWithDebt);

// Generar reporte de deudas
router.get('/debt-report', creditController.generateDebtReport);

// Obtener resumen mensual de créditos
router.get('/monthly-summary', creditController.getMonthlySummary);

// Obtener reporte de gastos fiados de un usuario específico (nuevo)
router.get('/user-report/:userId', creditController.getUserReport);

// Activar cuenta de crédito de un usuario
router.post('/enable/:userId', creditController.enableCreditAccount);

// Desactivar cuenta de crédito de un usuario
router.post('/disable/:userId', creditController.disableCreditAccount);

// Actualizar límite de crédito de un usuario
router.patch('/update-limit/:userId', creditController.updateCreditLimit);

// Ajustar deuda manualmente
router.post('/adjust-debt/:userId', creditController.adjustDebt);

module.exports = router;