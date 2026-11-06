const db = require('../config/db');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ProductosService {
  async listarProductos() {
    const { rows } = await db.query(`
      SELECT 
        p.*,
        (p.stock_actual <= 5.00) AS alerta_stock_bajo,
        EXISTS (
          SELECT 1 FROM detalle_venta dv WHERE dv.producto_id = p.id
        ) AS ha_sido_vendido
      FROM productos p
      WHERE p.activo = TRUE
      ORDER BY p.id ASC
    `);
    return rows;
  }

  async obtenerProductoPorId(id) {
    const { rows } = await db.query(
      'SELECT *, (stock_actual <= 5.00) AS alerta_stock_bajo FROM productos WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      throw new NotFoundError('Producto no encontrado');
    }
    return rows[0];
  }

  async crearProducto({ nombre, presentacion, unidad_medida, precio_compra, precio_venta, stock_actual, activo }) {
    if (!nombre || precio_compra === undefined || precio_venta === undefined) {
      throw new ValidationError('Nombre, precio de compra y precio de venta son requeridos');
    }

    const pCompra = parseFloat(precio_compra);
    const pVenta = parseFloat(precio_venta);
    const sActual = parseFloat(stock_actual || 0);
    const sMinimo = 5.00;
    const unit = String(unidad_medida || 'lb').trim();
    const pres = String(presentacion || 'Empaque estándar').trim();

    if (isNaN(pCompra) || isNaN(pVenta) || pCompra < 0 || pVenta < 0) {
      throw new ValidationError('Los precios de compra y venta deben ser valores numéricos válidos');
    }

    if (pVenta < pCompra) {
      throw new ValidationError('El precio de venta no puede ser menor al precio de compra');
    }

    if (isNaN(sActual) || sActual < 0) {
      throw new ValidationError('El stock actual no puede ser negativo');
    }

    const isActivo = activo !== undefined ? Boolean(activo) : true;
    const nombreTrimmed = String(nombre).trim();

    const { rows: existing } = await db.query(
      'SELECT id FROM productos WHERE LOWER(TRIM(nombre)) = LOWER($1)',
      [nombreTrimmed]
    );
    if (existing.length > 0) {
      throw new ValidationError(`Ya existe un producto con el nombre "${nombreTrimmed}"`);
    }

    const { rows } = await db.query(
      'INSERT INTO productos (nombre, presentacion, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *, (stock_actual <= 5.00) AS alerta_stock_bajo',
      [
        nombreTrimmed,
        pres,
        unit,
        pCompra,
        pVenta,
        sActual,
        sMinimo,
        isActivo
      ]
    );

    return rows[0];
  }

  async actualizarProducto(id, payload) {
    const { rows: currentProd } = await db.query('SELECT * FROM productos WHERE id = $1', [id]);
    if (currentProd.length === 0) {
      throw new NotFoundError('Producto no encontrado');
    }
    const prod = currentProd[0];

    const { rows: salesRows } = await db.query('SELECT id FROM detalle_venta WHERE producto_id = $1 LIMIT 1', [id]);
    const haSidoVendido = salesRows.length > 0;

    if (haSidoVendido && payload.stock_actual !== undefined) {
      const nuevoStock = parseFloat(payload.stock_actual);
      if (nuevoStock !== parseFloat(prod.stock_actual)) {
        throw new ValidationError('No se permite modificar manualmente el stock de un producto con historial de ventas. Utilice facturas de matadero o mermas.');
      }
    }

    const nombre = prod.nombre;
    const precio_compra = payload.precio_compra !== undefined ? parseFloat(payload.precio_compra) : parseFloat(prod.precio_compra);
    const precio_venta = payload.precio_venta !== undefined ? parseFloat(payload.precio_venta) : parseFloat(prod.precio_venta);
    const stock_minimo = 5.00;
    const stock_actual = (!haSidoVendido && payload.stock_actual !== undefined) ? parseFloat(payload.stock_actual) : parseFloat(prod.stock_actual);
    const activo = payload.activo !== undefined ? Boolean(payload.activo) : prod.activo;

    if (isNaN(precio_compra) || isNaN(precio_venta) || precio_venta < precio_compra) {
      throw new ValidationError('El precio de venta no puede ser menor al precio de compra');
    }

    const { rows: updatedRows } = await db.query(
      'UPDATE productos SET nombre = $1, precio_compra = $2, precio_venta = $3, stock_actual = $4, stock_minimo = $5, activo = $6 WHERE id = $7 RETURNING *, (stock_actual <= 5.00) AS alerta_stock_bajo',
      [nombre, precio_compra, precio_venta, stock_actual, stock_minimo, activo, id]
    );

    return updatedRows[0];
  }

  async eliminarProducto(id, { usuarioId, motivo } = {}) {
    const { rows: salesRows } = await db.query('SELECT COUNT(*)::int AS count FROM detalle_venta WHERE producto_id = $1', [id]);
    if (salesRows.length > 0 && salesRows[0].count > 0) {
      throw new ValidationError('No es posible eliminar el producto porque ya tiene ventas registradas en el sistema');
    }

    const { rows: currentProd } = await db.query('SELECT * FROM productos WHERE id = $1', [id]);
    if (currentProd.length === 0) {
      throw new NotFoundError('Producto no encontrado');
    }
    const prod = currentProd[0];

    await db.query(
      'INSERT INTO productos_eliminados (producto_nombre, cantidad_stock, usuario_id, motivo) VALUES ($1, $2, $3, $4)',
      [prod.nombre, parseFloat(prod.stock_actual) || 0, usuarioId || null, motivo || 'Eliminado por Gerencia']
    );

    const { rows: updatedRows } = await db.query(
      'UPDATE productos SET activo = FALSE, stock_actual = 0 WHERE id = $1 RETURNING *',
      [id]
    );

    return updatedRows[0];
  }

  async listarProductosEliminados() {
    const { rows } = await db.query(`
      SELECT 
        pe.id,
        pe.producto_nombre,
        pe.cantidad_stock,
        pe.fecha_eliminacion,
        pe.motivo,
        pe.usuario_id,
        u.nombre AS usuario_nombre
      FROM productos_eliminados pe
      LEFT JOIN usuarios u ON pe.usuario_id = u.id
      ORDER BY pe.fecha_eliminacion DESC, pe.id DESC
    `);
    return rows;
  }
}

module.exports = new ProductosService();
