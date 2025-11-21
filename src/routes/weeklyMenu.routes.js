const express = require('express');
const router = express.Router();
const weeklyMenuController = require('../controllers/weeklyMenuController');
const { protect, restrictTo } = require('../middleware/auth');

// ===================== RUTAS PÚBLICAS =====================
router.get('/', weeklyMenuController.getAllMenus);
router.get('/current-week', weeklyMenuController.getCurrentWeekMenus);
router.get('/:id', weeklyMenuController.getMenu);

// ===================== RUTAS PROTEGIDAS =====================
router.use(protect);

// Reservaciones del usuario
router.get('/user/my-reservations', weeklyMenuController.getMyReservations);
router.post('/:id/reservations', weeklyMenuController.createReservation);
router.patch('/reservations/:reservationId/cancel', weeklyMenuController.cancelReservation);

// ===================== RUTAS ADMIN =====================
router.use(restrictTo('admin'));

// CRUD de menús
router.post('/', weeklyMenuController.createMenu);
router.put('/:id', weeklyMenuController.updateMenu);
router.delete('/:id', weeklyMenuController.deleteMenu);

// Gestión de reservaciones (admin)
router.get('/:id/reservations', weeklyMenuController.getMenuReservations);
router.get('/:id/stats', weeklyMenuController.getMenuStats);
router.patch('/reservations/:reservationId/status', weeklyMenuController.updateReservationStatus);

module.exports = router;
