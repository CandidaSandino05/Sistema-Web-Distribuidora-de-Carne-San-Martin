const express = require('express');
const router = express.Router();
const mataderoController = require('../controllers/matadero.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/documentos', mataderoController.getDocumentos);
router.get('/', roleMiddleware('administrador'), mataderoController.obtenerEstadoCuenta);
router.post('/factura', roleMiddleware('administrador', 'gerente'), mataderoController.registrarFactura);
router.post('/deposito', roleMiddleware('administrador'), mataderoController.registrarDeposito);

module.exports = router;
