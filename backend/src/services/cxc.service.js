const db = require('../config/db');
const queries = require('../models/queries');
const { ValidationError, NotFoundError } = require('../utils/errors');

class CxCService {
  async listarCuentas() {
    const { rows } = await db.query(queries.cxc.findAll);
    return rows;
  }

  async registrarPago({ cuentaId, monto, metodoPago = 'efectivo', banco = null, usuarioId }) {
    const pagoMonto = parseFloat(monto);
    if (!cuentaId || isNaN(pagoMonto) || pagoMonto <= 0) {
      throw new ValidationError('Monto y cuenta son obligatorios y deben ser válidos');
    }

    if (!['efectivo', 'transferencia'].includes(String(metodoPago).toLowerCase())) {
      throw new ValidationError('Método de pago debe ser efectivo o transferencia');
    }

    if (String(metodoPago).toLowerCase() === 'transferencia' && !banco) {
      throw new ValidationError('Debe especificar el banco emisor o receptor para transferencias');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const { rows: cxcRows } = await client.query(
        'SELECT id, venta_id, cliente_id, saldo_pendiente, estado FROM cuentas_por_cobrar WHERE id = $1 FOR UPDATE',
        [cuentaId]
      );

      if (cxcRows.length === 0) {
        throw new NotFoundError('Cuenta por cobrar no encontrada');
      }

      const cuenta = cxcRows[0];
      const saldoActual = parseFloat(cuenta.saldo_pendiente);

      if (saldoActual <= 0 || String(cuenta.estado).toUpperCase() === 'PAGADA') {
        throw new ValidationError('Esta cuenta ya se encuentra totalmente saldada');
      }

      if (pagoMonto > saldoActual) {
        throw new ValidationError(
          `El monto abonado (C$${pagoMonto.toFixed(2)}) supera el saldo pendiente (C$${saldoActual.toFixed(2)})`
        );
      }

      const nuevoSaldo = Math.max(0, saldoActual - pagoMonto);
      const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADA' : 'PENDIENTE';

      const { rows: updatedRows } = await client.query(
        'UPDATE cuentas_por_cobrar SET saldo_pendiente = $1, estado = $2 WHERE id = $3 RETURNING *',
        [nuevoSaldo, nuevoEstado, cuentaId]
      );

      const { rows: pagoRows } = await client.query(
        queries.cxc.insertPago,
        [cuentaId, pagoMonto, usuarioId, metodoPago, banco]
      );
      const nuevoPago = pagoRows[0];

      if (nuevoEstado === 'PAGADA') {
        await client.query(
          'UPDATE ventas SET estado = \'pagada\' WHERE id = $1',
          [cuenta.venta_id]
        );
      }

      await client.query('COMMIT');

      return {
        pago: nuevoPago,
        cuenta: updatedRows[0]
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async obtenerHistorialPagos(cuentaId) {
    const { rows } = await db.query(queries.cxc.getPagosByCuenta, [cuentaId]);
    return rows;
  }
}

module.exports = new CxCService();