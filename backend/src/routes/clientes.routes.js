const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/', roleMiddleware('administrador', 'gerente', 'vendedor'), clientesController.listar);
router.get('/:id', roleMiddleware('administrador', 'gerente', 'vendedor'), clientesController.obtenerPorId);
router.get('/:id/ventas', roleMiddleware('administrador', 'gerente', 'vendedor'), clientesController.historialVentas);
router.post('/', roleMiddleware('gerente'), clientesController.crear);
router.patch('/:id/estado', roleMiddleware('gerente', 'administrador'), clientesController.cambiarEstado);
router.put('/:id/estado', roleMiddleware('gerente', 'administrador'), clientesController.cambiarEstado);

module.exports = router;
