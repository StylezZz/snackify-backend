const {Pool} = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl:{
        rejectUnauthorized: false,
        require: true
    }
});

pool.on('connect', ()=>{
    console.log('Connected to the database');
})

pool.on('error',(err)=>{
    console.error('Error inesperado en PostgreSQL', err);
    process.exit(-1);
})

const query = async (text, params) => {
    const start = Date.now();
    try{
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', {text, duration, rows: res.rowCount});
        return res;
    }catch(err){
        console.error('Error executing query', {text, err});
        throw err;
    }
};

//Función para transacciones
const transaction = async (callback) => {
    const client = await pool.connect();
    try{
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }catch(err){
        await client.query('ROLLBACK');
        console.error('Error en la transacción', err);
        throw err;
    }finally{
        client.release();
    }
}

module.exports = {
    query,
    transaction,
    pool
};