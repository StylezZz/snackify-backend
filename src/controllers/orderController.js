const Order = require('../models/Order');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// @desc    Crear nuevo pedido
// @route   POST /api/orders
// @access  Private
exports.createOrder = catchAsync(async (req, res, next) => {
  const { payment_method, notes, estimated_ready_time, items } = req.body;

  // Validaciones
  if (!items || items.length === 0) {
    return next(new AppError('El pedido debe tener al menos un producto', 400));
  }

  if (!payment_method || !['cash', 'card', 'credit'].includes(payment_method)) {
    return next(new AppError('Método de pago inválido', 400));
  }

  // Validar items
  for (const item of items) {
    if (!item.product_id || !item.quantity || item.quantity < 1) {
      return next(new AppError('Items inválidos en el pedido', 400));
    }
  }

  const orderData = {
    user_id: req.user.user_id,
    payment_method,
    notes,
    estimated_ready_time
  };

  const order = await Order.create(orderData, items);

  res.status(201).json({
    success: true,
    data: {
      order
    }
  });
});

// @desc    Obtener mis pedidos
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const filters = {
    status: req.query.status,
    payment_method: req.query.payment_method
  };

  const orders = await Order.findByUser(req.user.user_id, filters);

  res.status(200).json({
    success: true,
    count: orders.length,
    data: {
      orders
    }
  });
});

// @desc    Obtener pedido por ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Pedido no encontrado', 404));
  }

  // Verificar que el usuario sea dueño del pedido o admin
  if (order.user_id !== req.user.user_id && req.user.role !== 'admin') {
    return next(new AppError('No tienes permiso para ver este pedido', 403));
  }

  res.status(200).json({
    success: true,
    data: {
      order
    }
  });
});

// @desc    Obtener todos los pedidos (Admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const filters = {
    status: req.query.status,
    payment_method: req.query.payment_method,
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const orders = await Order.findAll(filters);

  res.status(200).json({
    success: true,
    count: orders.length,
    data: {
      orders
    }
  });
});

// @desc    Actualizar estado del pedido
// @route   PATCH /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    return next(new AppError('El estado es requerido', 400));
  }

  const order = await Order.updateStatus(req.params.id, status);

  if (!order) {
    return next(new AppError('Pedido no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      order
    }
  });
});

// @desc    Cancelar pedido
// @route   DELETE /api/orders/:id
// @access  Private
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Pedido no encontrado', 404));
  }

  // Verificar permisos
  if (order.user_id !== req.user.user_id && req.user.role !== 'admin') {
    return next(new AppError('No tienes permiso para cancelar este pedido', 403));
  }

  const cancelledOrder = await Order.cancel(req.params.id, reason || 'Cancelado por el usuario');

  res.status(200).json({
    success: true,
    message: 'Pedido cancelado correctamente',
    data: {
      order: cancelledOrder
    }
  });
});

// @desc    Obtener estadísticas de pedidos
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = catchAsync(async (req, res, next) => {
  const dateFrom = req.query.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = req.query.date_to || new Date();

  const stats = await Order.getStats(dateFrom, dateTo);

  res.status(200).json({
    success: true,
    data: {
      stats,
      period: {
        from: dateFrom,
        to: dateTo
      }
    }
  });
});