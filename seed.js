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

// Función para generar fecha aleatoria en los últimos N días
function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 14) + 7); // Entre 7am y 9pm
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
}

// Función para seleccionar elemento aleatorio
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando seed COMPLETO de la base de datos...\n');

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
      ['luis.rodriguez@uni.edu', 'Luis Rodríguez', '987123460'],
      ['sofia.torres@uni.edu', 'Sofía Torres', '987123461'],
      ['diego.sanchez@uni.edu', 'Diego Sánchez', '987123462'],
      ['valentina.rojas@uni.edu', 'Valentina Rojas', '987123463'],
      ['miguel.castro@uni.edu', 'Miguel Castro', '987123464'],
      ['camila.vargas@uni.edu', 'Camila Vargas', '987123465'],
      ['andres.morales@uni.edu', 'Andrés Morales', '987123466'],
      ['lucia.silva@uni.edu', 'Lucía Silva', '987123467'],
      ['sebastian.ramos@uni.edu', 'Sebastián Ramos', '987123468'],
      ['fernanda.cruz@uni.edu', 'Fernanda Cruz', '987123469'],
      ['ricardo.flores@uni.edu', 'Ricardo Flores', '987123470']
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

    // 3. Activar cuentas de crédito con diferentes límites y deudas
    console.log('💳 Activando cuentas de crédito...');
    if (userIds.length >= 8) {
      const creditAccounts = [
        { userId: userIds[0], limit: 100, debt: 93 },   // Caso del ejemplo: cerca del límite
        { userId: userIds[1], limit: 150, debt: 45 },   // Uso moderado
        { userId: userIds[2], limit: 200, debt: 180 },  // Uso alto
        { userId: userIds[3], limit: 100, debt: 0 },    // Sin deuda
        { userId: userIds[4], limit: 250, debt: 125 },  // Uso medio
        { userId: userIds[5], limit: 80, debt: 75 },    // Casi al límite
        { userId: userIds[6], limit: 150, debt: 20 },   // Bajo uso
        { userId: userIds[7], limit: 300, debt: 250 }   // Alto uso
      ];

      for (const { userId, limit, debt } of creditAccounts) {
        await client.query(
          `UPDATE users
           SET has_credit_account = true, credit_limit = $1, current_balance = $2
           WHERE user_id = $3`,
          [limit, debt, userId]
        );
      }
    }
    console.log('✅ Cuentas de crédito activadas con diferentes balances\n');

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
      [categoryIds[0], 'Chocolate Caliente', 'Chocolate con leche caliente', 4.50, 30, 5, 5],

      // Bebidas Frías
      [categoryIds[1], 'Jugo de Naranja', 'Jugo natural de naranja', 4.00, 30, 5, 5],
      [categoryIds[1], 'Limonada', 'Limonada natural', 3.50, 35, 5, 5],
      [categoryIds[1], 'Iced Coffee', 'Café helado', 6.00, 25, 5, 5],
      [categoryIds[1], 'Smoothie de Fresa', 'Smoothie natural de fresa', 7.00, 20, 5, 7],
      [categoryIds[1], 'Chicha Morada', 'Chicha morada tradicional', 3.00, 40, 5, 3],

      // Snacks
      [categoryIds[2], 'Chips Naturales', 'Papas fritas artesanales', 4.50, 60, 10, 2],
      [categoryIds[2], 'Galletas Chips', 'Galletas con chips de chocolate', 3.00, 55, 10, 2],
      [categoryIds[2], 'Mix de Frutos Secos', 'Mezcla de nueces y almendras', 5.50, 40, 10, 2],
      [categoryIds[2], 'Pop Corn', 'Palomitas de maíz', 2.50, 50, 10, 3],

      // Almuerzos
      [categoryIds[3], 'Menú Ejecutivo', 'Sopa + segundo + refresco', 12.00, 30, 5, 20],
      [categoryIds[3], 'Arroz con Pollo', 'Arroz con pollo y ensalada', 10.00, 25, 5, 18],
      [categoryIds[3], 'Lomo Saltado', 'Lomo saltado tradicional', 14.00, 20, 5, 20],
      [categoryIds[3], 'Ají de Gallina', 'Ají de gallina con arroz', 11.00, 22, 5, 18],
      [categoryIds[3], 'Tallarín Saltado', 'Tallarines salteados con pollo', 12.50, 20, 5, 15],

      // Postres
      [categoryIds[4], 'Torta de Chocolate', 'Porción de torta de chocolate', 5.00, 15, 3, 5],
      [categoryIds[4], 'Cheesecake', 'Porción de cheesecake', 6.00, 12, 3, 5],
      [categoryIds[4], 'Brownie', 'Brownie con helado', 5.50, 18, 3, 7],
      [categoryIds[4], 'Tres Leches', 'Porción de tres leches', 5.50, 10, 3, 5],

      // Sandwiches
      [categoryIds[5], 'Sandwich Mixto', 'Jamón, queso y verduras', 7.00, 35, 5, 10],
      [categoryIds[5], 'Club Sandwich', 'Triple de pollo', 9.00, 28, 5, 12],
      [categoryIds[5], 'Wrap Vegetariano', 'Wrap con vegetales', 8.00, 25, 5, 10],
      [categoryIds[5], 'Sandwich de Pollo', 'Pollo a la plancha con verduras', 8.50, 30, 5, 12]
    ];

    const productIds = [];
    for (const [catId, name, desc, price, stock, minStock, prepTime] of products) {
      const result = await client.query(
        `INSERT INTO products
         (category_id, name, description, price, stock_quantity, min_stock_level, preparation_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING product_id`,
        [catId, name, desc, price, stock, minStock, prepTime]
      );
      productIds.push(result.rows[0].product_id);
    }
    console.log(`✅ ${products.length} productos creados\n`);

    // 6. Crear MUCHAS órdenes históricas (últimos 60 días)
    console.log('📦 Creando órdenes históricas de prueba...');

    const paymentMethods = ['cash', 'card', 'credit', 'yape', 'plin'];
    const statuses = ['delivered', 'delivered', 'delivered', 'delivered', 'cancelled']; // Más delivered que cancelled
    let ordersCreated = 0;

    // Crear 150 órdenes aleatorias en los últimos 60 días
    for (let i = 0; i < 150; i++) {
      const userId = randomChoice(userIds);
      const createdAt = randomDate(60); // Últimos 60 días
      const status = randomChoice(statuses);

      // Seleccionar método de pago
      let paymentMethod = randomChoice(paymentMethods);
      let isCreditOrder = paymentMethod === 'credit';

      // Si es credit, verificar si el usuario tiene cuenta de crédito
      const userCheck = await client.query(
        'SELECT has_credit_account FROM users WHERE user_id = $1',
        [userId]
      );

      if (isCreditOrder && !userCheck.rows[0]?.has_credit_account) {
        paymentMethod = 'cash'; // Cambiar a cash si no tiene crédito
        isCreditOrder = false;
      }

      // Seleccionar 1-4 productos aleatorios
      const numItems = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
        const productIndex = Math.floor(Math.random() * productIds.length);
        const productId = productIds[productIndex];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = products[productIndex][3];

        selectedProducts.push({
          productId,
          productName: products[productIndex][1],
          quantity,
          price
        });

        totalAmount += price * quantity;
      }

      // Crear la orden
      const orderResult = await client.query(
        `INSERT INTO orders
         (user_id, total_amount, payment_method, is_credit_order, status, payment_status, created_at, delivered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING order_id`,
        [
          userId,
          totalAmount,
          paymentMethod,
          isCreditOrder,
          status,
          isCreditOrder ? (status === 'delivered' ? 'pending' : 'pending') : 'paid',
          createdAt,
          status === 'delivered' ? createdAt : null
        ]
      );

      const orderId = orderResult.rows[0].order_id;

      // Insertar items de la orden
      for (const item of selectedProducts) {
        await client.query(
          `INSERT INTO order_items
           (order_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.productId, item.productName, item.quantity, item.price, item.price * item.quantity]
        );
      }

      ordersCreated++;
    }
    console.log(`✅ ${ordersCreated} órdenes históricas creadas\n`);

    // 7. Crear algunas órdenes ACTIVAS (para el dashboard)
    console.log('🔄 Creando órdenes activas...');
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];

    for (let i = 0; i < 10; i++) {
      const userId = randomChoice(userIds);
      const status = randomChoice(activeStatuses);
      const paymentMethod = randomChoice(['cash', 'card', 'yape', 'plin']); // Sin credit para órdenes activas

      // Seleccionar 1-3 productos
      const numItems = Math.floor(Math.random() * 3) + 1;
      let totalAmount = 0;
      const selectedProducts = [];

      for (let j = 0; j < numItems; j++) {
        const productIndex = Math.floor(Math.random() * productIds.length);
        const quantity = Math.floor(Math.random() * 2) + 1;
        const price = products[productIndex][3];

        selectedProducts.push({
          productId: productIds[productIndex],
          productName: products[productIndex][1],
          quantity,
          price
        });

        totalAmount += price * quantity;
      }

      const orderResult = await client.query(
        `INSERT INTO orders
         (user_id, total_amount, payment_method, status, payment_status)
         VALUES ($1, $2, $3, $4, 'paid')
         RETURNING order_id`,
        [userId, totalAmount, paymentMethod, status]
      );

      const orderId = orderResult.rows[0].order_id;

      for (const item of selectedProducts) {
        await client.query(
          `INSERT INTO order_items
           (order_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.productId, item.productName, item.quantity, item.price, item.price * item.quantity]
        );
      }
    }
    console.log('✅ 10 órdenes activas creadas\n');

    // 8. Crear pagos de crédito para algunos usuarios
    console.log('💰 Registrando pagos de crédito...');
    if (userIds.length >= 4 && adminResult.rows.length > 0) {
      const adminId = adminResult.rows[0].user_id;

      // Usuario 2: pagar 20 de su deuda de 45
      await client.query(
        `INSERT INTO credit_payments
         (user_id, amount, payment_method, balance_before, balance_after, recorded_by)
         VALUES ($1, 20.00, 'cash', 45.00, 25.00, $2)`,
        [userIds[1], adminId]
      );

      await client.query(
        'UPDATE users SET current_balance = 25.00 WHERE user_id = $1',
        [userIds[1]]
      );

      // Usuario 7: pagar 10 de su deuda de 20
      await client.query(
        `INSERT INTO credit_payments
         (user_id, amount, payment_method, balance_before, balance_after, recorded_by)
         VALUES ($1, 10.00, 'yape', 20.00, 10.00, $2)`,
        [userIds[6], adminId]
      );

      await client.query(
        'UPDATE users SET current_balance = 10.00 WHERE user_id = $1',
        [userIds[6]]
      );
    }
    console.log('✅ Pagos registrados\n');

    // 9. Crear menú semanal
    console.log('📅 Creando menú semanal...');
    const currentWeek = Math.ceil((new Date().getDate()) / 7);
    const currentYear = new Date().getFullYear();

    const menuResult = await client.query(
      `INSERT INTO weekly_menus
       (menu_name, week_number, year, description)
       VALUES ($1, $2, $3, $4)
       RETURNING menu_id`,
      [`Menú Semana ${currentWeek}`, currentWeek, currentYear, 'Menú semanal de almuerzos']
    );

    const menuId = menuResult.rows[0].menu_id;

    // Agregar algunos productos al menú (almuerzos)
    const lunchProducts = productIds.slice(14, 19); // Productos de almuerzos
    for (const productId of lunchProducts) {
      await client.query(
        `INSERT INTO weekly_menu_items (menu_id, product_id, quantity, price, day_of_week)
         VALUES ($1, $2, 10, (SELECT price FROM products WHERE product_id = $2), $3)`,
        [menuId, productId, Math.floor(Math.random() * 5) + 1]
      );
    }
    console.log('✅ Menú semanal creado\n');

    console.log('✨ Seed completado exitosamente!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE DATOS CREADOS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Usuarios: ${users.length + 1} (${users.length} clientes + 1 admin)`);
    console.log(`💳 Con cuenta de crédito: 8 usuarios`);
    console.log(`   - Usuario 1 (Juan): Límite S/100, Deuda S/93 ⚠️ CASO DE PRUEBA`);
    console.log(`   - Usuario 2 (María): Límite S/150, Deuda S/25`);
    console.log(`   - Usuario 3 (Carlos): Límite S/200, Deuda S/180 ⚠️`);
    console.log(`   - Usuario 4 (Ana): Límite S/100, Sin deuda ✅`);
    console.log(`   - Y 4 usuarios más con diferentes balances`);
    console.log(`📂 Categorías: ${categories.length}`);
    console.log(`🍕 Productos: ${products.length}`);
    console.log(`📦 Órdenes históricas: ${ordersCreated} (últimos 60 días)`);
    console.log(`🔄 Órdenes activas: 10`);
    console.log(`💰 Pagos de crédito: 2 registrados`);
    console.log(`📅 Menús semanales: 1`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔑 CREDENCIALES DE PRUEBA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👨‍💼 Administrador:');
    console.log('   Email:    admin@kanela.com');
    console.log('   Password: admin123\n');
    console.log('👤 Clientes (todos con password: password123):');
    console.log('   juan.perez@uni.edu     - Límite S/100, Deuda S/93');
    console.log('   maria.garcia@uni.edu   - Límite S/150, Deuda S/25');
    console.log('   carlos.lopez@uni.edu   - Límite S/200, Deuda S/180');
    console.log('   ana.martinez@uni.edu   - Límite S/100, Sin deuda');
    console.log('   ...y 11 usuarios más');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🧪 CASOS DE PRUEBA PARA VALIDAR:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. ✅ Login con admin y revisar dashboard de estadísticas');
    console.log('2. ❌ Login con juan.perez e intentar hacer pedido > S/7.00 a crédito');
    console.log('3. ✅ Login con ana.martinez y hacer pedido de cualquier monto a crédito');
    console.log('4. 📊 Revisar estadísticas: /api/statistics/dashboard');
    console.log('5. 📈 Ver productos más vendidos: /api/statistics/top-products');
    console.log('6. 👥 Ver clientes frecuentes: /api/statistics/top-customers');
    console.log('7. 💳 Registrar pago de deuda de Juan (admin)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
    console.log('🎉 Proceso completado exitosamente!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
