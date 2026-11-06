
const token = localStorage.getItem('san_martin_token');
const userStr = localStorage.getItem('san_martin_user');

if (!token || !userStr) {
  window.location.href = './login.html';
}

const user = JSON.parse(userStr || '{}');
const userRole = (user.rol || '').toLowerCase();

if (userRole === 'vendedor') {
  window.location.href = './ventas.html';
}

const userNameEl = document.getElementById('userName');
if (userNameEl) userNameEl.textContent = user.nombre || 'Usuario';

const userRoleEl = document.getElementById('userRole');
if (userRoleEl) userRoleEl.textContent = (user.rol || 'usuario').toUpperCase();

const userAvatarEl = document.getElementById('userAvatar');
if (userAvatarEl) userAvatarEl.textContent = (user.nombre || 'U').charAt(0).toUpperCase();

const navDashboard = document.getElementById('navDashboardLink');
const navInventario = document.getElementById('navInventarioLink');
const navMatadero = document.getElementById('navMataderoLink');
const navVentas = document.getElementById('navVentasLink');
const navFacturas = document.getElementById('navFacturasLink');
const navCxc = document.getElementById('navCxcLink');
const navReportes = document.getElementById('navReportesLink');
const navMermas = document.getElementById('navMermasLink');
const btnOpenClienteModal = document.getElementById('btnOpenClienteModal');
const cliTelefonoInput = document.getElementById('cliTelefono');
const cliTelefonoError = document.getElementById('cliTelefonoError');

if (userRole === 'administrador') {
  if (navDashboard) navDashboard.style.display = 'flex';
  if (navInventario) navInventario.style.display = 'flex';
  if (navMatadero) navMatadero.style.display = 'flex';
  if (navVentas) navVentas.style.display = 'none';
  if (navFacturas) navFacturas.style.display = 'flex';
  if (navCxc) navCxc.style.display = 'flex';
  if (navMermas) navMermas.style.display = 'flex';
  if (navReportes) navReportes.style.display = 'flex';
  if (btnOpenClienteModal) btnOpenClienteModal.style.display = 'none';
} else if (userRole === 'gerente') {
  if (navDashboard) navDashboard.style.display = 'none';
  if (navInventario) navInventario.style.display = 'flex';
  if (navMatadero) navMatadero.style.display = 'none';
  if (navVentas) navVentas.style.display = 'none';
  if (navFacturas) navFacturas.style.display = 'flex';
  if (navCxc) navCxc.style.display = 'flex';
  if (navReportes) navReportes.style.display = 'none';
  if (btnOpenClienteModal) btnOpenClienteModal.style.display = 'inline-flex';
} else if (userRole === 'vendedor') {
  if (navDashboard) navDashboard.style.display = 'none';
  if (navInventario) navInventario.style.display = 'none';
  if (navMatadero) navMatadero.style.display = 'none';
  if (navVentas) navVentas.style.display = 'flex';
  if (navFacturas) navFacturas.style.display = 'flex';
  if (navCxc) navCxc.style.display = 'flex';
  if (navReportes) navReportes.style.display = 'none';
  if (btnOpenClienteModal) btnOpenClienteModal.style.display = 'none';
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
    if (userRole !== 'gerente') {
      showToast('Solo el rol de Gerente puede registrar nuevos clientes', true);
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
    showToast(err.message || 'Error al obtener clientes', true);
  }

  renderClients(clientsData);
}

function renderClients(list) {
  const tableBody = document.getElementById('clientesTableBody');
  if (!tableBody) return;

  if (!list || list.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No se encontraron clientes registrados</td></tr>';
    return;
  }

  tableBody.innerHTML = list.map(c => {
    const initials = (c.nombre || 'C').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    return `
      <tr>
        <td><strong>#${String(c.id).padStart(4, '0')}</strong></td>
        <td>
          <div style="display: flex; align-items: center;">
            <div class="client-avatar-badge">${initials}</div>
            <strong style="color: var(--color-text-main);">${c.nombre}</strong>
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
          <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="verHistorial(${c.id}, '${String(c.nombre).replace(/'/g, "\\'")}')" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
              Historial
            </button>
            ${String(c.nombre || '').toLowerCase().includes('consumidor final') ? '' : `
              <button type="button" class="btn btn-secondary btn-sm" onclick="toggleEstadoCliente(${c.id}, ${!c.activo}, '${String(c.nombre).replace(/'/g, "\\'")}')" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; ${c.activo ? 'color: var(--color-danger); border-color: rgba(211,47,47,0.3);' : 'color: var(--color-success); border-color: rgba(46,125,50,0.3);'}">
                ${c.activo ? 'Inactivar' : 'Activar'}
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleEstadoCliente = async function(id, nuevoEstado, nombre) {
  const advertencia = nuevoEstado
    ? `¿Desea activar al cliente "${nombre}"? Volverá a estar disponible en el punto de venta.`
    : `¿Desea inactivar al cliente "${nombre}"? No aparecerá para ventas nuevas en el POS (mantendrá su historial y saldo en CxC si adeuda).`;

  if (!confirm(advertencia)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/clientes/${id}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ activo: nuevoEstado })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al actualizar estado del cliente');
    }

    showToast(`Cliente "${nombre}" ${nuevoEstado ? 'activado' : 'inactivado'} exitosamente`);
    await loadClients();
  } catch (err) {
    showToast(err.message, true);
  }
};

const searchCliente = document.getElementById('clientSearchInput') || document.getElementById('searchCliente');
if (searchCliente) {
  searchCliente.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = clientsData.filter(c =>
      (c.nombre && c.nombre.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.direccion && c.direccion.toLowerCase().includes(q))
    );
    renderClients(filtered);
  });
}

const formNuevoCliente = document.getElementById('formNuevoCliente');
if (formNuevoCliente) {
  formNuevoCliente.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (userRole !== 'gerente') {
      showToast('Solo el Gerente tiene permisos para crear clientes', true);
      return;
    }

    const rawTelefono = cliTelefonoInput ? cliTelefonoInput.value.replace(/\D/g, '').trim() : '';
    if (rawTelefono.length < 8) {
      if (cliTelefonoError) cliTelefonoError.style.display = 'block';
      showToast('El teléfono debe tener exactamente 8 dígitos', true);
      if (cliTelefonoInput) cliTelefonoInput.focus();
      return;
    }
    if (cliTelefonoError) cliTelefonoError.style.display = 'none';

    const telefono = `+505${rawTelefono}`;
    const nombreEl = document.getElementById('cliNombre');
    const dirEl = document.getElementById('cliDireccion');
    const emailEl = document.getElementById('cliEmail');
    const limEl = document.getElementById('cliLimiteCredito');

    const nombre = nombreEl ? nombreEl.value.trim() : '';
    const direccion = dirEl ? dirEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const limite_credito = parseFloat((limEl && limEl.value) ? limEl.value : 0);

    const payload = {
      nombre,
      telefono,
      direccion,
      email,
      limite_credito,
      activo: true
    };

    const btnSubmit = document.getElementById('btnGuardarCliente');
    if (btnSubmit) btnSubmit.disabled = true;

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
      formNuevoCliente.reset();
      if (cliTelefonoError) cliTelefonoError.style.display = 'none';
      await loadClients();
    } catch (err) {
      showToast(err.message || 'Error al guardar cliente', true);
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  });
}

window.verHistorial = async function(clienteId, clienteNombre) {
  const histNombreEl = document.getElementById('historialClienteNombre');
  if (histNombreEl) histNombreEl.textContent = `Historial: ${clienteNombre}`;

  const container = document.getElementById('historialContent');
  if (container) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem;">Cargando historial de compras...</div>';
  }
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

    const ventas = data.data || [];
    if (!container) return;

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
                <td><strong>${v.numero_factura || ('#' + String(v.id).padStart(5, '0'))}</strong></td>
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
    if (container) {
      container.innerHTML = `<div style="text-align: center; color: var(--color-danger); padding: 2rem;">${err.message || 'Error al obtener historial'}</div>`;
    }
    showToast(err.message || 'Error al obtener historial', true);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadClients);
} else {
  loadClients();
}
