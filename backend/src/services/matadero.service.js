const db = require('../config/db');
const { ValidationError, NotFoundError } = require('../utils/errors');

class MataderoService {
  async obtenerEstadoCuenta() {
    const { rows: movRows } = await db.query(`
      SELECT 
        m.id,
        m.fecha,
        m.tipo_movimiento,
        m.monto,
        m.moneda,
        m.tasa_cambio,
        COALESCE(m.monto_cordobas, CASE WHEN m.moneda = 'USD' THEN m.monto * COALESCE(m.tasa_cambio, 1) ELSE m.monto END) AS monto_cordobas,
        m.banco,
        m.referencia,
        m.cliente_id,
        c.nombre AS cliente_nombre,
        m.cuenta_id,
        m.usuario_id,
        u.nombre AS usuario_nombre,
        m.detalle_items
      FROM matadero_movimientos m
      LEFT JOIN clientes c ON m.cliente_id = c.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.fecha DESC, m.id DESC
    `);

    let totalCargos = 0;
    let totalDepositos = 0;
    let cantidadCargos = 0;
    let cantidadDepositos = 0;

    for (const mov of movRows) {
      const montoNio = parseFloat(mov.monto_cordobas || 0);
      if (['deuda_inicial', 'vale', 'remision'].includes(mov.tipo_movimiento)) {
        totalCargos = parseFloat((totalCargos + montoNio).toFixed(2));
        cantidadCargos++;
      } else if (['deposito_cliente', 'deposito_distribuidora'].includes(mov.tipo_movimiento)) {
        totalDepositos = parseFloat((totalDepositos + montoNio).toFixed(2));
        cantidadDepositos++;
      }
    }

    const saldoDeuda = parseFloat((totalCargos - totalDepositos).toFixed(2));

    return {
      resumen: {
        saldo_deuda: saldoDeuda,
        total_cargos: totalCargos,
        total_depositos: totalDepositos,
        cantidad_cargos: cantidadCargos,
        cantidad_depositos: cantidadDepositos
      },
      movimientos: movRows
    };
  }

  async registrarFacturaMatadero({ tipo_movimiento, referencia, items, monto_manual, usuarioId }) {
    const tipo = String(tipo_movimiento || '').toLowerCase().trim();
    if (!['vale', 'remision', 'deuda_inicial'].includes(tipo)) {
      throw new ValidationError('El tipo de documento debe ser vale, remision o deuda_inicial');
    }

    const ref = String(referencia || '').trim();
    if (!ref) {
      throw new ValidationError('El número de documento o referencia es obligatorio');
    }

    if (tipo === 'vale' && !ref.toUpperCase().startsWith('VALE-')) {
      throw new ValidationError('El número de documento para un Vale debe iniciar con el prefijo VALE-');
    }
    if (tipo === 'remision' && !ref.toUpperCase().startsWith('REMI-')) {
      throw new ValidationError('El número de documento para una Remisión debe iniciar con el prefijo REMI-');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let totalMonto = 0;
      const detalleProcesado = [];

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const cant = parseFloat(item.cantidad);
          if (isNaN(cant) || cant <= 0) {
            throw new ValidationError('Cada producto en la factura de matadero debe tener una cantidad mayor a 0 lb');
          }

          if (item.es_nuevo) {
            const nombreNuevo = String(item.nombre || '').trim();
            const pCompra = parseFloat(item.precio_compra);
            const pVenta = parseFloat(item.precio_venta);

            if (!nombreNuevo || isNaN(pCompra) || isNaN(pVenta) || pCompra <= 0) {
              throw new ValidationError('Datos incompletos para el nuevo producto cárnico');
            }
            if (pVenta < pCompra) {
              throw new ValidationError(`El precio de venta de "${nombreNuevo}" no puede ser menor al precio de compra`);
            }

            const { rows: existingProd } = await client.query(
              'SELECT id FROM productos WHERE LOWER(TRIM(nombre)) = LOWER($1)',
              [nombreNuevo]
            );
            if (existingProd.length > 0) {
              throw new ValidationError(`El producto "${nombreNuevo}" ya existe en el catálogo. Debe seleccionarlo de la lista para ingresar stock.`);
            }

            const { rows: newProdRows } = await client.query(
              'INSERT INTO productos (nombre, presentacion, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, activo) VALUES ($1, $2, $3, $4, $5, $6, 5.00, TRUE) RETURNING *',
              [nombreNuevo, 'Empaque estándar', 'lb', pCompra, pVenta, cant]
            );
            const prodCreado = newProdRows[0];
            const subtotalItem = parseFloat((cant * pCompra).toFixed(2));
            totalMonto = parseFloat((totalMonto + subtotalItem).toFixed(2));

            detalleProcesado.push({
              producto_id: prodCreado.id,
              nombre: prodCreado.nombre,
              cantidad: cant,
              costo_unitario: pCompra,
              subtotal: subtotalItem
            });
          } else {
            const prodId = parseInt(item.producto_id, 10);
            if (!prodId) {
              throw new ValidationError('Debe seleccionar un producto válido');
            }

            const { rows: prodRows } = await client.query(
              'SELECT * FROM productos WHERE id = $1 FOR UPDATE',
              [prodId]
            );
            if (prodRows.length === 0) {
              throw new NotFoundError(`Producto con ID ${prodId} no encontrado`);
            }

            const prod = prodRows[0];
            const stockActual = parseFloat(prod.stock_actual);
            const costoActual = parseFloat(prod.precio_compra);
            const stockNuevo = cant;
            const costoNuevo = item.costo_unitario !== undefined && !isNaN(parseFloat(item.costo_unitario)) && parseFloat(item.costo_unitario) > 0
              ? parseFloat(item.costo_unitario)
              : costoActual;

            let nuevoCosto = costoNuevo;
            if (stockActual + stockNuevo > 0) {
              nuevoCosto = ((stockActual * costoActual) + (stockNuevo * costoNuevo)) / (stockActual + stockNuevo);
            }
            nuevoCosto = parseFloat(nuevoCosto.toFixed(2));

            if (nuevoCosto > parseFloat(prod.precio_venta)) {
              throw new ValidationError(`El costo promedio ponderado calculado (C$${nuevoCosto}) para "${prod.nombre}" supera su precio de venta actual (C$${prod.precio_venta})`);
            }

            await client.query(
              'UPDATE productos SET stock_actual = stock_actual + $1, precio_compra = $2 WHERE id = $3',
              [cant, nuevoCosto, prodId]
            );

            const subtotalItem = parseFloat((cant * costoNuevo).toFixed(2));
            totalMonto = parseFloat((totalMonto + subtotalItem).toFixed(2));

            detalleProcesado.push({
              producto_id: prod.id,
              nombre: prod.nombre,
              cantidad: cant,
              costo_unitario: costoNuevo,
              subtotal: subtotalItem
            });
          }
        }
      }

      if (monto_manual !== undefined && !isNaN(parseFloat(monto_manual)) && parseFloat(monto_manual) > 0) {
        totalMonto = parseFloat(parseFloat(monto_manual).toFixed(2));
      }

      if (totalMonto <= 0) {
        throw new ValidationError('El monto total del documento de matadero debe ser mayor a C$0.00');
      }

      const { rows: movRows } = await client.query(
        `INSERT INTO matadero_movimientos 
          (tipo_movimiento, monto, moneda, tasa_cambio, monto_cordobas, monto_original, referencia, usuario_id, detalle_items, productos_json) 
         VALUES ($1, $2, 'C$', 1.0000, $3, $3, $4, $5, $6, $6) RETURNING *`,
        [tipo, totalMonto, totalMonto, ref, usuarioId, JSON.stringify(detalleProcesado)]
      );

      await client.query('COMMIT');

      return {
        movimiento: movRows[0],
        items_ingresados: detalleProcesado,
        monto_total: totalMonto
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async registrarDeposito({ monto, moneda, tasa_cambio, banco, referencia, quien_deposito, cliente_id, cuenta_id, usuarioId }) {
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      throw new ValidationError('El monto del depósito debe ser mayor a 0');
    }

    const mon = String(moneda || 'C$').toUpperCase() === 'USD' ? 'USD' : 'C$';
    let tasa = 1.0;

    if (mon === 'USD') {
      tasa = parseFloat(tasa_cambio);
      if (isNaN(tasa) || tasa <= 0) {
        throw new ValidationError('Debe ingresar una tasa de cambio válida para depósitos en dólares (USD)');
      }
    }

    const bancoStr = String(banco || '').trim();
    const refStr = String(referencia || '').trim();
    if (!bancoStr || !refStr) {
      throw new ValidationError('El banco y el número de referencia son obligatorios');
    }

    const origen = String(quien_deposito || 'distribuidora').toLowerCase();
    const esCliente = origen === 'cliente' || origen === 'deposito_cliente';
    const tipoMovimiento = esCliente ? 'deposito_cliente' : 'deposito_distribuidora';
    const montoCordobas = parseFloat((montoNum * tasa).toFixed(2));

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let clienteIdVal = null;
      let cuentaIdPrincipal = null;
      const cuentasAfectadas = [];

      if (esCliente) {
        clienteIdVal = parseInt(cliente_id, 10);
        if (!clienteIdVal) {
          throw new ValidationError('Debe seleccionar el cliente que realizó el depósito al matadero');
        }

        const { rows: cxcRows } = await client.query(
          `SELECT * FROM cuentas_por_cobrar 
           WHERE cliente_id = $1 AND LOWER(estado) = 'pendiente' AND saldo_pendiente > 0 
           ORDER BY CASE WHEN id = $2 THEN 0 ELSE 1 END, fecha_vencimiento ASC, id ASC 
           FOR UPDATE`,
          [clienteIdVal, parseInt(cuenta_id, 10) || 0]
        );

        if (cxcRows.length === 0) {
          throw new ValidationError('El cliente seleccionado no tiene cuentas por cobrar pendientes');
        }

        const deudaTotalCliente = cxcRows.reduce((acc, r) => acc + parseFloat(r.saldo_pendiente), 0);
        if (montoCordobas > parseFloat(deudaTotalCliente.toFixed(2))) {
          throw new ValidationError(
            `El monto depositado (C$${montoCordobas.toFixed(2)}) supera la deuda total pendiente del cliente (C$${deudaTotalCliente.toFixed(2)})`
          );
        }

        cuentaIdPrincipal = cxcRows[0].id;

        const { rows: movRows } = await client.query(
          `INSERT INTO matadero_movimientos 
            (tipo_movimiento, monto, moneda, tasa_cambio, monto_cordobas, banco, referencia, cliente_id, cuenta_id, usuario_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [tipoMovimiento, montoNum, mon, tasa, montoCordobas, bancoStr, refStr, clienteIdVal, cuentaIdPrincipal, usuarioId]
        );
        const movCreado = movRows[0];

        let remanente = montoCordobas;

        for (const cuenta of cxcRows) {
          if (remanente <= 0) break;
          const saldoCuenta = parseFloat(cuenta.saldo_pendiente);
          const abonoCuenta = parseFloat(Math.min(saldoCuenta, remanente).toFixed(2));
          const nuevoSaldo = parseFloat((saldoCuenta - abonoCuenta).toFixed(2));
          const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'pendiente';

          await client.query(
            'UPDATE cuentas_por_cobrar SET saldo_pendiente = $1, estado = $2 WHERE id = $3',
            [nuevoSaldo, nuevoEstado, cuenta.id]
          );

          if (nuevoEstado === 'pagada') {
            await client.query(
              "UPDATE ventas SET estado = 'pagada' WHERE id = $1",
              [cuenta.venta_id]
            );
          }

          await client.query(
            'INSERT INTO pagos (cuenta_id, monto, usuario_id, metodo_pago, banco, referencia, matadero_movimiento_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [cuenta.id, abonoCuenta, usuarioId, 'transferencia', `${bancoStr} (Depósito Matadero Ref: ${refStr})`, refStr, movCreado.id]
          );

          cuentasAfectadas.push({
            cuenta_id: cuenta.id,
            venta_id: cuenta.venta_id,
            abono: abonoCuenta,
            nuevo_saldo: nuevoSaldo,
            estado: nuevoEstado
          });

          remanente = parseFloat((remanente - abonoCuenta).toFixed(2));
        }

        await client.query('COMMIT');

        return {
          movimiento: movCreado,
          monto_cordobas: montoCordobas,
          cuentas_afectadas: cuentasAfectadas
        };
      } else {
        const { rows: movRows } = await client.query(
          `INSERT INTO matadero_movimientos 
            (tipo_movimiento, monto, moneda, tasa_cambio, monto_cordobas, banco, referencia, usuario_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [tipoMovimiento, montoNum, mon, tasa, montoCordobas, bancoStr, refStr, usuarioId]
        );

        await client.query('COMMIT');

        return {
          movimiento: movRows[0],
          monto_cordobas: montoCordobas,
          cuentas_afectadas: []
        };
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async obtenerDocumentos(soloMios, usuarioId) {
    let query = `
      SELECT 
        m.id, 
        m.fecha, 
        m.referencia AS no_documento, 
        m.tipo_movimiento AS tipo, 
        m.monto_original AS total_cs, 
        u.nombre AS registrado_por, 
        m.productos_json AS productos_recibidos 
      FROM matadero_movimientos m 
      JOIN usuarios u ON m.usuario_id = u.id 
      WHERE m.tipo_movimiento IN ('vale', 'remision')
    `;
    const params = [];

    if ((soloMios === 'true' || soloMios === true) && usuarioId) {
      params.push(usuarioId);
      query += ` AND m.usuario_id = $${params.length}`;
    }

    query += ' ORDER BY m.fecha DESC, m.id DESC;';

    const { rows } = await db.query(query, params);
    return rows.map(r => ({
      ...r,
      numero_documento: r.no_documento,
      total_cordobas: r.total_cs,
      detalle_items: r.productos_recibidos
    }));
  }

  async listarDocumentos(opts = {}) {
    const soloMios = opts.soloMios || (opts.solo_mios === 'true');
    const usuarioId = opts.usuarioId;
    return this.obtenerDocumentos(soloMios, usuarioId);
  }
}

module.exports = new MataderoService();
