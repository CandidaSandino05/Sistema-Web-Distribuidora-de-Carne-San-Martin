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

document.getElementById('userName').textContent = user.nombre || 'Administrador';
document.getElementById('userRole').textContent = (user.rol || 'administrador').toUpperCase();
document.getElementById('userAvatar').textContent = (user.nombre || 'A').charAt(0).toUpperCase();

document.getElementById('btnLogout').addEventListener('click', () => {
  localStorage.removeItem('san_martin_token');
  localStorage.removeItem('san_martin_user');
  window.location.href = './login.html';
});

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

const nioFormatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
function formatMoney(amount) {
  return nioFormatter.format(parseFloat(amount || 0));
}

let salesChartInstance = null;
let categoryChartInstance = null;
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
  } catch (err) {
    renderEmptyDashboard();
  }
}

function renderDashboard(analytics) {
  const kpis = analytics.kpis || {};
  document.getElementById('kpiInversion').textContent = formatMoney(kpis.inversion_inventario);
  document.getElementById('kpiVentasMes').textContent = formatMoney(kpis.ventas_mes);
  document.getElementById('kpiMargen').textContent = formatMoney(kpis.margen_proyectado);
  document.getElementById('kpiCxc').textContent = formatMoney(kpis.total_cxc);

  renderSalesChart(analytics.ventas_7_dias || []);
  renderMermasChart(analytics.mermas_resumen || []);
  renderCategoryChart(analytics.categorias || []);

  renderTopProducts(analytics.top_productos || []);
  renderBestClients(analytics.mejores_clientes || []);
  renderStockAlerts(analytics.alertas_stock || []);
}

function renderEmptyDashboard() {
  document.getElementById('kpiInversion').textContent = formatMoney(0);
  document.getElementById('kpiVentasMes').textContent = formatMoney(0);
  document.getElementById('kpiMargen').textContent = formatMoney(0);
  document.getElementById('kpiCxc').textContent = formatMoney(0);

  renderSalesChart([]);
  renderMermasChart([]);
  renderCategoryChart([]);

  renderTopProducts([]);
  renderBestClients([]);
  renderStockAlerts([]);
}

function renderSalesChart(dataPoints) {
  const ctx = document.getElementById('salesLineChart').getContext('2d');
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
            label: (ctx) => `Facturado: ${formatMoney(ctx.raw)}`
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
  const ctx = document.getElementById('mermasChart').getContext('2d');

  if (mermasChartInstance) {
    mermasChartInstance.destroy();
  }

  const labels = mermasData.map(m => m.producto_nombre);
  const values = mermasData.map(m => parseFloat(m.costo_perdida));

  mermasChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Pérdida en C$',
        data: values,
        backgroundColor: [
          '#6A0D14',
          '#8B0000',
          '#B3261E',
          '#C9A84C'
        ],
        borderRadius: 4
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
          ticks: { font: { size: 9, family: 'DM Sans' } }
        },
        y: {
          border: { dash: [4, 4] },
          grid: { color: 'rgba(120, 120, 120, 0.1)' },
          ticks: {
            font: { size: 9, family: 'DM Sans' },
            callback: (v) => 'C$' + v.toLocaleString('es-NI')
          }
        }
      }
    }
  });
}

function renderCategoryChart(categories) {
  const ctx = document.getElementById('categoryDoughnutChart').getContext('2d');

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const labels = categories.length > 0 ? categories.map(c => c.nombre) : ['Sin Categorías'];
  const values = categories.length > 0 ? categories.map(c => c.total) : [0];

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#6A0D14',
          '#8B0000',
          '#C9A84C',
          '#E7DFD5'
        ],
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 10, family: 'DM Sans' },
            boxWidth: 10,
            padding: 8
          }
        }
      },
      cutout: '68%'
    }
  });
}

function renderTopProducts(products) {
  const tbody = document.getElementById('topProductsTableBody');
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

document.addEventListener('DOMContentLoaded', loadAnalytics);