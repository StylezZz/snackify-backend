require('dotenv').config();
const { Pool } = require('pg');

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

async function cleanDatabase() {
  const client = await pool.connect();

  try {
    console.log('🧹 Limpiando base de datos...\n');

    // Eliminar en orden correcto (respetando foreign keys)
    const tables = [
      'credit_history',
      'credit_payments',
      'weekly_menu_items',
      'weekly_menus',
      'order_items',
      'orders',
      'products',
      'categories',
      'notifications',
      'users'
    ];

    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ ${table}: ${result.rowCount} registros eliminados`);
      } catch (error) {
        console.log(`⚠️  Error en ${table}: ${error.message}`);
      }
    }

    console.log('\n✨ Base de datos limpiada exitosamente!');
    console.log('💡 Ahora puedes ejecutar: node seed.js\n');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar limpieza
cleanDatabase()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
