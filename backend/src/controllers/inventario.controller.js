const inventarioService = require('../services/inventario.service');

class InventarioController {
  async obtenerKpis(req, res, next) {
    try {
      const kpis = await inventarioService.obtenerKpis();
      res.status(200).json({
        success: true,
        data: kpis
      });
    } catch (err) {
      next(err);
    }
  }

  async alertarStockBajo(req, res, next) {
    try {
      const alertas = await inventarioService.alertarStockBajo();
      res.status(200).json({
        success: true,
        data: alertas
      });
    } catch (err) {
      next(err);
    }
  }

  async listarMermas(req, res, next) {
    try {
      const data = await inventarioService.listarMermas();
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async registrarMerma(req, res, next) {
    try {
      const { producto_id, cantidad, motivo } = req.body;
      const usuarioId = req.user ? req.user.id : null;

      const data = await inventarioService.registrarMerma({
        producto_id,
        cantidad,
        motivo,
        usuarioId
      });

      res.status(200).json({
        success: true,
        message: 'Merma registrada y stock actualizado',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async registrarIngreso(req, res, next) {
    try {
      const { producto_id, cantidad, motivo, costo } = req.body;

      const data = await inventarioService.registrarIngreso({
        producto_id,
        cantidad,
        motivo,
        costo
      });

      res.status(200).json({
        success: true,
        message: 'Ingreso de stock registrado exitosamente',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerAnalytics(req, res, next) {
    try {
      const { desde, hasta } = req.query;
      const data = await inventarioService.obtenerAnalytics({ desde, hasta });

      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InventarioController();
