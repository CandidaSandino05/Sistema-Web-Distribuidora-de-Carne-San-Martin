const db = require('../config/db');
const queries = require('../models/queries');
const { ValidationError, NotFoundError } = require('../utils/errors');

class InventarioController {
  async obtenerKpis(req, res, next) {
    try {
      const { rows } = await db.query(queries.dashboard.getKpis);
      res.status(200).json({
        success: true,
        data: rows[0]
      });
    } catch (err) {
      next(err);
    }
  }

  async alertarStockBajo(req, res, next) {
    try {
      const { rows } = await db.query(queries.productos.getLowStock);
      res.status(200).json({
        success: true,
        data: rows
      });
    } catch (err) {
      next(err);
    }
  }

  async registrarMerma(req, res, next) {
    try {
      const { producto_id, cantidad, motivo } = req.body;
      const cant = parseFloat(cantidad);
      const usuarioId = req.user ? req.user.id : null;

      if (!producto_id || isNaN(cant) || cant <= 0) {
        throw new ValidationError('Producto y cantidad de merma válidos son requeridos');
      }

      const { rows: prodRows } = await db.query(queries.productos.findById, [producto_id]);
      if (prodRows.length === 0) {
        throw new NotFoundError('Producto no encontrado');
      }

      const prod = prodRows[0];
      if (parseFloat(prod.stock_actual) < cant) {
        throw new ValidationError(
          `La cantidad de merma (${cant} lb) supera el stock disponible (${prod.stock_actual} lb)`
        );
      }

      const { rows: updatedRows } = await db.query(queries.productos.adjustStock, [cant, producto_id]);

      try {
        await db.query(
          'INSERT INTO mermas (producto_id, cantidad, motivo, usuario_id) VALUES ($1, $2, $3, $4)',
          [producto_id, cant, motivo || 'Merma operativa', usuarioId]
        );
      } catch (e) {}

      res.status(200).json({
        success: true,
        message: 'Merma registrada y stock actualizado',
        data: {
          producto: updatedRows[0],
          cantidad_merma: cant,
          motivo: motivo || 'Merma operativa'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async registrarIngreso(req, res, next) {
    try {
      const { producto_id, cantidad, motivo } = req.body;
      const cant = parseFloat(cantidad);

      if (!producto_id || isNaN(cant) || cant <= 0) {
        throw new ValidationError('Producto y cantidad de ingreso válidos son requeridos');
      }

      const { rows: prodRows } = await db.query(queries.productos.findById, [producto_id]);
      if (prodRows.length === 0) {
        throw new NotFoundError('Producto no encontrado');
      }

      const { rows: updatedRows } = await db.query(queries.productos.updateStock, [cant, producto_id]);

      res.status(200).json({
        success: true,
        message: 'Ingreso de stock registrado exitosamente',
        data: {
          producto: updatedRows[0],
          cantidad_ingreso: cant,
          motivo: motivo || 'Reposición de inventario'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerAnalytics(req, res, next) {
    try {
      const { desde, hasta } = req.query;

      let salesDateCondition = "AND v.estado != 'anulada'";
      let params = [];

      if (desde && hasta) {
        salesDateCondition += ` AND DATE(v.fecha) >= $1 AND DATE(v.fecha) <= $2`;
        params.push(desde, hasta);
      }

      const { rows: kpiRows } = await db.query(`
        SELECT 
          COALESCE(SUM(stock_actual * precio_compra), 0) AS inversion_inventario,
          COALESCE((
            SELECT SUM(total) FROM ventas v
            WHERE 1=1 ${salesDateCondition}
          ), 0) AS ventas_mes,
          COALESCE(SUM(stock_actual * (precio_venta - precio_compra)), 0) AS margen_proyectado,
          COALESCE((
            SELECT SUM(saldo_pendiente) FROM cuentas_por_cobrar 
            WHERE LOWER(estado) = 'pendiente'
          ), 0) AS total_cxc
        FROM productos WHERE activo = TRUE
      `, params);

      const { rows: sales7Days } = await db.query(`
        SELECT 
          TO_CHAR(d.day, 'TMDy DD') AS label,
          TO_CHAR(d.day, 'YYYY-MM-DD') AS fecha,
          COALESCE(SUM(v.total), 0) AS total
        FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(day)
        LEFT JOIN ventas v ON DATE(v.fecha) = DATE(d.day) AND v.estado != 'anulada'
        GROUP BY d.day
        ORDER BY d.day ASC
      `);

      const { rows: topProductos } = await db.query(`
        SELECT 
          p.id,
          p.nombre,
          COALESCE(SUM(dv.cantidad), 0) AS cantidad_vendida,
          COALESCE(SUM(dv.subtotal), 0) AS ingresos_generados
        FROM productos p
        JOIN detalle_venta dv ON p.id = dv.producto_id
        JOIN ventas v ON dv.venta_id = v.id AND v.estado != 'anulada'
        GROUP BY p.id, p.nombre
        ORDER BY cantidad_vendida DESC
        LIMIT 5
      `);

      const { rows: ultimasVentas } = await db.query(`
        SELECT 
          v.id,
          v.fecha,
          v.total,
          v.estado,
          v.tipo_pago,
          c.nombre AS cliente_nombre
        FROM ventas v
        JOIN clientes c ON v.cliente_id = c.id
        ORDER BY v.fecha DESC
        LIMIT 5
      `);

      const { rows: alertasStock } = await db.query(queries.productos.getLowStock);

      let mermasResumen = [];
      try {
        const { rows: mermasRows } = await db.query(`
          SELECT 
            p.nombre AS producto_nombre,
            COALESCE(SUM(m.cantidad), 0) AS libras_perdidas,
            COALESCE(SUM(m.cantidad * p.precio_compra), 0) AS costo_perdida
          FROM mermas m
          JOIN productos p ON m.producto_id = p.id
          GROUP BY p.id, p.nombre
          ORDER BY libras_perdidas DESC
          LIMIT 5
        `);
        mermasResumen = mermasRows;
      } catch (e) {
        mermasResumen = [];
      }

      let mejoresClientes = [];
      try {
        const { rows: clientesRows } = await db.query(`
          SELECT 
            c.id,
            c.nombre,
            COALESCE(SUM(v.total), 0) AS total_compras,
            COUNT(v.id) AS numero_ordenes
          FROM clientes c
          JOIN ventas v ON c.id = v.cliente_id AND v.estado != 'anulada'
          WHERE c.nombre NOT ILIKE '%Consumidor Final%'
          GROUP BY c.id, c.nombre
          ORDER BY total_compras DESC
          LIMIT 5
        `);
        mejoresClientes = clientesRows;
      } catch (e) {
        mejoresClientes = [];
      }

      res.status(200).json({
        success: true,
        data: {
          kpis: kpiRows[0],
          ventas_7_dias: sales7Days,
          top_productos: topProductos,
          ultimas_ventas: ultimasVentas,
          alertas_stock: alertasStock,
          mermas_resumen: mermasResumen,
          mejores_clientes: mejoresClientes
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InventarioController();
