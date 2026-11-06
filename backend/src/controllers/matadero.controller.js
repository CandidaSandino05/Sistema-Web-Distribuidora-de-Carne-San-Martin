const mataderoService = require('../services/matadero.service');

class MataderoController {
  async obtenerEstadoCuenta(req, res, next) {
    try {
      const data = await mataderoService.obtenerEstadoCuenta();
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async registrarFactura(req, res, next) {
    try {
      const { tipo_movimiento, referencia, items, monto_manual } = req.body;
      const usuarioId = req.user.id;

      const resultado = await mataderoService.registrarFacturaMatadero({
        tipo_movimiento,
        referencia,
        items,
        monto_manual,
        usuarioId
      });

      res.status(201).json({
        success: true,
        message: 'Factura de matadero e ingreso de stock registrados correctamente',
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }

  async registrarDeposito(req, res, next) {
    try {
      const { monto, moneda, tasa_cambio, banco, referencia, quien_deposito, cliente_id, cuenta_id } = req.body;
      const usuarioId = req.user.id;

      const resultado = await mataderoService.registrarDeposito({
        monto,
        moneda,
        tasa_cambio,
        banco,
        referencia,
        quien_deposito,
        cliente_id,
        cuenta_id,
        usuarioId
      });

      res.status(201).json({
        success: true,
        message: 'Depósito al matadero registrado exitosamente',
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }

  async getDocumentos(req, res, next) {
    try {
      const { solo_mios } = req.query;
      const usuarioId = (req.usuario && req.usuario.id) || (req.user && req.user.id);
      const data = await mataderoService.obtenerDocumentos(solo_mios, usuarioId);
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

  async listarDocumentos(req, res, next) {
    return this.getDocumentos(req, res, next);
  }
}

module.exports = new MataderoController();
