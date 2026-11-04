const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/', clientesController.listar);
router.get('/:id', clientesController.obtenerPorId);
router.get('/:id/ventas', clientesController.historialVentas);
router.post('/', roleMiddleware('administrador', 'gerente'), clientesController.crear);

module.exports = router;
