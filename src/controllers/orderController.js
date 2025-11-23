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

  if (!payment_method || !['cash', 'card', 'credit', 'yape', 'plin'].includes(payment_method)) {
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

// @desc    Buscar pedido por número de orden
// @route   GET /api/orders/search/:orderNumber
// @access  Private/Admin
exports.searchByOrderNumber = catchAsync(async (req, res, next) => {
  const order = await Order.findByOrderNumber(req.params.orderNumber);

  if (!order) {
    return next(new AppError('Pedido no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    data: { order }
  });
});

// @desc    Obtener órdenes activas (para panel de preparación)
// @route   GET /api/orders/active
// @access  Private/Admin
exports.getActiveOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.findActiveOrders();

  res.status(200).json({
    success: true,
    count: orders.length,
    data: { orders }
  });
});

// @desc    Obtener órdenes del día
// @route   GET /api/orders/today
// @access  Private/Admin
exports.getTodayOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.findTodayOrders();

  res.status(200).json({
    success: true,
    count: orders.length,
    data: { orders }
  });
});

// @desc    Obtener órdenes con paginación
// @route   GET /api/orders/paginated
// @access  Private/Admin
exports.getOrdersPaginated = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const filters = {
    status: req.query.status,
    payment_method: req.query.payment_method,
    payment_status: req.query.payment_status,
    is_credit_order: req.query.is_credit_order === 'true' ? true : req.query.is_credit_order === 'false' ? false : undefined,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    user_id: req.query.user_id,
    search: req.query.search
  };

  const result = await Order.findAllPaginated(filters, page, limit);

  res.status(200).json({
    success: true,
    data: result
  });
});

// @desc    Actualizar notas del pedido
// @route   PATCH /api/orders/:id/notes
// @access  Private/Admin
exports.updateOrderNotes = catchAsync(async (req, res, next) => {
  const { notes } = req.body;

  const order = await Order.updateNotes(req.params.id, notes);

  if (!order) {
    return next(new AppError('Pedido no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    data: { order }
  });
});

// @desc    Actualizar tiempo estimado de preparación
// @route   PATCH /api/orders/:id/estimated-time
// @access  Private/Admin
exports.updateEstimatedTime = catchAsync(async (req, res, next) => {
  const { estimated_ready_time } = req.body;

  if (!estimated_ready_time) {
    return next(new AppError('El tiempo estimado es requerido', 400));
  }

  const order = await Order.updateEstimatedTime(req.params.id, estimated_ready_time);

  if (!order) {
    return next(new AppError('Pedido no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    data: { order }
  });
});

// @desc    Validar QR code de orden
// @route   POST /api/orders/validate-qr
// @access  Private/Admin
exports.validateQR = catchAsync(async (req, res, next) => {
  const { qr_code } = req.body;

  if (!qr_code) {
    return next(new AppError('El código QR es requerido', 400));
  }

  const order = await Order.validateQR(qr_code);

  if (!order) {
    return next(new AppError('Código QR inválido', 404));
  }

  res.status(200).json({
    success: true,
    data: { order }
  });
});

// @desc    Reordenar (crear nueva orden basada en una anterior)
// @route   POST /api/orders/:id/reorder
// @access  Private
exports.reorder = catchAsync(async (req, res, next) => {
  const originalOrder = await Order.findById(req.params.id);

  if (!originalOrder) {
    return next(new AppError('Pedido original no encontrado', 404));
  }

  // Verificar que el usuario sea dueño del pedido
  if (originalOrder.user_id !== req.user.user_id && req.user.role !== 'admin') {
    return next(new AppError('No tienes permiso para reordenar este pedido', 403));
  }

  const newOrder = await Order.reorder(req.params.id, req.user.user_id);

  res.status(201).json({
    success: true,
    message: 'Pedido creado exitosamente',
    data: { order: newOrder }
  });
});

// @desc    Obtener historial de mis órdenes con paginación
// @route   GET /api/orders/my-history
// @access  Private
exports.getMyOrderHistory = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await Order.findUserHistory(req.user.user_id, page, limit);

  res.status(200).json({
    success: true,
    data: result
  });
});

// @desc    Obtener mis estadísticas de órdenes
// @route   GET /api/orders/my-stats
// @access  Private
exports.getMyOrderStats = catchAsync(async (req, res, next) => {
  const stats = await Order.getUserStats(req.user.user_id);

  res.status(200).json({
    success: true,
    data: { stats }
  });
});

// @desc    Obtener mis órdenes activas
// @route   GET /api/orders/my-active
// @access  Private
exports.getMyActiveOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.findActiveOrders({ user_id: req.user.user_id });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: { orders }
  });
});

// @desc    Obtener órdenes de un cliente específico (Admin)
// @route   GET /api/orders/customer/:customerId
// @access  Private/Admin
exports.getCustomerOrders = catchAsync(async (req, res, next) => {
  const filters = {
    status: req.query.status
  };

  const orders = await Order.findByCustomer(req.params.customerId, filters);

  res.status(200).json({
    success: true,
    count: orders.length,
    data: { orders }
  });
});