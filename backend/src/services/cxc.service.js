const db = require('../config/db');
const { ValidationError, NotFoundError } = require('../utils/errors');

class CxCService {
  async listarCuentas() {
    const { rows } = await db.query(`
      SELECT 
        cxc.id,
        cxc.venta_id,
        v.numero_factura,
        cxc.cliente_id,
        cxc.saldo_pendiente,
        cxc.fecha_vencimiento,
        cxc.estado,
        cl.nombre AS cliente_nombre,
        cl.telefono AS cliente_telefono,
        v.total AS total_venta,
        v.fecha AS venta_fecha,
        p.monto AS ultimo_pago,
        p.fecha_pago AS ultimo_pago_fecha,
        p.metodo_pago AS ultimo_pago_metodo,
        p.banco AS ultimo_pago_banco
      FROM cuentas_por_cobrar cxc
      JOIN clientes cl ON cxc.cliente_id = cl.id
      JOIN ventas v ON cxc.venta_id = v.id
      LEFT JOIN LATERAL (
        SELECT monto, fecha_pago, metodo_pago, banco
        FROM pagos
        WHERE cuenta_id = cxc.id
        ORDER BY fecha_pago DESC, id DESC
        LIMIT 1
      ) p ON TRUE
      ORDER BY cxc.id DESC
    `);
    return rows;
  }

  async registrarPago({ cuentaId, monto, metodoPago = 'efectivo', banco = null, destinoDeposito = 'distribuidora', referencia = null, usuarioId }) {
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
        'SELECT cxc.id, cxc.venta_id, cxc.cliente_id, cxc.saldo_pendiente, cxc.estado, v.numero_factura FROM cuentas_por_cobrar cxc JOIN ventas v ON cxc.venta_id = v.id WHERE cxc.id = $1 FOR UPDATE',
        [cuentaId]
      );

      if (cxcRows.length === 0) {
        throw new NotFoundError('Cuenta por cobrar no encontrada');
      }

      const cuenta = cxcRows[0];
      const saldoActual = parseFloat(cuenta.saldo_pendiente);

      if (saldoActual <= 0 || String(cuenta.estado).toLowerCase() === 'pagada') {
        throw new ValidationError('Esta cuenta ya se encuentra totalmente saldada');
      }

      if (pagoMonto > saldoActual) {
        throw new ValidationError(
          `El monto abonado (C$${pagoMonto.toFixed(2)}) supera el saldo pendiente (C$${saldoActual.toFixed(2)})`
        );
      }

      const nuevoSaldo = parseFloat(Math.max(0, saldoActual - pagoMonto).toFixed(2));
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'pendiente';

      const { rows: updatedRows } = await client.query(
        'UPDATE cuentas_por_cobrar SET saldo_pendiente = $1, estado = $2 WHERE id = $3 RETURNING *',
        [nuevoSaldo, nuevoEstado, cuentaId]
      );

      let mataderoMovId = null;
      if (String(metodoPago).toLowerCase() === 'transferencia' && String(destinoDeposito).toLowerCase() === 'matadero') {
        const refMatadero = referencia ? String(referencia).trim() : `Abono CxC - ${cuenta.numero_factura || ('Cuenta #' + cuentaId)}`;
        const { rows: movRows } = await client.query(
          `INSERT INTO matadero_movimientos 
            (tipo_movimiento, monto, moneda, tasa_cambio, monto_cordobas, banco, referencia, cliente_id, cuenta_id, usuario_id)
           VALUES ('deposito_cliente', $1, 'C$', 1.0000, $1, $2, $3, $4, $5, $6) RETURNING id`,
          [pagoMonto, banco, refMatadero, cuenta.cliente_id, cuentaId, usuarioId]
        );
        mataderoMovId = movRows[0].id;
      }

      const { rows: pagoRows } = await client.query(
        'INSERT INTO pagos (cuenta_id, monto, usuario_id, metodo_pago, banco, referencia, matadero_movimiento_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [cuentaId, pagoMonto, usuarioId, String(metodoPago).toLowerCase(), banco, referencia || null, mataderoMovId]
      );
      const nuevoPago = pagoRows[0];

      if (nuevoEstado === 'pagada') {
        await client.query(
          "UPDATE ventas SET estado = 'pagada' WHERE id = $1",
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
    const { rows } = await db.query(
      'SELECT id, cuenta_id, monto, fecha_pago, usuario_id, metodo_pago, banco, referencia FROM pagos WHERE cuenta_id = $1 ORDER BY fecha_pago ASC, id ASC',
      [cuentaId]
    );
    return rows;
  }

  async getCuentasAgrupadas() {
    const { rows } = await db.query(`
      SELECT 
        c.id AS cliente_id, 
        c.nombre AS cliente_nombre, 
        c.telefono,
        COALESCE(SUM(CASE WHEN cxc.estado = 'pendiente' THEN cxc.saldo_pendiente ELSE 0 END), 0) AS total_deuda,
        COUNT(CASE WHEN cxc.estado = 'pendiente' THEN 1 END) AS facturas_pendientes,
        COUNT(CASE WHEN cxc.estado = 'pagada' THEN 1 END) AS facturas_pagadas
      FROM clientes c
      JOIN cuentas_por_cobrar cxc ON c.id = cxc.cliente_id
      GROUP BY c.id, c.nombre, c.telefono
      ORDER BY total_deuda DESC;
    `);
    return rows;
  }

  async listarCuentasAgrupadas() {
    const { rows } = await db.query(`
      SELECT 
        cl.id AS cliente_id,
        cl.nombre AS cliente_nombre,
        cl.telefono AS cliente_telefono,
        cl.limite_credito,
        COALESCE(SUM(CASE WHEN cxc.estado = 'pendiente' THEN cxc.saldo_pendiente ELSE 0 END), 0) AS total_deuda,
        COUNT(CASE WHEN cxc.estado = 'pendiente' THEN 1 END)::int AS facturas_pendientes_count,
        COUNT(cxc.id)::int AS total_facturas_credito,
        MAX(CASE WHEN cxc.estado = 'pendiente' AND cxc.fecha_vencimiento < CURRENT_DATE THEN 1 ELSE 0 END)::int AS tiene_vencidas,
        CASE 
          WHEN MAX(CASE WHEN cxc.estado = 'pendiente' AND cxc.fecha_vencimiento < CURRENT_DATE THEN 1 ELSE 0 END) = 1 THEN 'VENCIDA'
          WHEN COALESCE(SUM(CASE WHEN cxc.estado = 'pendiente' THEN cxc.saldo_pendiente ELSE 0 END), 0) > 0 THEN 'PENDIENTE'
          ELSE 'AL DIA'
        END AS estado_credito
      FROM clientes cl
      JOIN cuentas_por_cobrar cxc ON cxc.cliente_id = cl.id
      GROUP BY cl.id, cl.nombre, cl.telefono, cl.limite_credito
      ORDER BY total_deuda DESC, cl.nombre ASC
    `);
    return rows;
  }

  async obtenerDetalleCliente(clienteId) {
    const { rows: clientRows } = await db.query(
      'SELECT id, nombre, telefono, limite_credito, direccion FROM clientes WHERE id = $1',
      [clienteId]
    );
    if (clientRows.length === 0) {
      throw new NotFoundError('Cliente no encontrado');
    }

    const { rows: facturas } = await db.query(`
      SELECT 
        cxc.id AS cuenta_id,
        cxc.venta_id,
        v.numero_factura,
        v.fecha,
        v.total,
        cxc.saldo_pendiente,
        cxc.fecha_vencimiento,
        cxc.estado,
        CASE WHEN cxc.estado = 'pendiente' AND cxc.fecha_vencimiento < CURRENT_DATE THEN true ELSE false END AS esta_vencida
      FROM cuentas_por_cobrar cxc
      JOIN ventas v ON cxc.venta_id = v.id
      WHERE cxc.cliente_id = $1
      ORDER BY v.fecha DESC, cxc.id DESC
    `, [clienteId]);

    const { rows: abonos } = await db.query(`
      SELECT 
        p.id,
        p.cuenta_id,
        cxc.venta_id,
        v.numero_factura,
        p.monto,
        p.fecha_pago,
        p.metodo_pago,
        p.banco,
        p.referencia,
        u.nombre AS usuario_nombre
      FROM pagos p
      JOIN cuentas_por_cobrar cxc ON p.cuenta_id = cxc.id
      JOIN ventas v ON cxc.venta_id = v.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE cxc.cliente_id = $1
      ORDER BY p.fecha_pago DESC, p.id DESC
    `, [clienteId]);

    const saldoTotal = facturas.reduce((sum, f) => {
      return f.estado === 'pendiente' ? sum + parseFloat(f.saldo_pendiente || 0) : sum;
    }, 0);

    return {
      cliente: clientRows[0],
      saldo_total: parseFloat(saldoTotal.toFixed(2)),
      facturas,
      abonos
    };
  }

  async registrarPagoGlobalCliente({ clienteId, monto, metodoPago = 'efectivo', banco = null, destinoDeposito = 'distribuidora', referencia = null, usuarioId }) {
    const pagoMonto = parseFloat(monto);
    if (!clienteId || isNaN(pagoMonto) || pagoMonto <= 0) {
      throw new ValidationError('Monto y cliente son obligatorios y deben ser válidos');
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

      const { rows: cuentasPendientes } = await client.query(
        `SELECT cxc.id, cxc.venta_id, cxc.cliente_id, cxc.saldo_pendiente, cxc.estado, v.numero_factura 
         FROM cuentas_por_cobrar cxc 
         JOIN ventas v ON cxc.venta_id = v.id 
         WHERE cxc.cliente_id = $1 AND cxc.estado = 'pendiente' AND cxc.saldo_pendiente > 0 
         ORDER BY cxc.fecha_vencimiento ASC, cxc.id ASC 
         FOR UPDATE`,
        [clienteId]
      );

      if (cuentasPendientes.length === 0) {
        throw new ValidationError('El cliente no tiene facturas pendientes de pago');
      }

      const totalDeuda = cuentasPendientes.reduce((sum, c) => sum + parseFloat(c.saldo_pendiente), 0);
      if (pagoMonto > totalDeuda) {
        throw new ValidationError(`El monto abonado (C$${pagoMonto.toFixed(2)}) supera la deuda total pendiente del cliente (C$${totalDeuda.toFixed(2)})`);
      }

      let restante = pagoMonto;
      const pagosGenerados = [];

      for (const cuenta of cuentasPendientes) {
        if (restante <= 0) break;

        const saldoActual = parseFloat(cuenta.saldo_pendiente);
        const montoAplicar = Math.min(restante, saldoActual);
        const nuevoSaldo = parseFloat((saldoActual - montoAplicar).toFixed(2));
        const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'pendiente';

        await client.query(
          'UPDATE cuentas_por_cobrar SET saldo_pendiente = $1, estado = $2 WHERE id = $3',
          [nuevoSaldo, nuevoEstado, cuenta.id]
        );

        if (nuevoEstado === 'pagada') {
          await client.query("UPDATE ventas SET estado = 'pagada' WHERE id = $1", [cuenta.venta_id]);
        }

        let mataderoMovId = null;
        if (String(metodoPago).toLowerCase() === 'transferencia' && String(destinoDeposito).toLowerCase() === 'matadero') {
          const refMatadero = referencia ? String(referencia).trim() : `Abono Global CxC - ${cuenta.numero_factura || ('Cuenta #' + cuenta.id)}`;
          const { rows: movRows } = await client.query(
            `INSERT INTO matadero_movimientos 
              (tipo_movimiento, monto, moneda, tasa_cambio, monto_cordobas, banco, referencia, cliente_id, cuenta_id, usuario_id)
             VALUES ('deposito_cliente', $1, 'C$', 1.0000, $1, $2, $3, $4, $5, $6) RETURNING id`,
            [montoAplicar, banco, refMatadero, clienteId, cuenta.id, usuarioId]
          );
          mataderoMovId = movRows[0].id;
        }

        const { rows: pagoRows } = await client.query(
          'INSERT INTO pagos (cuenta_id, monto, usuario_id, metodo_pago, banco, referencia, matadero_movimiento_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [cuenta.id, montoAplicar, usuarioId, String(metodoPago).toLowerCase(), banco, referencia || null, mataderoMovId]
        );

        pagosGenerados.push(pagoRows[0]);
        restante = parseFloat((restante - montoAplicar).toFixed(2));
      }

      await client.query('COMMIT');
      return { pagos: pagosGenerados, monto_total_aplicado: pagoMonto };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new CxCService();
