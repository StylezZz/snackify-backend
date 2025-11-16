const Credit = require('../models/Credit');
const User = require('../models/User');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// @desc    Registrar pago de deuda
// @route   POST /api/credit/payment
// @access  Private/Admin
exports.registerPayment = catchAsync(async (req, res, next) => {
  const { user_id, amount, payment_method, order_id, notes } = req.body;

  // Validaciones
  if (!user_id || !amount || !payment_method) {
    return next(new AppError('Usuario, monto y método de pago son requeridos', 400));
  }

  if (amount <= 0) {
    return next(new AppError('El monto debe ser mayor a 0', 400));
  }

  if (!['cash', 'card', 'transfer'].includes(payment_method)) {
    return next(new AppError('Método de pago inválido', 400));
  }

  const payment = await Credit.registerPayment({
    user_id,
    amount: parseFloat(amount),
    payment_method,
    order_id: order_id || null,
    notes,
    recorded_by: req.user.user_id
  });

  res.status(201).json({
    success: true,
    message: 'Pago registrado correctamente',
    data: {
      payment
    }
  });
});

// @desc    Obtener historial de pagos de un usuario
// @route   GET /api/credit/payments/:userId
// @access  Private/Admin
exports.getPaymentHistory = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  const payments = await Credit.getPaymentHistory(userId, limit);

  res.status(200).json({
    success: true,
    count: payments.length,
    data: {
      payments
    }
  });
});

// @desc    Obtener historial de crédito completo
// @route   GET /api/credit/history/:userId
// @access  Private (propio) / Admin
exports.getCreditHistory = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  // Verificar permisos
  if (userId !== req.user.user_id && req.user.role !== 'admin') {
    return next(new AppError('No tienes permiso para ver este historial', 403));
  }

  const limit = parseInt(req.query.limit) || 100;
  const history = await Credit.getCreditHistory(userId, limit);

  res.status(200).json({
    success: true,
    count: history.length,
    data: {
      history
    }
  });
});

// @desc    Obtener pedidos fiados pendientes de un usuario
// @route   GET /api/credit/pending-orders/:userId
// @access  Private (propio) / Admin
exports.getPendingOrders = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  // Verificar permisos
  if (userId !== req.user.user_id && req.user.role !== 'admin') {
    return next(new AppError('No tienes permiso para ver estos pedidos', 403));
  }

  const orders = await Credit.getPendingOrders(userId);

  res.status(200).json({
    success: true,
    count: orders.length,
    data: {
      orders
    }
  });
});

// @desc    Obtener todos los usuarios con deuda
// @route   GET /api/credit/users-with-debt
// @access  Private/Admin
exports.getUsersWithDebt = catchAsync(async (req, res, next) => {
  const users = await Credit.getUsersWithDebt();

  res.status(200).json({
    success: true,
    count: users.length,
    data: {
      users
    }
  });
});

// @desc    Generar reporte de deudas
// @route   GET /api/credit/debt-report
// @access  Private/Admin
exports.generateDebtReport = catchAsync(async (req, res, next) => {
  const filters = {
    min_debt: req.query.min_debt ? parseFloat(req.query.min_debt) : null,
    account_status: req.query.account_status
  };

  const report = await Credit.generateDebtReport(filters);

  // Calcular totales
  const totals = {
    total_users: report.length,
    total_debt: report.reduce((sum, user) => sum + parseFloat(user.debt_amount), 0),
    total_pending_orders: report.reduce((sum, user) => sum + parseInt(user.pending_orders_count), 0),
    average_debt: report.length > 0 
      ? report.reduce((sum, user) => sum + parseFloat(user.debt_amount), 0) / report.length 
      : 0
  };

  res.status(200).json({
    success: true,
    data: {
      report,
      summary: totals
    }
  });
});

// @desc    Verificar disponibilidad de crédito
// @route   POST /api/credit/check-availability
// @access  Private
exports.checkCreditAvailability = catchAsync(async (req, res, next) => {
  const { order_amount } = req.body;

  if (!order_amount || order_amount <= 0) {
    return next(new AppError('Monto del pedido inválido', 400));
  }

  const availability = await Credit.checkCreditAvailability(
    req.user.user_id,
    parseFloat(order_amount)
  );

  res.status(200).json({
    success: true,
    data: availability
  });
});

// @desc    Activar cuenta de crédito
// @route   POST /api/credit/enable/:userId
// @access  Private/Admin
exports.enableCreditAccount = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { credit_limit } = req.body;

  const limit = credit_limit ? parseFloat(credit_limit) : parseFloat(process.env.DEFAULT_CREDIT_LIMIT);
  const maxLimit = parseFloat(process.env.MAX_CREDIT_LIMIT);

  if (limit > maxLimit) {
    return next(new AppError(`El límite de crédito no puede exceder ${maxLimit}`, 400));
  }

  const user = await User.enableCreditAccount(userId, limit);

  res.status(200).json({
    success: true,
    message: 'Cuenta de crédito activada correctamente',
    data: {
      user
    }
  });
});

// @desc    Desactivar cuenta de crédito
// @route   POST /api/credit/disable/:userId
// @access  Private/Admin
exports.disableCreditAccount = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.disableCreditAccount(userId);

  res.status(200).json({
    success: true,
    message: 'Cuenta de crédito desactivada correctamente',
    data: {
      user
    }
  });
});

// @desc    Actualizar límite de crédito
// @route   PATCH /api/credit/update-limit/:userId
// @access  Private/Admin
exports.updateCreditLimit = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { new_limit } = req.body;

  if (!new_limit || new_limit <= 0) {
    return next(new AppError('Nuevo límite inválido', 400));
  }

  const maxLimit = parseFloat(process.env.MAX_CREDIT_LIMIT);
  if (new_limit > maxLimit) {
    return next(new AppError(`El límite de crédito no puede exceder ${maxLimit}`, 400));
  }

  const user = await User.updateCreditLimit(userId, parseFloat(new_limit));

  res.status(200).json({
    success: true,
    message: 'Límite de crédito actualizado correctamente',
    data: {
      user
    }
  });
});

// @desc    Ajustar deuda manualmente
// @route   POST /api/credit/adjust-debt/:userId
// @access  Private/Admin
exports.adjustDebt = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { amount, reason } = req.body;

  if (amount === undefined || !reason) {
    return next(new AppError('Monto y razón son requeridos', 400));
  }

  const result = await Credit.adjustDebt(
    userId,
    parseFloat(amount),
    reason,
    req.user.user_id
  );

  res.status(200).json({
    success: true,
    message: 'Ajuste de deuda realizado correctamente',
    data: result
  });
});

// @desc    Obtener resumen mensual de créditos
// @route   GET /api/credit/monthly-summary
// @access  Private/Admin
exports.getMonthlySummary = catchAsync(async (req, res, next) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;

  if (month < 1 || month > 12) {
    return next(new AppError('Mes inválido', 400));
  }

  const summary = await Credit.getMonthlySummary(year, month);

  res.status(200).json({
    success: true,
    data: {
      period: { year, month },
      summary
    }
  });
});

// @desc    Obtener mi estado de cuenta
// @route   GET /api/credit/my-account
// @access  Private
exports.getMyAccount = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.user_id);

  if (!user.has_credit_account) {
    return next(new AppError('No tienes cuenta de crédito activada', 404));
  }

  const pendingOrders = await Credit.getPendingOrders(req.user.user_id);
  const recentHistory = await Credit.getCreditHistory(req.user.user_id, 10);

  res.status(200).json({
    success: true,
    data: {
      account: {
        credit_limit: user.credit_limit,
        current_balance: user.current_balance,
        available_credit: user.credit_limit - user.current_balance,
        usage_percent: ((user.current_balance / user.credit_limit) * 100).toFixed(2)
      },
      pending_orders: pendingOrders,
      recent_history: recentHistory
    }
  });
});