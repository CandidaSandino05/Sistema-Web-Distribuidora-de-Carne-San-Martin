const API_URL = 'https://sistema-web-distribuidora-de-carne-san.onrender.com/api';

const token = localStorage.getItem('san_martin_token');
const userStr = localStorage.getItem('san_martin_user');

if (!token || !userStr) {
  window.location.href = './login.html';
}

const user = JSON.parse(userStr || '{}');
const userRole = (user.rol || '').toLowerCase();

if (userRole !== 'administrador') {
  window.location.href = './inventario.html';
}

const userNameEl = document.getElementById('userName');
if (userNameEl) userNameEl.textContent = user.nombre || 'Usuario';

const userRoleEl = document.getElementById('userRole');
if (userRoleEl) userRoleEl.textContent = (user.rol || 'usuario').toUpperCase();

const userAvatarEl = document.getElementById('userAvatar');
if (userAvatarEl) userAvatarEl.textContent = (user.nombre || 'U').charAt(0).toUpperCase();

const navDashboardLink = document.getElementById('navDashboardLink');
const navInventarioLink = document.getElementById('navInventarioLink');
const navMataderoLink = document.getElementById('navMataderoLink');
const navVentasLink = document.getElementById('navVentasLink');
const navFacturasLink = document.getElementById('navFacturasLink');
const navClientesLink = document.getElementById('navClientesLink');
const navCxcLink = document.getElementById('navCxcLink');
const navReportesLink = document.getElementById('navReportesLink');
const navMermasLink = document.getElementById('navMermasLink');

if (userRole === 'administrador') {
  if (navDashboardLink) navDashboardLink.style.display = 'flex';
  if (navInventarioLink) navInventarioLink.style.display = 'flex';
  if (navMataderoLink) navMataderoLink.style.display = 'flex';
  if (navVentasLink) navVentasLink.style.display = 'none';
  if (navFacturasLink) navFacturasLink.style.display = 'flex';
  if (navClientesLink) navClientesLink.style.display = 'flex';
  if (navCxcLink) navCxcLink.style.display = 'flex';
  if (navMermasLink) navMermasLink.style.display = 'flex';
  if (navReportesLink) navReportesLink.style.display = 'flex';
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
  }, 4000);
}

const nioFormatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
function formatMoney(amount) {
  return nioFormatter.format(parseFloat(amount || 0));
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

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

window.openModal = openModal;
window.closeModal = closeModal;

let movimientosList = [];
let currentFilter = 'todos';

const btnOpenDepositoModal = document.getElementById('btnOpenDepositoModal');
if (btnOpenDepositoModal) {
  btnOpenDepositoModal.addEventListener('click', () => {
    updateEquivalenteCordobas();
    openModal('modalDepositoMatadero');
  });
}

const depMoneda = document.getElementById('depMoneda');
const depMonto = document.getElementById('depMonto');
const groupDepTasa = document.getElementById('groupDepTasa');
const depTasaCambio = document.getElementById('depTasaCambio');
const depEquivalenteCordobas = document.getElementById('depEquivalenteCordobas');

if (depMoneda && groupDepTasa) {
  depMoneda.addEventListener('change', () => {
    if (depMoneda.value === 'USD') {
      groupDepTasa.style.display = 'block';
    } else {
      groupDepTasa.style.display = 'none';
    }
    updateEquivalenteCordobas();
  });
}

if (depMonto) depMonto.addEventListener('input', updateEquivalenteCordobas);
if (depTasaCambio) depTasaCambio.addEventListener('input', updateEquivalenteCordobas);

function updateEquivalenteCordobas() {
  const m = depMonto ? parseFloat(depMonto.value || 0) : 0;
  const mon = depMoneda ? depMoneda.value : 'C$';
  const t = (mon === 'USD' && depTasaCambio) ? parseFloat(depTasaCambio.value || 1) : 1;
  const eq = (!isNaN(m) && m > 0 && !isNaN(t) && t > 0) ? (m * t) : 0;
  if (depEquivalenteCordobas) {
    depEquivalenteCordobas.textContent = formatMoney(eq);
  }
}

async function loadMataderoData() {
  try {
    const resMat = await fetch(`${API_BASE_URL}/matadero`, {
      cache: 'no-store',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (resMat.status === 401) {
      localStorage.clear();
      window.location.href = './login.html';
      return;
    }

    const dataMat = await resMat.json();
    if (!resMat.ok || !dataMat.success) {
      throw new Error(dataMat.error || 'Error al cargar datos del matadero');
    }

    const resumen = dataMat.data?.resumen || {};
    movimientosList = Array.isArray(dataMat.data?.movimientos) ? dataMat.data.movimientos : [];

    const kpiSaldo = document.getElementById('kpiSaldoMatadero');
    const kpiCargos = document.getElementById('kpiCargosMatadero');
    const kpiCargosSub = document.getElementById('kpiCargosSub');
    const kpiDep = document.getElementById('kpiDepositosMatadero');
    const kpiDepSub = document.getElementById('kpiDepositosSub');

    if (kpiSaldo) kpiSaldo.textContent = formatMoney(resumen.saldo_deuda);
    if (kpiCargos) kpiCargos.textContent = formatMoney(resumen.total_cargos);
    if (kpiCargosSub) kpiCargosSub.textContent = `${resumen.cantidad_cargos || 0} documentos de cargo registrados`;
    if (kpiDep) kpiDep.textContent = formatMoney(resumen.total_depositos);
    if (kpiDepSub) kpiDepSub.textContent = `${resumen.cantidad_depositos || 0} depósitos bancarios aplicados`;

    applyMataderoFilters();
  } catch (err) {
    showToast(err.message || 'Error al cargar cuenta del matadero', true);
  }
}

const tabButtons = document.querySelectorAll('.matadero-tab-btn[data-filter]');
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.getAttribute('data-filter');
    applyMataderoFilters();
  });
});

const searchMataderoInput = document.getElementById('searchMataderoInput');
if (searchMataderoInput) {
  searchMataderoInput.addEventListener('input', applyMataderoFilters);
}

function applyMataderoFilters() {
  const q = searchMataderoInput ? searchMataderoInput.value.toLowerCase().trim() : '';
  let filtered = [...movimientosList];

  if (currentFilter === 'cargos') {
    filtered = filtered.filter(m => ['deuda_inicial', 'vale', 'remision'].includes(m.tipo_movimiento));
  } else if (currentFilter === 'depositos') {
    filtered = filtered.filter(m => ['deposito_cliente', 'deposito_distribuidora'].includes(m.tipo_movimiento));
  }

  if (q) {
    filtered = filtered.filter(m =>
      (m.referencia && m.referencia.toLowerCase().includes(q)) ||
      (m.banco && m.banco.toLowerCase().includes(q)) ||
      (m.cliente_nombre && m.cliente_nombre.toLowerCase().includes(q)) ||
      (m.tipo_movimiento && m.tipo_movimiento.toLowerCase().includes(q))
    );
  }

  renderMataderoTable(filtered);
}

function formatTipoLabel(tipo) {
  switch (tipo) {
    case 'deuda_inicial':
      return { text: 'DEUDA INICIAL', badge: 'badge-warning', isCargo: true };
    case 'vale':
      return { text: 'VALE MATADERO', badge: 'badge-danger', isCargo: true };
    case 'remision':
      return { text: 'REMISIÓN MATADERO', badge: 'badge-danger', isCargo: true };
    case 'deposito_cliente':
      return { text: 'DEPÓSITO CLIENTE (CxC)', badge: 'badge-success', isCargo: false };
    case 'deposito_distribuidora':
      return { text: 'DEPÓSITO DISTRIBUIDORA', badge: 'badge-info', isCargo: false };
    default:
      return { text: String(tipo).toUpperCase(), badge: 'badge-info', isCargo: false };
  }
}

function renderMataderoTable(list) {
  const tbody = document.getElementById('mataderoTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--color-text-muted); padding: 2.5rem;">No hay movimientos registrados con este filtro.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(m => {
    const info = formatTipoLabel(m.tipo_movimiento);
    const montoOrig = m.moneda === 'USD'
      ? `US$${parseFloat(m.monto).toFixed(2)}`
      : formatMoney(m.monto);
    const tasaStr = m.moneda === 'USD' ? `C$${parseFloat(m.tasa_cambio).toFixed(4)}` : '1.0000';
    const impactoPrefix = info.isCargo ? '+' : '-';
    const impactoColor = info.isCargo ? 'var(--color-danger)' : 'var(--color-success)';
    const origenCliente = m.cliente_nombre
      ? `<strong style="color: var(--color-primary);">${m.cliente_nombre}</strong>`
      : (info.isCargo ? 'Proveedor Matadero' : 'Carnes San Martín');

    return `
      <tr>
        <td><strong>#${String(m.id).padStart(4, '0')}</strong></td>
        <td>${formatDateTime(m.fecha)}</td>
        <td><span class="badge ${info.badge}">${info.text}</span></td>
        <td><strong>${m.referencia || '-'}</strong></td>
        <td>${origenCliente}</td>
        <td>${m.banco || '-'}</td>
        <td style="text-align: right; font-weight: 600;">${montoOrig}</td>
        <td style="text-align: right;">${tasaStr}</td>
        <td style="text-align: right; font-weight: 800; color: ${impactoColor};">${impactoPrefix}${formatMoney(m.monto_cordobas)}</td>
        <td>${m.usuario_nombre || 'Sistema'}</td>
      </tr>
    `;
  }).join('');
}

const formDepositoMatadero = document.getElementById('formDepositoMatadero');
if (formDepositoMatadero) {
  formDepositoMatadero.addEventListener('submit', async (e) => {
    e.preventDefault();

    const moneda = depMoneda ? depMoneda.value : 'C$';
    const monto = depMonto ? parseFloat(depMonto.value) : 0;
    const tasa_cambio = moneda === 'USD' && depTasaCambio ? parseFloat(depTasaCambio.value) : 1.0;
    const bancoEl = document.getElementById('depBanco');
    const refEl = document.getElementById('depReferencia');
    const banco = bancoEl ? bancoEl.value : '';
    const referencia = refEl ? refEl.value.trim() : '';

    const btnSubmit = document.getElementById('btnGuardarDeposito');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Procesando...';
    }

    try {
      const res = await fetch(`${API_BASE_URL}/matadero/deposito`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quien_deposito: 'distribuidora',
          cliente_id: null,
          moneda,
          monto,
          tasa_cambio,
          banco,
          referencia
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar depósito');
      }

      showToast('Depósito de la distribuidora acreditado a la deuda del matadero');
      closeModal('modalDepositoMatadero');
      formDepositoMatadero.reset();
      if (groupDepTasa) groupDepTasa.style.display = 'none';
      updateEquivalenteCordobas();
      await loadMataderoData();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Confirmar Depósito';
      }
    }
  });
}

const btnVerValesRemisiones = document.getElementById('btnVerValesRemisiones');
if (btnVerValesRemisiones) {
  btnVerValesRemisiones.addEventListener('click', async () => {
    const tbody = document.getElementById('valesTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">Cargando documentos...</td></tr>';
    }
    openModal('modalValesRemisiones');
    try {
      const res = await fetch(`${API_BASE_URL}/matadero/documentos`, {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener documentos');
      }
      renderValesTable(data.data || []);
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-danger); padding: 2rem;">${err.message}</td></tr>`;
      }
    }
  });
}

function renderValesTable(list) {
  const tbody = document.getElementById('valesTableBody');
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No hay vales ni remisiones registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(d => {
    let itemsArr = [];
    const rawItems = d.productos_recibidos !== undefined ? d.productos_recibidos : d.detalle_items;
    if (Array.isArray(rawItems)) {
      itemsArr = rawItems;
    } else if (typeof rawItems === 'string') {
      try { itemsArr = JSON.parse(rawItems); } catch (e) {}
    }
    const itemsHtml = Array.isArray(itemsArr) && itemsArr.length > 0
      ? `<div style="font-size: 0.8rem; line-height: 1.4;">${itemsArr.map(it => `<div>• <strong>${it.nombre || 'Corte'}</strong>: ${parseFloat(it.cantidad || 0).toFixed(2)} lb a ${formatMoney(it.costo_unitario || 0)}</div>`).join('')}</div>`
      : '<span style="color: var(--color-text-muted); font-size: 0.78rem;">-</span>';
    const tipoStr = String(d.tipo || '').toUpperCase();
    const tipoBadge = tipoStr === 'VALE' ? 'badge-warning' : 'badge-info';
    const numDoc = d.no_documento || d.numero_documento || '-';
    const montoTotal = d.total_cs !== undefined ? d.total_cs : d.total_cordobas;
    return `
      <tr>
        <td>${formatDateTime(d.fecha)}</td>
        <td><strong>${numDoc}</strong></td>
        <td><span class="badge ${tipoBadge}">${tipoStr}</span></td>
        <td style="text-align: right; font-weight: 700; color: var(--color-danger);">${formatMoney(montoTotal)}</td>
        <td>${d.registrado_por || 'Sistema'}</td>
        <td>${itemsHtml}</td>
      </tr>
    `;
  }).join('');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadMataderoData);
} else {
  loadMataderoData();
}
