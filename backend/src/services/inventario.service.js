const db = require('../config/db');
const { ValidationError, NotFoundError } = require('../utils/errors');

class InventarioService {
  async obtenerKpis() {
    const { rows } = await db.query(`
      SELECT 
        COALESCE(SUM(stock_actual * precio_compra), 0) AS inversion_inventario,
        COALESCE((
          SELECT SUM(total) FROM ventas v
          WHERE v.estado != 'anulada'
        ), 0) AS ventas_mes,
        COALESCE(SUM(stock_actual * (precio_venta - precio_compra)), 0) AS margen_proyectado,
        COALESCE((
          SELECT SUM(saldo_pendiente) FROM cuentas_por_cobrar 
          WHERE LOWER(estado) = 'pendiente'
        ), 0) AS total_cxc
      FROM productos WHERE activo = TRUE
    `);
    return rows[0];
  }

  async alertarStockBajo() {
    const { rows } = await db.query(
      'SELECT * FROM productos WHERE activo = TRUE AND stock_actual <= 5.00 ORDER BY stock_actual ASC'
    );
    return rows;
  }

  async listarMermas() {
    const { rows } = await db.query(`
      SELECT 
        m.id,
        m.fecha,
        m.producto_id,
        p.nombre AS producto_nombre,
        p.precio_compra,
        m.cantidad,
        ROUND(m.cantidad * p.precio_compra, 2) AS impacto_economico,
        m.motivo,
        m.usuario_id,
        u.nombre AS usuario_nombre
      FROM mermas m
      JOIN productos p ON m.producto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.fecha DESC, m.id DESC
    `);

    let totalImpacto = 0;
    let totalLibras = 0;

    for (const r of rows) {
      totalImpacto += parseFloat(r.impacto_economico || 0);
      totalLibras += parseFloat(r.cantidad || 0);
    }

    return {
      mermas: rows,
      total_impacto: parseFloat(totalImpacto.toFixed(2)),
      total_libras: parseFloat(totalLibras.toFixed(2)),
      total_registros: rows.length
    };
  }

  async registrarMerma({ producto_id, cantidad, motivo, usuarioId }) {
    const cant = parseFloat(cantidad);

    if (!producto_id || isNaN(cant) || cant <= 0) {
      throw new ValidationError('Producto y cantidad de merma válidos son requeridos');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const { rows: prodRows } = await client.query(
        'SELECT * FROM productos WHERE id = $1 FOR UPDATE',
        [producto_id]
      );
      if (prodRows.length === 0) {
        throw new NotFoundError('Producto no encontrado');
      }

      const prod = prodRows[0];
      if (parseFloat(prod.stock_actual) < cant) {
        throw new ValidationError(
          `La cantidad de merma (${cant} lb) supera el stock disponible (${prod.stock_actual} lb)`
        );
      }

      const { rows: updatedRows } = await client.query(
        'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2 RETURNING *',
        [cant, producto_id]
      );

      await client.query(
        'INSERT INTO mermas (producto_id, cantidad, motivo, usuario_id) VALUES ($1, $2, $3, $4)',
        [producto_id, cant, motivo || 'Merma operativa', usuarioId]
      );

      await client.query('COMMIT');

      const productoActualizado = updatedRows[0];
      const alertaStockBajo = parseFloat(productoActualizado.stock_actual) <= 5.00;

      return {
        producto: productoActualizado,
        cantidad_merma: cant,
        motivo: motivo || 'Merma operativa',
        alerta_stock_bajo: alertaStockBajo
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async registrarIngreso({ producto_id, cantidad, motivo, costo }) {
    const cant = parseFloat(cantidad);

    if (!producto_id || isNaN(cant) || cant <= 0) {
      throw new ValidationError('Producto y cantidad de ingreso válidos son requeridos');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const { rows: prodRows } = await client.query(
        'SELECT * FROM productos WHERE id = $1 FOR UPDATE',
        [producto_id]
      );
      if (prodRows.length === 0) {
        throw new NotFoundError('Producto no encontrado');
      }

      const prod = prodRows[0];
      let nuevoCosto = parseFloat(prod.precio_compra);
      if (costo !== undefined && !isNaN(parseFloat(costo)) && parseFloat(costo) > 0) {
        const stockActual = parseFloat(prod.stock_actual);
        const costoActual = parseFloat(prod.precio_compra);
        const stockNuevo = cant;
        const costoNuevo = parseFloat(costo);
        if (stockActual + stockNuevo > 0) {
          nuevoCosto = ((stockActual * costoActual) + (stockNuevo * costoNuevo)) / (stockActual + stockNuevo);
        }
        nuevoCosto = parseFloat(nuevoCosto.toFixed(2));
      }

      const { rows: updatedRows } = await client.query(
        'UPDATE productos SET stock_actual = stock_actual + $1, precio_compra = $2 WHERE id = $3 RETURNING *',
        [cant, nuevoCosto, producto_id]
      );

      await client.query('COMMIT');

      const productoActualizado = updatedRows[0];
      const alertaStockBajo = parseFloat(productoActualizado.stock_actual) <= 5.00;

      return {
        producto: productoActualizado,
        cantidad_ingreso: cant,
        motivo: motivo || 'Reposición de inventario',
        alerta_stock_bajo: alertaStockBajo
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async obtenerAnalytics({ desde, hasta }) {
    let salesDateCondition = "AND v.estado != 'anulada'";
    const params = [];

    if (desde && hasta) {
      salesDateCondition += ' AND DATE(v.fecha) >= $1 AND DATE(v.fecha) <= $2';
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

    const { rows: alertasStock } = await db.query(
      'SELECT * FROM productos WHERE activo = TRUE AND stock_actual <= 5.00 ORDER BY stock_actual ASC'
    );

    const { rows: mermasResumen } = await db.query(`
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

    const { rows: mermas7Days } = await db.query(`
      SELECT 
        TO_CHAR(d.day, 'TMDy DD') AS label,
        TO_CHAR(d.day, 'YYYY-MM-DD') AS fecha,
        COALESCE(SUM(m.cantidad * p.precio_compra), 0) AS total_perdida,
        COALESCE(SUM(m.cantidad), 0) AS total_libras
      FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(day)
      LEFT JOIN mermas m ON DATE(m.fecha) = DATE(d.day)
      LEFT JOIN productos p ON m.producto_id = p.id
      GROUP BY d.day
      ORDER BY d.day ASC
    `);

    const { rows: mejoresClientes } = await db.query(`
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

    const { rows: categorias } = await db.query(`
      SELECT 
        p.presentacion AS nombre,
        COALESCE(SUM(dv.subtotal), 0) AS total
      FROM productos p
      LEFT JOIN detalle_venta dv ON p.id = dv.producto_id
      LEFT JOIN ventas v ON dv.venta_id = v.id AND v.estado != 'anulada'
      WHERE p.activo = TRUE
      GROUP BY p.presentacion
      ORDER BY total DESC
    `);

    return {
      kpis: kpiRows[0],
      ventas_7_dias: sales7Days,
      top_productos: topProductos,
      ultimas_ventas: ultimasVentas,
      alertas_stock: alertasStock,
      mermas_resumen: mermasResumen,
      mermas_7_dias: mermas7Days,
      mejores_clientes: mejoresClientes,
      categorias
    };
  }
}

module.exports = new InventarioService();
