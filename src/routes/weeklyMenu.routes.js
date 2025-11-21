const express = require('express');
const router = express.Router();
const weeklyMenuController = require('../controllers/weeklyMenuController');
const { protect, restrictTo } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// ===================== RUTAS PÚBLICAS =====================
router.get('/', weeklyMenuController.getAllMenus);
router.get('/current-week', weeklyMenuController.getCurrentWeekMenus);
router.get('/:id', weeklyMenuController.getMenu);

// ===================== RUTAS PROTEGIDAS =====================
router.use(protect);

// Reservaciones del usuario
router.get('/user/my-reservations', weeklyMenuController.getMyReservations);
router.get('/user/my-waitlist', weeklyMenuController.getMyWaitlist);
router.post('/:id/reservations', weeklyMenuController.createReservation);
router.patch('/reservations/:reservationId/cancel', weeklyMenuController.cancelReservation);

// Lista de espera (usuario)
router.post('/:id/waitlist', weeklyMenuController.addToWaitlist);
router.delete('/waitlist/:waitlistId', weeklyMenuController.cancelWaitlistEntry);

// ===================== RUTAS ADMIN =====================
router.use(restrictTo('admin'));

// CRUD de menús
router.post('/', weeklyMenuController.createMenu);
router.put('/:id', weeklyMenuController.updateMenu);
router.delete('/:id', weeklyMenuController.deleteMenu);

// Importación Excel
router.get('/template', weeklyMenuController.downloadMenuTemplate);
router.post('/import', upload.single('file'), weeklyMenuController.importMenusFromExcel);

// Gestión de reservaciones (admin)
router.get('/:id/reservations', weeklyMenuController.getMenuReservations);
router.get('/:id/stats', weeklyMenuController.getMenuStats);
router.patch('/reservations/:reservationId/status', weeklyMenuController.updateReservationStatus);

// Demanda y lista de espera (admin)
router.get('/demand/report', weeklyMenuController.getDemandReport);
router.get('/:id/waitlist', weeklyMenuController.getMenuWaitlist);
router.get('/:id/demand', weeklyMenuController.getMenuDemand);
router.patch('/:id/capacity', weeklyMenuController.updateMenuCapacity);

module.exports = router;
