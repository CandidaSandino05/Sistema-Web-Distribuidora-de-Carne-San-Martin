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
const navClientes = document.getElementById('navClientesLink');
const navCxc = document.getElementById('navCxcLink');
const navReportes = document.getElementById('navReportesLink');
const navMermas = document.getElementById('navMermasLink');
const facturasSubtitle = document.getElementById('facturasSubtitle');

if (userRole === 'administrador') {
  if (navDashboard) navDashboard.style.display = 'flex';
  if (navInventario) navInventario.style.display = 'flex';
  if (navMatadero) navMatadero.style.display = 'flex';
  if (navVentas) navVentas.style.display = 'none';
  if (navClientes) navClientes.style.display = 'flex';
  if (navCxc) navCxc.style.display = 'flex';
  if (navMermas) navMermas.style.display = 'flex';
  if (navReportes) navReportes.style.display = 'flex';
  if (facturasSubtitle) facturasSubtitle.textContent = 'Auditoría global de todas las facturas emitidas en la distribuidora';
} else if (userRole === 'gerente') {
  if (navDashboard) navDashboard.style.display = 'none';
  if (navInventario) navInventario.style.display = 'flex';
  if (navMatadero) navMatadero.style.display = 'none';
  if (navVentas) navVentas.style.display = 'none';
  if (navClientes) navClientes.style.display = 'flex';
  if (navCxc) navCxc.style.display = 'flex';
  if (navReportes) navReportes.style.display = 'none';
  if (facturasSubtitle) facturasSubtitle.textContent = 'Supervisión general de todas las facturas emitidas';
} else if (userRole === 'vendedor') {
  if (navDashboard) navDashboard.style.display = 'none';
  if (navInventario) navInventario.style.display = 'none';
  if (navMatadero) navMatadero.style.display = 'none';
  if (navVentas) navVentas.style.display = 'flex';
  if (navClientes) navClientes.style.display = 'none';
  if (navCxc) navCxc.style.display = 'flex';
  if (navReportes) navReportes.style.display = 'none';
  if (facturasSubtitle) facturasSubtitle.textContent = `Mis facturas emitidas (${user.nombre || 'Vendedor'})`;
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
  }, 3800);
}

const currencyFormatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
function formatMoney(amount) {
  return currencyFormatter.format(parseFloat(amount || 0));
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

let facturasList = [];
let currentTipoFilter = 'todas';

async function loadFacturas() {
  const tbody = document.getElementById('facturasTableBody');
  try {
    const res = await fetch(`${API_BASE_URL}/ventas`, {
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

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al cargar facturas');
    }

    let rows = Array.isArray(data.data) ? data.data : [];
    if (userRole === 'vendedor' && user.id) {
      rows = rows.filter(v => Number(v.usuario_id) === Number(user.id));
    }

    facturasList = rows;
    applyFacturaFilters();
  } catch (err) {
    facturasList = [];
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--color-danger); padding: 2.5rem;">${err.message || 'Error al cargar facturas'}</td></tr>`;
    }
    showToast(err.message || 'Error al cargar facturas', true);
  }
}

const searchFacturaInput = document.getElementById('searchFacturaInput');
if (searchFacturaInput) {
  searchFacturaInput.addEventListener('input', applyFacturaFilters);
}

const tipoButtons = document.querySelectorAll('.filter-pill-btn[data-tipo]');
tipoButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tipoButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTipoFilter = btn.getAttribute('data-tipo');
    applyFacturaFilters();
  });
});

function applyFacturaFilters() {
  const q = searchFacturaInput ? searchFacturaInput.value.toLowerCase().trim() : '';
  let filtered = [...facturasList];

  if (currentTipoFilter !== 'todas') {
    filtered = filtered.filter(f => String(f.tipo_pago || '').toLowerCase() === currentTipoFilter);
  }

  if (q) {
    filtered = filtered.filter(f =>
      (f.numero_factura && f.numero_factura.toLowerCase().includes(q)) ||
      (f.cliente_nombre && f.cliente_nombre.toLowerCase().includes(q)) ||
      (f.usuario_nombre && f.usuario_nombre.toLowerCase().includes(q)) ||
      String(f.id).includes(q)
    );
  }

  renderFacturas(filtered);
}

function renderFacturas(list) {
  const tbody = document.getElementById('facturasTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--color-text-muted); padding: 2.5rem;">No se encontraron facturas con los criterios seleccionados.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(f => {
    const numFac = f.numero_factura || `FAC-${String(f.id).padStart(6, '0')}`;
    const subtotal = parseFloat(f.subtotal !== undefined ? f.subtotal : f.total);
    const descuento = parseFloat(f.descuento || 0);
    const total = parseFloat(f.total || 0);
    const isPaid = String(f.estado || '').toLowerCase() === 'pagada';

    return `
      <tr style="cursor: pointer;" onclick="verDetalleFactura(${f.id})">
        <td><strong style="color: var(--color-primary);">${numFac}</strong></td>
        <td>${formatDateTime(f.fecha)}</td>
        <td><strong style="color: var(--color-text-main);">${f.cliente_nombre}</strong></td>
        <td>${f.usuario_nombre || 'Vendedor'}</td>
        <td>
          <span class="badge ${f.tipo_pago === 'credito' ? 'badge-warning' : 'badge-info'}">
            ${f.tipo_pago === 'credito' ? 'CRÉDITO' : 'CONTADO'}
          </span>
        </td>
        <td style="text-align: right;">${formatMoney(subtotal)}</td>
        <td style="text-align: right; color: var(--color-danger);">${descuento > 0 ? '-' + formatMoney(descuento) : 'C$0.00'}</td>
        <td style="text-align: right; font-weight: 800; color: var(--color-primary);">${formatMoney(total)}</td>
        <td>
          <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
            ${String(f.estado || 'pagada').toUpperCase()}
          </span>
        </td>
        <td style="text-align: right;" onclick="event.stopPropagation();">
          <button type="button" class="btn btn-secondary btn-sm" onclick="verDetalleFactura(${f.id})">
            Ver Factura
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.verDetalleFactura = async function(ventaId) {
  const content = document.getElementById('modalFacturaContent');
  if (content) {
    content.innerHTML = '<div style="text-align: center; padding: 2rem;">Cargando comprobante...</div>';
  }
  openModal('modalDetalleFactura');

  try {
    const res = await fetch(`${API_BASE_URL}/ventas/${ventaId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudo cargar el detalle de la factura');
    }

    const f = data.data;
    const numFac = f.numero_factura || `FAC-${String(f.id).padStart(6, '0')}`;
    const items = Array.isArray(f.items) ? f.items : [];
    const calcSubtotal = items.reduce((acc, it) => acc + parseFloat(it.subtotal || (it.cantidad * it.precio_unitario) || 0), 0);
    const subtotal = parseFloat(f.subtotal || calcSubtotal || f.total);
    const descuento = parseFloat(f.descuento || 0);
    const total = parseFloat(f.total || 0);
    const isPaid = String(f.estado || '').toLowerCase() === 'pagada';

    if (!content) return;

    content.innerHTML = `
      <div class="invoice-sheet">
        <div class="invoice-brand-header">
          <div style="display: flex; align-items: center; gap: 0.9rem;">
            <div style="width: 48px; height: 48px; border-radius: 10px; background: var(--color-primary); color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 5c-1.5 0-2.8 1.2-3 2.7-.8-.5-1.8-.7-3-.7s-2.2.2-3 .7C9.8 6.2 8.5 5 7 5c-2.2 0-4 1.8-4 4 0 2 1.3 3.6 3.1 3.9C6.4 14.5 7 16.2 7 18h10c0-1.8.6-3.5.9-5.1 1.8-.3 3.1-1.9 3.1-3.9 0-2.2-1.8-4-4-4z"/>
                <circle cx="9" cy="11" r="1" fill="currentColor"/>
                <circle cx="15" cy="11" r="1" fill="currentColor"/>
                <path d="M10 15h4"/>
              </svg>
            </div>
            <div>
              <div style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: var(--color-primary);">DISTRIBUIDORA DE CARNES SAN MARTÍN</div>
              <div style="font-size: 0.8rem; color: var(--color-text-muted);">Mercado Mayoreo, Sector Cárnico • Managua, Nicaragua</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); font-weight: 700;">Factura Comercial</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--color-primary);">${numFac}</div>
            <div style="font-size: 0.8rem; color: var(--color-text-muted);">${formatDateTime(f.fecha)}</div>
          </div>
        </div>

        <div class="invoice-meta-grid">
          <div>
            <div style="font-size: 0.74rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; margin-bottom: 0.25rem;">Datos del Cliente</div>
            <div><strong>Cliente:</strong> ${f.cliente_nombre}</div>
            <div><strong>Teléfono:</strong> ${f.cliente_telefono || 'N/A'}</div>
            <div><strong>Dirección:</strong> ${f.cliente_direccion || 'Mostrador Mercado Mayoreo'}</div>
          </div>
          <div>
            <div style="font-size: 0.74rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; margin-bottom: 0.25rem;">Datos de Emisión</div>
            <div><strong>Emitida por (Vendedor):</strong> ${f.usuario_nombre || 'Vendedor'}</div>
            <div><strong>Condición de Pago:</strong> <span style="text-transform: uppercase; font-weight: 700;">${f.tipo_pago}</span></div>
            <div><strong>Estado:</strong> <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">${String(f.estado || 'pagada').toUpperCase()}</span></div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table table-compact">
            <thead>
              <tr>
                <th>#</th>
                <th>Corte Cárnico</th>
                <th style="text-align: right;">Peso (lb)</th>
                <th style="text-align: right;">Precio Unitario (C$)</th>
                <th style="text-align: right;">Subtotal (C$)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${it.producto_nombre}</strong></td>
                  <td style="text-align: right; font-weight: 600;">${parseFloat(it.cantidad).toFixed(2)} lb</td>
                  <td style="text-align: right;">${formatMoney(it.precio_unitario)}</td>
                  <td style="text-align: right; font-weight: 700;">${formatMoney(it.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="invoice-totals-box">
          <div class="invoice-totals-row">
            <span>Subtotal:</span>
            <strong>${formatMoney(subtotal)}</strong>
          </div>
          <div class="invoice-totals-row" style="color: var(--color-danger);">
            <span>Descuento (-C$):</span>
            <strong>-${formatMoney(descuento)}</strong>
          </div>
          <div class="invoice-totals-row grand-total">
            <span>Total a Pagar:</span>
            <span>${formatMoney(total)}</span>
          </div>
        </div>

        <div class="invoice-signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Entregado Conforme (Distribuidora)</span>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Recibido Conforme (Cliente)</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    if (content) {
      content.innerHTML = `<div style="text-align: center; color: var(--color-danger); padding: 2rem;">${err.message}</div>`;
    }
    showToast(err.message, true);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFacturas);
} else {
  loadFacturas();
}
