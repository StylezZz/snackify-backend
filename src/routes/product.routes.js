const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({storage: multer.memoryStorage()});

// Rutas públicas
router.get('/',productController.getAllProducts);
router.get('/search/:term', productController.searchProducts);
router.get('/category/:categoryId', productController.getProductsByCategory);
router.get('/:id', productController.getProduct);

// Rutas protegidas (solo admin)
//router.use(protect, restrictTo('admin'));

router.post('/', upload.single("imagen"), productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/stock', productController.updateStock);
router.delete('/:id', productController.deleteProduct);
router.get('/low-stock/list', productController.getLowStockProducts);

module.exports = router;