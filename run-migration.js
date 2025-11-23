const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/database');

async function runMigration() {
    try {
        console.log('Ejecutando migración: 005_add_payment_methods.sql');

        const migrationPath = path.join(__dirname, 'src/database/migrations/005_add_payment_methods.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Migración ejecutada exitosamente');
        console.log('Los métodos de pago Yape y Plin han sido agregados al sistema');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando la migración:', error);
        process.exit(1);
    }
}

runMigration();
