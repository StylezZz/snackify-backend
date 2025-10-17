const jwt = require('jsonwebtoken');
const {AppError, catchAsync } = require('./errorHandler');
const {query} = require('../config/database');

//Middelware de autenticación
const protect = catchAsync(async (req, res, next)=> {
    // 1.- Obtener el token y comprobar si existe
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }

    if(!token){
        return next(new AppError('No estás autenticado. Por favor, inicia sesión para obtener acceso.', 401));
    }

    //2.- Verificar el token
    let decoded;
    try{
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    }catch(err){
        return next(new AppError('Token inválido o expirado. Por favor, inicia sesión de nuevo.', 401));
    }

    //3.- Verificar si el usuario aún existe
    const result = await query(
        'SELECT user_id,email,full_name,role,account_status FROM users WHERE user_id = $1',
        [decoded.userId]
    );

    if(result.rows.length === 0){
        return next(new AppError('El usuario ya no existe', 401));
    }

    const user = result.rows[0];
    
    //4.- Verificar si la cuenta está activa
    if(user.account_status !== 'active'){
        return next(new AppError('La cuenta del usuario no está activa. Por favor, contacta al soporte.', 403));
    }

    // 5.- Adjuntar usuario al request
    req.user = user;
    next();
});

//Middelware para restringir por roles
const restrictTo = (...roles) => {
    return (req,res,next) => {
        if(!roles.includes(req.user.role)){
            return next(new AppError('No tienes permiso para realizar esta acción.', 403));
        }
        next();
    }
}

// Middleware opcional - permite acceso sin token pero adjunta usuario si existe
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(); // Continuar sin usuario
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT user_id, email, full_name, role, account_status FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].account_status === 'active') {
      req.user = result.rows[0];
    }
  } catch (error) {
    // Token inválido, simplemente continuar sin usuario
  }

  next();
});

module.exports = {
  protect,
  restrictTo,
  optionalAuth
};