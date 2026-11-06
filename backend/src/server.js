const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const db = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const ventasRoutes = require('./routes/ventas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const cxcRoutes = require('./routes/cxc.routes');
const cuentasRoutes = require('./routes/cuentas.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const mataderoRoutes = require('./routes/matadero.routes');
const errorMiddleware = require('./middlewares/error.middleware');
const { NotFoundError } = require('./utils/errors');

const app = express();

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization', 'cache-control', 'pragma', 'expires', 'Cache-Control', 'Pragma', 'Expires']
};

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    servicio: 'Distribuidora San Martin API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/cxc', cuentasRoutes);
app.use('/api/cuentas', cuentasRoutes);
app.use('/api/cuentas-por-cobrar', cuentasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/matadero', mataderoRoutes);

app.use((req, res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
});

app.use(errorMiddleware);

async function ensureDatabaseSchema() {
  try {
    await db.query(`
      DO $$ BEGIN
        CREATE TYPE tipo_movimiento_matadero AS ENUM ('deuda_inicial', 'vale', 'remision', 'deposito_cliente', 'deposito_distribuidora');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await db.query('ALTER TABLE productos ALTER COLUMN stock_minimo SET DEFAULT 5.00;');
    await db.query('ALTER TABLE ventas ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00;');
    await db.query('ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento NUMERIC(12, 2) NOT NULL DEFAULT 0.00;');
    await db.query(`
      CREATE TABLE IF NOT EXISTS matadero_movimientos (
        id SERIAL PRIMARY KEY,
        fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tipo_movimiento tipo_movimiento_matadero NOT NULL,
        monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
        moneda VARCHAR(10) NOT NULL DEFAULT 'C$' CHECK (moneda IN ('C$', 'NIO', 'USD')),
        tasa_cambio NUMERIC(10, 4) NOT NULL DEFAULT 1.0000 CHECK (tasa_cambio > 0),
        monto_cordobas NUMERIC(12, 2) NOT NULL CHECK (monto_cordobas > 0),
        banco VARCHAR(80),
        referencia VARCHAR(100),
        cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
        cuenta_id INTEGER REFERENCES cuentas_por_cobrar(id) ON DELETE SET NULL,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        detalle_items JSONB,
        monto_original NUMERIC(12, 2),
        productos_json JSONB
      );
    `);
    await db.query('ALTER TABLE matadero_movimientos ADD COLUMN IF NOT EXISTS monto_original NUMERIC(12, 2);');
    await db.query('ALTER TABLE matadero_movimientos ADD COLUMN IF NOT EXISTS productos_json JSONB;');
    await db.query('UPDATE matadero_movimientos SET monto_original = monto_cordobas WHERE monto_original IS NULL;');
    await db.query('UPDATE matadero_movimientos SET productos_json = detalle_items WHERE productos_json IS NULL;');
    await db.query('ALTER TABLE pagos ADD COLUMN IF NOT EXISTS referencia VARCHAR(100);');
    await db.query('ALTER TABLE pagos ADD COLUMN IF NOT EXISTS matadero_movimiento_id INTEGER REFERENCES matadero_movimientos(id) ON DELETE SET NULL;');
    await db.query(`
      CREATE TABLE IF NOT EXISTS productos_eliminados (
        id SERIAL PRIMARY KEY,
        producto_nombre VARCHAR(150) NOT NULL,
        cantidad_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        fecha_eliminacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        motivo TEXT
      );
    `);
  } catch (err) {
    console.error('Aviso al sincronizar esquema:', err.message);
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  try {
    await db.query('SELECT 1');
    await ensureDatabaseSchema();
    console.log('Base de datos conectada y sincronizada');
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

module.exports = app;

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
