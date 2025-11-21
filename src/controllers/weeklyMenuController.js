const WeeklyMenu = require('../models/WeeklyMenu');
const WeeklyMenuImportService = require('../services/weeklyMenuImportService');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// ===================== MENUS =====================

// @desc    Crear nuevo menú semanal
// @route   POST /api/weekly-menus
// @access  Private/Admin
exports.createMenu = catchAsync(async (req, res, next) => {
  const {
    menu_date,
    entry_description,
    main_course_description,
    drink_description,
    dessert_description,
    description,
    price,
    reservation_deadline,
    max_reservations
  } = req.body;

  // Validaciones
  if (!menu_date || !entry_description || !main_course_description ||
      !drink_description || !dessert_description || !price) {
    return next(new AppError('Todos los campos del menú son requeridos', 400));
  }

  // Si no se proporciona deadline, calcular 2 días antes
  let deadline = reservation_deadline;
  if (!deadline) {
    const menuDateObj = new Date(menu_date);
    menuDateObj.setDate(menuDateObj.getDate() - 2);
    menuDateObj.setHours(23, 59, 59);
    deadline = menuDateObj.toISOString();
  }

  // Validar que el deadline sea antes de la fecha del menú
  if (new Date(deadline) >= new Date(menu_date)) {
    return next(new AppError('La fecha límite de reserva debe ser anterior a la fecha del menú', 400));
  }

  // Verificar que no exista menú para esa fecha
  const existingMenu = await WeeklyMenu.findByDate(menu_date);
  if (existingMenu) {
    return next(new AppError('Ya existe un menú para esa fecha', 400));
  }

  const menu = await WeeklyMenu.create({
    menu_date,
    entry_description,
    main_course_description,
    drink_description,
    dessert_description,
    description,
    price,
    reservation_deadline: deadline,
    max_reservations
  });

  res.status(201).json({
    success: true,
    data: { menu }
  });
});

// @desc    Obtener todos los menús
// @route   GET /api/weekly-menus
// @access  Public
exports.getAllMenus = catchAsync(async (req, res, next) => {
  const filters = {
    is_active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
    from_date: req.query.from_date,
    to_date: req.query.to_date,
    available_for_reservation: req.query.available === 'true'
  };

  const menus = await WeeklyMenu.findAll(filters);

  res.status(200).json({
    success: true,
    count: menus.length,
    data: { menus }
  });
});

// @desc    Obtener menús de la semana actual
// @route   GET /api/weekly-menus/current-week
// @access  Public
exports.getCurrentWeekMenus = catchAsync(async (req, res, next) => {
  const menus = await WeeklyMenu.getCurrentWeekMenus();

  res.status(200).json({
    success: true,
    count: menus.length,
    data: { menus }
  });
});

// @desc    Obtener menú por ID
// @route   GET /api/weekly-menus/:id
// @access  Public
exports.getMenu = catchAsync(async (req, res, next) => {
  const menu = await WeeklyMenu.findById(req.params.id);

  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    data: { menu }
  });
});

// @desc    Actualizar menú
// @route   PUT /api/weekly-menus/:id
// @access  Private/Admin
exports.updateMenu = catchAsync(async (req, res, next) => {
  const menu = await WeeklyMenu.findById(req.params.id);

  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  // Validar deadline si se actualiza
  if (req.body.reservation_deadline && req.body.menu_date) {
    if (new Date(req.body.reservation_deadline) >= new Date(req.body.menu_date)) {
      return next(new AppError('La fecha límite de reserva debe ser anterior a la fecha del menú', 400));
    }
  }

  const updatedMenu = await WeeklyMenu.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: { menu: updatedMenu }
  });
});

// @desc    Eliminar menú (soft delete)
// @route   DELETE /api/weekly-menus/:id
// @access  Private/Admin
exports.deleteMenu = catchAsync(async (req, res, next) => {
  const menu = await WeeklyMenu.findById(req.params.id);

  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  await WeeklyMenu.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Menú desactivado correctamente'
  });
});

// ===================== RESERVACIONES =====================

// @desc    Crear reservación de menú
// @route   POST /api/weekly-menus/:id/reservations
// @access  Private
exports.createReservation = catchAsync(async (req, res, next) => {
  const menuId = req.params.id;
  const userId = req.user.user_id;
  const { quantity = 1, notes } = req.body;

  // Verificar que el menú existe
  const menu = await WeeklyMenu.findById(menuId);
  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  // Verificar si se puede reservar
  const canReserve = await WeeklyMenu.canReserve(menuId);
  if (!canReserve.can_reserve) {
    return next(new AppError(canReserve.reason, 400));
  }

  // Verificar si el usuario ya tiene reservación
  const hasReservation = await WeeklyMenu.userHasReservation(userId, menuId);
  if (hasReservation) {
    return next(new AppError('Ya tienes una reservación para este menú', 400));
  }

  // Verificar cupo disponible
  if (menu.max_reservations) {
    const availableSpots = menu.max_reservations - menu.current_reservations;
    if (quantity > availableSpots) {
      return next(new AppError(`Solo hay ${availableSpots} cupos disponibles`, 400));
    }
  }

  const reservation = await WeeklyMenu.createReservation({
    menu_id: menuId,
    user_id: userId,
    quantity,
    notes
  });

  res.status(201).json({
    success: true,
    data: { reservation }
  });
});

// @desc    Obtener reservaciones del usuario autenticado
// @route   GET /api/weekly-menus/my-reservations
// @access  Private
exports.getMyReservations = catchAsync(async (req, res, next) => {
  const userId = req.user.user_id;
  const filters = { status: req.query.status };

  const reservations = await WeeklyMenu.getUserReservations(userId, filters);

  res.status(200).json({
    success: true,
    count: reservations.length,
    data: { reservations }
  });
});

// @desc    Obtener reservaciones de un menú (admin)
// @route   GET /api/weekly-menus/:id/reservations
// @access  Private/Admin
exports.getMenuReservations = catchAsync(async (req, res, next) => {
  const menuId = req.params.id;
  const filters = { status: req.query.status };

  const menu = await WeeklyMenu.findById(menuId);
  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  const reservations = await WeeklyMenu.getMenuReservations(menuId, filters);
  const stats = await WeeklyMenu.getMenuReservationStats(menuId);

  res.status(200).json({
    success: true,
    count: reservations.length,
    data: { reservations, stats }
  });
});

// @desc    Cancelar reservación
// @route   PATCH /api/weekly-menus/reservations/:reservationId/cancel
// @access  Private
exports.cancelReservation = catchAsync(async (req, res, next) => {
  const { reservationId } = req.params;
  const userId = req.user.user_id;
  const { reason } = req.body;

  const reservation = await WeeklyMenu.findReservationById(reservationId);
  if (!reservation) {
    return next(new AppError('Reservación no encontrada', 404));
  }

  // Verificar que la reservación pertenece al usuario o es admin
  if (reservation.user_id !== userId && req.user.role !== 'admin') {
    return next(new AppError('No tienes permiso para cancelar esta reservación', 403));
  }

  if (reservation.status === 'cancelled') {
    return next(new AppError('Esta reservación ya está cancelada', 400));
  }

  if (reservation.status === 'delivered') {
    return next(new AppError('No se puede cancelar una reservación ya entregada', 400));
  }

  // Verificar si aún está dentro del plazo de cancelación
  const menu = await WeeklyMenu.findById(reservation.menu_id);
  if (new Date() > new Date(menu.reservation_deadline)) {
    return next(new AppError('El plazo para cancelar ha vencido', 400));
  }

  const cancelledReservation = await WeeklyMenu.cancelReservation(reservationId, reason);

  res.status(200).json({
    success: true,
    data: { reservation: cancelledReservation }
  });
});

// @desc    Actualizar estado de reservación (admin)
// @route   PATCH /api/weekly-menus/reservations/:reservationId/status
// @access  Private/Admin
exports.updateReservationStatus = catchAsync(async (req, res, next) => {
  const { reservationId } = req.params;
  const { status, reason } = req.body;

  const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Estado inválido', 400));
  }

  const reservation = await WeeklyMenu.findReservationById(reservationId);
  if (!reservation) {
    return next(new AppError('Reservación no encontrada', 404));
  }

  const updatedReservation = await WeeklyMenu.updateReservationStatus(
    reservationId,
    status,
    reason
  );

  res.status(200).json({
    success: true,
    data: { reservation: updatedReservation }
  });
});

// @desc    Obtener estadísticas de un menú
// @route   GET /api/weekly-menus/:id/stats
// @access  Private/Admin
exports.getMenuStats = catchAsync(async (req, res, next) => {
  const menuId = req.params.id;

  const menu = await WeeklyMenu.findById(menuId);
  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  const stats = await WeeklyMenu.getMenuReservationStats(menuId);

  res.status(200).json({
    success: true,
    data: { menu, stats }
  });
});

// ===================== IMPORTACIÓN EXCEL =====================

// @desc    Importar menús desde archivo Excel
// @route   POST /api/weekly-menus/import
// @access  Private/Admin
exports.importMenusFromExcel = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Archivo Excel requerido', 400));
  }

  const options = {
    defaultMaxReservations: parseInt(req.body.default_max_reservations) || 30,
    hoursBeforeDeadline: parseInt(req.body.hours_before_deadline) || 48,
    skipExistingDates: req.body.skip_existing !== 'false'
  };

  const results = await WeeklyMenuImportService.importMenusFromExcel(
    req.file.buffer,
    options
  );

  res.status(200).json({
    success: true,
    message: `Importación completada: ${results.successful} menús creados`,
    data: results
  });
});

// @desc    Descargar plantilla Excel para menús
// @route   GET /api/weekly-menus/template
// @access  Private/Admin
exports.downloadMenuTemplate = catchAsync(async (req, res, next) => {
  const buffer = WeeklyMenuImportService.generateMenuTemplate();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_menus_semanales.xlsx');
  res.send(buffer);
});

// ===================== LISTA DE ESPERA / DEMANDA =====================

// @desc    Agregar a lista de espera (cuando el menú está lleno)
// @route   POST /api/weekly-menus/:id/waitlist
// @access  Private
exports.addToWaitlist = catchAsync(async (req, res, next) => {
  const menuId = req.params.id;
  const userId = req.user.user_id;
  const { quantity = 1, notes } = req.body;

  const menu = await WeeklyMenu.findById(menuId);
  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  if (!menu.is_active) {
    return next(new AppError('Menú no disponible', 400));
  }

  // Verificar si ya tiene reservación
  const hasReservation = await WeeklyMenu.userHasReservation(userId, menuId);
  if (hasReservation) {
    return next(new AppError('Ya tienes una reservación para este menú', 400));
  }

  // Verificar si ya está en lista de espera
  const inWaitlist = await WeeklyMenu.userInWaitlist(userId, menuId);
  if (inWaitlist) {
    return next(new AppError('Ya estás en la lista de espera para este menú', 400));
  }

  const waitlistEntry = await WeeklyMenu.addToWaitlist({
    menu_id: menuId,
    user_id: userId,
    quantity,
    notes
  });

  res.status(201).json({
    success: true,
    message: 'Agregado a la lista de espera. Te notificaremos si hay disponibilidad.',
    data: { waitlist: waitlistEntry }
  });
});

// @desc    Obtener mi lista de espera
// @route   GET /api/weekly-menus/user/my-waitlist
// @access  Private
exports.getMyWaitlist = catchAsync(async (req, res, next) => {
  const userId = req.user.user_id;
  const waitlist = await WeeklyMenu.getUserWaitlist(userId);

  res.status(200).json({
    success: true,
    count: waitlist.length,
    data: { waitlist }
  });
});

// @desc    Cancelar entrada en lista de espera
// @route   DELETE /api/weekly-menus/waitlist/:waitlistId
// @access  Private
exports.cancelWaitlistEntry = catchAsync(async (req, res, next) => {
  const { waitlistId } = req.params;
  const userId = req.user.user_id;

  const cancelled = await WeeklyMenu.cancelWaitlistEntry(waitlistId, userId);
  if (!cancelled) {
    return next(new AppError('Entrada en lista de espera no encontrada', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Removido de la lista de espera'
  });
});

// @desc    Obtener lista de espera de un menú (admin)
// @route   GET /api/weekly-menus/:id/waitlist
// @access  Private/Admin
exports.getMenuWaitlist = catchAsync(async (req, res, next) => {
  const menuId = req.params.id;

  const menu = await WeeklyMenu.findById(menuId);
  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  const waitlist = await WeeklyMenu.getMenuWaitlist(menuId);

  res.status(200).json({
    success: true,
    count: waitlist.length,
    data: { waitlist }
  });
});

// @desc    Obtener demanda de un menú (reservas + lista espera)
// @route   GET /api/weekly-menus/:id/demand
// @access  Private/Admin
exports.getMenuDemand = catchAsync(async (req, res, next) => {
  const menuId = req.params.id;

  const demand = await WeeklyMenu.getMenuDemand(menuId);
  if (!demand) {
    return next(new AppError('Menú no encontrado', 404));
  }

  res.status(200).json({
    success: true,
    data: { demand }
  });
});

// @desc    Obtener reporte de demanda de todos los menús
// @route   GET /api/weekly-menus/demand/report
// @access  Private/Admin
exports.getDemandReport = catchAsync(async (req, res, next) => {
  const filters = {
    from_date: req.query.from_date,
    to_date: req.query.to_date,
    has_unmet_demand: req.query.unmet_only === 'true'
  };

  const report = await WeeklyMenu.getDemandReport(filters);

  res.status(200).json({
    success: true,
    count: report.length,
    data: { report }
  });
});

// @desc    Aumentar cupo de un menú (admin decide preparar más platos)
// @route   PATCH /api/weekly-menus/:id/capacity
// @access  Private/Admin
exports.updateMenuCapacity = catchAsync(async (req, res, next) => {
  const menuId = req.params.id;
  const { max_reservations, notify_waitlist = true } = req.body;

  if (!max_reservations || max_reservations < 1) {
    return next(new AppError('Cupo máximo inválido', 400));
  }

  const menu = await WeeklyMenu.findById(menuId);
  if (!menu) {
    return next(new AppError('Menú no encontrado', 404));
  }

  const result = await WeeklyMenu.updateMaxReservations(menuId, max_reservations);

  let notifiedUsers = [];
  if (notify_waitlist && result.newSpotsAvailable > 0) {
    notifiedUsers = await WeeklyMenu.processWaitlist(menuId, result.newSpotsAvailable);
  }

  res.status(200).json({
    success: true,
    message: `Cupo actualizado a ${max_reservations}. ${notifiedUsers.length} personas notificadas.`,
    data: {
      menu: result.menu,
      newSpotsAvailable: result.newSpotsAvailable,
      notifiedUsers
    }
  });
});
