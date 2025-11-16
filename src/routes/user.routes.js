const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol de admin
router.use(protect, restrictTo('admin'));

router.get('/', userController.getAllUsers);
router.get('/with-debt', userController.getUsersWithDebt);
router.get('/:id', userController.getUser);
router.post('/:id/suspend', userController.suspendUser);
router.post('/:id/reactivate', userController.reactivateUser);

module.exports = router;