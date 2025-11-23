const { query, transaction } = require('../config/database');

class Credit {
  // Registrar pago de deuda
  static async registerPayment(paymentData) {
    return await transaction(async (client) => {
      const { user_id, amount, payment_method, order_id, notes, recorded_by } = paymentData;

      // Obtener balance actual
      const userResult = await client.query(
        'SELECT current_balance, has_credit_account FROM users WHERE user_id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const user = userResult.rows[0];

      if (!user.has_credit_account) {
        throw new Error('Usuario no tiene cuenta de crédito');
      }

      if (amount > user.current_balance) {
        throw new Error('El monto excede la deuda actual');
      }

      const balanceBefore = user.current_balance;
      const balanceAfter = balanceBefore - amount;

      // Registrar pago
      const paymentResult = await client.query(
        `INSERT INTO credit_payments 
         (user_id, order_id, amount, payment_method, balance_before, balance_after, 
          transaction_reference, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          user_id,
          order_id || null,
          amount,
          payment_method,
          balanceBefore,
          balanceAfter,
          null, // transaction_reference se puede agregar después
          notes || null,
          recorded_by
        ]
      );

      // Actualizar balance del usuario
      await client.query(
        'UPDATE users SET current_balance = $1 WHERE user_id = $2',
        [balanceAfter, user_id]
      );

      // Si hay order_id, actualizar el pedido
      if (order_id) {
        const orderResult = await client.query(
          'SELECT total_amount, credit_paid_amount FROM orders WHERE order_id = $1',
          [order_id]
        );

        if (orderResult.rows.length > 0) {
          const order = orderResult.rows[0];
          const newPaidAmount = order.credit_paid_amount + amount;
          const newPaymentStatus = newPaidAmount >= order.total_amount ? 'paid' : 'partial';

          await client.query(
            `UPDATE orders 
             SET credit_paid_amount = $1, payment_status = $2
             WHERE order_id = $3`,
            [newPaidAmount, newPaymentStatus, order_id]
          );
        }
      }

      // Registrar en historial
      await client.query(
        `INSERT INTO credit_history 
         (user_id, transaction_type, amount, balance_before, balance_after, 
          payment_id, description, performed_by)
         VALUES ($1, 'payment', $2, $3, $4, $5, $6, $7)`,
        [
          user_id,
          amount,
          balanceBefore,
          balanceAfter,
          paymentResult.rows[0].payment_id,
          `Pago registrado${order_id ? ' para pedido específico' : ''}`,
          recorded_by
        ]
      );

      return paymentResult.rows[0];
    });
  }

  // Obtener historial de pagos de un usuario
  static async getPaymentHistory(userId, limit = 50) {
    const result = await query(
      `SELECT cp.*, o.order_number
       FROM credit_payments cp
       LEFT JOIN orders o ON o.order_id = cp.order_id
       WHERE cp.user_id = $1
       ORDER BY cp.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  // Obtener historial de crédito completo
  static async getCreditHistory(userId, limit = 100) {
    const result = await query(
      `SELECT ch.*, 
              o.order_number,
              u.full_name as performed_by_name
       FROM credit_history ch
       LEFT JOIN orders o ON o.order_id = ch.order_id
       LEFT JOIN users u ON u.user_id = ch.performed_by
       WHERE ch.user_id = $1
       ORDER BY ch.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  // Obtener pedidos fiados pendientes de un usuario
  static async getPendingOrders(userId) {
    const result = await query(
      `SELECT o.order_id, o.order_number, o.total_amount, o.credit_paid_amount,
              (o.total_amount - o.credit_paid_amount) as remaining_amount,
              o.payment_status, o.created_at
       FROM orders o
       WHERE o.user_id = $1 
       AND o.is_credit_order = true 
       AND o.payment_status != 'paid'
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // Obtener todos los usuarios con deuda
  static async getUsersWithDebt() {
    const result = await query(
      `SELECT * FROM users_with_debt
       ORDER BY debt_amount DESC`
    );

    return result.rows;
  }

  // Generar reporte de deudas
  static async generateDebtReport(filters = {}) {
    let whereClause = 'WHERE u.has_credit_account = true AND u.current_balance > 0';
    const params = [];
    let paramCount = 1;

    if (filters.min_debt) {
      whereClause += ` AND u.current_balance >= $${paramCount}`;
      params.push(filters.min_debt);
      paramCount++;
    }

    if (filters.account_status) {
      whereClause += ` AND u.account_status = $${paramCount}`;
      params.push(filters.account_status);
      paramCount++;
    }

    const result = await query(
      `SELECT 
         u.user_id,
         u.full_name,
         u.email,
         u.phone,
         u.current_balance as debt_amount,
         u.credit_limit,
         ROUND((u.current_balance / NULLIF(u.credit_limit, 0) * 100), 2) as credit_usage_percent,
         u.account_status,
         COUNT(o.order_id) as pending_orders_count,
         MIN(o.created_at) as oldest_order_date,
         MAX(o.created_at) as newest_order_date,
         COALESCE(SUM(o.total_amount - o.credit_paid_amount), 0) as total_pending_amount
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.user_id 
                          AND o.is_credit_order = true 
                          AND o.payment_status != 'paid'
       ${whereClause}
       GROUP BY u.user_id, u.full_name, u.email, u.phone, u.current_balance, 
                u.credit_limit, u.account_status
       ORDER BY u.current_balance DESC`,
      params
    );

    return result.rows;
  }

  // Verificar si usuario puede hacer un pedido fiado
  static async checkCreditAvailability(userId, orderAmount) {
    const result = await query(
      `SELECT has_credit_account, credit_limit, current_balance, account_status
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        canOrder: false,
        reason: 'Usuario no encontrado'
      };
    }

    const user = result.rows[0];

    if (!user.has_credit_account) {
      return {
        canOrder: false,
        reason: 'No tiene cuenta de crédito activada'
      };
    }

    if (user.account_status !== 'active') {
      return {
        canOrder: false,
        reason: 'Cuenta suspendida o inactiva'
      };
    }

    const availableCredit = user.credit_limit - user.current_balance;
    const threshold = parseFloat(process.env.CREDIT_BLOCK_THRESHOLD || 0.90);
    const usagePercent = user.current_balance / user.credit_limit;

    if (usagePercent >= threshold) {
      return {
        canOrder: false,
        reason: `Límite de crédito alcanzado (${(usagePercent * 100).toFixed(1)}%)`,
        current_balance: user.current_balance,
        credit_limit: user.credit_limit,
        available_credit: availableCredit
      };
    }

    if (orderAmount > availableCredit) {
      return {
        canOrder: false,
        reason: 'Monto supera el crédito disponible',
        current_balance: user.current_balance,
        credit_limit: user.credit_limit,
        available_credit: availableCredit,
        order_amount: orderAmount
      };
    }

    return {
      canOrder: true,
      current_balance: user.current_balance,
      credit_limit: user.credit_limit,
      available_credit: availableCredit,
      order_amount: orderAmount,
      remaining_after_order: availableCredit - orderAmount
    };
  }

  // Ajustar deuda manualmente (por admin)
  static async adjustDebt(userId, amount, reason, performedBy) {
    return await transaction(async (client) => {
      // Obtener balance actual
      const userResult = await client.query(
        'SELECT current_balance FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const balanceBefore = userResult.rows[0].current_balance;
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) {
        throw new Error('El ajuste resultaría en balance negativo');
      }

      // Actualizar balance
      await client.query(
        'UPDATE users SET current_balance = $1 WHERE user_id = $2',
        [balanceAfter, userId]
      );

      // Registrar en historial
      await client.query(
        `INSERT INTO credit_history 
         (user_id, transaction_type, amount, balance_before, balance_after, 
          description, performed_by)
         VALUES ($1, 'adjustment', $2, $3, $4, $5, $6)`,
        [userId, amount, balanceBefore, balanceAfter, reason, performedBy]
      );

      return {
        user_id: userId,
        adjustment_amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reason
      };
    });
  }

  // Obtener resumen de crédito mensual
  static async getMonthlySummary(year, month) {
    const result = await query(
      `SELECT
         COUNT(DISTINCT user_id) as users_with_credit,
         SUM(current_balance) as total_debt,
         AVG(current_balance) as avg_debt_per_user,
         COUNT(DISTINCT CASE WHEN current_balance > 0 THEN user_id END) as users_with_debt
       FROM users
       WHERE has_credit_account = true`,
      []
    );

    const paymentsResult = await query(
      `SELECT
         COUNT(*) as total_payments,
         SUM(amount) as total_collected
       FROM credit_payments
       WHERE EXTRACT(YEAR FROM created_at) = $1
       AND EXTRACT(MONTH FROM created_at) = $2`,
      [year, month]
    );

    const ordersResult = await query(
      `SELECT
         COUNT(*) as credit_orders_count,
         SUM(total_amount) as credit_orders_total
       FROM orders
       WHERE is_credit_order = true
       AND EXTRACT(YEAR FROM created_at) = $1
       AND EXTRACT(MONTH FROM created_at) = $2`,
      [year, month]
    );

    return {
      general: result.rows[0],
      payments: paymentsResult.rows[0],
      orders: ordersResult.rows[0]
    };
  }

  // Obtener reporte de gastos fiados de un usuario (diario, semanal, mensual)
  static async getUserCreditReport(userId, period = 'monthly', startDate = null, endDate = null) {
    let dateFilter = '';
    let params = [userId];
    let paramCount = 2;

    if (startDate && endDate) {
      dateFilter = `AND o.created_at >= $${paramCount} AND o.created_at <= $${paramCount + 1}`;
      params.push(startDate, endDate);
    } else {
      // Calcular fechas según el período
      const now = new Date();
      let start;

      if (period === 'daily') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'weekly') {
        start = new Date(now);
        start.setDate(now.getDate() - 7);
      } else { // monthly
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      dateFilter = `AND o.created_at >= $${paramCount}`;
      params.push(start);
    }

    // Obtener pedidos fiados del período
    const ordersResult = await query(
      `SELECT
         o.order_id,
         o.order_number,
         o.total_amount,
         o.credit_paid_amount,
         (o.total_amount - o.credit_paid_amount) as remaining_amount,
         o.payment_status,
         o.created_at,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'product_name', oi.product_name,
             'quantity', oi.quantity,
             'unit_price', oi.unit_price,
             'subtotal', oi.subtotal
           )
         ) as items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       WHERE o.user_id = $1
       AND o.is_credit_order = true
       ${dateFilter}
       GROUP BY o.order_id, o.order_number, o.total_amount, o.credit_paid_amount,
                o.payment_status, o.created_at
       ORDER BY o.created_at DESC`,
      params
    );

    // Obtener pagos del período
    const paymentsResult = await query(
      `SELECT
         cp.payment_id,
         cp.amount,
         cp.payment_method,
         cp.created_at,
         cp.notes,
         o.order_number
       FROM credit_payments cp
       LEFT JOIN orders o ON o.order_id = cp.order_id
       WHERE cp.user_id = $1
       ${dateFilter.replace('o.created_at', 'cp.created_at')}
       ORDER BY cp.created_at DESC`,
      params
    );

    const orders = ordersResult.rows;
    const payments = paymentsResult.rows;

    // Calcular totales
    const totalOrdered = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const totalPending = orders.reduce((sum, order) => sum + parseFloat(order.remaining_amount), 0);

    return {
      period,
      orders: {
        count: orders.length,
        total: totalOrdered,
        items: orders
      },
      payments: {
        count: payments.length,
        total: totalPaid,
        items: payments
      },
      summary: {
        total_ordered: totalOrdered,
        total_paid: totalPaid,
        total_pending: totalPending
      }
    };
  }

  // Registrar pago de deuda iniciado por el cliente
  static async registerCustomerPayment(paymentData) {
    return await transaction(async (client) => {
      const { user_id, amount, payment_method, order_id, notes, transaction_reference } = paymentData;

      // Obtener balance actual
      const userResult = await client.query(
        'SELECT current_balance, has_credit_account FROM users WHERE user_id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const user = userResult.rows[0];

      if (!user.has_credit_account) {
        throw new Error('Usuario no tiene cuenta de crédito');
      }

      if (amount > user.current_balance) {
        throw new Error('El monto excede la deuda actual');
      }

      const balanceBefore = user.current_balance;
      const balanceAfter = balanceBefore - amount;

      // Registrar pago
      const paymentResult = await client.query(
        `INSERT INTO credit_payments
         (user_id, order_id, amount, payment_method, balance_before, balance_after,
          transaction_reference, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          user_id,
          order_id || null,
          amount,
          payment_method,
          balanceBefore,
          balanceAfter,
          transaction_reference || null,
          notes || `Pago realizado por cliente vía ${payment_method}`,
          user_id // El cliente registra su propio pago
        ]
      );

      // Actualizar balance del usuario
      await client.query(
        'UPDATE users SET current_balance = $1 WHERE user_id = $2',
        [balanceAfter, user_id]
      );

      // Si hay order_id, actualizar el pedido
      if (order_id) {
        const orderResult = await client.query(
          'SELECT total_amount, credit_paid_amount FROM orders WHERE order_id = $1 AND user_id = $2',
          [order_id, user_id]
        );

        if (orderResult.rows.length > 0) {
          const order = orderResult.rows[0];
          const newPaidAmount = parseFloat(order.credit_paid_amount) + amount;
          const newPaymentStatus = newPaidAmount >= parseFloat(order.total_amount) ? 'paid' : 'partial';

          await client.query(
            `UPDATE orders
             SET credit_paid_amount = $1, payment_status = $2
             WHERE order_id = $3`,
            [newPaidAmount, newPaymentStatus, order_id]
          );
        }
      }

      // Registrar en historial
      await client.query(
        `INSERT INTO credit_history
         (user_id, transaction_type, amount, balance_before, balance_after,
          payment_id, description, performed_by)
         VALUES ($1, 'payment', $2, $3, $4, $5, $6, $7)`,
        [
          user_id,
          amount,
          balanceBefore,
          balanceAfter,
          paymentResult.rows[0].payment_id,
          `Pago realizado vía ${payment_method}${order_id ? ' para pedido específico' : ''}`,
          user_id
        ]
      );

      return paymentResult.rows[0];
    });
  }
}

module.exports = Credit;