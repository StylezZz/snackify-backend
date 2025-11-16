const User = require('../models/User');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const filters = {
    role: req.query.role,
    account_status: req.query.account_status,
    has_credit_account: req.query.has_credit_account === 'true' ? true 
                       : req.query.has_credit_account === 'false' ? false 
                       : undefined
  };

  const result = await User.findAll(page, limit, filters);

  res.status(200).json({
    success: true,
    data: result
  });
});

// @desc    Obtener usuario por ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

// @desc    Suspender cuenta de usuario
// @route   POST /api/users/:id/suspend
// @access  Private/Admin
exports.suspendUser = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  if (!reason) {
    return next(new AppError('La razón de suspensión es requerida', 400));
  }

  const user = await User.suspendAccount(req.params.id, reason);

  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Usuario suspendido correctamente',
    data: {
      user
    }
  });
});

// @desc    Reactivar cuenta de usuario
// @route   POST /api/users/:id/reactivate
// @access  Private/Admin
exports.reactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.reactivateAccount(req.params.id);

  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Usuario reactivado correctamente',
    data: {
      user
    }
  });
});

// @desc    Obtener usuarios con deuda
// @route   GET /api/users/with-debt
// @access  Private/Admin
exports.getUsersWithDebt = catchAsync(async (req, res, next) => {
  const users = await User.getUsersWithDebt();

  res.status(200).json({
    success: true,
    count: users.length,
    data: {
      users
    }
  });
});