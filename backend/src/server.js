const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  try {
    await db.query('SELECT 1');
    console.log('Base de datos conectada');
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
