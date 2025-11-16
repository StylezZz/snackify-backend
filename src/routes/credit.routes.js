const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditController');
const { protect, restrictTo } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas de usuario (propias)
router.get('/my-account', creditController.getMyAccount);
router.post('/check-availability', creditController.checkCreditAvailability);
router.get('/history/:userId', creditController.getCreditHistory);
router.get('/pending-orders/:userId', creditController.getPendingOrders);

// Rutas de admin
router.use(restrictTo('admin'));

router.post('/payment', creditController.registerPayment);
router.get('/payments/:userId', creditController.getPaymentHistory);
router.get('/users-with-debt', creditController.getUsersWithDebt);
router.get('/debt-report', creditController.generateDebtReport);
router.get('/monthly-summary', creditController.getMonthlySummary);

router.post('/enable/:userId', creditController.enableCreditAccount);
router.post('/disable/:userId', creditController.disableCreditAccount);
router.patch('/update-limit/:userId', creditController.updateCreditLimit);
router.post('/adjust-debt/:userId', creditController.adjustDebt);

module.exports = router;