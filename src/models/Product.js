const { query } = require('../config/database');

class Product {
  // Crear producto
  static async create(productData) {
    const {
      category_id,
      name,
      description,
      price,
      image_url,
      thumbnail_url,
      stock_quantity = 0,
      min_stock_level = 5,
      preparation_time = 10,
      calories,
      allergens
    } = productData;

    const result = await query(
      `INSERT INTO products 
       (category_id, name, description, price, image_url, thumbnail_url, 
        stock_quantity, min_stock_level, preparation_time, calories, allergens)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        category_id,
        name,
        description,
        price,
        image_url || null,
        thumbnail_url || null,
        stock_quantity,
        min_stock_level,
        preparation_time,
        calories || null,
        allergens || null
      ]
    );

    return result.rows[0];
  }

  // Obtener todos los productos con filtros
  static async findAll(filters = {}) {
    let whereConditions = ['1=1'];
    const params = [];
    let paramCount = 1;

    // Filtro por categoría
    if (filters.category_id) {
      whereConditions.push(`p.category_id = $${paramCount}`);
      params.push(filters.category_id);
      paramCount++;
    }

    // Filtro por disponibilidad
    if (filters.is_available !== undefined) {
      whereConditions.push(`p.is_available = $${paramCount}`);
      params.push(filters.is_available);
      paramCount++;
    }

    // Filtro por búsqueda de texto
    if (filters.search) {
      whereConditions.push(`(p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`);
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    // Filtro por rango de precio
    if (filters.min_price) {
      whereConditions.push(`p.price >= $${paramCount}`);
      params.push(filters.min_price);
      paramCount++;
    }

    if (filters.max_price) {
      whereConditions.push(`p.price <= $${paramCount}`);
      params.push(filters.max_price);
      paramCount++;
    }

    // Filtro por stock bajo
    if (filters.low_stock) {
      whereConditions.push('p.stock_quantity <= p.min_stock_level');
    }

    const result = await query(
      `SELECT p.product_id, p.name, p.description, p.price, p.image_url, p.thumbnail_url,
              p.stock_quantity, p.min_stock_level, p.is_available, p.preparation_time,
              p.calories, p.allergens, p.created_at, p.updated_at,
              c.name as category_name, c.category_id
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY p.created_at DESC`,
      params
    );

    return result.rows;
  }

  // Obtener producto por ID
  static async findById(productId) {
    const result = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       WHERE p.product_id = $1`,
      [productId]
    );

    return result.rows[0];
  }

  // Actualizar producto
  static async update(productId, updates) {
    const allowedFields = [
      'category_id',
      'name',
      'description',
      'price',
      'image_url',
      'thumbnail_url',
      'stock_quantity',
      'min_stock_level',
      'is_available',
      'preparation_time',
      'calories',
      'allergens'
    ];

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

    params.push(productId);

    const result = await query(
      `UPDATE products 
       SET ${updateFields.join(', ')}
       WHERE product_id = $${paramCount}
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // Actualizar stock
  static async updateStock(productId, quantity, movementType = 'adjustment') {
    const product = await this.findById(productId);
    
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const newStock = product.stock_quantity + quantity;

    if (newStock < 0) {
      throw new Error('Stock insuficiente');
    }

    // Actualizar stock
    const result = await query(
      `UPDATE products 
       SET stock_quantity = $1
       WHERE product_id = $2
       RETURNING *`,
      [newStock, productId]
    );

    // Registrar movimiento de inventario
    await query(
      `INSERT INTO inventory_movements 
       (product_id, movement_type, quantity, stock_before, stock_after, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        productId,
        movementType,
        quantity,
        product.stock_quantity,
        newStock,
        `Ajuste de inventario: ${movementType}`
      ]
    );

    return result.rows[0];
  }

  // Eliminar producto (soft delete)
  static async delete(productId) {
    const result = await query(
      `UPDATE products 
       SET is_available = false
       WHERE product_id = $1
       RETURNING *`,
      [productId]
    );

    return result.rows[0];
  }

  // Obtener productos con stock bajo
  static async getLowStockProducts() {
    const result = await query(
      'SELECT * FROM low_stock_products'
    );

    return result.rows;
  }

  // Verificar disponibilidad de producto
  static async checkAvailability(productId, quantity = 1) {
    const product = await this.findById(productId);

    if (!product) {
      return { available: false, reason: 'Producto no encontrado' };
    }

    if (!product.is_available) {
      return { available: false, reason: 'Producto no disponible' };
    }

    if (product.stock_quantity < quantity) {
      return { 
        available: false, 
        reason: 'Stock insuficiente',
        available_quantity: product.stock_quantity
      };
    }

    return { available: true, product };
  }

  // Obtener productos por categoría (para menú público)
  static async getByCategory(categoryId) {
    const result = await query(
      `SELECT product_id, name, description, price, image_url, thumbnail_url,
              preparation_time, calories, allergens, stock_quantity > 0 as in_stock
       FROM products
       WHERE category_id = $1 AND is_available = true
       ORDER BY name ASC`,
      [categoryId]
    );

    return result.rows;
  }

  // Buscar productos (para barra de búsqueda)
  static async search(searchTerm, limit = 20) {
    const result = await query(
      `SELECT p.product_id, p.name, p.description, p.price, p.image_url, p.thumbnail_url,
              c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       WHERE p.is_available = true 
       AND (p.name ILIKE $1 OR p.description ILIKE $1)
       ORDER BY p.name ASC
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );

    return result.rows;
  }
}

module.exports = Product;