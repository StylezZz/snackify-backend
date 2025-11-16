const { query, transaction } = require('../config/database');
const QRCode = require('qrcode');

class Order {
  // Crear nuevo pedido
  static async create(orderData, items) {
    return await transaction(async (client) => {
      const {
        user_id,
        payment_method,
        notes,
        estimated_ready_time
      } = orderData;

      // Calcular total y verificar disponibilidad
      let totalAmount = 0;
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price, stock_quantity, is_available FROM products WHERE product_id = $1',
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Producto ${item.product_id} no encontrado`);
        }

        const product = productResult.rows[0];

        if (!product.is_available) {
          throw new Error(`Producto no disponible`);
        }

        if (product.stock_quantity < item.quantity) {
          throw new Error(`Stock insuficiente para el producto`);
        }

        totalAmount += product.price * item.quantity;
      }

      // Verificar límite de crédito si es pedido fiado
      const is_credit_order = payment_method === 'credit';
      if (is_credit_order) {
        const userResult = await client.query(
          `SELECT has_credit_account, credit_limit, current_balance 
           FROM users WHERE user_id = $1`,
          [user_id]
        );

        if (userResult.rows.length === 0) {
          throw new Error('Usuario no encontrado');
        }

        const user = userResult.rows[0];

        if (!user.has_credit_account) {
          throw new Error('Usuario no tiene cuenta de crédito activada');
        }

        const availableCredit = user.credit_limit - user.current_balance;
        if (totalAmount > availableCredit) {
          throw new Error(`Crédito insuficiente. Disponible: ${availableCredit.toFixed(2)}`);
        }
      }

      // Crear orden
      const orderResult = await client.query(
        `INSERT INTO orders 
         (user_id, total_amount, payment_method, is_credit_order, 
          estimated_ready_time, notes, status, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          user_id,
          totalAmount,
          payment_method,
          is_credit_order,
          estimated_ready_time || null,
          notes || null,
          'pending',
          is_credit_order ? 'pending' : 'paid'
        ]
      );

      const order = orderResult.rows[0];

      // Generar QR code
      const qrData = `ORDER:${order.order_id}:${order.order_number}`;
      const qrCode = await QRCode.toDataURL(qrData);

      await client.query(
        'UPDATE orders SET qr_code = $1 WHERE order_id = $2',
        [qrCode, order.order_id]
      );

      // Insertar items del pedido
      for (const item of items) {
        const productResult = await client.query(
          'SELECT name, price FROM products WHERE product_id = $1',
          [item.product_id]
        );

        const product = productResult.rows[0];
        const subtotal = product.price * item.quantity;

        await client.query(
          `INSERT INTO order_items 
           (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.order_id,
            item.product_id,
            product.name,
            item.quantity,
            product.price,
            subtotal,
            item.customizations || null
          ]
        );
      }

      // Retornar orden completa con items
      const completeOrder = await this.findById(order.order_id);
      return completeOrder;
    });
  }

  // Obtener pedido por ID con items
  static async findById(orderId) {
    const orderResult = await query(
      `SELECT o.*, u.full_name as customer_name, u.email as customer_email
       FROM orders o
       JOIN users u ON u.user_id = o.user_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return null;
    }

    const order = orderResult.rows[0];

    // Obtener items
    const itemsResult = await query(
      `SELECT oi.*, p.image_url, p.thumbnail_url
       FROM order_items oi
       LEFT JOIN products p ON p.product_id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    order.items = itemsResult.rows;

    return order;
  }

  // Obtener pedidos de un usuario
  static async findByUser(userId, filters = {}) {
    let whereClause = 'WHERE o.user_id = $1';
    const params = [userId];
    let paramCount = 2;

    if (filters.status) {
      whereClause += ` AND o.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.payment_method) {
      whereClause += ` AND o.payment_method = $${paramCount}`;
      params.push(filters.payment_method);
      paramCount++;
    }

    const result = await query(
      `SELECT o.order_id, o.order_number, o.total_amount, o.status, 
              o.payment_method, o.payment_status, o.created_at,
              o.estimated_ready_time, o.is_credit_order
       FROM orders o
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT 50`,
      params
    );

    return result.rows;
  }

  // Obtener todos los pedidos (para admin)
  static async findAll(filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      whereClause += ` AND o.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.payment_method) {
      whereClause += ` AND o.payment_method = $${paramCount}`;
      params.push(filters.payment_method);
      paramCount++;
    }

    if (filters.date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(filters.date_from);
      paramCount++;
    }

    if (filters.date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(filters.date_to);
      paramCount++;
    }

    const result = await query(
      `SELECT o.*, u.full_name as customer_name, u.email as customer_email
       FROM orders o
       JOIN users u ON u.user_id = o.user_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT 100`,
      params
    );

    return result.rows;
  }

  // Actualizar estado del pedido
  static async updateStatus(orderId, newStatus) {
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Estado inválido');
    }

    const updates = { status: newStatus };

    // Actualizar timestamps según el estado
    if (newStatus === 'confirmed') {
      updates.confirmed_at = 'CURRENT_TIMESTAMP';
    } else if (newStatus === 'ready') {
      updates.ready_at = 'CURRENT_TIMESTAMP';
    } else if (newStatus === 'delivered') {
      updates.delivered_at = 'CURRENT_TIMESTAMP';
    }

    let setClause = 'status = $2';
    const params = [orderId, newStatus];

    if (updates.confirmed_at) {
      setClause += ', confirmed_at = CURRENT_TIMESTAMP';
    }
    if (updates.ready_at) {
      setClause += ', ready_at = CURRENT_TIMESTAMP';
    }
    if (updates.delivered_at) {
      setClause += ', delivered_at = CURRENT_TIMESTAMP';
    }

    const result = await query(
      `UPDATE orders 
       SET ${setClause}
       WHERE order_id = $1
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // Cancelar pedido
  static async cancel(orderId, reason) {
    return await transaction(async (client) => {
      // Obtener orden
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE order_id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const order = orderResult.rows[0];

      // Solo se puede cancelar si está en pending o confirmed
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new Error('No se puede cancelar este pedido en su estado actual');
      }

      // Si ya fue confirmado, devolver stock
      if (order.status === 'confirmed') {
        const itemsResult = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [orderId]
        );

        for (const item of itemsResult.rows) {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE product_id = $2',
            [item.quantity, item.product_id]
          );
        }
      }

      // Si es orden a crédito, revertir el cargo
      if (order.is_credit_order && order.payment_status === 'pending') {
        await client.query(
          'UPDATE users SET current_balance = current_balance - $1 WHERE user_id = $2',
          [order.total_amount, order.user_id]
        );

        // Registrar en historial
        await client.query(
          `INSERT INTO credit_history 
           (user_id, transaction_type, amount, balance_before, balance_after, order_id, description)
           SELECT user_id, 'adjustment', $2, current_balance + $2, current_balance, $3, $4
           FROM users WHERE user_id = $1`,
          [order.user_id, order.total_amount, orderId, `Reversión por cancelación: ${order.order_number}`]
        );
      }

      // Cancelar orden
      const cancelResult = await client.query(
        `UPDATE orders 
         SET status = 'cancelled', cancellation_reason = $2
         WHERE order_id = $1
         RETURNING *`,
        [orderId, reason]
      );

      return cancelResult.rows[0];
    });
  }

  // Obtener estadísticas de pedidos
  static async getStats(dateFrom, dateTo) {
    const result = await query(
      `SELECT 
         COUNT(*) as total_orders,
         COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
         COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
         COUNT(CASE WHEN is_credit_order THEN 1 END) as credit_orders,
         SUM(total_amount) as total_revenue,
         SUM(CASE WHEN is_credit_order THEN total_amount ELSE 0 END) as credit_revenue,
         AVG(total_amount) as avg_order_value
       FROM orders
       WHERE created_at BETWEEN $1 AND $2
       AND status != 'cancelled'`,
      [dateFrom, dateTo]
    );

    return result.rows[0];
  }
}

module.exports = Order;