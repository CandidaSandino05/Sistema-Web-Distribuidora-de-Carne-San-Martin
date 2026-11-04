const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
  ? 'http://localhost:3000/api'
  : '/api';

const token = localStorage.getItem('san_martin_token');
const userStr = localStorage.getItem('san_martin_user');

if (!token || !userStr) {
  window.location.href = './login.html';
}

const user = JSON.parse(userStr || '{}');

if (user.rol !== 'administrador') {
  if (user.rol === 'vendedor') {
    window.location.href = './ventas.html';
  } else {
    window.location.href = './inventario.html';
  }
}

const userNameEl = document.getElementById('userName');
if (userNameEl) userNameEl.textContent = user.nombre || 'Administrador';

const userRoleEl = document.getElementById('userRole');
if (userRoleEl) userRoleEl.textContent = (user.rol || 'administrador').toUpperCase();

const userAvatarEl = document.getElementById('userAvatar');
if (userAvatarEl) userAvatarEl.textContent = (user.nombre || 'A').charAt(0).toUpperCase();

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
    toastEl.className = 'toast';
  }, 3500);
}

const currencyFormatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
function formatMoney(amount) {
  return currencyFormatter.format(parseFloat(amount || 0));
}

const inputDesde = document.getElementById('repDesde');
const inputHasta = document.getElementById('repHasta');
const btnFiltrar = document.getElementById('btnFiltrarReporte');
const btnLimpiar = document.getElementById('btnLimpiarFiltros');
const btnExportar = document.getElementById('btnExportarCsv');

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

if (inputDesde) inputDesde.value = firstDay.toISOString().split('T')[0];
if (inputHasta) inputHasta.value = today.toISOString().split('T')[0];

if (btnFiltrar) {
  btnFiltrar.addEventListener('click', () => {
    loadReportes();
  });
}

if (btnLimpiar) {
  btnLimpiar.addEventListener('click', () => {
    if (inputDesde) inputDesde.value = '';
    if (inputHasta) inputHasta.value = '';
    loadReportes();
  });
}

if (btnExportar) {
  btnExportar.addEventListener('click', () => {
    exportarCsv();
  });
}

const presetButtons = document.querySelectorAll('.filter-pill-btn[data-preset]');
presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    presetButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const preset = btn.getAttribute('data-preset');
    const now = new Date();
    if (preset === 'hoy') {
      const todayStr = now.toISOString().split('T')[0];
      if (inputDesde) inputDesde.value = todayStr;
      if (inputHasta) inputHasta.value = todayStr;
    } else if (preset === '7d') {
      const d7 = new Date();
      d7.setDate(now.getDate() - 7);
      if (inputDesde) inputDesde.value = d7.toISOString().split('T')[0];
      if (inputHasta) inputHasta.value = now.toISOString().split('T')[0];
    } else if (preset === 'mes') {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      if (inputDesde) inputDesde.value = startMonth.toISOString().split('T')[0];
      if (inputHasta) inputHasta.value = now.toISOString().split('T')[0];
    }
    loadReportes();
  });
});

let reportesData = [];

async function loadReportes() {
  const desde = inputDesde ? inputDesde.value : '';
  const hasta = inputHasta ? inputHasta.value : '';

  let url = `${API_BASE_URL}/ventas/reportes`;
  const params = [];
  if (desde) params.push(`desde=${desde}`);
  if (hasta) params.push(`hasta=${hasta}`);
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  try {
    const res = await fetch(url, {
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
      throw new Error(errData?.error || 'No se pudo conectar con el servidor para cargar los reportes');
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener reportes');
    }

    reportesData = data.data?.productos || [];
    renderReportes(data.data || { total_vendido: 0, ganancia_neta: 0, productos: [] });
  } catch (err) {
    reportesData = [];
    renderReportes({ total_vendido: 0, ganancia_neta: 0, productos: [] });
    showToast(err.message || 'Error al cargar los reportes de ventas', true);
  }
}

function renderReportes(reportData) {
  const totalVendido = reportData.total_vendido || 0;
  const gananciaNeta = reportData.ganancia_neta || 0;
  const productos = reportData.productos || [];

  const kpiVendidoEl = document.getElementById('kpiTotalVendido');
  if (kpiVendidoEl) kpiVendidoEl.textContent = formatMoney(totalVendido);

  const kpiGananciaEl = document.getElementById('kpiGananciaNeta');
  if (kpiGananciaEl) kpiGananciaEl.textContent = formatMoney(gananciaNeta);

  const tbody = document.getElementById('reportesTableBody');
  if (!tbody) return;
  if (!productos || productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2.5rem;">No hay ventas en este rango</td></tr>';
    return;
  }

  tbody.innerHTML = productos.map((p, idx) => `
    <tr>
      <td><strong>#${String(p.producto_id || idx + 1).padStart(4, '0')}</strong></td>
      <td><strong style="color: var(--color-text-main);">${p.producto_nombre}</strong></td>
      <td style="text-align: right; font-weight: 600;">${parseFloat(p.cantidad_vendida).toFixed(2)} lb</td>
      <td style="text-align: right;">${formatMoney(p.precio_unitario)}</td>
      <td style="text-align: right; font-weight: 700; color: var(--color-primary);">${formatMoney(p.total_cobrado)}</td>
      <td style="text-align: right; font-weight: 700; color: var(--color-success);">${formatMoney(p.ganancia_neta)}</td>
    </tr>
  `).join('');
}

function exportarCsv() {
  if (reportesData.length === 0) {
    showToast('No hay datos disponibles para exportar', true);
    return;
  }

  let csv = 'Código,Corte Cárnico,Libras Vendidas,Precio Venta Unitario,Total Facturado,Ganancia Neta\n';
  reportesData.forEach(p => {
    csv += `"${p.producto_id}","${p.producto_nombre}","${p.cantidad_vendida}","${p.precio_unitario}","${p.total_cobrado}","${p.ganancia_neta}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `reporte_ventas_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadReportes);
} else {
  loadReportes();
}
