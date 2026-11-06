const express = require('express');
const router = express.Router();
const cuentasController = require('../controllers/cuentas.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/agrupadas', cuentasController.getCuentasAgrupadas);
router.get('/cliente/:clienteId/detalle', cuentasController.obtenerDetalleCliente);
router.post('/cliente/:clienteId/abono-global', cuentasController.registrarPagoGlobal);
router.get('/', cuentasController.listar);
router.post('/:id/pagos', cuentasController.registrarPago);
router.post('/:id/pago', cuentasController.registrarPago);
router.get('/:id/pagos', cuentasController.historialPagos);

module.exports = router;