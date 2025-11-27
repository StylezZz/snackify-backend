const Statistics = require('../models/Statistics');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// @desc    Obtener productos más vendidos
// @route   GET /api/statistics/top-products
// @access  Private/Admin
exports.getTopProducts = catchAsync(async (req, res, next) => {
  const filters = {
    limit: parseInt(req.query.limit) || 10,
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const products = await Statistics.getTopProducts(filters);

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products,
      filters
    }
  });
});

// @desc    Obtener menús semanales más vendidos
// @route   GET /api/statistics/top-menus
// @access  Private/Admin
exports.getTopWeeklyMenus = catchAsync(async (req, res, next) => {
  const filters = {
    limit: parseInt(req.query.limit) || 10,
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const menus = await Statistics.getTopWeeklyMenus(filters);

  res.status(200).json({
    success: true,
    count: menus.length,
    data: {
      menus,
      filters
    }
  });
});

// @desc    Obtener ventas por día
// @route   GET /api/statistics/sales-by-day
// @access  Private/Admin
exports.getSalesByDay = catchAsync(async (req, res, next) => {
  const filters = {
    limit: parseInt(req.query.limit) || 30,
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const salesByDay = await Statistics.getSalesByDay(filters);

  res.status(200).json({
    success: true,
    count: salesByDay.length,
    data: {
      sales: salesByDay,
      filters
    }
  });
});

// @desc    Obtener ventas por hora del día
// @route   GET /api/statistics/sales-by-hour
// @access  Private/Admin
exports.getSalesByHour = catchAsync(async (req, res, next) => {
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const salesByHour = await Statistics.getSalesByHour(filters);

  res.status(200).json({
    success: true,
    count: salesByHour.length,
    data: {
      sales: salesByHour,
      filters
    }
  });
});

// @desc    Obtener resumen general de ventas
// @route   GET /api/statistics/summary
// @access  Private/Admin
exports.getSalesSummary = catchAsync(async (req, res, next) => {
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const summary = await Statistics.getSalesSummary(filters);

  res.status(200).json({
    success: true,
    data: {
      summary,
      filters
    }
  });
});

// @desc    Obtener clientes más frecuentes
// @route   GET /api/statistics/top-customers
// @access  Private/Admin
exports.getTopCustomers = catchAsync(async (req, res, next) => {
  const filters = {
    limit: parseInt(req.query.limit) || 10,
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const customers = await Statistics.getTopCustomers(filters);

  res.status(200).json({
    success: true,
    count: customers.length,
    data: {
      customers,
      filters
    }
  });
});

// @desc    Obtener categorías más vendidas
// @route   GET /api/statistics/top-categories
// @access  Private/Admin
exports.getTopCategories = catchAsync(async (req, res, next) => {
  const filters = {
    limit: parseInt(req.query.limit) || 10,
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const categories = await Statistics.getTopCategories(filters);

  res.status(200).json({
    success: true,
    count: categories.length,
    data: {
      categories,
      filters
    }
  });
});

// @desc    Obtener estadísticas de métodos de pago
// @route   GET /api/statistics/payment-methods
// @access  Private/Admin
exports.getPaymentMethodsStats = catchAsync(async (req, res, next) => {
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const paymentMethods = await Statistics.getPaymentMethodsStats(filters);

  res.status(200).json({
    success: true,
    count: paymentMethods.length,
    data: {
      payment_methods: paymentMethods,
      filters
    }
  });
});

// @desc    Obtener estadísticas de tiempos de entrega
// @route   GET /api/statistics/delivery-times
// @access  Private/Admin
exports.getDeliveryTimeStats = catchAsync(async (req, res, next) => {
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const deliveryStats = await Statistics.getDeliveryTimeStats(filters);

  res.status(200).json({
    success: true,
    data: {
      delivery_stats: deliveryStats,
      filters
    }
  });
});

// @desc    Obtener tendencia de ventas mensual
// @route   GET /api/statistics/sales-trend
// @access  Private/Admin
exports.getSalesTrend = catchAsync(async (req, res, next) => {
  const filters = {
    months: parseInt(req.query.months) || 12
  };

  const trend = await Statistics.getSalesTrend(filters);

  res.status(200).json({
    success: true,
    count: trend.length,
    data: {
      trend,
      filters
    }
  });
});

// @desc    Obtener reporte completo para exportar
// @route   GET /api/statistics/complete-report
// @access  Private/Admin
exports.getCompleteReport = catchAsync(async (req, res, next) => {
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  const report = await Statistics.getCompleteReport(filters);

  res.status(200).json({
    success: true,
    data: {
      report
    }
  });
});

// @desc    Dashboard principal (todos los datos en una sola llamada)
// @route   GET /api/statistics/dashboard
// @access  Private/Admin
exports.getDashboard = catchAsync(async (req, res, next) => {
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to
  };

  // Obtener datos en paralelo para el dashboard
  const [
    summary,
    topProducts,
    topCategories,
    salesByDay,
    salesByHour,
    paymentMethods,
    topCustomers,
    deliveryStats
  ] = await Promise.all([
    Statistics.getSalesSummary(filters),
    Statistics.getTopProducts({ ...filters, limit: 5 }),
    Statistics.getTopCategories({ ...filters, limit: 5 }),
    Statistics.getSalesByDay({ ...filters, limit: 7 }),
    Statistics.getSalesByHour(filters),
    Statistics.getPaymentMethodsStats(filters),
    Statistics.getTopCustomers({ ...filters, limit: 5 }),
    Statistics.getDeliveryTimeStats(filters)
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary,
      top_products: topProducts,
      top_categories: topCategories,
      recent_sales_by_day: salesByDay,
      sales_by_hour: salesByHour,
      payment_methods: paymentMethods,
      top_customers: topCustomers,
      delivery_stats: deliveryStats,
      filters
    }
  });
});
