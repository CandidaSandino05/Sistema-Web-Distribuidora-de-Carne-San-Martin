const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
  ? 'http://localhost:3000/api'
  : '/api';

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
const navVentas = document.getElementById('navVentasLink');
const navClientes = document.getElementById('navClientesLink');
const navCxc = document.getElementById('navCxcLink');

if (userRole === 'administrador') {
  if (navDashboard) navDashboard.style.display = '';
  if (navInventario) navInventario.style.display = '';
  if (navVentas) navVentas.style.display = '';
  if (navClientes) navClientes.style.display = '';
  if (navCxc) navCxc.style.display = '';
} else if (userRole === 'gerente') {
  if (navDashboard) navDashboard.style.display = 'none';
  if (navInventario) navInventario.style.display = '';
  if (navVentas) navVentas.style.display = 'none';
  if (navClientes) navClientes.style.display = '';
  if (navCxc) navCxc.style.display = '';
} else if (userRole === 'vendedor') {
  if (navDashboard) navDashboard.style.display = 'none';
  if (navInventario) navInventario.style.display = 'none';
  if (navVentas) navVentas.style.display = '';
  if (navClientes) navClientes.style.display = '';
  if (navCxc) navCxc.style.display = '';
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

const btnAbonar = document.getElementById('btn-abonar');
if (btnAbonar) {
  if (userRole === 'gerente' || !canRegisterPayment) {
    btnAbonar.style.display = 'none';
  } else {
    btnAbonar.style.display = '';
    btnAbonar.addEventListener('click', () => {
      if (typeof openPagoModal === 'function') {
        openPagoModal();
      }
    });
  }
}

const pagoMetodoSelect = document.getElementById('pagoMetodo');
const groupPagoBanco = document.getElementById('groupPagoBanco');

if (pagoMetodoSelect && groupPagoBanco) {
  pagoMetodoSelect.addEventListener('change', () => {
    if (pagoMetodoSelect.value === 'transferencia') {
      groupPagoBanco.style.display = 'block';
    } else {
      groupPagoBanco.style.display = 'none';
    }
  });
}

let cxcList = [];
let currentFilterStatus = 'todas';
let currentSelectedCuenta = null;

async function loadCuentas() {
  const tableBody = document.getElementById('cxcTableBody');
  const timestamp = Date.now();
  try {
    const res = await fetch(`${API_BASE_URL}/cuentas-por-cobrar?_t=${timestamp}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = './login.html';
      return;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || 'No se pudo conectar con el servidor para cargar las cuentas por cobrar');
    }

    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.error || 'Respuesta inválida del servidor');
    }

    cxcList = json.data;
    applyFilters();
    updateStats(cxcList);
  } catch (err) {
    console.error('Error al cargar cuentas por cobrar:', err);
    cxcList = [];
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--color-danger, #ef4444); padding: 2.5rem;">Error al cargar las cuentas por cobrar: ${err.message || 'Error del servidor'}</td></tr>`;
    }
    showToast(err.message || 'Error al cargar cuentas por cobrar', true);
    updateStats([]);
  }
}

function updateStats(list) {
  let pendienteTotal = 0;
  let countPendientes = 0;
  let countPagadas = 0;

  if (Array.isArray(list)) {
    list.forEach(c => {
      const saldoNum = parseFloat(c.saldo_pendiente || 0);
      const estadoStr = String(c.estado || '').toUpperCase();
      const isPaid = estadoStr === 'PAGADA' || saldoNum <= 0;

      if (!isPaid) {
        pendienteTotal += saldoNum;
        countPendientes++;
      } else {
        countPagadas++;
      }
    });
  }

  const statCartera = document.getElementById('statCarteraPendiente');
  if (statCartera) statCartera.textContent = formatMoney(pendienteTotal);
  const statPendientes = document.getElementById('statCuentasPendientes');
  if (statPendientes) statPendientes.textContent = countPendientes;
  const statPagadas = document.getElementById('statCuentasPagadas');
  if (statPagadas) statPagadas.textContent = countPagadas;
}

const statusButtons = document.querySelectorAll('.filter-pill-btn[data-status]');
statusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    statusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilterStatus = btn.getAttribute('data-status');
    applyFilters();
  });
});

const btnFiltrarCxc = document.getElementById('btnFiltrarCxc');
if (btnFiltrarCxc) {
  btnFiltrarCxc.addEventListener('click', applyFilters);
}

const btnLimpiarCxc = document.getElementById('btnLimpiarCxc');
if (btnLimpiarCxc) {
  btnLimpiarCxc.addEventListener('click', () => {
    const d = document.getElementById('cxcDesde');
    const h = document.getElementById('cxcHasta');
    if (d) d.value = '';
    if (h) h.value = '';
    currentFilterStatus = 'todas';
    statusButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-status') === 'todas'));
    applyFilters();
  });
}

function applyFilters() {
  const desdeEl = document.getElementById('cxcDesde');
  const hastaEl = document.getElementById('cxcHasta');
  const desde = desdeEl ? desdeEl.value : '';
  const hasta = hastaEl ? hastaEl.value : '';

  let filtered = [...cxcList];

  if (currentFilterStatus !== 'todas') {
    filtered = filtered.filter(c => {
      const estadoStr = String(c.estado || '').toLowerCase();
      const saldoNum = parseFloat(c.saldo_pendiente || 0);
      const isPaid = estadoStr === 'pagada' || saldoNum <= 0;

      if (currentFilterStatus === 'pagada') {
        return isPaid;
      }
      return !isPaid;
    });
  }

  if (desde) {
    filtered = filtered.filter(c => {
      const d = c.venta_fecha || c.fecha_vencimiento;
      return d && d.slice(0, 10) >= desde;
    });
  }

  if (hasta) {
    filtered = filtered.filter(c => {
      const d = c.venta_fecha || c.fecha_vencimiento;
      return d && d.slice(0, 10) <= hasta;
    });
  }

  renderCuentas(filtered);
}

function renderCuentas(list) {
  const tableBody = document.getElementById('cxcTableBody');
  if (!tableBody) return;
  if (!list || list.length === 0) {
    const emptyMsg = (!cxcList || cxcList.length === 0)
      ? 'No hay registros'
      : 'No hay cuentas con los filtros seleccionados';
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--color-text-muted); padding: 2.5rem;">${emptyMsg}</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(c => {
    const saldoPendienteNum = parseFloat(c.saldo_pendiente || 0);
    const estadoStr = String(c.estado || '').toUpperCase();
    const isPaid = estadoStr === 'PAGADA' || saldoPendienteNum <= 0;

    let pagoDesc = '-';
    if (c.ultimo_pago !== undefined && c.ultimo_pago !== null && c.ultimo_pago !== '') {
      const montoFmt = formatMoney(c.ultimo_pago);
      const fechaFmt = c.ultimo_pago_fecha ? formatDate(c.ultimo_pago_fecha) : '';
      const metodoFmt = c.ultimo_pago_metodo === 'transferencia' ? `Transf. (${c.ultimo_pago_banco || 'Banco'})` : (c.ultimo_pago_metodo ? 'Efectivo' : '');
      const meta = [fechaFmt, metodoFmt].filter(Boolean).join(' • ');
      pagoDesc = `${montoFmt}${meta ? `<br><span style="font-size: 0.72rem; color: var(--color-text-muted);">${meta}</span>` : ''}`;
    } else if (c.ultimo_pago_fecha) {
      const metodoFmt = c.ultimo_pago_metodo === 'transferencia' ? `Transf. (${c.ultimo_pago_banco || 'Banco'})` : 'Efectivo';
      pagoDesc = `${formatDate(c.ultimo_pago_fecha)}<br><span style="font-size: 0.72rem; color: var(--color-text-muted);">${metodoFmt}</span>`;
    }

    let actionsHtml = `
      <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="openTimelineModal(${c.id})" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" title="Ver historial">
          Línea de Tiempo
        </button>
    `;

    if (canRegisterPayment) {
      if (!isPaid) {
        actionsHtml += `<button type="button" class="btn btn-sm btn-primary btn-abonar" onclick="openPagoModal(${c.id})" style="font-size: 0.75rem; padding: 0.25rem 0.55rem;">Abonar</button>`;
      } else {
        actionsHtml += `<span style="color: var(--color-text-muted); font-size: 0.75rem;">Saldada</span>`;
      }
    }

    actionsHtml += `</div>`;

    return `
      <tr>
        <td><strong>#${String(c.id).padStart(4, '0')}</strong></td>
        <td><strong style="color: var(--color-primary);">Venta #${String(c.venta_id).padStart(5, '0')}</strong></td>
        <td>
          <a href="javascript:void(0)" onclick="openTimelineModal(${c.id})" style="font-weight: 700; color: var(--color-text-main); text-decoration: underline;">
            ${c.cliente_nombre}
          </a>
        </td>
        <td>${c.cliente_telefono || '-'}</td>
        <td>${formatMoney(c.total_venta)}</td>
        <td style="font-weight: 700; color: ${isPaid ? 'var(--color-success)' : 'var(--color-primary)'};">
          ${formatMoney(c.saldo_pendiente)}
        </td>
        <td>${formatDate(c.fecha_vencimiento)}</td>
        <td>${pagoDesc}</td>
        <td>
          <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
            ${isPaid ? 'PAGADA' : 'PENDIENTE'}
          </span>
        </td>
        <td style="text-align: right;">${actionsHtml}</td>
      </tr>
    `;
  }).join('');

  if (userRole === 'gerente' || !canRegisterPayment) {
    document.querySelectorAll('.btn-abonar').forEach(btn => {
      btn.style.display = 'none';
    });
  }
}

window.openTimelineModal = async (cuentaId) => {
  const cuenta = cxcList.find(c => String(c.id) === String(cuentaId));
  if (!cuenta) return;

  const saldoNum = parseFloat(cuenta.saldo_pendiente || 0);
  const estadoStr = String(cuenta.estado || '').toUpperCase();
  const isPaid = estadoStr === 'PAGADA' || saldoNum <= 0;

  const clienteNombreEl = document.getElementById('timelineClienteNombre');
  if (clienteNombreEl) {
    clienteNombreEl.textContent = `Cliente: ${cuenta.cliente_nombre}`;
  }

  const facturaInfoEl = document.getElementById('timelineFacturaInfo');
  if (facturaInfoEl) {
    facturaInfoEl.textContent = `Venta #${cuenta.venta_id} • Total: ${formatMoney(cuenta.total_venta)} • Saldo: ${formatMoney(cuenta.saldo_pendiente)}`;
  }

  const content = document.getElementById('timelineContent');
  if (content) {
    content.innerHTML = '<div style="text-align: center; padding: 1.5rem;">Cargando pagos...</div>';
  }
  openModal('modalTimeline');

  let pagos = [];

  try {
    const timestamp = Date.now();
    const res = await fetch(`${API_BASE_URL}/cuentas-por-cobrar/${cuentaId}/pagos?_t=${timestamp}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data)) {
        pagos = data.data;
      }
    }
  } catch (e) {}

  if (!content) return;

  let timelineHtml = `
    <div class="timeline-list">
      <div class="timeline-item">
        <span class="timeline-date">${formatDate(cuenta.venta_fecha || cuenta.fecha_vencimiento)}</span>
        <div class="timeline-title">Emisión de Factura / Venta #${cuenta.venta_id}</div>
        <div class="timeline-desc">Crédito original por <strong>${formatMoney(cuenta.total_venta)}</strong>. Fecha límite de cobro: ${formatDate(cuenta.fecha_vencimiento)}.</div>
      </div>
  `;

  if (pagos.length === 0) {
    timelineHtml += `
      <div class="timeline-item" style="border-left-color: var(--color-warning);">
        <span class="timeline-date">Sin abonos registrados</span>
        <div class="timeline-title">Pendiente de primer pago</div>
        <div class="timeline-desc">No se han registrado abonos a esta cuenta. Saldo total adeudado: <strong>${formatMoney(cuenta.saldo_pendiente)}</strong>.</div>
      </div>
    `;
  } else {
    pagos.forEach((p, idx) => {
      const bancoInfo = p.banco ? ` • Banco: ${p.banco}` : '';
      timelineHtml += `
        <div class="timeline-item">
          <span class="timeline-date">${formatDate(p.fecha_pago)}</span>
          <div class="timeline-title">Abono #${idx + 1}: ${formatMoney(p.monto)}</div>
          <div class="timeline-desc">Método: <strong style="text-transform: capitalize;">${p.metodo_pago || 'Efectivo'}</strong>${bancoInfo}</div>
        </div>
      `;
    });
  }

  if (isPaid) {
    timelineHtml += `
      <div class="timeline-item" style="border-left-color: var(--color-success);">
        <span class="timeline-date">Cuenta Saldada</span>
        <div class="timeline-title" style="color: var(--color-success);">¡Deuda Liquidada al 100%!</div>
        <div class="timeline-desc">El cliente ha cancelado la totalidad de la factura.</div>
      </div>
    `;
  }

  timelineHtml += `</div>`;
  content.innerHTML = timelineHtml;
};

window.openPagoModal = (cuentaId) => {
  if (!canRegisterPayment) {
    showToast('Su rol no tiene autorización para registrar cobros', true);
    return;
  }

  const cuenta = cxcList.find(c => String(c.id) === String(cuentaId));
  if (!cuenta) return;

  currentSelectedCuenta = cuenta;
  const pagoCuentaIdEl = document.getElementById('pagoCuentaId');
  if (pagoCuentaIdEl) pagoCuentaIdEl.value = cuenta.id;
  const pagoClienteNombreEl = document.getElementById('pagoClienteNombre');
  if (pagoClienteNombreEl) pagoClienteNombreEl.textContent = cuenta.cliente_nombre;
  const pagoSaldoActualEl = document.getElementById('pagoSaldoActual');
  if (pagoSaldoActualEl) pagoSaldoActualEl.textContent = formatMoney(cuenta.saldo_pendiente);
  const pagoMontoEl = document.getElementById('pagoMonto');
  if (pagoMontoEl) {
    pagoMontoEl.value = '';
    pagoMontoEl.max = cuenta.saldo_pendiente;
  }
  const pagoMetodoEl = document.getElementById('pagoMetodo');
  if (pagoMetodoEl) pagoMetodoEl.value = 'efectivo';
  const groupPagoBancoEl = document.getElementById('groupPagoBanco');
  if (groupPagoBancoEl) groupPagoBancoEl.style.display = 'none';

  openModal('modalPago');
};

const btnPagarTotal = document.getElementById('btnPagarTotal');
if (btnPagarTotal) {
  btnPagarTotal.addEventListener('click', () => {
    if (currentSelectedCuenta) {
      const montoInput = document.getElementById('pagoMonto');
      if (montoInput) {
        montoInput.value = parseFloat(currentSelectedCuenta.saldo_pendiente).toFixed(2);
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

    const cuentaIdEl = document.getElementById('pagoCuentaId');
    const cuentaId = cuentaIdEl ? cuentaIdEl.value : null;
    const montoEl = document.getElementById('pagoMonto');
    const monto = montoEl ? parseFloat(montoEl.value) : 0;
    const metodoEl = document.getElementById('pagoMetodo');
    const metodo_pago = metodoEl ? metodoEl.value : 'efectivo';
    const bancoEl = document.getElementById('pagoBanco');
    const banco = (metodo_pago === 'transferencia' && bancoEl) ? bancoEl.value : null;
    const btnSubmit = document.getElementById('btnGuardarPago');

    if (isNaN(monto) || monto <= 0) {
      showToast('Ingrese un monto válido a abonar', true);
      return;
    }

    if (currentSelectedCuenta && monto > parseFloat(currentSelectedCuenta.saldo_pendiente)) {
      showToast('El monto supera el saldo pendiente', true);
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Registrando...';
    }

    try {
      const timestamp = Date.now();
      const res = await fetch(`${API_BASE_URL}/cuentas-por-cobrar/${cuentaId}/pagos?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ monto, metodo_pago, banco })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al registrar pago en el servidor');
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al registrar pago');
      }

      showToast(`Abono de ${formatMoney(monto)} acreditado`);
      closeModal('modalPago');
      await loadCuentas();
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
