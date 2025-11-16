const { query } = require('../config/database');

class Category {
  // Crear categoría
  static async create(categoryData) {
    const { name, description, icon_url, display_order } = categoryData;

    const result = await query(
      `INSERT INTO categories (name, description, icon_url, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, icon_url || null, display_order || 0]
    );

    return result.rows[0];
  }

  // Obtener todas las categorías
  static async findAll(includeInactive = false) {
    const whereClause = includeInactive ? '' : 'WHERE is_active = true';
    
    const result = await query(
      `SELECT * FROM categories
       ${whereClause}
       ORDER BY display_order ASC, name ASC`
    );

    return result.rows;
  }

  // Obtener categoría por ID
  static async findById(categoryId) {
    const result = await query(
      'SELECT * FROM categories WHERE category_id = $1',
      [categoryId]
    );

    return result.rows[0];
  }

  // Actualizar categoría
  static async update(categoryId, updates) {
    const allowedFields = ['name', 'description', 'icon_url', 'display_order', 'is_active'];
    const updateFields = [];
    const params = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        params.push(updates[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    params.push(categoryId);

    const result = await query(
      `UPDATE categories 
       SET ${updateFields.join(', ')}
       WHERE category_id = $${paramCount}
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // Eliminar categoría (soft delete)
  static async delete(categoryId) {
    const result = await query(
      `UPDATE categories 
       SET is_active = false
       WHERE category_id = $1
       RETURNING *`,
      [categoryId]
    );

    return result.rows[0];
  }

  // Eliminar permanentemente (solo si no tiene productos)
  static async hardDelete(categoryId) {
    // Verificar si tiene productos
    const productsCheck = await query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1',
      [categoryId]
    );

    if (parseInt(productsCheck.rows[0].count) > 0) {
      throw new Error('No se puede eliminar la categoría porque tiene productos asociados');
    }

    const result = await query(
      'DELETE FROM categories WHERE category_id = $1 RETURNING *',
      [categoryId]
    );

    return result.rows[0];
  }

  // Contar productos por categoría
  static async getProductCount(categoryId) {
    const result = await query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_available = true',
      [categoryId]
    );

    return parseInt(result.rows[0].count);
  }
}

module.exports = Category;