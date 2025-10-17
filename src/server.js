require('dotenv').config();

const app = require('./app');
const {pool} = require('./config/database');

const PORT = process.env.PORT || 3000;

process.on('uncaughtException',(error)=>{
    console.error('Uncaught Exception: ', error);
    console.error(error.name,error.message);
    process.exit(1);
});

//Iniciar el servidor
const server = app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log(`║  🚀 Servidor corriendo en puerto ${PORT}  ║`);
  console.log(`║  📍 Ambiente: ${process.env.NODE_ENV || 'development'}           ║`);
  console.log('╚════════════════════════════════════════╝');
});

process.on('unhandledRejection',(error)=>{
    console.error(' Unhandled Rejection: ', error);
    console.error(error.name,error.message);
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    pool.end(() => {
      console.log('✅ Pool de PostgreSQL cerrado');
      process.exit(0);
    });
  });
});
