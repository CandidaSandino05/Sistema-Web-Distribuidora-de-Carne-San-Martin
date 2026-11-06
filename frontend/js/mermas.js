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
    if (toastEl) toastEl.className = 'toast';
  }, 3500);
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

let mermasData = [];

async function loadMermas() {
  const tbody = document.getElementById('mermasTableBody');
  try {
    const res = await fetch(`${API_BASE_URL}/inventario/mermas`, {
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
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Error al conectar con el servidor');
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Respuesta inválida');
    }

    const data = json.data;
    mermasData = Array.isArray(data.mermas) ? data.mermas : [];

    const kpiImpacto = document.getElementById('kpiImpactoMermas');
    const kpiLibras = document.getElementById('kpiLibrasMermas');
    const kpiConteo = document.getElementById('kpiConteoMermas');

    if (kpiImpacto) kpiImpacto.textContent = formatMoney(data.total_impacto);
    if (kpiLibras) kpiLibras.textContent = `${parseFloat(data.total_libras || 0).toFixed(2)} lb`;
    if (kpiConteo) kpiConteo.textContent = data.total_registros || 0;

    renderMermasTable(mermasData);
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-danger); padding: 2.5rem;">${err.message}</td></tr>`;
    }
    showToast(err.message, true);
  }
}

function renderMermasTable(list) {
  const tbody = document.getElementById('mermasTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 2.5rem;">No hay mermas registradas con los filtros actuales.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(m => `
    <tr>
      <td><strong>#${String(m.id).padStart(4, '0')}</strong></td>
      <td>${formatDateTime(m.fecha)}</td>
      <td><strong style="color: var(--color-primary);">${m.producto_nombre}</strong></td>
      <td style="text-align: right; font-weight: 600;">${parseFloat(m.cantidad).toFixed(2)} lb</td>
      <td style="text-align: right;">${formatMoney(m.precio_compra)}</td>
      <td style="text-align: right; font-weight: 800; color: var(--color-danger);">${formatMoney(m.impacto_economico)}</td>
      <td><span class="badge badge-warning">${m.motivo || 'Merma operativa'}</span></td>
      <td>${m.usuario_nombre || 'Gerente Operativo'}</td>
    </tr>
  `).join('');
}

const filtroInput = document.getElementById('filtroMermasInput');
if (filtroInput) {
  filtroInput.addEventListener('input', () => {
    const q = filtroInput.value.toLowerCase().trim();
    if (!q) {
      renderMermasTable(mermasData);
      return;
    }
    const filtered = mermasData.filter(m =>
      (m.producto_nombre && m.producto_nombre.toLowerCase().includes(q)) ||
      (m.motivo && m.motivo.toLowerCase().includes(q)) ||
      (m.usuario_nombre && m.usuario_nombre.toLowerCase().includes(q))
    );
    renderMermasTable(filtered);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadMermas);
} else {
  loadMermas();
}