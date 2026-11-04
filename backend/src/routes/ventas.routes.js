const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventas.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/', ventasController.listar);
router.get('/reportes', roleMiddleware('administrador'), ventasController.obtenerReportes);
router.get('/:id', ventasController.obtenerPorId);
router.post('/', roleMiddleware('vendedor', 'administrador', 'gerente'), ventasController.crear);

module.exports = router;
