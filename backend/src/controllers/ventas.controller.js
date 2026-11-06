const ventasService = require('../services/ventas.service');
const { ValidationError } = require('../utils/errors');

class VentasController {
  async listar(req, res, next) {
    try {
      const ventas = await ventasService.listarVentas(req.user);
      res.status(200).json({
        success: true,
        data: ventas
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const venta = await ventasService.obtenerVentaPorId(id, req.user);
      res.status(200).json({
        success: true,
        data: venta
      });
    } catch (err) {
      next(err);
    }
  }

  async crear(req, res, next) {
    try {
      const { cliente_id, tipo_pago, items, dias_credito, descuento } = req.body;
      const usuarioId = req.user.id;

      if (!Array.isArray(items) || items.length === 0) {
        throw new ValidationError('La venta debe contener al menos un producto');
      }

      for (const item of items) {
        const qty = parseFloat(item.cantidad);
        if (isNaN(qty) || qty <= 0) {
          throw new ValidationError('La cantidad de cada producto debe ser mayor a 0');
        }
      }

      const resultado = await ventasService.crearVenta({
        clienteId: cliente_id,
        usuarioId,
        tipoPago: tipo_pago,
        items,
        diasCredito: dias_credito || 15,
        descuentoGlobal: parseFloat(descuento || 0)
      });

      res.status(201).json({
        success: true,
        message: 'Venta registrada con éxito',
        data: resultado
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerReportes(req, res, next) {
    try {
      const { desde, hasta } = req.query;
      const data = await ventasService.obtenerReportes({ desde, hasta });

      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VentasController();
