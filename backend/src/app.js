const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const ventasRoutes = require('./routes/ventas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const cxcRoutes = require('./routes/cxc.routes');
const inventarioRoutes = require('./routes/inventario.routes');
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
app.use('/api/cxc', cxcRoutes);
app.use('/api/cuentas-por-cobrar', cxcRoutes);
app.use('/api/inventario', inventarioRoutes);

app.use((req, res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
});

app.use(errorMiddleware);

module.exports = app;
