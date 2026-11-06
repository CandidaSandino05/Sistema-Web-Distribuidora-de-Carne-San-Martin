const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventario.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/kpis', roleMiddleware('administrador', 'gerente'), inventarioController.obtenerKpis);
router.get('/analytics', roleMiddleware('administrador', 'gerente'), inventarioController.obtenerAnalytics);
router.get('/alertas', roleMiddleware('administrador', 'gerente'), inventarioController.alertarStockBajo);
router.get('/mermas', roleMiddleware('administrador'), inventarioController.listarMermas);
router.post('/mermas', roleMiddleware('gerente'), inventarioController.registrarMerma);
router.post('/merma', roleMiddleware('gerente'), inventarioController.registrarMerma);
router.post('/ingreso', roleMiddleware('gerente'), inventarioController.registrarIngreso);

module.exports = router;
