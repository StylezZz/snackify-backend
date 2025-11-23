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

// Función helper para crear order items
async function createOrderWithItems(client, userId, items, paymentStatus, status, creditPaidAmount = 0, daysAgo = 0) {
  // Calcular el total y obtener información de productos
  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const productResult = await client.query(
      'SELECT product_id, name, price FROM products WHERE name = $1',
      [item.productName]
    );

    if (productResult.rows.length > 0) {
      const product = productResult.rows[0];
      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        product_id: product.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal: subtotal
      });
    }
  }

  // Crear la orden
  const createdAt = new Date();
  if (daysAgo > 0) {
    createdAt.setDate(createdAt.getDate() - daysAgo);
  }

  const orderResult = await client.query(
    `INSERT INTO orders
     (user_id, total_amount, payment_method, is_credit_order, status, payment_status, credit_paid_amount, created_at)
     VALUES ($1, $2, 'credit', true, $3, $4, $5, $6)
     RETURNING order_id, order_number`,
    [userId, totalAmount, status, paymentStatus, creditPaidAmount, createdAt]
  );

  const orderId = orderResult.rows[0].order_id;
  const orderNumber = orderResult.rows[0].order_number;

  // Crear los items de la orden
  for (const item of orderItems) {
    await client.query(
      `INSERT INTO order_items
       (order_id, product_id, product_name, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal]
    );
  }

  return {
    order_id: orderId,
    order_number: orderNumber,
    total_amount: totalAmount,
    items: orderItems
  };
}

async function seedCreditUsers() {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando seed de usuarios con crédito...\n');

    const customerPassword = await bcrypt.hash('password123', 12);

    // Verificar que existan productos
    const productsCheck = await client.query('SELECT COUNT(*) as count FROM products');
    if (parseInt(productsCheck.rows[0].count) === 0) {
      console.log('⚠️  No hay productos en la base de datos. Ejecuta primero: npm run seed');
      return;
    }

    // 1. Usuario con crédito normal (puede hacer más pedidos)
    console.log('👤 Creando usuario con crédito disponible...');
    const user1Result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, has_credit_account, credit_limit, current_balance)
       VALUES ($1, $2, $3, 'customer', $4, true, $5, $6)
       ON CONFLICT (email) DO UPDATE
       SET has_credit_account = true, credit_limit = $5, current_balance = $6
       RETURNING user_id`,
      ['pedro.sanchez@uni.edu', customerPassword, 'Pedro Sánchez', '987111222', 200.00, 0]
    );
    const user1Id = user1Result.rows[0].user_id;
    console.log('✅ Usuario: pedro.sanchez@uni.edu');

    // Crear pedidos fiados para user1 con items reales
    const order1_1 = await createOrderWithItems(client, user1Id, [
      { productName: 'Café Latte', quantity: 2 },
      { productName: 'Brownie', quantity: 1 },
      { productName: 'Sandwich Mixto', quantity: 1 }
    ], 'pending', 'delivered', 0, 5);

    const order1_2 = await createOrderWithItems(client, user1Id, [
      { productName: 'Menú Ejecutivo', quantity: 1 },
      { productName: 'Jugo de Naranja', quantity: 1 }
    ], 'partial', 'delivered', 8.00, 3);

    // Actualizar balance del usuario
    const user1Balance = order1_1.total_amount + (order1_2.total_amount - 8.00);
    await client.query(
      'UPDATE users SET current_balance = $1 WHERE user_id = $2',
      [user1Balance, user1Id]
    );

    // Registrar pago parcial del segundo pedido
    if (order1_2.total_amount > 8.00) {
      const paymentResult = await client.query(
        `INSERT INTO credit_payments
         (user_id, order_id, amount, payment_method, balance_before, balance_after, notes, recorded_by)
         VALUES ($1, $2, $3, 'yape', $4, $5, 'Pago parcial vía Yape', $6)
         RETURNING payment_id`,
        [user1Id, order1_2.order_id, 8.00, user1Balance + 8.00, user1Balance, user1Id]
      );
    }

    console.log(`   Pedido 1: ${order1_1.order_number} - S/ ${order1_1.total_amount.toFixed(2)}`);
    console.log(`   Pedido 2: ${order1_2.order_number} - S/ ${order1_2.total_amount.toFixed(2)} (pagado S/ 8.00)`);
    console.log(`   Deuda total: S/ ${user1Balance.toFixed(2)}\n`);

    // 2. Usuario al borde del límite (80% usado)
    console.log('⚠️  Creando usuario cerca del límite de crédito...');
    const user2Result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, has_credit_account, credit_limit, current_balance)
       VALUES ($1, $2, $3, 'customer', $4, true, $5, $6)
       ON CONFLICT (email) DO UPDATE
       SET has_credit_account = true, credit_limit = $5, current_balance = $6
       RETURNING user_id`,
      ['sofia.torres@uni.edu', customerPassword, 'Sofía Torres', '987222333', 150.00, 0]
    );
    const user2Id = user2Result.rows[0].user_id;
    console.log('✅ Usuario: sofia.torres@uni.edu');

    // Crear pedidos fiados para user2
    const order2_1 = await createOrderWithItems(client, user2Id, [
      { productName: 'Lomo Saltado', quantity: 1 },
      { productName: 'Iced Coffee', quantity: 2 },
      { productName: 'Cheesecake', quantity: 1 }
    ], 'pending', 'delivered', 0, 8);

    const order2_2 = await createOrderWithItems(client, user2Id, [
      { productName: 'Club Sandwich', quantity: 2 },
      { productName: 'Smoothie de Fresa', quantity: 2 }
    ], 'pending', 'delivered', 0, 4);

    const order2_3 = await createOrderWithItems(client, user2Id, [
      { productName: 'Arroz con Pollo', quantity: 2 },
      { productName: 'Limonada', quantity: 2 }
    ], 'pending', 'preparing', 0, 1);

    // Actualizar balance del usuario
    const user2Balance = order2_1.total_amount + order2_2.total_amount + order2_3.total_amount;
    await client.query(
      'UPDATE users SET current_balance = $1 WHERE user_id = $2',
      [user2Balance, user2Id]
    );

    console.log(`   Pedido 1: ${order2_1.order_number} - S/ ${order2_1.total_amount.toFixed(2)}`);
    console.log(`   Pedido 2: ${order2_2.order_number} - S/ ${order2_2.total_amount.toFixed(2)}`);
    console.log(`   Pedido 3: ${order2_3.order_number} - S/ ${order2_3.total_amount.toFixed(2)}`);
    console.log(`   Deuda total: S/ ${user2Balance.toFixed(2)} (${((user2Balance / 150) * 100).toFixed(1)}% usado)\n`);

    // 3. Usuario que EXCEDIÓ su límite de crédito (NO puede hacer más pedidos)
    console.log('🚫 Creando usuario con crédito EXCEDIDO...');
    const user3Result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, has_credit_account, credit_limit, current_balance, account_status)
       VALUES ($1, $2, $3, 'customer', $4, true, $5, $6, 'active')
       ON CONFLICT (email) DO UPDATE
       SET has_credit_account = true, credit_limit = $5, current_balance = $6, account_status = 'active'
       RETURNING user_id`,
      ['roberto.diaz@uni.edu', customerPassword, 'Roberto Díaz', '987333444', 100.00, 0]
    );
    const user3Id = user3Result.rows[0].user_id;
    console.log('✅ Usuario: roberto.diaz@uni.edu');

    // Crear pedidos fiados para user3 (múltiples para llegar al límite)
    const order3_1 = await createOrderWithItems(client, user3Id, [
      { productName: 'Menú Ejecutivo', quantity: 2 },
      { productName: 'Iced Coffee', quantity: 1 }
    ], 'overdue', 'delivered', 0, 20);

    const order3_2 = await createOrderWithItems(client, user3Id, [
      { productName: 'Lomo Saltado', quantity: 1 },
      { productName: 'Jugo de Naranja', quantity: 2 }
    ], 'pending', 'delivered', 0, 15);

    const order3_3 = await createOrderWithItems(client, user3Id, [
      { productName: 'Club Sandwich', quantity: 1 },
      { productName: 'Smoothie de Fresa', quantity: 1 },
      { productName: 'Torta de Chocolate', quantity: 1 }
    ], 'pending', 'delivered', 0, 10);

    const order3_4 = await createOrderWithItems(client, user3Id, [
      { productName: 'Arroz con Pollo', quantity: 1 },
      { productName: 'Café Latte', quantity: 2 }
    ], 'pending', 'delivered', 0, 5);

    // Actualizar balance del usuario
    const user3Balance = order3_1.total_amount + order3_2.total_amount + order3_3.total_amount + order3_4.total_amount;
    await client.query(
      'UPDATE users SET current_balance = $1 WHERE user_id = $2',
      [user3Balance, user3Id]
    );

    console.log(`   Pedido 1: ${order3_1.order_number} - S/ ${order3_1.total_amount.toFixed(2)} (vencido)`);
    console.log(`   Pedido 2: ${order3_2.order_number} - S/ ${order3_2.total_amount.toFixed(2)}`);
    console.log(`   Pedido 3: ${order3_3.order_number} - S/ ${order3_3.total_amount.toFixed(2)}`);
    console.log(`   Pedido 4: ${order3_4.order_number} - S/ ${order3_4.total_amount.toFixed(2)}`);
    console.log(`   Deuda total: S/ ${user3Balance.toFixed(2)} (${((user3Balance / 100) * 100).toFixed(1)}% usado)`);
    console.log('   ⚠️  NO PUEDE HACER MÁS PEDIDOS\n');

    // 4. Usuario con cuenta de crédito pero sin deuda
    console.log('✅ Creando usuario con crédito disponible sin deuda...');
    const user4Result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, has_credit_account, credit_limit, current_balance)
       VALUES ($1, $2, $3, 'customer', $4, true, $5, $6)
       ON CONFLICT (email) DO UPDATE
       SET has_credit_account = true, credit_limit = $5, current_balance = $6
       RETURNING user_id`,
      ['carmen.vega@uni.edu', customerPassword, 'Carmen Vega', '987444555', 250.00, 0.00]
    );
    const user4Id = user4Result.rows[0].user_id;
    console.log('✅ Usuario: carmen.vega@uni.edu - Sin deuda\n');

    // 5. Usuario que pagó toda su deuda recientemente
    console.log('💰 Creando usuario que pagó su deuda...');
    const user5Result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, has_credit_account, credit_limit, current_balance)
       VALUES ($1, $2, $3, 'customer', $4, true, $5, $6)
       ON CONFLICT (email) DO UPDATE
       SET has_credit_account = true, credit_limit = $5, current_balance = $6
       RETURNING user_id`,
      ['diego.ruiz@uni.edu', customerPassword, 'Diego Ruiz', '987555666', 180.00, 0.00]
    );
    const user5Id = user5Result.rows[0].user_id;
    console.log('✅ Usuario: diego.ruiz@uni.edu');

    // Crear pedidos fiados pagados para user5
    const order5_1 = await createOrderWithItems(client, user5Id, [
      { productName: 'Menú Ejecutivo', quantity: 2 },
      { productName: 'Limonada', quantity: 2 },
      { productName: 'Brownie', quantity: 2 }
    ], 'paid', 'delivered', 0, 7);

    // Marcar como pagado
    await client.query(
      'UPDATE orders SET credit_paid_amount = total_amount WHERE order_id = $1',
      [order5_1.order_id]
    );

    const order5_2 = await createOrderWithItems(client, user5Id, [
      { productName: 'Lomo Saltado', quantity: 1 },
      { productName: 'Jugo de Naranja', quantity: 1 },
      { productName: 'Cheesecake', quantity: 1 }
    ], 'paid', 'delivered', 0, 3);

    // Marcar como pagado
    await client.query(
      'UPDATE orders SET credit_paid_amount = total_amount WHERE order_id = $1',
      [order5_2.order_id]
    );

    // Registrar pagos completos
    const createdAt1 = new Date();
    createdAt1.setDate(createdAt1.getDate() - 7);
    await client.query(
      `INSERT INTO credit_payments
       (user_id, order_id, amount, payment_method, balance_before, balance_after, notes, recorded_by, created_at)
       VALUES ($1, $2, $3, 'plin', $4, 0, 'Pago completo vía Plin', $5, $6)`,
      [user5Id, order5_1.order_id, order5_1.total_amount, order5_1.total_amount, user5Id, createdAt1]
    );

    const createdAt2 = new Date();
    createdAt2.setDate(createdAt2.getDate() - 3);
    await client.query(
      `INSERT INTO credit_payments
       (user_id, order_id, amount, payment_method, balance_before, balance_after, notes, recorded_by, created_at)
       VALUES ($1, $2, $3, 'yape', $4, 0, 'Pago completo vía Yape', $5, $6)`,
      [user5Id, order5_2.order_id, order5_2.total_amount, order5_2.total_amount, user5Id, createdAt2]
    );

    console.log(`   Pedido 1: ${order5_1.order_number} - S/ ${order5_1.total_amount.toFixed(2)} (PAGADO)`);
    console.log(`   Pedido 2: ${order5_2.order_number} - S/ ${order5_2.total_amount.toFixed(2)} (PAGADO)`);
    console.log('   Deuda actual: S/ 0.00\n');

    console.log('✨ Seed de usuarios con crédito completado!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE USUARIOS CREADOS:\n');
    console.log('1️⃣  pedro.sanchez@uni.edu');
    console.log(`   Límite: S/ 200.00 | Deuda: S/ ${user1Balance.toFixed(2)} | Disponible: S/ ${(200 - user1Balance).toFixed(2)}`);
    console.log('   Estado: ✅ PUEDE HACER PEDIDOS\n');

    console.log('2️⃣  sofia.torres@uni.edu');
    console.log(`   Límite: S/ 150.00 | Deuda: S/ ${user2Balance.toFixed(2)} | Disponible: S/ ${(150 - user2Balance).toFixed(2)}`);
    console.log(`   Estado: ⚠️  CERCA DEL LÍMITE (${((user2Balance / 150) * 100).toFixed(1)}% usado)\n`);

    console.log('3️⃣  roberto.diaz@uni.edu');
    console.log(`   Límite: S/ 100.00 | Deuda: S/ ${user3Balance.toFixed(2)} | Disponible: S/ ${Math.max(0, 100 - user3Balance).toFixed(2)}`);
    console.log('   Estado: 🚫 CRÉDITO EXCEDIDO - NO PUEDE HACER MÁS PEDIDOS\n');

    console.log('4️⃣  carmen.vega@uni.edu');
    console.log('   Límite: S/ 250.00 | Deuda: S/ 0.00 | Disponible: S/ 250.00');
    console.log('   Estado: ✅ SIN DEUDA\n');

    console.log('5️⃣  diego.ruiz@uni.edu');
    console.log('   Límite: S/ 180.00 | Deuda: S/ 0.00 | Disponible: S/ 180.00');
    console.log('   Estado: ✅ PAGÓ SU DEUDA RECIENTEMENTE\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 CREDENCIALES (todas con password: password123):\n');
    console.log('Email: pedro.sanchez@uni.edu');
    console.log('Email: sofia.torres@uni.edu');
    console.log('Email: roberto.diaz@uni.edu');
    console.log('Email: carmen.vega@uni.edu');
    console.log('Email: diego.ruiz@uni.edu\n');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar seed
seedCreditUsers()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
