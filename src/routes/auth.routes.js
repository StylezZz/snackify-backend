const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas protegidas (requieren autenticación)
router.use(protect); // Aplica a todas las rutas siguientes

router.get('/me', authController.getMe);
router.put('/update-password', authController.updatePassword);
router.put('/update-profile', authController.updateProfile);

module.exports = router;