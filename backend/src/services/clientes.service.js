const db = require('../config/db');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ClientesService {
  async listarClientes() {
    const { rows } = await db.query('SELECT * FROM clientes ORDER BY id ASC');
    return rows;
  }

  async obtenerClientePorId(id) {
    const { rows } = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (rows.length === 0) {
      throw new NotFoundError('Cliente no encontrado');
    }
    return rows[0];
  }

  async crearCliente({ nombre, telefono, direccion, email, limite_credito, activo }) {
    if (!nombre || String(nombre).trim().length === 0) {
      throw new ValidationError('El nombre del cliente es obligatorio');
    }

    const limite = limite_credito !== undefined ? parseFloat(limite_credito) : 0;
    if (isNaN(limite) || limite < 0) {
      throw new ValidationError('El límite de crédito no puede ser negativo');
    }

    const isActivo = activo !== undefined ? Boolean(activo) : true;

    const { rows } = await db.query(
      'INSERT INTO clientes (nombre, telefono, direccion, email, limite_credito, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        String(nombre).trim(),
        telefono ? String(telefono).trim() : null,
        direccion ? String(direccion).trim() : null,
        email ? String(email).trim().toLowerCase() : null,
        limite,
        isActivo
      ]
    );

    return rows[0];
  }

  async obtenerHistorialVentas(clienteId) {
    const { rows } = await db.query(
      'SELECT id, numero_factura, fecha, total, tipo_pago, estado FROM ventas WHERE cliente_id = $1 ORDER BY fecha DESC',
      [clienteId]
    );
    return rows;
  }

  async actualizarEstado(id, activo) {
    const isActivo = Boolean(activo);
    const { rows } = await db.query(
      'UPDATE clientes SET activo = $1 WHERE id = $2 RETURNING *',
      [isActivo, id]
    );
    if (rows.length === 0) {
      throw new NotFoundError('Cliente no encontrado');
    }
    return rows[0];
  }
}

module.exports = new ClientesService();
