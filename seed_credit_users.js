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

async function seedCreditUsers() {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando seed de usuarios con crédito...\n');

    const customerPassword = await bcrypt.hash('password123', 12);

    // 1. Usuario con crédito normal (puede hacer más pedidos)
    console.log('👤 Creando usuario con crédito disponible...');
    const user1Result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, has_credit_account, credit_limit, current_balance)
       VALUES ($1, $2, $3, 'customer', $4, true, $5, $6)
       ON CONFLICT (email) DO UPDATE
       SET has_credit_account = true, credit_limit = $5, current_balance = $6
       RETURNING user_id`,
      ['pedro.sanchez@uni.edu', customerPassword, 'Pedro Sánchez', '987111222', 200.00, 50.00]
    );
    const user1Id = user1Result.rows[0].user_id;
    console.log('✅ Usuario con crédito disponible: pedro.sanchez@uni.edu (S/ 150.00 disponible)\n');

    // Crear pedidos fiados para user1
    const user1Orders = [
      { amount: 25.50, paid: 0, status: 'delivered', payment_status: 'pending' },
      { amount: 24.50, paid: 10.00, status: 'delivered', payment_status: 'partial' }
    ];

    for (const orderData of user1Orders) {
      const orderResult = await client.query(
        `INSERT INTO orders
         (user_id, total_amount, payment_method, is_credit_order, status, payment_status, credit_paid_amount)
         VALUES ($1, $2, 'credit', true, $3, $4, $5)
         RETURNING order_id`,
        [user1Id, orderData.amount, orderData.status, orderData.payment_status, orderData.paid]
      );

      // Registrar en historial de crédito
      await client.query(
        `INSERT INTO credit_history
         (user_id, transaction_type, amount, balance_before, balance_after, order_id, description, performed_by)
         VALUES ($1, 'charge', $2, $3, $4, $5, $6, $7)`,
        [user1Id, orderData.amount, 50.00 - orderData.amount, 50.00, orderResult.rows[0].order_id,
         'Pedido fiado realizado', user1Id]
      );

      // Si tiene pago parcial, registrar el pago
      if (orderData.paid > 0) {
        const paymentResult = await client.query(
          `INSERT INTO credit_payments
           (user_id, order_id, amount, payment_method, balance_before, balance_after, notes, recorded_by)
           VALUES ($1, $2, $3, 'cash', $4, $5, 'Pago parcial', $6)
           RETURNING payment_id`,
          [user1Id, orderResult.rows[0].order_id, orderData.paid, 50.00, 50.00 - orderData.paid, user1Id]
        );

        await client.query(
          `INSERT INTO credit_history
           (user_id, transaction_type, amount, balance_before, balance_after, payment_id, description, performed_by)
           VALUES ($1, 'payment', $2, $3, $4, $5, 'Pago parcial realizado', $6)`,
          [user1Id, orderData.paid, 50.00, 50.00 - orderData.paid, paymentResult.rows[0].payment_id, user1Id]
        );
      }
    }

    // 2. Usuario al borde del límite (80% usado)
    console.log('⚠️  Creando usuario cerca del límite de crédito...');
    const user2Result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, has_credit_account, credit_limit, current_balance)
       VALUES ($1, $2, $3, 'customer', $4, true, $5, $6)
       ON CONFLICT (email) DO UPDATE
       SET has_credit_account = true, credit_limit = $5, current_balance = $6
       RETURNING user_id`,
      ['sofia.torres@uni.edu', customerPassword, 'Sofía Torres', '987222333', 150.00, 120.00]
    );
    const user2Id = user2Result.rows[0].user_id;
    console.log('✅ Usuario cerca del límite: sofia.torres@uni.edu (S/ 30.00 disponible - 80% usado)\n');

    // Crear pedidos fiados para user2
    const user2Orders = [
      { amount: 45.00, paid: 0, status: 'delivered', payment_status: 'pending' },
      { amount: 35.00, paid: 0, status: 'delivered', payment_status: 'pending' },
      { amount: 40.00, paid: 0, status: 'preparing', payment_status: 'pending' }
    ];

    for (const orderData of user2Orders) {
      await client.query(
        `INSERT INTO orders
         (user_id, total_amount, payment_method, is_credit_order, status, payment_status, credit_paid_amount)
         VALUES ($1, $2, 'credit', true, $3, $4, 0)`,
        [user2Id, orderData.amount, orderData.status, orderData.payment_status]
      );
    }

    // 3. Usuario que EXCEDIÓ su límite de crédito (NO puede hacer más pedidos)
    console.log('🚫 Creando usuario con crédito EXCEDIDO...');
    const user3Result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, has_credit_account, credit_limit, current_balance, account_status)
       VALUES ($1, $2, $3, 'customer', $4, true, $5, $6, 'active')
       ON CONFLICT (email) DO UPDATE
       SET has_credit_account = true, credit_limit = $5, current_balance = $6, account_status = 'active'
       RETURNING user_id`,
      ['roberto.diaz@uni.edu', customerPassword, 'Roberto Díaz', '987333444', 100.00, 100.00]
    );
    const user3Id = user3Result.rows[0].user_id;
    console.log('✅ Usuario con crédito EXCEDIDO: roberto.diaz@uni.edu (S/ 0.00 disponible - 100% usado)\n');
    console.log('   ⚠️  Este usuario NO podrá hacer más pedidos fiados hasta que pague!\n');

    // Crear pedidos fiados para user3 (múltiples para llegar al límite)
    const user3Orders = [
      { amount: 32.50, paid: 0, status: 'delivered', payment_status: 'pending', days_ago: 15 },
      { amount: 28.00, paid: 0, status: 'delivered', payment_status: 'pending', days_ago: 10 },
      { amount: 22.50, paid: 0, status: 'delivered', payment_status: 'pending', days_ago: 5 },
      { amount: 17.00, paid: 0, status: 'delivered', payment_status: 'overdue', days_ago: 20 }
    ];

    for (const orderData of user3Orders) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - orderData.days_ago);

      await client.query(
        `INSERT INTO orders
         (user_id, total_amount, payment_method, is_credit_order, status, payment_status, credit_paid_amount, created_at)
         VALUES ($1, $2, 'credit', true, $3, $4, 0, $5)`,
        [user3Id, orderData.amount, orderData.status, orderData.payment_status, createdAt]
      );
    }

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
    console.log('✅ Usuario con crédito sin deuda: carmen.vega@uni.edu (S/ 250.00 disponible)\n');

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
    console.log('✅ Usuario que pagó su deuda: diego.ruiz@uni.edu\n');

    // Crear pedidos fiados pagados para user5
    const user5Orders = [
      { amount: 45.00, paid: 45.00, status: 'delivered', payment_status: 'paid', days_ago: 7 },
      { amount: 38.50, paid: 38.50, status: 'delivered', payment_status: 'paid', days_ago: 3 }
    ];

    for (const orderData of user5Orders) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - orderData.days_ago);

      const orderResult = await client.query(
        `INSERT INTO orders
         (user_id, total_amount, payment_method, is_credit_order, status, payment_status, credit_paid_amount, created_at)
         VALUES ($1, $2, 'credit', true, $3, $4, $5, $6)
         RETURNING order_id`,
        [user5Id, orderData.amount, orderData.status, orderData.payment_status, orderData.paid, createdAt]
      );

      // Registrar pago completo
      if (orderData.paid > 0) {
        const paymentResult = await client.query(
          `INSERT INTO credit_payments
           (user_id, order_id, amount, payment_method, balance_before, balance_after, notes, recorded_by, created_at)
           VALUES ($1, $2, $3, 'yape', $4, 0, 'Pago completo vía Yape', $5, $6)
           RETURNING payment_id`,
          [user5Id, orderResult.rows[0].order_id, orderData.paid, orderData.amount, user5Id, createdAt]
        );
      }
    }

    console.log('✨ Seed de usuarios con crédito completado!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE USUARIOS CREADOS:\n');
    console.log('1️⃣  pedro.sanchez@uni.edu');
    console.log('   Límite: S/ 200.00 | Deuda: S/ 50.00 | Disponible: S/ 150.00');
    console.log('   Estado: ✅ PUEDE HACER PEDIDOS\n');

    console.log('2️⃣  sofia.torres@uni.edu');
    console.log('   Límite: S/ 150.00 | Deuda: S/ 120.00 | Disponible: S/ 30.00');
    console.log('   Estado: ⚠️  CERCA DEL LÍMITE (80% usado)\n');

    console.log('3️⃣  roberto.diaz@uni.edu');
    console.log('   Límite: S/ 100.00 | Deuda: S/ 100.00 | Disponible: S/ 0.00');
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
