const db = require('../config/db');
const queries = require('../models/queries');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ProductosController {
  async listar(req, res, next) {
    try {
      const { rows } = await db.query(queries.productos.findAll);
      res.status(200).json({
        success: true,
        data: rows
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const { rows } = await db.query(queries.productos.findById, [id]);
      if (rows.length === 0) {
        throw new NotFoundError('Producto no encontrado');
      }
      res.status(200).json({
        success: true,
        data: rows[0]
      });
    } catch (err) {
      next(err);
    }
  }

  async crear(req, res, next) {
    try {
      const { nombre, presentacion, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, activo } = req.body;

      if (!nombre || precio_compra === undefined || precio_venta === undefined) {
        throw new ValidationError('Nombre, precio de compra y precio de venta son requeridos');
      }

      const pCompra = parseFloat(precio_compra);
      const pVenta = parseFloat(precio_venta);
      const sActual = parseFloat(stock_actual || 0);
      const sMinimo = parseFloat(stock_minimo || 0);
      const unit = (unidad_medida || 'lb').trim();
      const pres = (presentacion || 'Empaque estándar').trim();

      if (pVenta < pCompra) {
        throw new ValidationError('El precio de venta no puede ser menor al precio de compra');
      }

      if (sActual < 0) {
        throw new ValidationError('El stock actual no puede ser negativo');
      }

      const isActivo = activo !== undefined ? Boolean(activo) : true;

      const { rows } = await db.query(queries.productos.create, [
        nombre.trim(),
        pres,
        unit,
        pCompra,
        pVenta,
        sActual,
        sMinimo,
        isActivo
      ]);

      res.status(201).json({
        success: true,
        data: rows[0]
      });
    } catch (err) {
      next(err);
    }
  }

  async eliminar(req, res, next) {
    try {
      const { id } = req.params;
      const { rows: salesRows } = await db.query(queries.productos.hasSales, [id]);
      if (salesRows.length > 0) {
        throw new ValidationError('No es posible eliminar el producto porque ya tiene ventas registradas en el sistema');
      }
      const { rows: delRows } = await db.query(queries.productos.delete, [id]);
      if (delRows.length === 0) {
        throw new NotFoundError('Producto no encontrado');
      }
      res.status(200).json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (err) {
      next(err);
    }
  }

  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { rows: currentProd } = await db.query(queries.productos.findById, [id]);
      if (currentProd.length === 0) {
        throw new NotFoundError('Producto no encontrado');
      }
      const prod = currentProd[0];

      const { rows: salesRows } = await db.query(queries.productos.hasSales, [id]);
      const haSidoVendido = salesRows.length > 0;

      if (haSidoVendido && req.body.stock_actual !== undefined) {
        const nuevoStock = parseFloat(req.body.stock_actual);
        if (nuevoStock !== parseFloat(prod.stock_actual)) {
          throw new ValidationError('No se permite modificar manualmente el stock de un producto con historial de ventas. Utilice compras, ingresos o mermas.');
        }
      }

      const nombre = req.body.nombre !== undefined ? req.body.nombre.trim() : prod.nombre;
      const precio_compra = req.body.precio_compra !== undefined ? parseFloat(req.body.precio_compra) : parseFloat(prod.precio_compra);
      const precio_venta = req.body.precio_venta !== undefined ? parseFloat(req.body.precio_venta) : parseFloat(prod.precio_venta);
      const stock_minimo = req.body.stock_minimo !== undefined ? parseFloat(req.body.stock_minimo) : parseFloat(prod.stock_minimo);
      const stock_actual = (!haSidoVendido && req.body.stock_actual !== undefined) ? parseFloat(req.body.stock_actual) : parseFloat(prod.stock_actual);
      const activo = req.body.activo !== undefined ? Boolean(req.body.activo) : prod.activo;

      const { rows: updatedRows } = await db.query(
        'UPDATE productos SET nombre = $1, precio_compra = $2, precio_venta = $3, stock_actual = $4, stock_minimo = $5, activo = $6 WHERE id = $7 RETURNING *',
        [nombre, precio_compra, precio_venta, stock_actual, stock_minimo, activo, id]
      );

      res.status(200).json({
        success: true,
        data: updatedRows[0]
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductosController();
