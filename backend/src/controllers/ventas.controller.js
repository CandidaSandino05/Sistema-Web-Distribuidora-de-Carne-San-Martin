const db = require('../config/db');
const ventasService = require('../services/ventas.service');
const { ValidationError } = require('../utils/errors');

class VentasController {
  async listar(req, res, next) {
    try {
      const ventas = await ventasService.listarVentas();
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
      const venta = await ventasService.obtenerVentaPorId(id);
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
      const { cliente_id, tipo_pago, items, dias_credito } = req.body;
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
        diasCredito: dias_credito || 15
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

      let dateFilter = '';
      const params = [];

      if (desde && hasta) {
        params.push(desde, hasta);
        dateFilter = ' AND DATE(v.fecha) >= $1 AND DATE(v.fecha) <= $2';
      } else if (desde) {
        params.push(desde);
        dateFilter = ' AND DATE(v.fecha) >= $1';
      } else if (hasta) {
        params.push(hasta);
        dateFilter = ' AND DATE(v.fecha) <= $1';
      }

      let productos = [];
      let totalVendido = 0;
      let gananciaNeta = 0;

      try {
        const { rows } = await db.query(`
          SELECT 
            p.id AS producto_id,
            p.nombre AS producto_nombre,
            COALESCE(SUM(dv.cantidad), 0) AS cantidad_vendida,
            dv.precio_unitario,
            p.precio_compra,
            COALESCE(SUM(dv.subtotal), 0) AS total_cobrado,
            COALESCE(SUM(dv.cantidad * (dv.precio_unitario - p.precio_compra)), 0) AS ganancia_neta
          FROM detalle_venta dv
          JOIN productos p ON dv.producto_id = p.id
          JOIN ventas v ON dv.venta_id = v.id
          WHERE v.estado != 'anulada' ${dateFilter}
          GROUP BY p.id, p.nombre, dv.precio_unitario, p.precio_compra
          ORDER BY total_cobrado DESC
        `, params);

        productos = rows || [];
        totalVendido = productos.reduce((acc, r) => acc + parseFloat(r.total_cobrado || 0), 0);
        gananciaNeta = productos.reduce((acc, r) => acc + parseFloat(r.ganancia_neta || 0), 0);
      } catch (e) {
        productos = [];
      }

      res.status(200).json({
        success: true,
        data: {
          total_vendido: totalVendido,
          ganancia_neta: gananciaNeta,
          productos
        }
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message || 'Error al obtener reportes',
        data: {
          total_vendido: 0,
          ganancia_neta: 0,
          productos: []
        }
      });
    }
  }
}

module.exports = new VentasController();
