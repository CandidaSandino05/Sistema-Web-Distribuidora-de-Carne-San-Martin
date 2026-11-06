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

const navVentasLink = document.getElementById('navVentasLink');
if (navVentasLink) {
  navVentasLink.style.display = 'none';
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

const currencyFormatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
function formatMoney(amount) {
  return currencyFormatter.format(parseFloat(amount || 0));
}

function formatDate(isoDate) {
  if (!isoDate) return '-';
  return new Date(isoDate).toLocaleDateString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
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
    document.querySelectorAll('.filter-pill-btn[data-preset]').forEach(b => b.classList.remove('active'));
    loadReportes();
  });
}

if (btnExportar) {
  btnExportar.addEventListener('click', () => {
    exportarExcel();
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
    renderReportes(data.data || { total_vendido: 0, ganancia_neta: 0, total_cxc_pendiente: 0, total_morosos: 0, productos: [], cuentas_por_cobrar: [] });
  } catch (err) {
    reportesData = [];
    renderReportes({ total_vendido: 0, ganancia_neta: 0, total_cxc_pendiente: 0, total_morosos: 0, productos: [], cuentas_por_cobrar: [] });
    showToast(err.message || 'Error al cargar los reportes de ventas', true);
  }
}

function renderReportes(reportData) {
  const totalVendido = reportData.total_vendido || 0;
  const gananciaNeta = reportData.ganancia_neta || 0;
  const totalCxcPendiente = reportData.total_cxc_pendiente || 0;
  const totalMorosos = reportData.total_morosos || 0;
  const productos = reportData.productos || [];
  const cuentasPorCobrar = reportData.cuentas_por_cobrar || [];

  const kpiVendidoEl = document.getElementById('kpiTotalVendido');
  if (kpiVendidoEl) kpiVendidoEl.textContent = formatMoney(totalVendido);

  const kpiGananciaEl = document.getElementById('kpiGananciaNeta');
  if (kpiGananciaEl) kpiGananciaEl.textContent = formatMoney(gananciaNeta);

  const kpiCxcReporteEl = document.getElementById('kpiTotalCxcReporte');
  if (kpiCxcReporteEl) kpiCxcReporteEl.textContent = formatMoney(totalCxcPendiente);

  const kpiMorososSubEl = document.getElementById('kpiMorososSub');
  if (kpiMorososSubEl) {
    kpiMorososSubEl.textContent = `${totalMorosos} cuenta${totalMorosos === 1 ? '' : 's'} vencida${totalMorosos === 1 ? '' : 's'} en mora`;
  }

  const tbody = document.getElementById('reportesTableBody');
  if (tbody) {
    if (!productos || productos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2.5rem;">No hay ventas en este rango</td></tr>';
    } else {
      tbody.innerHTML = productos.map((p, idx) => `
        <tr>
          <td><strong>#${String(p.producto_id || idx + 1).padStart(4, '0')}</strong></td>
          <td><strong style="color: var(--color-text-main);">${p.producto_nombre}</strong></td>
          <td class="table-num-cell">${parseFloat(p.cantidad_vendida).toFixed(2)} lb</td>
          <td class="table-num-cell">${formatMoney(p.precio_unitario)}</td>
          <td class="table-num-cell" style="color: var(--color-primary);">${formatMoney(p.total_cobrado)}</td>
          <td class="table-num-cell" style="color: var(--color-success);">${formatMoney(p.ganancia_neta)}</td>
        </tr>
      `).join('');
    }
  }

  const cxcTbody = document.getElementById('reportesCxcTableBody');
  if (cxcTbody) {
    if (!cuentasPorCobrar || cuentasPorCobrar.length === 0) {
      cxcTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--color-success); padding: 2.5rem;">Sin cuentas por cobrar ni clientes morosos pendientes</td></tr>';
    } else {
      cxcTbody.innerHTML = cuentasPorCobrar.map(c => {
        const diasMora = parseInt(c.dias_mora || 0, 10);
        const esMoroso = Boolean(c.es_moroso) || diasMora > 0;
        const badgeClass = esMoroso ? 'badge-danger' : 'badge-warning';
        const badgeText = esMoroso ? `MOROSO (${diasMora} días vencido)` : 'EN PLAZO';

        return `
          <tr>
            <td><strong style="color: var(--color-primary);">${c.numero_factura || ('Venta #' + String(c.venta_id).padStart(5, '0'))}</strong></td>
            <td><strong style="color: var(--color-text-main);">${c.cliente_nombre}</strong></td>
            <td>${c.cliente_telefono || '-'}</td>
            <td>${formatDate(c.fecha_vencimiento)}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td class="table-num-cell">${formatMoney(c.monto_original)}</td>
            <td class="table-num-cell" style="color: var(--color-danger);">${formatMoney(c.saldo_pendiente)}</td>
          </tr>
        `;
      }).join('');
    }
  }
}

function exportarExcel() {
  if (!reportesData || reportesData.length === 0) {
    showToast('No hay datos disponibles para exportar', true);
    return;
  }

  const filename = `reporte_ventas_${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (typeof XLSX !== 'undefined') {
    const dataRows = reportesData.map((p, idx) => ({
      'Código': p.producto_id || (idx + 1),
      'Corte Cárnico': p.producto_nombre,
      'Libras Vendidas (lb)': parseFloat(p.cantidad_vendida || 0),
      'Precio Venta Unitario (C$)': parseFloat(p.precio_unitario || 0),
      'Total Facturado (C$)': parseFloat(p.total_cobrado || 0),
      'Ganancia Neta (C$)': parseFloat(p.ganancia_neta || 0)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 22 },
      { wch: 25 },
      { wch: 22 },
      { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas por Producto');
    XLSX.writeFile(workbook, filename);
    showToast('Reporte en Excel descargado exitosamente');
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
