const db = require('../config/db');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

class VentasService {
  async crearVenta({ clienteId, usuarioId, tipoPago, items, diasCredito = 15, descuentoGlobal = 0 }) {
    if (!clienteId || !usuarioId || !tipoPago || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Datos de la venta incompletos o inválidos');
    }

    if (!['contado', 'credito'].includes(tipoPago)) {
      throw new ValidationError('El tipo de pago debe ser contado o credito');
    }

    const descManual = parseFloat(descuentoGlobal || 0);
    if (isNaN(descManual) || descManual < 0) {
      throw new ValidationError('El monto de descuento manual no puede ser negativo');
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      let cliente;
      const esConsumidorFinal = String(clienteId).toLowerCase() === 'cf' || String(clienteId).toLowerCase() === 'consumidor_final' || clienteId === 0;

      if (esConsumidorFinal) {
        if (tipoPago === 'credito') {
          throw new ValidationError('El Consumidor Final no puede realizar compras al crédito');
        }
        const { rows: cfRows } = await client.query("SELECT * FROM clientes WHERE nombre ILIKE '%Consumidor Final%' LIMIT 1");
        if (cfRows.length > 0) {
          cliente = cfRows[0];
          clienteId = cliente.id;
        } else {
          const { rows: newCf } = await client.query(
            'INSERT INTO clientes (nombre, telefono, direccion, email, limite_credito, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            ['Consumidor Final', 'N/A', 'Mostrador Mercado Mayoreo', 'cf@carnessanmartin.com', 0, true]
          );
          cliente = newCf[0];
          clienteId = cliente.id;
        }
      } else {
        const { rows: clienteRows } = await client.query('SELECT * FROM clientes WHERE id = $1', [clienteId]);
        if (clienteRows.length === 0) {
          throw new NotFoundError('Cliente no encontrado');
        }
        cliente = clienteRows[0];
        if (!cliente.activo) {
          throw new ValidationError('El cliente seleccionado se encuentra inactivo');
        }
      }

      const productTotals = {};
      for (const item of items) {
        const prodId = parseInt(item.producto_id, 10);
        const qty = parseFloat(item.cantidad);
        if (!prodId || isNaN(qty) || qty <= 0) {
          throw new ValidationError('Cantidad y producto inválidos en los items');
        }
        productTotals[prodId] = (productTotals[prodId] || 0) + qty;
      }

      let subtotalOrden = 0;
      const verifiedItems = [];

      for (const item of items) {
        const prodId = parseInt(item.producto_id, 10);
        const qty = parseFloat(item.cantidad);

        const { rows: prodRows } = await client.query(
          'SELECT id, nombre, precio_venta, stock_actual, stock_minimo, activo FROM productos WHERE id = $1 FOR UPDATE',
          [prodId]
        );

        if (prodRows.length === 0) {
          throw new NotFoundError(`Producto con ID ${prodId} no existe`);
        }

        const prod = prodRows[0];
        if (!prod.activo) {
          throw new ValidationError(`El producto "${prod.nombre}" no está activo`);
        }

        const totalQtyForProd = productTotals[prodId];
        const stockActual = parseFloat(prod.stock_actual);
        if (stockActual < totalQtyForProd) {
          throw new ValidationError(
            `Stock insuficiente para ${prod.nombre}. Disponible: ${prod.stock_actual} lb, Solicitado: ${totalQtyForProd.toFixed(2)} lb`
          );
        }

        const price = parseFloat(item.precio_unitario || prod.precio_venta);
        const subtotalFila = parseFloat((qty * price).toFixed(2));
        subtotalOrden = parseFloat((subtotalOrden + subtotalFila).toFixed(2));

        verifiedItems.push({
          producto_id: prod.id,
          nombre: prod.nombre,
          cantidad: qty,
          precio_unitario: price,
          descuento: 0,
          subtotal: subtotalFila
        });
      }

      if (descManual > subtotalOrden) {
        throw new ValidationError('El descuento no puede superar el subtotal de la venta');
      }

      const calculatedTotal = parseFloat(Math.max(0, subtotalOrden - descManual).toFixed(2));

      if (tipoPago === 'credito') {
        const { rows: cxcRows } = await client.query(
          "SELECT COALESCE(SUM(saldo_pendiente), 0) AS deuda_actual FROM cuentas_por_cobrar WHERE cliente_id = $1 AND LOWER(estado) = 'pendiente'",
          [clienteId]
        );
        const deudaActual = parseFloat(cxcRows[0]?.deuda_actual || 0);
        const limite = parseFloat(cliente.limite_credito || 0);
        const disponible = Math.max(0, limite - deudaActual);

        if (calculatedTotal > disponible) {
          throw new ValidationError(
            `Límite de crédito excedido. Disponible: C$${disponible.toFixed(2)}, Deuda Actual: C$${deudaActual.toFixed(2)}, Venta Solicitada: C$${calculatedTotal.toFixed(2)}`
          );
        }
      }

      const estadoVenta = tipoPago === 'credito' ? 'pendiente' : 'pagada';

      const { rows: statsRows } = await client.query(
        'SELECT COALESCE(MAX(id), 0) AS max_id, COUNT(*) AS count_rows FROM ventas'
      );
      const { rows: maxRows } = await client.query(
        "SELECT numero_factura FROM ventas WHERE numero_factura LIKE 'FAC-%' ORDER BY id DESC LIMIT 1"
      );
      let nextNum = 1;
      if (maxRows.length > 0 && maxRows[0].numero_factura) {
        const match = maxRows[0].numero_factura.match(/FAC-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      const maxId = parseInt(statsRows[0]?.max_id || 0, 10) + 1;
      const countId = parseInt(statsRows[0]?.count_rows || 0, 10) + 1;
      const resolvedNum = Math.max(nextNum, maxId, countId);
      const numeroFactura = `FAC-${String(resolvedNum).padStart(6, '0')}`;

      const { rows: ventaRows } = await client.query(
        'INSERT INTO ventas (numero_factura, cliente_id, usuario_id, subtotal, descuento, total, tipo_pago, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [numeroFactura, clienteId, usuarioId, subtotalOrden, descManual, calculatedTotal, tipoPago, estadoVenta]
      );
      const nuevaVenta = ventaRows[0];

      const alertasStock = [];

      for (const it of verifiedItems) {
        await client.query(
          'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, descuento, subtotal) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [nuevaVenta.id, it.producto_id, it.cantidad, it.precio_unitario, it.descuento, it.subtotal]
        );

        const resDeduct = await client.query(
          'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2 AND stock_actual >= $1 RETURNING *',
          [it.cantidad, it.producto_id]
        );
        if (resDeduct.rowCount === 0) {
          throw new ValidationError(`Stock insuficiente para ${it.nombre}. Disponible: 0 lb`);
        }

        const prodActualizado = resDeduct.rows[0];
        if (parseFloat(prodActualizado.stock_actual) <= 5.00) {
          alertasStock.push({
            producto_id: prodActualizado.id,
            nombre: prodActualizado.nombre,
            stock_actual: parseFloat(prodActualizado.stock_actual),
            stock_minimo: 5.00
          });
        }
      }

      if (tipoPago === 'credito') {
        const plazo = parseInt(diasCredito, 10) || 15;
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + plazo);

        await client.query(
          'INSERT INTO cuentas_por_cobrar (venta_id, cliente_id, saldo_pendiente, fecha_vencimiento, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [nuevaVenta.id, clienteId, calculatedTotal, fechaVencimiento.toISOString(), 'pendiente']
        );
      }

      await client.query('COMMIT');

      return {
        venta: nuevaVenta,
        items: verifiedItems,
        subtotal: subtotalOrden,
        descuento_total: descManual,
        total: calculatedTotal,
        numero_factura: nuevaVenta.numero_factura,
        alertas_stock: alertasStock
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listarVentas(user) {
    const isVendedor = user && String(user.rol || '').toLowerCase() === 'vendedor';
    const params = [];
    let whereClause = '';

    if (isVendedor) {
      params.push(user.id);
      whereClause = 'WHERE v.usuario_id = $1';
    }

    const { rows } = await db.query(`
      SELECT 
        v.id,
        v.numero_factura,
        v.cliente_id,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono,
        v.usuario_id,
        u.nombre AS usuario_nombre,
        v.fecha,
        COALESCE(v.subtotal, v.total + COALESCE(v.descuento, 0)) AS subtotal,
        COALESCE(v.descuento, 0) AS descuento,
        v.total,
        v.tipo_pago,
        v.estado 
      FROM ventas v 
      JOIN clientes c ON v.cliente_id = c.id 
      JOIN usuarios u ON v.usuario_id = u.id 
      ${whereClause}
      ORDER BY v.fecha DESC, v.id DESC
    `, params);
    return rows;
  }

  async obtenerVentaPorId(id, user) {
    const { rows: ventaRows } = await db.query(`
      SELECT 
        v.id,
        v.numero_factura,
        v.cliente_id,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono,
        c.direccion AS cliente_direccion,
        c.email AS cliente_email,
        v.usuario_id,
        u.nombre AS usuario_nombre,
        u.rol AS usuario_rol,
        v.fecha,
        COALESCE(v.subtotal, v.total + COALESCE(v.descuento, 0)) AS subtotal,
        COALESCE(v.descuento, 0) AS descuento,
        v.total,
        v.tipo_pago,
        v.estado 
      FROM ventas v 
      JOIN clientes c ON v.cliente_id = c.id 
      JOIN usuarios u ON v.usuario_id = u.id 
      WHERE v.id = $1
    `, [id]);

    if (ventaRows.length === 0) {
      throw new NotFoundError('Factura no encontrada');
    }

    const venta = ventaRows[0];
    if (user && String(user.rol || '').toLowerCase() === 'vendedor' && Number(venta.usuario_id) !== Number(user.id)) {
      throw new ForbiddenError('No tiene permiso para visualizar facturas emitidas por otro vendedor');
    }

    const { rows: detalleRows } = await db.query(`
      SELECT 
        dv.id,
        dv.venta_id,
        dv.producto_id,
        p.nombre AS producto_nombre,
        p.unidad_medida,
        dv.cantidad,
        dv.precio_unitario,
        dv.descuento,
        dv.subtotal 
      FROM detalle_venta dv 
      JOIN productos p ON dv.producto_id = p.id 
      WHERE dv.venta_id = $1 
      ORDER BY dv.id ASC
    `, [id]);

    return {
      ...venta,
      items: detalleRows
    };
  }

  async obtenerReportes({ desde, hasta }) {
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

    const { rows } = await db.query(`
      SELECT 
        p.id AS producto_id,
        p.nombre AS producto_nombre,
        COALESCE(SUM(dv.cantidad), 0) AS cantidad_vendida,
        dv.precio_unitario,
        p.precio_compra,
        COALESCE(SUM(dv.subtotal), 0) AS total_cobrado,
        COALESCE(SUM(dv.subtotal - (dv.cantidad * p.precio_compra)), 0) AS ganancia_neta
      FROM detalle_venta dv
      JOIN productos p ON dv.producto_id = p.id
      JOIN ventas v ON dv.venta_id = v.id
      WHERE v.estado != 'anulada' ${dateFilter}
      GROUP BY p.id, p.nombre, dv.precio_unitario, p.precio_compra
      ORDER BY total_cobrado DESC
    `, params);

    const { rows: cxcRows } = await db.query(`
      SELECT 
        cxc.id AS cuenta_id,
        cxc.venta_id,
        v.numero_factura,
        cl.id AS cliente_id,
        cl.nombre AS cliente_nombre,
        cl.telefono AS cliente_telefono,
        v.fecha AS fecha_venta,
        cxc.fecha_vencimiento,
        v.total AS monto_original,
        cxc.saldo_pendiente,
        cxc.estado,
        GREATEST(0, (CURRENT_DATE - DATE(cxc.fecha_vencimiento))) AS dias_mora,
        CASE 
          WHEN DATE(cxc.fecha_vencimiento) < CURRENT_DATE THEN TRUE
          ELSE FALSE
        END AS es_moroso
      FROM cuentas_por_cobrar cxc
      JOIN clientes cl ON cxc.cliente_id = cl.id
      JOIN ventas v ON cxc.venta_id = v.id
      WHERE LOWER(cxc.estado) = 'pendiente' AND cxc.saldo_pendiente > 0
      ORDER BY es_moroso DESC, cxc.fecha_vencimiento ASC
    `);

    const productos = rows || [];
    const cuentasPorCobrar = cxcRows || [];
    const totalVendido = productos.reduce((acc, r) => acc + parseFloat(r.total_cobrado || 0), 0);
    const gananciaNeta = productos.reduce((acc, r) => acc + parseFloat(r.ganancia_neta || 0), 0);
    const totalCxcPendiente = cuentasPorCobrar.reduce((acc, c) => acc + parseFloat(c.saldo_pendiente || 0), 0);
    const clientesMorosos = cuentasPorCobrar.filter(c => c.es_moroso);

    return {
      total_vendido: totalVendido,
      ganancia_neta: gananciaNeta,
      total_cxc_pendiente: totalCxcPendiente,
      total_morosos: clientesMorosos.length,
      productos,
      cuentas_por_cobrar: cuentasPorCobrar
    };
  }
}

module.exports = new VentasService();
