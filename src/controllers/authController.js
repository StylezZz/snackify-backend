const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// Generar JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Enviar respuesta con token
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user.user_id);

  // Remover información sensible
  delete user.password_hash;

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user
    }
  });
};

// @desc    Registro de nuevo usuario
// @route   POST /api/auth/register
// @access  Public
exports.register = catchAsync(async (req, res, next) => {
  const { email, password, full_name, phone } = req.body;

  // Validaciones básicas
  if (!email || !password || !full_name) {
    return next(new AppError('Por favor proporciona email, contraseña y nombre completo', 400));
  }

  if (password.length < 6) {
    return next(new AppError('La contraseña debe tener al menos 6 caracteres', 400));
  }

  // Verificar si el email ya existe
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return next(new AppError('El email ya está registrado', 409));
  }

  // Crear usuario
  const user = await User.create({
    email,
    password,
    full_name,
    phone,
    role: 'customer' // Por defecto todos son customers
  });

  sendTokenResponse(user, 201, res);
});

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Validar campos
  if (!email || !password) {
    return next(new AppError('Por favor proporciona email y contraseña', 400));
  }

  // Buscar usuario
  const user = await User.findByEmail(email);
  if (!user) {
    return next(new AppError('Credenciales inválidas', 401));
  }

  // Verificar contraseña
  const isPasswordValid = await User.comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    return next(new AppError('Credenciales inválidas', 401));
  }

  // Verificar estado de cuenta
  if (user.account_status === 'suspended') {
    return next(new AppError(`Tu cuenta ha sido suspendida. Razón: ${user.suspension_reason}`, 403));
  }

  if (user.account_status === 'inactive') {
    return next(new AppError('Tu cuenta está inactiva. Contacta al administrador', 403));
  }

  // Actualizar último login
  await User.updateLastLogin(user.user_id);

  sendTokenResponse(user, 200, res);
});

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Private
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.user_id);

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

// @desc    Actualizar contraseña
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // Validaciones
  if (!oldPassword || !newPassword || !confirmPassword) {
    return next(new AppError('Por favor proporciona todas las contraseñas', 400));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError('Las contraseñas no coinciden', 400));
  }

  if (newPassword.length < 6) {
    return next(new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400));
  }

  // Cambiar contraseña
  await User.changePassword(req.user.user_id, oldPassword, newPassword);

  // Obtener usuario actualizado y enviar nuevo token
  const user = await User.findById(req.user.user_id);
  sendTokenResponse(user, 200, res);
});

// @desc    Actualizar perfil
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = catchAsync(async (req, res, next) => {
  const { full_name, phone } = req.body;

  const updates = {};
  if (full_name) updates.full_name = full_name;
  if (phone) updates.phone = phone;

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No hay datos para actualizar', 400));
  }

  const user = await User.updateProfile(req.user.user_id, updates);

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

// @desc    Solicitar recuperación de contraseña
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Por favor proporciona tu email', 400));
  }

  // Buscar usuario
  const user = await User.findByEmail(email);

  // Por seguridad, siempre responder igual (no revelar si el email existe)
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'Si el email existe, recibirás un correo con instrucciones para restablecer tu contraseña'
    });
  }

  // Verificar que la cuenta esté activa
  if (user.account_status === 'suspended' || user.account_status === 'inactive') {
    return res.status(200).json({
      success: true,
      message: 'Si el email existe, recibirás un correo con instrucciones para restablecer tu contraseña'
    });
  }

  // Crear token de reset
  const resetToken = await User.createPasswordResetToken(user.user_id);

  // Enviar email
  try {
    await EmailService.sendPasswordResetEmail(user.email, resetToken, user.full_name);
  } catch (error) {
    console.error('Error enviando email:', error);
    return next(new AppError('Error al enviar el correo. Intenta de nuevo más tarde', 500));
  }

  res.status(200).json({
    success: true,
    message: 'Si el email existe, recibirás un correo con instrucciones para restablecer tu contraseña'
  });
});

// @desc    Verificar token de reset (opcional, para validar antes de mostrar formulario)
// @route   GET /api/auth/verify-reset-token/:token
// @access  Public
exports.verifyResetToken = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return next(new AppError('Token no proporcionado', 400));
  }

  const tokenData = await User.verifyPasswordResetToken(token);

  if (!tokenData) {
    return next(new AppError('Token inválido o expirado', 400));
  }

  res.status(200).json({
    success: true,
    message: 'Token válido',
    data: {
      email: tokenData.email
    }
  });
});

// @desc    Restablecer contraseña con token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password, confirmPassword } = req.body;

  // Validaciones
  if (!token || !password || !confirmPassword) {
    return next(new AppError('Por favor proporciona todos los campos requeridos', 400));
  }

  if (password !== confirmPassword) {
    return next(new AppError('Las contraseñas no coinciden', 400));
  }

  if (password.length < 6) {
    return next(new AppError('La contraseña debe tener al menos 6 caracteres', 400));
  }

  // Resetear contraseña
  let user;
  try {
    user = await User.resetPasswordWithToken(token, password);
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  // Enviar email de confirmación
  try {
    await EmailService.sendPasswordChangedEmail(user.email, user.full_name);
  } catch (error) {
    console.error('Error enviando email de confirmación:', error);
    // No bloquear el proceso por esto
  }

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña'
  });
});