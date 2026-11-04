const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productos.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/', productosController.listar);
router.get('/:id', productosController.obtenerPorId);
router.post('/', roleMiddleware('gerente'), productosController.crear);
router.put('/:id', roleMiddleware('gerente'), productosController.actualizar);
router.delete('/:id', roleMiddleware('gerente'), productosController.eliminar);

module.exports = router;
