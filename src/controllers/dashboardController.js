const { query } = require('../config/database');
const { catchAsync } = require('../middleware/errorHandler');

// @desc    Obtener resumen general del dashboard
// @route   GET /api/dashboard/summary
// @access  Private/Admin
exports.getDashboardSummary = catchAsync(async (req, res, next) => {
  // Resumen de ventas del día
  const todaySales = await query(
    `SELECT 
       COUNT(*) as orders_today,
       COALESCE(SUM(total_amount), 0) as revenue_today,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
       COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_orders
     FROM orders
     WHERE DATE(created_at) = CURRENT_DATE
     AND status != 'cancelled'`
  );

  // Resumen de ventas del mes
  const monthSales = await query(
    `SELECT 
       COUNT(*) as orders_month,
       COALESCE(SUM(total_amount), 0) as revenue_month,
       AVG(total_amount) as avg_order_value
     FROM orders
     WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
     AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
     AND status != 'cancelled'`
  );

  // Resumen de créditos
  const creditSummary = await query(
    `SELECT 
       COUNT(*) as users_with_credit,
       COUNT(CASE WHEN current_balance > 0 THEN 1 END) as users_with_debt,
       COALESCE(SUM(current_balance), 0) as total_debt_amount
     FROM users
     WHERE has_credit_account = true`
  );

  // Productos con stock bajo
  const lowStockProducts = await query(
    `SELECT COUNT(*) as low_stock_count
     FROM products
     WHERE stock_quantity <= min_stock_level
     AND is_available = true`
  );

  // Usuarios totales
  const usersCount = await query(
    `SELECT 
       COUNT(*) as total_users,
       COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
       COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active_users
     FROM users`
  );

  res.status(200).json({
    success: true,
    data: {
      today: todaySales.rows[0],
      month: monthSales.rows[0],
      credit: creditSummary.rows[0],
      inventory: lowStockProducts.rows[0],
      users: usersCount.rows[0]
    }
  });
});

// @desc    Obtener ventas diarias del último mes
// @route   GET /api/dashboard/daily-sales
// @access  Private/Admin
exports.getDailySales = catchAsync(async (req, res, next) => {
  const days = parseInt(req.query.days) || 30;

  const result = await query(
    `SELECT * FROM daily_sales_summary
     WHERE sale_date >= CURRENT_DATE - INTERVAL '${days} days'
     ORDER BY sale_date ASC`
  );

  res.status(200).json({
    success: true,
    data: {
      sales: result.rows
    }
  });
});

// @desc    Obtener productos más vendidos
// @route   GET /api/dashboard/top-products
// @access  Private/Admin
exports.getTopProducts = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const days = parseInt(req.query.days) || 30;

  const result = await query(
    `SELECT 
       p.product_id,
       p.name,
       p.image_url,
       c.name as category_name,
       COUNT(oi.order_item_id) as times_ordered,
       SUM(oi.quantity) as total_quantity_sold,
       SUM(oi.subtotal) as total_revenue
     FROM order_items oi
     JOIN products p ON p.product_id = oi.product_id
     LEFT JOIN categories c ON c.category_id = p.category_id
     JOIN orders o ON o.order_id = oi.order_id
     WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
     AND o.status != 'cancelled'
     GROUP BY p.product_id, p.name, p.image_url, c.name
     ORDER BY total_revenue DESC
     LIMIT $1`,
    [limit]
  );

  res.status(200).json({
    success: true,
    data: {
      products: result.rows
    }
  });
});

// @desc    Obtener estadísticas de pedidos por estado
// @route   GET /api/dashboard/orders-by-status
// @access  Private/Admin
exports.getOrdersByStatus = catchAsync(async (req, res, next) => {
  const result = await query(
    `SELECT 
       status,
       COUNT(*) as count,
       SUM(total_amount) as total_amount
     FROM orders
     WHERE DATE(created_at) = CURRENT_DATE
     GROUP BY status
     ORDER BY count DESC`
  );

  res.status(200).json({
    success: true,
    data: {
      orders_by_status: result.rows
    }
  });
});

// @desc    Obtener ingresos por método de pago
// @route   GET /api/dashboard/revenue-by-payment
// @access  Private/Admin
exports.getRevenueByPayment = catchAsync(async (req, res, next) => {
  const days = parseInt(req.query.days) || 30;

  const result = await query(
    `SELECT 
       payment_method,
       COUNT(*) as order_count,
       SUM(total_amount) as total_revenue,
       AVG(total_amount) as avg_order_value
     FROM orders
     WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
     AND status != 'cancelled'
     GROUP BY payment_method
     ORDER BY total_revenue DESC`
  );

  res.status(200).json({
    success: true,
    data: {
      revenue_by_payment: result.rows
    }
  });
});

// @desc    Obtener alertas del sistema
// @route   GET /api/dashboard/alerts
// @access  Private/Admin
exports.getSystemAlerts = catchAsync(async (req, res, next) => {
  const alerts = [];

  // Verificar productos con stock bajo
  const lowStock = await query(
    `SELECT COUNT(*) as count FROM products
     WHERE stock_quantity <= min_stock_level AND is_available = true`
  );

  if (parseInt(lowStock.rows[0].count) > 0) {
    alerts.push({
      type: 'warning',
      category: 'inventory',
      message: `${lowStock.rows[0].count} producto(s) con stock bajo`,
      action: '/api/products?low_stock=true'
    });
  }

  // Verificar usuarios cerca del límite de crédito
  const nearLimit = await query(
    `SELECT COUNT(*) as count FROM users
     WHERE has_credit_account = true
     AND (current_balance / NULLIF(credit_limit, 0)) >= 0.80
     AND account_status = 'active'`
  );

  if (parseInt(nearLimit.rows[0].count) > 0) {
    alerts.push({
      type: 'info',
      category: 'credit',
      message: `${nearLimit.rows[0].count} usuario(s) cerca del límite de crédito`,
      action: '/api/credit/users-with-debt'
    });
  }

  // Verificar pedidos pendientes antiguos (más de 30 minutos)
  const oldPending = await query(
    `SELECT COUNT(*) as count FROM orders
     WHERE status = 'pending'
     AND created_at < NOW() - INTERVAL '30 minutes'`
  );

  if (parseInt(oldPending.rows[0].count) > 0) {
    alerts.push({
      type: 'error',
      category: 'orders',
      message: `${oldPending.rows[0].count} pedido(s) pendiente(s) por más de 30 minutos`,
      action: '/api/orders?status=pending'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      alerts,
      count: alerts.length
    }
  });
});