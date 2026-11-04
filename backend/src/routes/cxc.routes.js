const express = require('express');
const router = express.Router();
const cxcController = require('../controllers/cxc.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/', roleMiddleware('administrador', 'gerente', 'vendedor'), cxcController.listar);
router.post('/:id/pagos', roleMiddleware('administrador', 'gerente', 'vendedor'), cxcController.registrarPago);
router.post('/:id/pago', roleMiddleware('administrador', 'gerente', 'vendedor'), cxcController.registrarPago);
router.get('/:id/pagos', roleMiddleware('administrador', 'gerente', 'vendedor'), cxcController.historialPagos);

module.exports = router;
