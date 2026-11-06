const clientesService = require('../services/clientes.service');

class ClientesController {
  async listar(req, res, next) {
    try {
      const clientes = await clientesService.listarClientes();
      res.status(200).json({
        success: true,
        data: clientes
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const cliente = await clientesService.obtenerClientePorId(id);
      res.status(200).json({
        success: true,
        data: cliente
      });
    } catch (err) {
      next(err);
    }
  }

  async crear(req, res, next) {
    try {
      const cliente = await clientesService.crearCliente(req.body);
      res.status(201).json({
        success: true,
        data: cliente
      });
    } catch (err) {
      next(err);
    }
  }

  async historialVentas(req, res, next) {
    try {
      const { id } = req.params;
      const ventas = await clientesService.obtenerHistorialVentas(id);
      res.status(200).json({
        success: true,
        data: ventas
      });
    } catch (err) {
      next(err);
    }
  }

  async cambiarEstado(req, res, next) {
    try {
      const { id } = req.params;
      const { activo } = req.body;
      const cliente = await clientesService.actualizarEstado(id, activo);
      res.status(200).json({
        success: true,
        data: cliente
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClientesController();
