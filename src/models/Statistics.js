const { query } = require('../config/database');

class Statistics {
  // Productos más vendidos
  static async getTopProducts(filters = {}) {
    const { limit = 10, date_from, date_to } = filters;
    let whereClause = 'WHERE o.status = \'delivered\'';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    params.push(limit);

    const result = await query(
      `SELECT
        p.product_id,
        p.name,
        p.image_url,
        p.thumbnail_url,
        c.name as category_name,
        SUM(oi.quantity) as total_sold,
        COUNT(DISTINCT o.order_id) as times_ordered,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.unit_price) as avg_price
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN products p ON p.product_id = oi.product_id
       LEFT JOIN categories c ON c.category_id = p.category_id
       ${whereClause}
       GROUP BY p.product_id, p.name, p.image_url, p.thumbnail_url, c.name
       ORDER BY total_sold DESC
       LIMIT $${paramCount}`,
      params
    );

    return result.rows;
  }

  // Menús semanales más vendidos
  static async getTopWeeklyMenus(filters = {}) {
    const { limit = 10, date_from, date_to } = filters;
    let whereClause = 'WHERE o.status = \'delivered\'';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    params.push(limit);

    const result = await query(
      `SELECT
        wm.menu_id,
        wm.menu_name,
        wm.week_number,
        wm.year,
        COUNT(DISTINCT o.order_id) as times_ordered,
        SUM(wmi.quantity) as total_items_sold,
        SUM(wmi.quantity * wmi.price) as total_revenue
       FROM weekly_menu_items wmi
       JOIN weekly_menus wm ON wm.menu_id = wmi.menu_id
       JOIN order_items oi ON oi.product_id = wmi.product_id
       JOIN orders o ON o.order_id = oi.order_id
       ${whereClause}
       GROUP BY wm.menu_id, wm.menu_name, wm.week_number, wm.year
       ORDER BY total_revenue DESC
       LIMIT $${paramCount}`,
      params
    );

    return result.rows;
  }

  // Ventas por día (días con más ventas)
  static async getSalesByDay(filters = {}) {
    const { limit = 30, date_from, date_to } = filters;
    let whereClause = 'WHERE o.status = \'delivered\'';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    params.push(limit);

    const result = await query(
      `SELECT
        DATE(o.created_at) as date,
        TO_CHAR(o.created_at, 'Day') as day_name,
        COUNT(DISTINCT o.order_id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END) as cash_revenue,
        SUM(CASE WHEN o.payment_method = 'card' THEN o.total_amount ELSE 0 END) as card_revenue,
        SUM(CASE WHEN o.payment_method = 'credit' THEN o.total_amount ELSE 0 END) as credit_revenue,
        SUM(CASE WHEN o.payment_method = 'yape' THEN o.total_amount ELSE 0 END) as yape_revenue,
        SUM(CASE WHEN o.payment_method = 'plin' THEN o.total_amount ELSE 0 END) as plin_revenue
       FROM orders o
       ${whereClause}
       GROUP BY DATE(o.created_at), TO_CHAR(o.created_at, 'Day')
       ORDER BY total_revenue DESC
       LIMIT $${paramCount}`,
      params
    );

    return result.rows;
  }

  // Ventas por hora del día (para identificar horas pico)
  static async getSalesByHour(filters = {}) {
    const { date_from, date_to } = filters;
    let whereClause = 'WHERE o.status = \'delivered\'';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    const result = await query(
      `SELECT
        EXTRACT(HOUR FROM o.created_at) as hour,
        COUNT(DISTINCT o.order_id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value
       FROM orders o
       ${whereClause}
       GROUP BY EXTRACT(HOUR FROM o.created_at)
       ORDER BY hour ASC`,
      params
    );

    return result.rows;
  }

  // Resumen general de ventas
  static async getSalesSummary(filters = {}) {
    const { date_from, date_to } = filters;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    const result = await query(
      `SELECT
        COUNT(DISTINCT o.order_id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.order_id END) as delivered_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.order_id END) as cancelled_orders,
        COUNT(DISTINCT CASE WHEN o.status IN ('pending', 'confirmed', 'preparing', 'ready') THEN o.order_id END) as active_orders,

        SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN o.status = 'delivered' THEN o.total_amount END) as avg_order_value,

        COUNT(DISTINCT CASE WHEN o.payment_method = 'cash' AND o.status = 'delivered' THEN o.order_id END) as cash_orders,
        COUNT(DISTINCT CASE WHEN o.payment_method = 'card' AND o.status = 'delivered' THEN o.order_id END) as card_orders,
        COUNT(DISTINCT CASE WHEN o.payment_method = 'credit' AND o.status = 'delivered' THEN o.order_id END) as credit_orders,
        COUNT(DISTINCT CASE WHEN o.payment_method = 'yape' AND o.status = 'delivered' THEN o.order_id END) as yape_orders,
        COUNT(DISTINCT CASE WHEN o.payment_method = 'plin' AND o.status = 'delivered' THEN o.order_id END) as plin_orders,

        SUM(CASE WHEN o.payment_method = 'cash' AND o.status = 'delivered' THEN o.total_amount ELSE 0 END) as cash_revenue,
        SUM(CASE WHEN o.payment_method = 'card' AND o.status = 'delivered' THEN o.total_amount ELSE 0 END) as card_revenue,
        SUM(CASE WHEN o.payment_method = 'credit' AND o.status = 'delivered' THEN o.total_amount ELSE 0 END) as credit_revenue,
        SUM(CASE WHEN o.payment_method = 'yape' AND o.status = 'delivered' THEN o.total_amount ELSE 0 END) as yape_revenue,
        SUM(CASE WHEN o.payment_method = 'plin' AND o.status = 'delivered' THEN o.total_amount ELSE 0 END) as plin_revenue,

        COUNT(DISTINCT o.user_id) as unique_customers,

        SUM(oi.quantity) as total_items_sold
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       ${whereClause}`,
      params
    );

    return result.rows[0];
  }

  // Clientes más frecuentes
  static async getTopCustomers(filters = {}) {
    const { limit = 10, date_from, date_to } = filters;
    let whereClause = 'WHERE o.status = \'delivered\'';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    params.push(limit);

    const result = await query(
      `SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.phone,
        COUNT(DISTINCT o.order_id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.created_at) as last_order_date,
        u.has_credit_account,
        u.current_balance as current_debt
       FROM users u
       JOIN orders o ON o.user_id = u.user_id
       ${whereClause}
       GROUP BY u.user_id, u.full_name, u.email, u.phone, u.has_credit_account, u.current_balance
       ORDER BY total_spent DESC
       LIMIT $${paramCount}`,
      params
    );

    return result.rows;
  }

  // Categorías más vendidas
  static async getTopCategories(filters = {}) {
    const { limit = 10, date_from, date_to } = filters;
    let whereClause = 'WHERE o.status = \'delivered\'';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    params.push(limit);

    const result = await query(
      `SELECT
        c.category_id,
        c.name as category_name,
        c.description,
        COUNT(DISTINCT oi.order_item_id) as times_ordered,
        SUM(oi.quantity) as total_items_sold,
        SUM(oi.subtotal) as total_revenue,
        COUNT(DISTINCT p.product_id) as products_in_category
       FROM categories c
       JOIN products p ON p.category_id = c.category_id
       JOIN order_items oi ON oi.product_id = p.product_id
       JOIN orders o ON o.order_id = oi.order_id
       ${whereClause}
       GROUP BY c.category_id, c.name, c.description
       ORDER BY total_revenue DESC
       LIMIT $${paramCount}`,
      params
    );

    return result.rows;
  }

  // Métodos de pago más utilizados
  static async getPaymentMethodsStats(filters = {}) {
    const { date_from, date_to } = filters;
    let whereClause = 'WHERE o.status = \'delivered\'';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    const result = await query(
      `SELECT
        o.payment_method,
        COUNT(DISTINCT o.order_id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        ROUND((COUNT(DISTINCT o.order_id)::numeric /
          (SELECT COUNT(DISTINCT order_id) FROM orders WHERE status = 'delivered' ${date_from ? 'AND created_at >= $1' : ''} ${date_to ? 'AND created_at <= $' + (date_from ? '2' : '1') : ''}) * 100), 2) as percentage
       FROM orders o
       ${whereClause}
       GROUP BY o.payment_method
       ORDER BY total_orders DESC`,
      params
    );

    return result.rows;
  }

  // Rendimiento de tiempos de entrega
  static async getDeliveryTimeStats(filters = {}) {
    const { date_from, date_to } = filters;
    let whereClause = 'WHERE o.status = \'delivered\' AND o.delivered_at IS NOT NULL';
    const params = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    const result = await query(
      `SELECT
        AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at))/60) as avg_delivery_time_minutes,
        MIN(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at))/60) as min_delivery_time_minutes,
        MAX(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at))/60) as max_delivery_time_minutes,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (o.delivered_at - o.created_at))/60) as median_delivery_time_minutes,
        COUNT(*) as total_delivered_orders
       FROM orders o
       ${whereClause}`,
      params
    );

    return result.rows[0];
  }

  // Tendencia de ventas (comparación mensual)
  static async getSalesTrend(filters = {}) {
    const { months = 12 } = filters;

    const result = await query(
      `SELECT
        TO_CHAR(o.created_at, 'YYYY-MM') as month,
        COUNT(DISTINCT o.order_id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.order_id END) as delivered_orders,
        SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN o.status = 'delivered' THEN o.total_amount END) as avg_order_value,
        COUNT(DISTINCT o.user_id) as unique_customers
       FROM orders o
       WHERE o.created_at >= NOW() - INTERVAL '${months} months'
       GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
       ORDER BY month ASC`,
      []
    );

    return result.rows;
  }

  // Reporte completo para exportar
  static async getCompleteReport(filters = {}) {
    const { date_from, date_to } = filters;

    // Ejecutar todas las consultas en paralelo
    const [
      summary,
      topProducts,
      topCustomers,
      topCategories,
      salesByDay,
      paymentMethods,
      deliveryTime
    ] = await Promise.all([
      this.getSalesSummary(filters),
      this.getTopProducts({ ...filters, limit: 5 }),
      this.getTopCustomers({ ...filters, limit: 5 }),
      this.getTopCategories({ ...filters, limit: 5 }),
      this.getSalesByDay({ ...filters, limit: 7 }),
      this.getPaymentMethodsStats(filters),
      this.getDeliveryTimeStats(filters)
    ]);

    return {
      period: {
        from: date_from || 'Inicio',
        to: date_to || 'Hoy'
      },
      summary,
      top_products: topProducts,
      top_customers: topCustomers,
      top_categories: topCategories,
      sales_by_day: salesByDay,
      payment_methods: paymentMethods,
      delivery_time: deliveryTime,
      generated_at: new Date()
    };
  }
}

module.exports = Statistics;
