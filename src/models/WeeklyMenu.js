const pool = require('../config/database');

class WeeklyMenu {
  // Crear un nuevo menú semanal
  static async create(menuData) {
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
    } = menuData;

    const query = `
      INSERT INTO weekly_menus (
        menu_date, entry_description, main_course_description,
        drink_description, dessert_description, description,
        price, reservation_deadline, max_reservations
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      menu_date,
      entry_description,
      main_course_description,
      drink_description,
      dessert_description,
      description,
      price,
      reservation_deadline,
      max_reservations
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Obtener todos los menús
  static async findAll(filters = {}) {
    let query = `
      SELECT *,
        CASE
          WHEN reservation_deadline < NOW() THEN false
          WHEN max_reservations IS NOT NULL AND current_reservations >= max_reservations THEN false
          ELSE true
        END as can_reserve
      FROM weekly_menus
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.is_active);
    }

    if (filters.from_date) {
      paramCount++;
      query += ` AND menu_date >= $${paramCount}`;
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      query += ` AND menu_date <= $${paramCount}`;
      values.push(filters.to_date);
    }

    if (filters.available_for_reservation) {
      query += ` AND reservation_deadline > NOW() AND is_active = true`;
      query += ` AND (max_reservations IS NULL OR current_reservations < max_reservations)`;
    }

    query += ' ORDER BY menu_date ASC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Obtener menú por ID
  static async findById(menuId) {
    const query = `
      SELECT *,
        CASE
          WHEN reservation_deadline < NOW() THEN false
          WHEN max_reservations IS NOT NULL AND current_reservations >= max_reservations THEN false
          ELSE true
        END as can_reserve
      FROM weekly_menus
      WHERE menu_id = $1
    `;
    const result = await pool.query(query, [menuId]);
    return result.rows[0];
  }

  // Obtener menú por fecha
  static async findByDate(menuDate) {
    const query = `
      SELECT *,
        CASE
          WHEN reservation_deadline < NOW() THEN false
          WHEN max_reservations IS NOT NULL AND current_reservations >= max_reservations THEN false
          ELSE true
        END as can_reserve
      FROM weekly_menus
      WHERE menu_date = $1
    `;
    const result = await pool.query(query, [menuDate]);
    return result.rows[0];
  }

  // Actualizar menú
  static async update(menuId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'menu_date', 'entry_description', 'main_course_description',
      'drink_description', 'dessert_description', 'description',
      'price', 'reservation_deadline', 'max_reservations', 'is_active'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
      }
    }

    if (fields.length === 0) return this.findById(menuId);

    paramCount++;
    values.push(menuId);

    const query = `
      UPDATE weekly_menus
      SET ${fields.join(', ')}
      WHERE menu_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Eliminar menú (soft delete)
  static async delete(menuId) {
    const query = `
      UPDATE weekly_menus
      SET is_active = false
      WHERE menu_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [menuId]);
    return result.rows[0];
  }

  // Verificar si se puede reservar
  static async canReserve(menuId) {
    const query = `
      SELECT
        menu_id,
        reservation_deadline > NOW() as within_deadline,
        is_active,
        CASE
          WHEN max_reservations IS NULL THEN true
          ELSE current_reservations < max_reservations
        END as has_availability
      FROM weekly_menus
      WHERE menu_id = $1
    `;
    const result = await pool.query(query, [menuId]);
    if (!result.rows[0]) return { can_reserve: false, reason: 'Menu no encontrado' };

    const menu = result.rows[0];
    if (!menu.is_active) return { can_reserve: false, reason: 'Menu no disponible' };
    if (!menu.within_deadline) return { can_reserve: false, reason: 'Plazo de reserva vencido' };
    if (!menu.has_availability) return { can_reserve: false, reason: 'No hay cupos disponibles' };

    return { can_reserve: true };
  }

  // Obtener menús de la semana actual
  static async getCurrentWeekMenus() {
    const query = `
      SELECT *,
        CASE
          WHEN reservation_deadline < NOW() THEN false
          WHEN max_reservations IS NOT NULL AND current_reservations >= max_reservations THEN false
          ELSE true
        END as can_reserve
      FROM weekly_menus
      WHERE menu_date >= date_trunc('week', CURRENT_DATE)
        AND menu_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
        AND is_active = true
      ORDER BY menu_date ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // ===================== RESERVACIONES =====================

  // Crear reservación
  static async createReservation(reservationData) {
    const { menu_id, user_id, quantity = 1, notes } = reservationData;

    // Obtener precio del menú
    const menuQuery = 'SELECT price FROM weekly_menus WHERE menu_id = $1';
    const menuResult = await pool.query(menuQuery, [menu_id]);
    if (!menuResult.rows[0]) throw new Error('Menu no encontrado');

    const total_amount = menuResult.rows[0].price * quantity;

    const query = `
      INSERT INTO menu_reservations (menu_id, user_id, quantity, total_amount, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [menu_id, user_id, quantity, total_amount, notes]);
    return result.rows[0];
  }

  // Obtener reservación por ID
  static async findReservationById(reservationId) {
    const query = `
      SELECT r.*, m.menu_date, m.entry_description, m.main_course_description,
             m.drink_description, m.dessert_description, m.price as menu_price,
             u.full_name as user_name, u.email as user_email
      FROM menu_reservations r
      JOIN weekly_menus m ON r.menu_id = m.menu_id
      JOIN users u ON r.user_id = u.user_id
      WHERE r.reservation_id = $1
    `;
    const result = await pool.query(query, [reservationId]);
    return result.rows[0];
  }

  // Obtener reservaciones de un usuario
  static async getUserReservations(userId, filters = {}) {
    let query = `
      SELECT r.*, m.menu_date, m.entry_description, m.main_course_description,
             m.drink_description, m.dessert_description, m.description as menu_description
      FROM menu_reservations r
      JOIN weekly_menus m ON r.menu_id = m.menu_id
      WHERE r.user_id = $1
    `;
    const values = [userId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      values.push(filters.status);
    }

    query += ' ORDER BY m.menu_date DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Obtener reservaciones de un menú
  static async getMenuReservations(menuId, filters = {}) {
    let query = `
      SELECT r.*, u.full_name, u.email, u.phone
      FROM menu_reservations r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.menu_id = $1
    `;
    const values = [menuId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      values.push(filters.status);
    }

    query += ' ORDER BY r.reserved_at ASC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Verificar si usuario ya reservó este menú
  static async userHasReservation(userId, menuId) {
    const query = `
      SELECT reservation_id FROM menu_reservations
      WHERE user_id = $1 AND menu_id = $2 AND status != 'cancelled'
    `;
    const result = await pool.query(query, [userId, menuId]);
    return result.rows.length > 0;
  }

  // Actualizar estado de reservación
  static async updateReservationStatus(reservationId, status, reason = null) {
    let query;
    let values;

    if (status === 'cancelled') {
      query = `
        UPDATE menu_reservations
        SET status = $1, cancelled_at = NOW(), cancellation_reason = $2
        WHERE reservation_id = $3
        RETURNING *
      `;
      values = [status, reason, reservationId];
    } else if (status === 'confirmed') {
      query = `
        UPDATE menu_reservations
        SET status = $1, confirmed_at = NOW()
        WHERE reservation_id = $2
        RETURNING *
      `;
      values = [status, reservationId];
    } else if (status === 'delivered') {
      query = `
        UPDATE menu_reservations
        SET status = $1, delivered_at = NOW()
        WHERE reservation_id = $2
        RETURNING *
      `;
      values = [status, reservationId];
    } else {
      query = `
        UPDATE menu_reservations
        SET status = $1
        WHERE reservation_id = $2
        RETURNING *
      `;
      values = [status, reservationId];
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Cancelar reservación
  static async cancelReservation(reservationId, reason) {
    return this.updateReservationStatus(reservationId, 'cancelled', reason);
  }

  // Obtener estadísticas de reservaciones por menú
  static async getMenuReservationStats(menuId) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        SUM(quantity) FILTER (WHERE status != 'cancelled') as total_quantity,
        SUM(total_amount) FILTER (WHERE status != 'cancelled') as total_revenue
      FROM menu_reservations
      WHERE menu_id = $1
    `;
    const result = await pool.query(query, [menuId]);
    return result.rows[0];
  }

  // ===================== LISTA DE ESPERA / DEMANDA =====================

  // Agregar a lista de espera
  static async addToWaitlist(waitlistData) {
    const { menu_id, user_id, quantity = 1, notes } = waitlistData;

    const query = `
      INSERT INTO menu_waitlist (menu_id, user_id, quantity, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [menu_id, user_id, quantity, notes]);
    return result.rows[0];
  }

  // Verificar si usuario está en lista de espera
  static async userInWaitlist(userId, menuId) {
    const query = `
      SELECT waitlist_id FROM menu_waitlist
      WHERE user_id = $1 AND menu_id = $2 AND status = 'waiting'
    `;
    const result = await pool.query(query, [userId, menuId]);
    return result.rows.length > 0;
  }

  // Obtener lista de espera de un menú
  static async getMenuWaitlist(menuId) {
    const query = `
      SELECT w.*, u.full_name, u.email, u.phone
      FROM menu_waitlist w
      JOIN users u ON w.user_id = u.user_id
      WHERE w.menu_id = $1 AND w.status = 'waiting'
      ORDER BY w.created_at ASC
    `;
    const result = await pool.query(query, [menuId]);
    return result.rows;
  }

  // Obtener demanda total (reservaciones + lista de espera)
  static async getMenuDemand(menuId) {
    const query = `
      SELECT
        m.menu_id,
        m.menu_date,
        m.max_reservations,
        m.current_reservations,
        COALESCE(m.max_reservations - m.current_reservations, 999) as spots_available,
        COALESCE(w.waitlist_count, 0) as waitlist_count,
        COALESCE(w.waitlist_quantity, 0) as waitlist_quantity,
        m.current_reservations + COALESCE(w.waitlist_quantity, 0) as total_demand,
        CASE
          WHEN m.max_reservations IS NULL THEN 0
          ELSE GREATEST(0, (m.current_reservations + COALESCE(w.waitlist_quantity, 0)) - m.max_reservations)
        END as unmet_demand,
        CASE
          WHEN m.max_reservations IS NULL THEN 'unlimited'
          WHEN m.current_reservations < m.max_reservations THEN 'available'
          WHEN COALESCE(w.waitlist_count, 0) > 0 THEN 'full_with_demand'
          ELSE 'full'
        END as demand_status
      FROM weekly_menus m
      LEFT JOIN (
        SELECT menu_id,
               COUNT(*) as waitlist_count,
               SUM(quantity) as waitlist_quantity
        FROM menu_waitlist
        WHERE status = 'waiting'
        GROUP BY menu_id
      ) w ON m.menu_id = w.menu_id
      WHERE m.menu_id = $1
    `;
    const result = await pool.query(query, [menuId]);
    return result.rows[0];
  }

  // Obtener reporte de demanda para todos los menús activos
  static async getDemandReport(filters = {}) {
    let query = `
      SELECT
        m.menu_id,
        m.menu_date,
        m.entry_description,
        m.main_course_description,
        m.max_reservations,
        m.current_reservations,
        COALESCE(w.waitlist_count, 0) as waitlist_count,
        COALESCE(w.waitlist_quantity, 0) as waitlist_quantity,
        m.current_reservations + COALESCE(w.waitlist_quantity, 0) as total_demand,
        CASE
          WHEN m.max_reservations IS NULL THEN 0
          ELSE GREATEST(0, (m.current_reservations + COALESCE(w.waitlist_quantity, 0)) - m.max_reservations)
        END as unmet_demand,
        ROUND(
          CASE
            WHEN m.max_reservations IS NULL OR m.max_reservations = 0 THEN 0
            ELSE (m.current_reservations::numeric / m.max_reservations) * 100
          END, 1
        ) as occupancy_percentage
      FROM weekly_menus m
      LEFT JOIN (
        SELECT menu_id,
               COUNT(*) as waitlist_count,
               SUM(quantity) as waitlist_quantity
        FROM menu_waitlist
        WHERE status = 'waiting'
        GROUP BY menu_id
      ) w ON m.menu_id = w.menu_id
      WHERE m.is_active = true
    `;
    const values = [];
    let paramCount = 0;

    if (filters.from_date) {
      paramCount++;
      query += ` AND m.menu_date >= $${paramCount}`;
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      query += ` AND m.menu_date <= $${paramCount}`;
      values.push(filters.to_date);
    }

    if (filters.has_unmet_demand) {
      query += ` AND (m.current_reservations + COALESCE(w.waitlist_quantity, 0)) > COALESCE(m.max_reservations, 999999)`;
    }

    query += ' ORDER BY m.menu_date ASC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Actualizar cupo máximo (admin puede agregar más platos)
  static async updateMaxReservations(menuId, newMax, adminNotes = null) {
    const query = `
      UPDATE weekly_menus
      SET max_reservations = $1
      WHERE menu_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [newMax, menuId]);

    // Si hay lista de espera y ahora hay cupos, notificar
    if (result.rows[0]) {
      const menu = result.rows[0];
      if (menu.current_reservations < newMax) {
        // Hay cupos disponibles, podrían procesarse personas en espera
        return {
          menu: result.rows[0],
          newSpotsAvailable: newMax - menu.current_reservations
        };
      }
    }

    return { menu: result.rows[0], newSpotsAvailable: 0 };
  }

  // Procesar lista de espera cuando hay nuevos cupos
  static async processWaitlist(menuId, spotsAvailable) {
    const waitlistQuery = `
      SELECT w.*, u.email, u.full_name
      FROM menu_waitlist w
      JOIN users u ON w.user_id = u.user_id
      WHERE w.menu_id = $1 AND w.status = 'waiting'
      ORDER BY w.created_at ASC
      LIMIT $2
    `;
    const waitlist = await pool.query(waitlistQuery, [menuId, spotsAvailable]);

    const processed = [];
    for (const entry of waitlist.rows) {
      // Marcar como notificado
      await pool.query(
        `UPDATE menu_waitlist SET status = 'notified', notified_at = NOW() WHERE waitlist_id = $1`,
        [entry.waitlist_id]
      );
      processed.push({
        user_id: entry.user_id,
        email: entry.email,
        full_name: entry.full_name,
        quantity: entry.quantity
      });
    }

    return processed;
  }

  // Cancelar entrada en lista de espera
  static async cancelWaitlistEntry(waitlistId, userId) {
    const query = `
      UPDATE menu_waitlist
      SET status = 'cancelled'
      WHERE waitlist_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [waitlistId, userId]);
    return result.rows[0];
  }

  // Obtener lista de espera de un usuario
  static async getUserWaitlist(userId) {
    const query = `
      SELECT w.*, m.menu_date, m.entry_description, m.main_course_description,
             m.drink_description, m.dessert_description, m.price
      FROM menu_waitlist w
      JOIN weekly_menus m ON w.menu_id = m.menu_id
      WHERE w.user_id = $1 AND w.status IN ('waiting', 'notified')
      ORDER BY m.menu_date ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}

module.exports = WeeklyMenu;
