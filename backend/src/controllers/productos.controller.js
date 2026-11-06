const productosService = require('../services/productos.service');

class ProductosController {
  async listar(req, res, next) {
    try {
      const productos = await productosService.listarProductos();
      res.status(200).json({
        success: true,
        data: productos
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const producto = await productosService.obtenerProductoPorId(id);
      res.status(200).json({
        success: true,
        data: producto
      });
    } catch (err) {
      next(err);
    }
  }

  async crear(req, res, next) {
    try {
      const producto = await productosService.crearProducto(req.body);
      res.status(201).json({
        success: true,
        data: producto
      });
    } catch (err) {
      next(err);
    }
  }

  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const producto = await productosService.actualizarProducto(id, req.body);
      res.status(200).json({
        success: true,
        data: producto
      });
    } catch (err) {
      next(err);
    }
  }

  async eliminar(req, res, next) {
    try {
      const { id } = req.params;
      const usuarioId = req.user ? req.user.id : null;
      const motivo = req.body ? req.body.motivo : null;
      await productosService.eliminarProducto(id, { usuarioId, motivo });
      res.status(200).json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (err) {
      next(err);
    }
  }

  async listarEliminados(req, res, next) {
    try {
      const eliminados = await productosService.listarProductosEliminados();
      res.status(200).json({
        success: true,
        data: eliminados
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductosController();
