const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
  ? 'http://localhost:3000/api'
  : '/api';

const token = localStorage.getItem('san_martin_token');
const userStr = localStorage.getItem('san_martin_user');

if (!token || !userStr) {
  window.location.href = './login.html';
}

const user = JSON.parse(userStr || '{}');

document.getElementById('userName').textContent = user.nombre || 'Usuario';
document.getElementById('userRole').textContent = (user.rol || 'usuario').toUpperCase();
document.getElementById('userAvatar').textContent = (user.nombre || 'U').charAt(0).toUpperCase();

const navInventario = document.getElementById('navInventarioLink');
const navVentas = document.getElementById('navVentasLink');
const navCxc = document.getElementById('navCxcLink');
const btnOpenClienteModal = document.getElementById('btnOpenClienteModal');
const cliTelefonoInput = document.getElementById('cliTelefono');
const cliTelefonoError = document.getElementById('cliTelefonoError');

if (user.rol === 'vendedor') {
  if (navInventario) navInventario.style.display = 'none';
  if (navVentas) navVentas.style.display = '';
  if (navCxc) navCxc.style.display = '';
  if (btnOpenClienteModal) btnOpenClienteModal.style.display = 'none';
} else if (user.rol === 'gerente') {
  if (navInventario) navInventario.style.display = '';
  if (navVentas) navVentas.style.display = 'none';
  if (navCxc) navCxc.style.display = '';
  if (btnOpenClienteModal) btnOpenClienteModal.style.display = '';
}

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

const toastEl = document.getElementById('toast');
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = 'toast show ' + (isError ? 'toast-error' : 'toast-success');
  setTimeout(() => {
    toastEl.className = 'toast';
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

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

window.openModal = openModal;
window.closeModal = closeModal;

if (cliTelefonoInput) {
  cliTelefonoInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (cliTelefonoError) {
      if (e.target.value.length === 8 || e.target.value.length === 0) {
        cliTelefonoError.style.display = 'none';
      }
    }
  });
}

if (btnOpenClienteModal) {
  btnOpenClienteModal.addEventListener('click', () => {
    if (user.rol === 'vendedor') {
      showToast('No tiene permisos para crear clientes', true);
      return;
    }
    if (cliTelefonoError) cliTelefonoError.style.display = 'none';
    openModal('modalCliente');
  });
}

let clientsData = [];

async function loadClients() {
  try {
    const res = await fetch(`${API_BASE_URL}/clientes`, {
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
    if (data.success && Array.isArray(data.data)) {
      clientsData = data.data;
    } else {
      throw new Error(data.error || 'Error al obtener clientes');
    }
  } catch (err) {
    clientsData = [];
    showToast(err.message, true);
  }

  renderClients(clientsData);
}

function renderClients(list) {
  const tableBody = document.getElementById('clientesTableBody');
  if (!list || list.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No se encontraron clientes registrados</td></tr>';
    return;
  }

  tableBody.innerHTML = list.map(c => {
    const initials = c.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    return `
      <tr>
        <td><strong>#${String(c.id).padStart(4, '0')}</strong></td>
        <td>
          <div style="display: flex; align-items: center;">
            <div class="client-avatar-badge">${initials}</div>
            <strong style="color: #1A1A1A;">${c.nombre}</strong>
          </div>
        </td>
        <td>${c.telefono || '-'}</td>
        <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${c.direccion || '-'}
        </td>
        <td>${c.email || '-'}</td>
        <td style="font-weight: 700; color: var(--color-primary);">${formatMoney(c.limite_credito)}</td>
        <td>
          <span class="badge ${c.activo ? 'badge-success' : 'badge-warning'}">
            ${c.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="verHistorial(${c.id}, '${c.nombre.replace(/'/g, "\\'")}')" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
            Historial de Compras
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

const searchCliente = document.getElementById('searchCliente');
if (searchCliente) {
  searchCliente.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = clientsData.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.telefono && c.telefono.includes(q)) ||
      (c.direccion && c.direccion.toLowerCase().includes(q))
    );
    renderClients(filtered);
  });
}

document.getElementById('formNuevoCliente').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (user.rol === 'vendedor') {
    showToast('No tiene permisos para crear clientes', true);
    return;
  }

  const rawTelefono = document.getElementById('cliTelefono').value.replace(/\D/g, '').trim();
  if (rawTelefono.length < 8) {
    if (cliTelefonoError) cliTelefonoError.style.display = 'block';
    showToast('El teléfono debe tener exactamente 8 dígitos', true);
    document.getElementById('cliTelefono').focus();
    return;
  }
  if (cliTelefonoError) cliTelefonoError.style.display = 'none';

  const telefono = `+505${rawTelefono}`;
  const nombre = document.getElementById('cliNombre').value.trim();
  const direccion = document.getElementById('cliDireccion').value.trim();
  const email = document.getElementById('cliEmail').value.trim();
  const limite_credito = parseFloat(document.getElementById('cliLimiteCredito').value || 0);

  const payload = {
    nombre,
    telefono,
    direccion,
    email,
    limite_credito,
    activo: true
  };

  const btnSubmit = document.getElementById('btnGuardarCliente');
  btnSubmit.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al guardar cliente');
    }

    showToast('Cliente registrado exitosamente');
    closeModal('modalCliente');
    document.getElementById('formNuevoCliente').reset();
    if (cliTelefonoError) cliTelefonoError.style.display = 'none';
    await loadClients();
  } catch (err) {
    showToast(err.message || 'Error al guardar cliente', true);
  } finally {
    btnSubmit.disabled = false;
  }
});

window.verHistorial = async function(clienteId, clienteNombre) {
  document.getElementById('historialClienteNombre').textContent = `Historial: ${clienteNombre}`;
  const container = document.getElementById('historialContent');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">Cargando historial de compras...</div>';
  openModal('modalHistorial');

  try {
    const res = await fetch(`${API_BASE_URL}/clientes/${clienteId}/ventas`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al obtener historial');
    }

    const ventas = data.data;
    if (ventas.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No hay registros de compras previas para este cliente.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Condición</th>
              <th>Total Facturado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${ventas.map(v => `
              <tr>
                <td><strong>#${String(v.id).padStart(5, '0')}</strong></td>
                <td>${formatDate(v.fecha)}</td>
                <td style="text-transform: capitalize;">${v.tipo_pago}</td>
                <td style="font-weight: 700;">${formatMoney(v.total)}</td>
                <td>
                  <span class="badge ${v.estado === 'pagada' ? 'badge-success' : 'badge-warning'}">
                    ${v.estado}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    showToast(err.message || 'Error al obtener historial', true);
  }
};

document.addEventListener('DOMContentLoaded', loadClients);