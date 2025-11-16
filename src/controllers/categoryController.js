const Category = require('../models/Category');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// @desc    Obtener todas las categorías
// @route   GET /api/categories
// @access  Public
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const includeInactive = req.query.includeInactive === 'true';
  const categories = await Category.findAll(includeInactive);

  res.status(200).json({
    success: true,
    count: categories.length,
    data: {
      categories
    }
  });
});

// @desc    Obtener categoría por ID
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('Categoría no encontrada', 404));
  }

  // Obtener conteo de productos
  const productCount = await Category.getProductCount(req.params.id);

  res.status(200).json({
    success: true,
    data: {
      category: {
        ...category,
        product_count: productCount
      }
    }
  });
});

// @desc    Crear nueva categoría
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = catchAsync(async (req, res, next) => {
  const { name, description, icon_url, display_order } = req.body;

  if (!name) {
    return next(new AppError('El nombre de la categoría es requerido', 400));
  }

  const category = await Category.create({
    name,
    description,
    icon_url,
    display_order
  });

  res.status(201).json({
    success: true,
    data: {
      category
    }
  });
});

// @desc    Actualizar categoría
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('Categoría no encontrada', 404));
  }

  const updatedCategory = await Category.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: {
      category: updatedCategory
    }
  });
});

// @desc    Eliminar categoría (soft delete)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('Categoría no encontrada', 404));
  }

  await Category.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Categoría desactivada correctamente'
  });
});