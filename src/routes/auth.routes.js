const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas de recuperación de contraseña (públicas)
router.post('/forgot-password', authController.forgotPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas (requieren autenticación)
router.use(protect); // Aplica a todas las rutas siguientes

router.get('/me', authController.getMe);
router.put('/update-password', authController.updatePassword);
router.put('/update-profile', authController.updateProfile);

module.exports = router;