const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const excelImportController = require('../controllers/excelImportController');
const { protect, restrictTo } = require('../middleware/auth');

const multer = require('multer');
const { importUsers } = require('../controllers/excelImportController');
const upload = multer({storage: multer.memoryStorage()});

// Todas las rutas requieren autenticación y rol de admin
router.use(protect, restrictTo('admin'));

router.post('/import', upload.single('file'), excelImportController.importUsers);
router.get('/import/template', excelImportController.downloadTemplate);
router.get('/', userController.getAllUsers);
router.get('/with-debt', userController.getUsersWithDebt);
router.get('/:id', userController.getUser);
router.post('/:id/suspend', userController.suspendUser);
router.post('/:id/reactivate', userController.reactivateUser);

module.exports = router;