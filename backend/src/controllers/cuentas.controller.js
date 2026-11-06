const cuentasService = require('../services/cuentas.service');

class CuentasController {
  async getCuentasAgrupadas(req, res, next) {
    try {
      const data = await cuentasService.getCuentasAgrupadas();
      res.status(200).json({
        success: true,
        data: data || []
      });
    } catch (err) {
      if (next) {
        next(err);
      } else {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  }

  async listar(req, res, next) {
    try {
      const cuentas = await cuentasService.listarCuentas();
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
      const usuarioId = (req.usuario && req.usuario.id) || (req.user && req.user.id);

      const resultado = await cuentasService.registrarPago({
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
      const pagos = await cuentasService.obtenerHistorialPagos(id);
      res.status(200).json({
        success: true,
        data: pagos
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerDetalleCliente(req, res, next) {
    try {
      const { clienteId } = req.params;
      const detalle = await cuentasService.obtenerDetalleCliente(clienteId);
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
      const usuarioId = (req.usuario && req.usuario.id) || (req.user && req.user.id);

      const resultado = await cuentasService.registrarPagoGlobalCliente({
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

module.exports = new CuentasController();