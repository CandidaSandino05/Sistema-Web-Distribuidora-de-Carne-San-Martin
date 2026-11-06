const express = require('express');
const router = express.Router();
const cxcController = require('../controllers/cxc.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/agrupadas', cxcController.getCuentasAgrupadas);
router.get('/cliente/:clienteId/detalle', roleMiddleware('administrador', 'gerente', 'vendedor'), cxcController.obtenerDetalleCliente);
router.post('/cliente/:clienteId/abono-global', roleMiddleware('vendedor'), cxcController.registrarPagoGlobal);
router.get('/', roleMiddleware('administrador', 'gerente', 'vendedor'), cxcController.listar);
router.post('/:id/pagos', roleMiddleware('vendedor'), cxcController.registrarPago);
router.post('/:id/pago', roleMiddleware('vendedor'), cxcController.registrarPago);
router.get('/:id/pagos', roleMiddleware('administrador', 'gerente', 'vendedor'), cxcController.historialPagos);

module.exports = router;
