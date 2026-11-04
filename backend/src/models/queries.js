const queries = {
  usuarios: {
    findByUsernameOrEmail: 'SELECT * FROM usuarios WHERE LOWER(usuario) = LOWER($1) OR LOWER(correo) = LOWER($1)'
  },
  clientes: {
    findAll: 'SELECT * FROM clientes ORDER BY id ASC',
    findById: 'SELECT * FROM clientes WHERE id = $1',
    create: 'INSERT INTO clientes (nombre, telefono, direccion, email, limite_credito, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    getClientSales: 'SELECT id, numero_factura, fecha, total, tipo_pago, estado FROM ventas WHERE cliente_id = $1 ORDER BY fecha DESC'
  },
  productos: {
    findAll: 'SELECT * FROM productos ORDER BY id ASC',
    findById: 'SELECT * FROM productos WHERE id = $1',
    create: 'INSERT INTO productos (nombre, presentacion, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    hasSales: 'SELECT id FROM detalle_venta WHERE producto_id = $1 LIMIT 1',
    delete: 'DELETE FROM productos WHERE id = $1 RETURNING *',
    getLowStock: 'SELECT * FROM productos WHERE activo = TRUE AND stock_actual <= stock_minimo ORDER BY stock_actual ASC',
    adjustStock: 'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2 RETURNING *',
    updateStock: 'UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2 RETURNING *'
  },
  cxc: {
    findAll: `SELECT 
      cxc.id,
      cxc.venta_id,
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
    ORDER BY cxc.id DESC`,
    insertPago: 'INSERT INTO pagos (cuenta_id, monto, usuario_id, metodo_pago, banco) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    getPagosByCuenta: 'SELECT id, cuenta_id, monto, fecha_pago, usuario_id, metodo_pago, banco FROM pagos WHERE cuenta_id = $1 ORDER BY fecha_pago ASC, id ASC',
    insertCxC: 'INSERT INTO cuentas_por_cobrar (venta_id, cliente_id, saldo_pendiente, fecha_vencimiento, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *'
  },
  ventas: {
    insertVenta: 'INSERT INTO ventas (numero_factura, cliente_id, usuario_id, total, tipo_pago, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    insertDetalle: 'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, descuento, subtotal) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    deductStock: 'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2 AND stock_actual >= $1 RETURNING *',
    findAll: `SELECT 
      v.id,
      v.numero_factura,
      v.cliente_id,
      c.nombre AS cliente_nombre,
      v.usuario_id,
      u.nombre AS usuario_nombre,
      v.fecha,
      v.total,
      v.tipo_pago,
      v.estado 
    FROM ventas v 
    JOIN clientes c ON v.cliente_id = c.id 
    JOIN usuarios u ON v.usuario_id = u.id 
    ORDER BY v.fecha DESC, v.id DESC`,
    findById: `SELECT 
      v.id,
      v.numero_factura,
      v.cliente_id,
      c.nombre AS cliente_nombre,
      c.telefono AS cliente_telefono,
      c.direccion AS cliente_direccion,
      v.usuario_id,
      u.nombre AS usuario_nombre,
      v.fecha,
      v.total,
      v.tipo_pago,
      v.estado 
    FROM ventas v 
    JOIN clientes c ON v.cliente_id = c.id 
    JOIN usuarios u ON v.usuario_id = u.id 
    WHERE v.id = $1`,
    getDetails: `SELECT 
      dv.id,
      dv.venta_id,
      dv.producto_id,
      p.nombre AS producto_nombre,
      dv.cantidad,
      dv.precio_unitario,
      dv.descuento,
      dv.subtotal 
    FROM detalle_venta dv 
    JOIN productos p ON dv.producto_id = p.id 
    WHERE dv.venta_id = $1 
    ORDER BY dv.id ASC`
  },
  dashboard: {
    getKpis: `SELECT 
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
    FROM productos WHERE activo = TRUE`
  }
};

module.exports = queries;
