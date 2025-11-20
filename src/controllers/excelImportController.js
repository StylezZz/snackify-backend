const ExcelImportService = require('../services/excelImportService');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// @desc    Importar usuarios desde Excel
// @route   POST /api/users/import
// @access  Private/Admin
exports.importUsers = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No se recibió ningún archivo', 400));
  }

  const options = {
    defaultPassword: req.body.default_password || 'Temporal123',
    skipDuplicates: req.body.skip_duplicates !== 'false',
    sendWelcomeEmail: req.body.send_welcome_email === 'true'
  };

  const results = await ExcelImportService.importUsersFromExcel(
    req.file.buffer,
    options
  );

  res.status(200).json({
    success: true,
    message: 'Importación completada',
    data: results
  });
});

// @desc    Descargar plantilla Excel
// @route   GET /api/users/import/template
// @access  Private/Admin
exports.downloadTemplate = catchAsync(async (req, res, next) => {
  const buffer = ExcelImportService.generateTemplate();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_usuarios.xlsx');
  
  res.send(buffer);
});