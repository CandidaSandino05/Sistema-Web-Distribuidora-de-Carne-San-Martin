const API_URL = 'https://sistema-web-distribuidora-de-carne-san.onrender.com/api';

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

const nioFormatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
function formatMoney(amount) {
  return nioFormatter.format(parseFloat(amount || 0));
}

let salesChartInstance = null;
let mermasChartInstance = null;

async function loadAnalytics() {
  try {
    const res = await fetch(`${API_BASE_URL}/inventario/analytics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = './login.html';
      return;
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener métricas');
    }

    renderDashboard(data.data);
    await loadProductosEliminados();
  } catch (err) {
    renderEmptyDashboard();
    await loadProductosEliminados();
  }
}

async function loadProductosEliminados() {
  const tbody = document.getElementById('productosEliminadosTableBody');
  if (!tbody) return;
  try {
    const res = await fetch(`${API_BASE_URL}/productos/eliminados/auditoria`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const json = await res.json();
    const list = json.data || [];
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 1.5rem;">No hay registros de productos eliminados.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(item => `
      <tr>
        <td>${new Date(item.fecha_eliminacion).toLocaleString('es-NI')}</td>
        <td><strong style="color: var(--color-primary);">${item.producto_nombre}</strong></td>
        <td style="text-align: right; font-weight: 700; color: var(--color-danger);">${parseFloat(item.cantidad_stock || 0).toFixed(2)} lb</td>
        <td>${item.motivo || 'Baja operativa'}</td>
        <td>${item.usuario_nombre || 'Gerente'}</td>
      </tr>
    `).join('');
  } catch (e) {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 1.5rem;">No fue posible cargar el historial de eliminados.</td></tr>';
    }
  }
}

function renderDashboard(analytics) {
  const kpis = analytics.kpis || {};
  const invEl = document.getElementById('kpiInversion');
  const venEl = document.getElementById('kpiVentasMes');
  const marEl = document.getElementById('kpiMargen');
  const cxcEl = document.getElementById('kpiCxc');

  if (invEl) invEl.textContent = formatMoney(kpis.inversion_inventario);
  if (venEl) venEl.textContent = formatMoney(kpis.ventas_mes);
  if (marEl) marEl.textContent = formatMoney(kpis.margen_proyectado);
  if (cxcEl) cxcEl.textContent = formatMoney(kpis.total_cxc);

  renderSalesChart(analytics.ventas_7_dias || []);
  renderMermasChart(analytics.mermas_7_dias || analytics.mermas_resumen || []);

  renderTopProducts(analytics.top_productos || []);
  renderBestClients(analytics.mejores_clientes || []);
  renderStockAlerts(analytics.alertas_stock || []);
}

function renderEmptyDashboard() {
  const invEl = document.getElementById('kpiInversion');
  const venEl = document.getElementById('kpiVentasMes');
  const marEl = document.getElementById('kpiMargen');
  const cxcEl = document.getElementById('kpiCxc');

  if (invEl) invEl.textContent = formatMoney(0);
  if (venEl) venEl.textContent = formatMoney(0);
  if (marEl) marEl.textContent = formatMoney(0);
  if (cxcEl) cxcEl.textContent = formatMoney(0);

  renderSalesChart([]);
  renderMermasChart([]);

  renderTopProducts([]);
  renderBestClients([]);
  renderStockAlerts([]);
}

function renderSalesChart(dataPoints) {
  const canvas = document.getElementById('salesLineChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  const labels = dataPoints.map(d => d.label);
  const values = dataPoints.map(d => parseFloat(d.total));

  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventas (C$)',
        data: values,
        borderColor: '#8B0000',
        backgroundColor: 'rgba(139, 0, 0, 0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#C9A84C',
        pointBorderColor: '#8B0000',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `Facturado: ${formatMoney(c.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10, family: 'DM Sans' } }
        },
        y: {
          border: { dash: [4, 4] },
          grid: { color: 'rgba(120, 120, 120, 0.1)' },
          ticks: {
            font: { size: 10, family: 'DM Sans' },
            callback: (v) => 'C$' + v.toLocaleString('es-NI')
          }
        }
      }
    }
  });
}

function renderMermasChart(mermasData) {
  const canvas = document.getElementById('mermasChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');

  if (mermasChartInstance) {
    mermasChartInstance.destroy();
  }

  const labels = mermasData.map(m => m.label || m.producto_nombre);
  const values = mermasData.map(m => parseFloat(m.total_perdida !== undefined ? m.total_perdida : (m.costo_perdida || 0)));

  mermasChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Pérdidas (C$)',
        data: values,
        borderColor: '#B3261E',
        backgroundColor: 'rgba(179, 38, 30, 0.08)',
        borderWidth: 2.2,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#B3261E',
        pointBorderColor: '#FFFFFF',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `Pérdida: ${formatMoney(c.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10, family: 'DM Sans' } }
        },
        y: {
          border: { dash: [4, 4] },
          grid: { color: 'rgba(120, 120, 120, 0.1)' },
          ticks: {
            font: { size: 10, family: 'DM Sans' },
            callback: (v) => 'C$' + v.toLocaleString('es-NI')
          }
        }
      }
    }
  });
}

function renderTopProducts(products) {
  const tbody = document.getElementById('topProductsTableBody');
  if (!tbody) return;
  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 1.5rem;">Sin registros de venta</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td><strong style="color: var(--color-text-main);">${p.nombre}</strong></td>
      <td style="text-align: right; font-weight: 600;">${parseFloat(p.cantidad_vendida).toFixed(1)} lb</td>
      <td style="text-align: right; color: var(--color-primary); font-weight: 700;">${formatMoney(p.ingresos_generados)}</td>
    </tr>
  `).join('');
}

function renderBestClients(clients) {
  const tbody = document.getElementById('bestClientsTableBody');
  if (!tbody) return;
  if (!clients || clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 1.5rem;">Sin clientes destacados</td></tr>';
    return;
  }

  tbody.innerHTML = clients.map(c => `
    <tr>
      <td><strong style="color: var(--color-text-main);">${c.nombre}</strong></td>
      <td style="text-align: right; font-weight: 600;">${c.numero_ordenes}</td>
      <td style="text-align: right; color: var(--color-success); font-weight: 700;">${formatMoney(c.total_compras)}</td>
    </tr>
  `).join('');
}

function renderStockAlerts(alerts) {
  const tbody = document.getElementById('stockAlertsTableBody');
  if (!tbody) return;
  if (!alerts || alerts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--color-success); padding: 1.5rem;">Todo el stock se encuentra en niveles óptimos</td></tr>';
    return;
  }

  tbody.innerHTML = alerts.map(a => `
    <tr>
      <td><span style="font-weight: 600; color: var(--color-text-main);">${a.nombre}</span></td>
      <td style="text-align: right; color: var(--color-danger); font-weight: 700;">${parseFloat(a.stock_actual).toFixed(1)} lb</td>
      <td style="text-align: right; color: var(--color-text-muted);">${parseFloat(a.stock_minimo).toFixed(1)} lb</td>
    </tr>
  `).join('');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAnalytics);
} else {
  loadAnalytics();
}
