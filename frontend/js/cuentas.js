const API_URL = 'https://sistema-web-distribuidora-de-carne-san.onrender.com/api';

const token = localStorage.getItem('san_martin_token');
const userStr = localStorage.getItem('san_martin_user');

if (!token || !userStr) {
  window.location.href = './login.html';
}

const user = JSON.parse(userStr || '{}');
const userRole = (user.rol || '').toLowerCase();

const canRegisterPayment = userRole === 'vendedor';

const navDashboard = document.getElementById('navDashboardLink');
const navInventario = document.getElementById('navInventarioLink');
const navMatadero = document.getElementById('navMataderoLink');
const navReportes = document.getElementById('navReportesLink');
const navVentas = document.getElementById('navVentasLink');
const navFacturas = document.getElementById('navFacturasLink');
const navClientes = document.getElementById('navClientesLink');
const navCxc = document.getElementById('navCxcLink');
const navMermas = document.getElementById('navMermasLink');
const cxcSummaryGrid = document.getElementById('cxcSummaryGrid');

if (userRole === 'administrador') {
  if (navDashboard) navDashboard.style.display = 'flex';
  if (navInventario) navInventario.style.display = 'flex';
  if (navMatadero) navMatadero.style.display = 'flex';
  if (navMermas) navMermas.style.display = 'flex';
  if (navReportes) navReportes.style.display = 'flex';
  if (navVentas) navVentas.style.display = 'none';
  if (navFacturas) navFacturas.style.display = 'flex';
  if (navClientes) navClientes.style.display = 'flex';
  if (navCxc) navCxc.style.display = 'flex';
  if (cxcSummaryGrid) cxcSummaryGrid.style.display = 'grid';
} else if (userRole === 'gerente') {
  if (navDashboard) navDashboard.style.display = 'none';
  if (navInventario) navInventario.style.display = 'flex';
  if (navMatadero) navMatadero.style.display = 'none';
  if (navReportes) navReportes.style.display = 'none';
  if (navVentas) navVentas.style.display = 'none';
  if (navFacturas) navFacturas.style.display = 'flex';
  if (navClientes) navClientes.style.display = 'flex';
  if (navCxc) navCxc.style.display = 'flex';
  if (cxcSummaryGrid) cxcSummaryGrid.style.display = 'grid';
} else if (userRole === 'vendedor') {
  if (navDashboard) navDashboard.style.display = 'none';
  if (navInventario) navInventario.style.display = 'none';
  if (navMatadero) navMatadero.style.display = 'none';
  if (navReportes) navReportes.style.display = 'none';
  if (navVentas) navVentas.style.display = 'flex';
  if (navFacturas) navFacturas.style.display = 'flex';
  if (navClientes) navClientes.style.display = 'none';
  if (navCxc) navCxc.style.display = 'flex';
  if (cxcSummaryGrid) cxcSummaryGrid.style.display = 'none';
}

const userNameEl = document.getElementById('userName');
if (userNameEl) {
  userNameEl.textContent = user.nombre || 'Usuario';
}

const userRoleEl = document.getElementById('userRole');
if (userRoleEl) {
  userRoleEl.textContent = (user.rol || 'usuario').toUpperCase() + (canRegisterPayment ? '' : ' (SOLO LECTURA)');
}

const userAvatarEl = document.getElementById('userAvatar');
if (userAvatarEl) {
  userAvatarEl.textContent = (user.nombre || 'U').charAt(0).toUpperCase();
}

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('san_martin_token');
    localStorage.removeItem('san_martin_user');
    window.location.href = './login.html';
  });
}

const btnToggle = document.getElementById('btnToggleSidebar');
const sidebar = document.getElementById('appSidebar');
const backdrop = document.getElementById('sidebarBackdrop');

if (btnToggle && sidebar) {
  btnToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active');
  });
}
if (backdrop && sidebar) {
  backdrop.addEventListener('click', () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('active');
  });
}

const toastEl = document.getElementById('toast');
function showToast(message, isError = false) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = 'toast show ' + (isError ? 'toast-error' : 'toast-success');
  setTimeout(() => {
    if (toastEl) toastEl.className = 'toast';
  }, 3500);
}

const nioFormatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
function formatMoney(amount) {
  return nioFormatter.format(parseFloat(amount || 0));
}

function formatDate(isoDate) {
  if (!isoDate) return '-';
  return new Date(isoDate).toLocaleDateString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatDateTime(isoDate) {
  if (!isoDate) return '-';
  return new Date(isoDate).toLocaleString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('open');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('open');
}

window.openModal = openModal;
window.closeModal = closeModal;

let clientesGlobal = [];
let clientesCxcList = [];
let currentFilterStatus = userRole === 'vendedor' ? 'pendiente' : 'todas';
let activeClientDetail = null;

if (userRole === 'vendedor') {
  const btnTodas = document.getElementById('btnStatusTodas');
  const btnPend = document.getElementById('btnStatusPendiente');
  if (btnTodas) btnTodas.classList.remove('active');
  if (btnPend) btnPend.classList.add('active');
}

async function loadCuentas() {
  const tableBody = document.getElementById('cxcTableBody');
  const timestamp = Date.now();
  try {
    const res = await fetch(`${API_BASE_URL}/cuentas-por-cobrar/agrupadas?_t=${timestamp}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = './login.html';
      return;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || 'Error al cargar cartera de clientes');
    }

    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.error || 'Respuesta inválida del servidor');
    }

    clientesGlobal = json.data;
    clientesCxcList = clientesGlobal;
    renderizarTabla(currentFilterStatus);
    updateStats(clientesGlobal);
  } catch (err) {
    clientesGlobal = [];
    clientesCxcList = [];
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-danger, #ef4444); padding: 2.5rem;">${err.message || 'Error del servidor'}</td></tr>`;
    }
    showToast(err.message || 'Error al cargar cuentas', true);
    updateStats([]);
  }
}

function updateStats(list) {
  if (userRole === 'vendedor') return;

  let pendienteTotal = 0;
  let countConDeuda = 0;
  let countAlDia = 0;

  if (Array.isArray(list)) {
    list.forEach(c => {
      const deuda = parseFloat(c.total_deuda || 0);
      const facPend = parseInt(c.facturas_pendientes || 0, 10);
      const facPag = parseInt(c.facturas_pagadas || 0, 10);
      if (facPend > 0) {
        pendienteTotal += deuda;
        countConDeuda++;
      } else if (facPend === 0 && facPag > 0) {
        countAlDia++;
      }
    });
  }

  const statCartera = document.getElementById('statCarteraPendiente');
  if (statCartera) statCartera.textContent = formatMoney(pendienteTotal);
  const statPendientes = document.getElementById('statCuentasPendientes');
  if (statPendientes) statPendientes.textContent = countConDeuda;
  const statPagadas = document.getElementById('statCuentasPagadas');
  if (statPagadas) statPagadas.textContent = countAlDia;
}

const statusButtons = document.querySelectorAll('.filter-pill-btn[data-status]');
statusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    statusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilterStatus = btn.getAttribute('data-status');
    renderizarTabla(currentFilterStatus);
  });
});

const btnFiltrarCxc = document.getElementById('btnFiltrarCxc');
if (btnFiltrarCxc) {
  btnFiltrarCxc.addEventListener('click', () => renderizarTabla(currentFilterStatus));
}

const btnLimpiarCxc = document.getElementById('btnLimpiarCxc');
if (btnLimpiarCxc) {
  btnLimpiarCxc.addEventListener('click', () => {
    const d = document.getElementById('cxcDesde');
    const h = document.getElementById('cxcHasta');
    if (d) d.value = '';
    if (h) h.value = '';
    currentFilterStatus = userRole === 'vendedor' ? 'pendiente' : 'todas';
    statusButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-status') === currentFilterStatus));
    renderizarTabla(currentFilterStatus);
  });
}

function applyFilters() {
  renderizarTabla(currentFilterStatus);
}

function renderizarTabla(filtro) {
  const tableBody = document.getElementById('cxcTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  const fNorm = String(filtro || 'todas').toLowerCase();
  let filtered = [...clientesGlobal];

  if (fNorm === 'pendiente' || fNorm === 'pendientes') {
    filtered = filtered.filter(c => parseInt(c.facturas_pendientes || 0, 10) > 0);
  } else if (fNorm === 'pagada' || fNorm === 'pagadas') {
    filtered = filtered.filter(c => parseInt(c.facturas_pendientes || 0, 10) === 0 && parseInt(c.facturas_pagadas || 0, 10) > 0);
  } else {
    filtered = filtered.filter(c => (parseInt(c.facturas_pendientes || 0, 10) + parseInt(c.facturas_pagadas || 0, 10)) > 0);
  }

  renderCuentas(filtered);
}

window.renderizarTabla = renderizarTabla;

function renderCuentas(list) {
  const tableBody = document.getElementById('cxcTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!list || list.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2.5rem;">No hay clientes en esta vista.</td></tr>';
    return;
  }

  tableBody.innerHTML = list.map(c => {
    const deudaNum = parseFloat(c.total_deuda || 0);
    const facPendientes = parseInt(c.facturas_pendientes || 0, 10);
    const facPagadas = parseInt(c.facturas_pagadas || 0, 10);
    const hasDebt = facPendientes > 0 && deudaNum > 0;
    const isVencida = c.estado_credito === 'VENCIDA';

    let badgeClass = 'badge-success';
    let estadoLabel = 'PAGADA';

    if (isVencida) {
      badgeClass = 'badge-danger';
      estadoLabel = 'VENCIDA';
    } else if (facPendientes > 0) {
      badgeClass = 'badge-warning';
      estadoLabel = 'PENDIENTE';
    }

    let actionsHtml = `
      <div style="display: inline-flex; gap: 0.4rem; align-items: center; justify-content: flex-end;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="openTimelineModal(${c.cliente_id})" style="font-size: 0.75rem; padding: 0.25rem 0.55rem;">
          Ver Estado de Cuenta
        </button>
    `;

    if (canRegisterPayment) {
      if (hasDebt) {
        actionsHtml += `<button type="button" class="btn btn-sm btn-primary" onclick="openPagoModal(${c.cliente_id})" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">Abonar</button>`;
      } else {
        actionsHtml += `<span style="color: var(--color-success); font-size: 0.75rem; font-weight: 700;">Sin Deuda</span>`;
      }
    }

    actionsHtml += `</div>`;

    const facturasLabel = facPendientes > 0
      ? `${facPendientes} pendiente(s)`
      : `0 pendientes (${facPagadas} pagada(s))`;

    return `
      <tr class="${isVencida ? 'row-vencida' : ''}">
        <td>
          <a href="javascript:void(0)" onclick="openTimelineModal(${c.cliente_id})" style="font-weight: 700; color: var(--color-primary); text-decoration: underline;">
            ${c.cliente_nombre}
          </a>
        </td>
        <td>${c.telefono || c.cliente_telefono || '-'}</td>
        <td style="text-align: right; font-weight: 800; color: ${hasDebt ? 'var(--color-danger)' : 'var(--color-success)'};">
          ${formatMoney(deudaNum)}
        </td>
        <td style="text-align: center; font-weight: 600;">
          ${facturasLabel}
        </td>
        <td style="text-align: center;">
          <span class="badge ${badgeClass}">${estadoLabel}</span>
        </td>
        <td style="text-align: right;">${actionsHtml}</td>
      </tr>
    `;
  }).join('');
}

window.openTimelineModal = async (clienteId) => {
  const clienteNombreEl = document.getElementById('timelineClienteNombre');
  const facturaInfoEl = document.getElementById('timelineFacturaInfo');
  const content = document.getElementById('timelineContent');

  if (content) {
    content.innerHTML = '<div style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">Cargando estado de cuenta...</div>';
  }
  openModal('modalTimeline');

  try {
    const timestamp = Date.now();
    const res = await fetch(`${API_BASE_URL}/cuentas-por-cobrar/cliente/${clienteId}/detalle?_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener estado de cuenta');
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error('Datos de cliente no válidos');
    }

    const detalle = data.data;
    activeClientDetail = detalle;

    if (clienteNombreEl) {
      clienteNombreEl.textContent = `Estado de Cuenta: ${detalle.cliente.nombre}`;
    }
    if (facturaInfoEl) {
      facturaInfoEl.textContent = `Tel: ${detalle.cliente.telefono || 'Sin teléfono'} • Saldo Pendiente Total: ${formatMoney(detalle.saldo_total)} • Límite: ${formatMoney(detalle.cliente.limite_credito)}`;
    }

    let facturasRows = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 1rem;">No tiene facturas al crédito.</td></tr>';
    if (Array.isArray(detalle.facturas) && detalle.facturas.length > 0) {
      facturasRows = detalle.facturas.map(f => {
        const saldoF = parseFloat(f.saldo_pendiente || 0);
        const isPaid = f.estado === 'pagada' || saldoF <= 0;
        const isVenc = f.esta_vencida;
        const badge = isPaid ? 'badge-success' : (isVenc ? 'badge-danger' : 'badge-warning');
        const estText = isPaid ? 'PAGADA' : (isVenc ? 'VENCIDA' : 'PENDIENTE');

        return `
          <tr class="${isVenc ? 'row-vencida' : ''}">
            <td>${formatDate(f.fecha)}</td>
            <td><strong>${f.numero_factura || ('Venta #' + f.venta_id)}</strong></td>
            <td style="text-align: right; font-weight: 600;">${formatMoney(f.total)}</td>
            <td style="text-align: right; font-weight: 700; color: ${isPaid ? 'var(--color-success)' : 'var(--color-danger)'};">${formatMoney(f.saldo_pendiente)}</td>
            <td>${formatDate(f.fecha_vencimiento)}</td>
            <td style="text-align: center;"><span class="badge ${badge}">${estText}</span></td>
          </tr>
        `;
      }).join('');
    }

    let abonosRows = '<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted); padding: 1rem;">No hay abonos registrados para este cliente.</td></tr>';
    if (Array.isArray(detalle.abonos) && detalle.abonos.length > 0) {
      abonosRows = detalle.abonos.map(a => {
        const bancoInfo = a.banco ? ` (${a.banco})` : '';
        return `
          <tr>
            <td>${formatDateTime(a.fecha_pago)}</td>
            <td><strong>${a.numero_factura || ('Cuenta #' + a.cuenta_id)}</strong></td>
            <td style="text-align: right; font-weight: 700; color: var(--color-success);">${formatMoney(a.monto)}</td>
            <td style="text-transform: capitalize;">${a.metodo_pago}${bancoInfo}</td>
            <td>${a.banco || '-'}</td>
            <td><strong>${a.referencia || '-'}</strong></td>
            <td>${a.usuario_nombre || 'Sistema'}</td>
          </tr>
        `;
      }).join('');
    }

    const abonarBtnHtml = (canRegisterPayment && detalle.saldo_total > 0)
      ? `<button type="button" class="btn btn-primary btn-sm" onclick="openPagoModal(${detalle.cliente.id})" style="margin-left: auto;">+ Registrar Abono</button>`
      : '';

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--color-surface-muted); padding: 0.85rem 1.15rem; border-radius: var(--radius-sm); border: 1px solid var(--color-border-light); margin-bottom: 1.25rem;">
        <div>
          <span style="font-size: 0.82rem; color: var(--color-text-muted); display: block;">Saldo Total Adeudado Actualizado:</span>
          <strong style="font-size: 1.4rem; color: ${detalle.saldo_total > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">${formatMoney(detalle.saldo_total)}</strong>
        </div>
        ${abonarBtnHtml}
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-main);">1. Facturas Emitidas al Crédito</h4>
        <div class="table-responsive">
          <table class="data-table table-compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>No. Factura</th>
                <th style="text-align: right;">Total Factura (C$)</th>
                <th style="text-align: right;">Saldo Pendiente (C$)</th>
                <th>Vencimiento</th>
                <th style="text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${facturasRows}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-main);">2. Historial de Abonos Realizados (Línea de Tiempo)</h4>
        <div class="table-responsive">
          <table class="data-table table-compact">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>No. Factura</th>
                <th style="text-align: right;">Monto Abonado (C$)</th>
                <th>Método</th>
                <th>Banco</th>
                <th>No. Referencia / Minuta</th>
                <th>Registrado Por</th>
              </tr>
            </thead>
            <tbody>
              ${abonosRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    if (content) {
      content.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--color-danger);">${err.message}</div>`;
    }
  }
};

window.openPagoModal = async (clienteId) => {
  if (!canRegisterPayment) {
    showToast('Su rol no tiene autorización para registrar cobros', true);
    return;
  }

  closeModal('modalTimeline');

  const pagoClienteIdInit = document.getElementById('pagoClienteId');
  if (pagoClienteIdInit && clienteId) {
    pagoClienteIdInit.value = clienteId;
  }

  try {
    const timestamp = Date.now();
    const res = await fetch(`${API_BASE_URL}/cuentas-por-cobrar/cliente/${clienteId}/detalle?_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error('Error al cargar datos del cliente para abono');
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error('Datos no válidos');
    }

    activeClientDetail = data.data;
    const { cliente, saldo_total, facturas } = activeClientDetail;

    if (saldo_total <= 0) {
      showToast('Este cliente no tiene saldo pendiente por cobrar', true);
      return;
    }

    const pagoClienteIdEl = document.getElementById('pagoClienteId');
    if (pagoClienteIdEl) pagoClienteIdEl.value = cliente.id;

    const pagoClienteNombreEl = document.getElementById('pagoClienteNombre');
    if (pagoClienteNombreEl) pagoClienteNombreEl.textContent = cliente.nombre;

    const pagoSaldoActualEl = document.getElementById('pagoSaldoActual');
    if (pagoSaldoActualEl) pagoSaldoActualEl.textContent = formatMoney(saldo_total);

    const facturasPendientes = (facturas || []).filter(f => f.estado === 'pendiente' && parseFloat(f.saldo_pendiente) > 0);

    const destinoFacturaSelect = document.getElementById('pagoDestinoFactura');
    if (destinoFacturaSelect) {
      let options = `<option value="global">Pago Global (Distribuir en facturas más antiguas - FIFO) [Saldo: ${formatMoney(saldo_total)}]</option>`;
      facturasPendientes.forEach(f => {
        options += `<option value="${f.cuenta_id}">Factura ${f.numero_factura || ('Venta #' + f.venta_id)} - Saldo: ${formatMoney(f.saldo_pendiente)}</option>`;
      });
      destinoFacturaSelect.innerHTML = options;
      destinoFacturaSelect.value = 'global';
    }

    const pagoMontoEl = document.getElementById('pagoMonto');
    if (pagoMontoEl) {
      pagoMontoEl.value = '';
      pagoMontoEl.max = saldo_total;
    }

    const pagoMetodoEl = document.getElementById('pagoMetodo');
    if (pagoMetodoEl) pagoMetodoEl.value = 'efectivo';
    const groupPagoBancoEl = document.getElementById('groupPagoBanco');
    if (groupPagoBancoEl) groupPagoBancoEl.style.display = 'none';
    const groupPagoDestinoEl = document.getElementById('groupPagoDestino');
    if (groupPagoDestinoEl) groupPagoDestinoEl.style.display = 'none';
    const groupPagoRefEl = document.getElementById('groupPagoReferencia');
    if (groupPagoRefEl) groupPagoRefEl.style.display = 'block';
    const pagoDestinoEl = document.getElementById('pagoDestino');
    if (pagoDestinoEl) pagoDestinoEl.value = 'distribuidora';
    const pagoRefEl = document.getElementById('pagoReferencia');
    if (pagoRefEl) pagoRefEl.value = '';

    openModal('modalPago');
  } catch (err) {
    showToast(err.message, true);
  }
};

const destinoFacturaSelect = document.getElementById('pagoDestinoFactura');
if (destinoFacturaSelect) {
  destinoFacturaSelect.addEventListener('change', () => {
    if (!activeClientDetail) return;
    const selVal = destinoFacturaSelect.value;
    const pagoSaldoActualEl = document.getElementById('pagoSaldoActual');
    const pagoMontoEl = document.getElementById('pagoMonto');

    if (selVal === 'global') {
      if (pagoSaldoActualEl) pagoSaldoActualEl.textContent = formatMoney(activeClientDetail.saldo_total);
      if (pagoMontoEl) pagoMontoEl.max = activeClientDetail.saldo_total;
    } else {
      const fac = (activeClientDetail.facturas || []).find(f => String(f.cuenta_id) === String(selVal));
      if (fac) {
        if (pagoSaldoActualEl) pagoSaldoActualEl.textContent = formatMoney(fac.saldo_pendiente);
        if (pagoMontoEl) pagoMontoEl.max = fac.saldo_pendiente;
      }
    }
  });
}

const pagoMetodoEl = document.getElementById('pagoMetodo');
if (pagoMetodoEl) {
  pagoMetodoEl.addEventListener('change', () => {
    const isTransf = pagoMetodoEl.value === 'transferencia';
    const groupPagoBanco = document.getElementById('groupPagoBanco');
    const groupPagoDestino = document.getElementById('groupPagoDestino');
    const groupPagoRef = document.getElementById('groupPagoReferencia');
    if (groupPagoBanco) groupPagoBanco.style.display = isTransf ? 'block' : 'none';
    if (groupPagoDestino) groupPagoDestino.style.display = isTransf ? 'block' : 'none';
    if (groupPagoRef) groupPagoRef.style.display = 'block';
  });
}

const btnPagarTotal = document.getElementById('btnPagarTotal');
if (btnPagarTotal) {
  btnPagarTotal.addEventListener('click', () => {
    if (!activeClientDetail) return;
    const selVal = destinoFacturaSelect ? destinoFacturaSelect.value : 'global';
    const montoInput = document.getElementById('pagoMonto');
    if (!montoInput) return;

    if (selVal === 'global') {
      montoInput.value = parseFloat(activeClientDetail.saldo_total || 0).toFixed(2);
    } else {
      const fac = (activeClientDetail.facturas || []).find(f => String(f.cuenta_id) === String(selVal));
      if (fac) {
        montoInput.value = parseFloat(fac.saldo_pendiente || 0).toFixed(2);
      }
    }
  });
}

const formPago = document.getElementById('formPago');
if (formPago) {
  formPago.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!canRegisterPayment) {
      showToast('Acción denegada por permisos de rol', true);
      return;
    }

    const clienteIdEl = document.getElementById('pagoClienteId');
    const clienteId = clienteIdEl ? clienteIdEl.value : null;
    const destinoFactura = destinoFacturaSelect ? destinoFacturaSelect.value : 'global';

    const montoEl = document.getElementById('pagoMonto');
    const monto = montoEl ? parseFloat(montoEl.value) : 0;
    const metodoEl = document.getElementById('pagoMetodo');
    const metodo_pago = metodoEl ? metodoEl.value : 'efectivo';
    const bancoEl = document.getElementById('pagoBanco');
    const banco = (metodo_pago === 'transferencia' && bancoEl) ? bancoEl.value : null;
    const destinoEl = document.getElementById('pagoDestino');
    const destino_deposito = (metodo_pago === 'transferencia' && destinoEl) ? destinoEl.value : 'distribuidora';
    const refEl = document.getElementById('pagoReferencia');
    const referencia = refEl && refEl.value.trim() ? refEl.value.trim() : null;
    const btnSubmit = document.getElementById('btnGuardarPago');

    if (isNaN(monto) || monto <= 0) {
      showToast('Ingrese un monto válido a abonar', true);
      return;
    }

    if (destinoFactura === 'global') {
      if (activeClientDetail && monto > parseFloat(activeClientDetail.saldo_total)) {
        showToast('El monto supera la deuda total pendiente del cliente', true);
        return;
      }
    } else {
      const fac = (activeClientDetail.facturas || []).find(f => String(f.cuenta_id) === String(destinoFactura));
      if (fac && monto > parseFloat(fac.saldo_pendiente)) {
        showToast('El monto supera el saldo pendiente de la factura seleccionada', true);
        return;
      }
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Registrando...';
    }

    try {
      const timestamp = Date.now();
      let url = '';
      if (destinoFactura === 'global') {
        url = `${API_BASE_URL}/cuentas-por-cobrar/cliente/${clienteId}/abono-global?_t=${timestamp}`;
      } else {
        url = `${API_BASE_URL}/cuentas-por-cobrar/${destinoFactura}/pagos?_t=${timestamp}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ monto, metodo_pago, banco, destino_deposito, referencia })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al registrar abono');
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al registrar abono');
      }

      showToast(`Abono de ${formatMoney(monto)} registrado correctamente`);
      closeModal('modalPago');
      await loadCuentas();

      const modalTimeline = document.getElementById('modalTimeline');
      if (modalTimeline && modalTimeline.classList.contains('open') && clienteId) {
        openTimelineModal(clienteId);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Confirmar Pago';
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadCuentas);
} else {
  loadCuentas();
}