require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    // 1. Crear usuario admin
    console.log('👤 Creando usuario administrador...');
    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING user_id`,
      ['admin@kanela.com', adminPassword, 'Administrador Kanela', 'admin', '987654321']
    );
    console.log('✅ Admin creado\n');

    // 2. Crear usuarios de prueba
    console.log('👥 Creando usuarios de prueba...');
    const customerPassword = await bcrypt.hash('password123', 12);
    
    const users = [
      ['juan.perez@uni.edu', 'Juan Pérez', '987123456'],
      ['maria.garcia@uni.edu', 'María García', '987123457'],
      ['carlos.lopez@uni.edu', 'Carlos López', '987123458'],
      ['ana.martinez@uni.edu', 'Ana Martínez', '987123459'],
      ['luis.rodriguez@uni.edu', 'Luis Rodríguez', '987123460']
    ];

    const userIds = [];
    for (const [email, name, phone] of users) {
      const result = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, phone)
         VALUES ($1, $2, $3, 'customer', $4)
         ON CONFLICT (email) DO NOTHING
         RETURNING user_id`,
        [email, customerPassword, name, phone]
      );
      if (result.rows.length > 0) {
        userIds.push(result.rows[0].user_id);
      }
    }
    console.log(`✅ ${users.length} usuarios creados\n`);

    // 3. Activar cuentas de crédito para algunos usuarios
    console.log('💳 Activando cuentas de crédito...');
    if (userIds.length >= 3) {
      for (let i = 0; i < 3; i++) {
        await client.query(
          `UPDATE users 
           SET has_credit_account = true, credit_limit = $1
           WHERE user_id = $2`,
          [100 + (i * 50), userIds[i]]
        );
      }
    }
    console.log('✅ Cuentas de crédito activadas\n');

    // 4. Crear categorías
    console.log('📂 Creando categorías...');
    const categories = [
      ['Bebidas Calientes', 'Café, té y bebidas calientes', '☕', 1],
      ['Bebidas Frías', 'Jugos, gaseosas y refrescos', '🥤', 2],
      ['Snacks', 'Snacks y bocadillos rápidos', '🍿', 3],
      ['Almuerzos', 'Platos de fondo y menús ejecutivos', '🍽️', 4],
      ['Postres', 'Postres y dulces', '🍰', 5],
      ['Sandwiches', 'Sandwiches y wraps', '🥪', 6]
    ];

    const categoryIds = [];
    for (const [name, desc, icon, order] of categories) {
      const result = await client.query(
        `INSERT INTO categories (name, description, icon_url, display_order)
         VALUES ($1, $2, $3, $4)
         RETURNING category_id`,
        [name, desc, icon, order]
      );
      categoryIds.push(result.rows[0].category_id);
    }
    console.log(`✅ ${categories.length} categorías creadas\n`);

    // 5. Crear productos
    console.log('🍕 Creando productos...');
    const products = [
      // Bebidas Calientes
      [categoryIds[0], 'Café Americano', 'Café americano tradicional', 3.50, 50, 5, 5],
      [categoryIds[0], 'Café Latte', 'Café con leche espumosa', 5.00, 45, 5, 5],
      [categoryIds[0], 'Cappuccino', 'Espresso con espuma de leche', 5.50, 40, 5, 5],
      [categoryIds[0], 'Té Verde', 'Té verde natural', 3.00, 35, 5, 3],
      
      // Bebidas Frías
      [categoryIds[1], 'Jugo de Naranja', 'Jugo natural de naranja', 4.00, 30, 5, 5],
      [categoryIds[1], 'Limonada', 'Limonada natural', 3.50, 35, 5, 5],
      [categoryIds[1], 'Iced Coffee', 'Café helado', 6.00, 25, 5, 5],
      [categoryIds[1], 'Smoothie de Fresa', 'Smoothie natural de fresa', 7.00, 20, 5, 7],
      
      // Snacks
      [categoryIds[2], 'Chips Naturales', 'Papas fritas artesanales', 4.50, 60, 10, 2],
      [categoryIds[2], 'Galletas Chips', 'Galletas con chips de chocolate', 3.00, 55, 10, 2],
      [categoryIds[2], 'Mix de Frutos Secos', 'Mezcla de nueces y almendras', 5.50, 40, 10, 2],
      
      // Almuerzos
      [categoryIds[3], 'Menú Ejecutivo', 'Sopa + segundo + refresco', 12.00, 30, 5, 20],
      [categoryIds[3], 'Arroz con Pollo', 'Arroz con pollo y ensalada', 10.00, 25, 5, 18],
      [categoryIds[3], 'Lomo Saltado', 'Lomo saltado tradicional', 14.00, 20, 5, 20],
      
      // Postres
      [categoryIds[4], 'Torta de Chocolate', 'Porción de torta de chocolate', 5.00, 15, 3, 5],
      [categoryIds[4], 'Cheesecake', 'Porción de cheesecake', 6.00, 12, 3, 5],
      [categoryIds[4], 'Brownie', 'Brownie con helado', 5.50, 18, 3, 7],
      
      // Sandwiches
      [categoryIds[5], 'Sandwich Mixto', 'Jamón, queso y verduras', 7.00, 35, 5, 10],
      [categoryIds[5], 'Club Sandwich', 'Triple de pollo', 9.00, 28, 5, 12],
      [categoryIds[5], 'Wrap Vegetariano', 'Wrap con vegetales', 8.00, 25, 5, 10]
    ];

    for (const [catId, name, desc, price, stock, minStock, prepTime] of products) {
      await client.query(
        `INSERT INTO products 
         (category_id, name, description, price, stock_quantity, min_stock_level, preparation_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [catId, name, desc, price, stock, minStock, prepTime]
      );
    }
    console.log(`✅ ${products.length} productos creados\n`);

    // 6. Crear algunos pedidos de prueba
    console.log('📦 Creando pedidos de prueba...');
    if (userIds.length > 0) {
      // Pedido completado
      const order1 = await client.query(
        `INSERT INTO orders 
         (user_id, total_amount, payment_method, status, payment_status)
         VALUES ($1, 18.50, 'cash', 'delivered', 'paid')
         RETURNING order_id`,
        [userIds[0]]
      );

      // Pedido en preparación
      const order2 = await client.query(
        `INSERT INTO orders 
         (user_id, total_amount, payment_method, status, payment_status)
         VALUES ($1, 12.00, 'card', 'preparing', 'paid')
         RETURNING order_id`,
        [userIds[1]]
      );

      // Pedido fiado (si hay usuarios con crédito)
      if (userIds.length >= 3) {
        const order3 = await client.query(
          `INSERT INTO orders 
           (user_id, total_amount, payment_method, is_credit_order, status, payment_status)
           VALUES ($1, 25.50, 'credit', true, 'pending', 'pending')
           RETURNING order_id`,
          [userIds[2]]
        );

        // Actualizar balance del usuario
        await client.query(
          `UPDATE users SET current_balance = current_balance + 25.50
           WHERE user_id = $1`,
          [userIds[2]]
        );
      }

      console.log('✅ Pedidos de prueba creados\n');
    }

    console.log('✨ Seed completado exitosamente!\n');
    console.log('📝 Credenciales de prueba:');
    console.log('   Admin:');
    console.log('   - Email: admin@kanela.com');
    console.log('   - Password: admin123\n');
    console.log('   Usuario:');
    console.log('   - Email: juan.perez@uni.edu');
    console.log('   - Password: password123\n');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar seed
seed()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });