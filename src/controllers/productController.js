const Product = require('../models/Product');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const {uploadImageToS3} = require('../services/imageService');
// @desc    Obtener todos los productos
// @route   GET /api/products
// @access  Public
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const filters = {
    category_id: req.query.category,
    is_available: req.query.available === 'true' ? true : req.query.available === 'false' ? false : undefined,
    search: req.query.search,
    min_price: req.query.min_price,
    max_price: req.query.max_price,
    low_stock: req.query.low_stock === 'true'
  };

  const products = await Product.findAll(filters);

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products
    }
  });
});

// @desc    Obtener producto por ID
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Producto no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      product
    }
  });
});

// @desc    Crear nuevo producto
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = catchAsync(async (req, res, next) => {
  const {
    category_id,
    name,
    description,
    price
  } = req.body;

  // Validaciones
  if (!category_id || !name || !price) {
    return next(new AppError('Categoría, nombre y precio son requeridos', 400));
  }

  if (price < 0) {
    return next(new AppError('El precio no puede ser negativo', 400));
  }

  let image_url = null;

  if(req.file){
    try{
      image_url = await uploadImageToS3(req.file);
    }catch(error){
      return next(new AppError('Error subiendo imagen a S3', 500));
    }
  }

  const product = await Product.create({
    category_id,
    name,
    description,
    price,
    image_url
  });

  res.status(201).json({
    success: true,
    data: {
      product
    }
  });
});

// @desc    Actualizar producto
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Producto no encontrado', 404));
  }

  // Validar precio si se actualiza
  if (req.body.price !== undefined && req.body.price < 0) {
    return next(new AppError('El precio no puede ser negativo', 400));
  }

  const updatedProduct = await Product.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: {
      product: updatedProduct
    }
  });
});

// @desc    Actualizar stock de producto
// @route   PATCH /api/products/:id/stock
// @access  Private/Admin
exports.updateStock = catchAsync(async (req, res, next) => {
  const { quantity, movement_type } = req.body;

  if (quantity === undefined) {
    return next(new AppError('La cantidad es requerida', 400));
  }

  const product = await Product.updateStock(
    req.params.id,
    parseInt(quantity),
    movement_type || 'adjustment'
  );

  res.status(200).json({
    success: true,
    data: {
      product
    }
  });
});

// @desc    Eliminar producto (soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Producto no encontrado', 404));
  }

  await Product.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Producto desactivado correctamente'
  });
});

// @desc    Obtener productos con stock bajo
// @route   GET /api/products/low-stock
// @access  Private/Admin
exports.getLowStockProducts = catchAsync(async (req, res, next) => {
  const products = await Product.getLowStockProducts();

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products
    }
  });
});

// @desc    Buscar productos
// @route   GET /api/products/search/:term
// @access  Public
exports.searchProducts = catchAsync(async (req, res, next) => {
  const { term } = req.params;
  const limit = parseInt(req.query.limit) || 20;

  if (!term || term.length < 2) {
    return next(new AppError('El término de búsqueda debe tener al menos 2 caracteres', 400));
  }

  const products = await Product.search(term, limit);

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products
    }
  });
});

// @desc    Obtener productos por categoría
// @route   GET /api/products/category/:categoryId
// @access  Public
exports.getProductsByCategory = catchAsync(async (req, res, next) => {
  const products = await Product.getByCategory(req.params.categoryId);

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products
    }
  });
});