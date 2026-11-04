const db = require('../config/db');
const queries = require('../models/queries');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ClientesController {
  async listar(req, res, next) {
    try {
      const { rows } = await db.query(queries.clientes.findAll);
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
      const { rows } = await db.query(queries.clientes.findById, [id]);
      if (rows.length === 0) {
        throw new NotFoundError('Cliente no encontrado');
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
      const { nombre, telefono, direccion, email, limite_credito, activo } = req.body;

      if (!nombre || nombre.trim().length === 0) {
        throw new ValidationError('El nombre del cliente es obligatorio');
      }

      const limite = limite_credito !== undefined ? parseFloat(limite_credito) : 0;
      if (limite < 0) {
        throw new ValidationError('El límite de crédito no puede ser negativo');
      }

      const isActivo = activo !== undefined ? Boolean(activo) : true;

      const { rows } = await db.query(queries.clientes.create, [
        nombre.trim(),
        telefono ? telefono.trim() : null,
        direccion ? direccion.trim() : null,
        email ? email.trim().toLowerCase() : null,
        limite,
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

  async historialVentas(req, res, next) {
    try {
      const { id } = req.params;
      const { rows } = await db.query(queries.clientes.getClientSales, [id]);
      res.status(200).json({
        success: true,
        data: rows
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClientesController();
