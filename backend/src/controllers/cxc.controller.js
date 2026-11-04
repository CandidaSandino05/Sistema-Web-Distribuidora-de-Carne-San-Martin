const cxcService = require('../services/cxc.service');

class CxCController {
  async listar(req, res, next) {
    try {
      const cuentas = await cxcService.listarCuentas();
      res.status(200).json({
        success: true,
        data: cuentas || []
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message || 'Error al obtener cuentas por cobrar',
        data: []
      });
    }
  }

  async registrarPago(req, res, next) {
    try {
      const { id } = req.params;
      const { monto, metodo_pago, banco } = req.body;
      const usuarioId = req.user.id;

      const resultado = await cxcService.registrarPago({
        cuentaId: id,
        monto,
        metodoPago: metodo_pago || 'efectivo',
        banco: banco || null,
        usuarioId
      });

      res.status(200).json({
        success: true,
        message: 'Pago registrado exitosamente',
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }

  async historialPagos(req, res, next) {
    try {
      const { id } = req.params;
      const pagos = await cxcService.obtenerHistorialPagos(id);
      res.status(200).json({
        success: true,
        data: pagos
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CxCController();
