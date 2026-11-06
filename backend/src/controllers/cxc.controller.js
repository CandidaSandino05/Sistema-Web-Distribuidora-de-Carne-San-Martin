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
      next(err);
    }
  }

  async registrarPago(req, res, next) {
    try {
      const { id } = req.params;
      const { monto, metodo_pago, banco, destino_deposito, referencia } = req.body;
      const usuarioId = req.user.id;

      const resultado = await cxcService.registrarPago({
        cuentaId: id,
        monto,
        metodoPago: metodo_pago || 'efectivo',
        banco: banco || null,
        destinoDeposito: destino_deposito || 'distribuidora',
        referencia: referencia || null,
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

  async getCuentasAgrupadas(req, res, next) {
    try {
      const list = await cxcService.getCuentasAgrupadas();
      res.status(200).json({
        success: true,
        data: list || []
      });
    } catch (err) {
      if (next) {
        next(err);
      } else {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  }

  async listarAgrupadas(req, res, next) {
    try {
      const list = await cxcService.listarCuentasAgrupadas();
      res.status(200).json({
        success: true,
        data: list || []
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerDetalleCliente(req, res, next) {
    try {
      const { clienteId } = req.params;
      const detalle = await cxcService.obtenerDetalleCliente(clienteId);
      res.status(200).json({
        success: true,
        data: detalle
      });
    } catch (err) {
      next(err);
    }
  }

  async registrarPagoGlobal(req, res, next) {
    try {
      const { clienteId } = req.params;
      const { monto, metodo_pago, banco, destino_deposito, referencia } = req.body;
      const usuarioId = req.user.id;

      const resultado = await cxcService.registrarPagoGlobalCliente({
        clienteId,
        monto,
        metodoPago: metodo_pago || 'efectivo',
        banco: banco || null,
        destinoDeposito: destino_deposito || 'distribuidora',
        referencia: referencia || null,
        usuarioId
      });

      res.status(200).json({
        success: true,
        message: 'Abono global distribuido exitosamente',
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CxCController();
