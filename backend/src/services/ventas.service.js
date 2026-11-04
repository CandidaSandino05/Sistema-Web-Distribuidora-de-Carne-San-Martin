const db = require('../config/db');
const queries = require('../models/queries');
const { ValidationError, NotFoundError } = require('../utils/errors');

class VentasService {
  async crearVenta({ clienteId, usuarioId, tipoPago, items, diasCredito = 15 }) {
    if (!clienteId || !usuarioId || !tipoPago || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Datos de la venta incompletos o inválidos');
    }

    if (!['contado', 'credito'].includes(tipoPago)) {
      throw new ValidationError('El tipo de pago debe ser contado o credito');
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
        const { rows: cfRows } = await client.query('SELECT * FROM clientes WHERE nombre ILIKE \'%Consumidor Final%\' LIMIT 1');
        if (cfRows.length > 0) {
          cliente = cfRows[0];
          clienteId = cliente.id;
        } else {
          const { rows: newCf } = await client.query(
            'INSERT INTO clientes (nombre, telefono, direccion, email, limite_credito, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            ['Consumidor Final', 'N/A', 'Mostrador Nandaime', 'cf@carnessanmartin.com', 0, true]
          );
          cliente = newCf[0];
          clienteId = cliente.id;
        }
      } else {
        const { rows: clienteRows } = await client.query(queries.clientes.findById, [clienteId]);
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

      let calculatedTotal = 0;
      const verifiedItems = [];

      for (const item of items) {
        const prodId = parseInt(item.producto_id, 10);
        const qty = parseFloat(item.cantidad);
        const desc = parseFloat(item.descuento || 0);

        const { rows: prodRows } = await client.query(
          'SELECT id, nombre, precio_venta, stock_actual, activo FROM productos WHERE id = $1 FOR UPDATE',
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
            `Stock insuficiente para ${prod.nombre}. Disponible: ${prod.stock_actual} lb`
          );
        }

        const price = parseFloat(item.precio_unitario || prod.precio_venta);
        const subtotal = Math.max(0, qty * price - desc);
        calculatedTotal += subtotal;

        verifiedItems.push({
          producto_id: prod.id,
          nombre: prod.nombre,
          cantidad: qty,
          precio_unitario: price,
          descuento: desc,
          subtotal
        });
      }

      if (tipoPago === 'credito') {
        const { rows: cxcRows } = await client.query(
          'SELECT COALESCE(SUM(saldo_pendiente), 0) AS deuda_actual FROM cuentas_por_cobrar WHERE cliente_id = $1 AND LOWER(estado) = \'pendiente\'',
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
        queries.ventas.insertVenta,
        [numeroFactura, clienteId, usuarioId, calculatedTotal, tipoPago, estadoVenta]
      );
      const nuevaVenta = ventaRows[0];

      for (const it of verifiedItems) {
        await client.query(
          queries.ventas.insertDetalle,
          [nuevaVenta.id, it.producto_id, it.cantidad, it.precio_unitario, it.descuento, it.subtotal]
        );

        const resDeduct = await client.query(
          queries.ventas.deductStock,
          [it.cantidad, it.producto_id]
        );
        if (resDeduct.rowCount === 0) {
          throw new ValidationError(`Stock insuficiente para ${it.nombre}. Disponible: 0 lb`);
        }
      }

      if (tipoPago === 'credito') {
        const plazo = parseInt(diasCredito, 10) || 15;
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + plazo);

        await client.query(
          queries.cxc.insertCxC,
          [nuevaVenta.id, clienteId, calculatedTotal, fechaVencimiento.toISOString(), 'PENDIENTE']
        );
      }

      await client.query('COMMIT');

      return {
        venta: nuevaVenta,
        items: verifiedItems,
        total: calculatedTotal,
        numero_factura: nuevaVenta.numero_factura
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listarVentas() {
    const { rows } = await db.query(queries.ventas.findAll);
    return rows;
  }

  async obtenerVentaPorId(id) {
    const { rows: ventaRows } = await db.query(queries.ventas.findById, [id]);
    if (ventaRows.length === 0) {
      throw new NotFoundError('Venta no encontrada');
    }

    const { rows: detalleRows } = await db.query(queries.ventas.getDetails, [id]);

    return {
      ...ventaRows[0],
      items: detalleRows
    };
  }
}

module.exports = new VentasService();
