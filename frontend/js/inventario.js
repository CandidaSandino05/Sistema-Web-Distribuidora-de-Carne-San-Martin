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

if (userRole === 'vendedor') {
  window.location.href = './ventas.html';
}

const userNameEl = document.getElementById('userName');
if (userNameEl) userNameEl.textContent = user.nombre || 'Usuario';

const userRoleEl = document.getElementById('userRole');
if (userRoleEl) userRoleEl.textContent = (user.rol || 'usuario').toUpperCase();

const userAvatarEl = document.getElementById('userAvatar');
if (userAvatarEl) userAvatarEl.textContent = (user.nombre || 'U').charAt(0).toUpperCase();

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

const navDashboardLink = document.getElementById('navDashboardLink');
const navReportesLink = document.getElementById('navReportesLink');
const navClientesLink = document.getElementById('navClientesLink');
const navCxcLink = document.getElementById('navCxcLink');
const inventoryHeaderActions = document.getElementById('inventoryHeaderActions');
const thGanancia = document.getElementById('thGanancia');
const thAcciones = document.getElementById('thAcciones');

if (userRole === 'administrador') {
  if (navDashboardLink) navDashboardLink.style.display = 'flex';
  if (navReportesLink) navReportesLink.style.display = 'flex';
  if (navClientesLink) navClientesLink.style.display = 'none';
  if (navCxcLink) navCxcLink.style.display = 'none';
  if (inventoryHeaderActions) inventoryHeaderActions.style.display = 'none';
  if (thGanancia) thGanancia.style.display = '';
  if (thAcciones) thAcciones.style.display = 'none';
} else if (userRole === 'gerente') {
  if (navDashboardLink) navDashboardLink.style.display = 'none';
  if (navReportesLink) navReportesLink.style.display = 'none';
  if (navClientesLink) navClientesLink.style.display = 'flex';
  if (navCxcLink) navCxcLink.style.display = 'flex';
  if (inventoryHeaderActions) inventoryHeaderActions.style.display = 'flex';
  if (thGanancia) thGanancia.style.display = 'none';
  if (thAcciones) thAcciones.style.display = '';
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

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    el.classList.add('active');
    el.style.display = 'flex';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    el.classList.remove('active');
    el.style.display = 'none';
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

const btnAbrirModalProducto = document.getElementById('btn-abrir-modal-producto') || document.getElementById('btnOpenCreateModal');
if (btnAbrirModalProducto) {
  btnAbrirModalProducto.addEventListener('click', () => {
    openModal('modalProducto');
  });
}

const btnOpenIngreso = document.getElementById('btnOpenIngresoGeneralModal');
if (btnOpenIngreso) {
  btnOpenIngreso.addEventListener('click', () => {
    openModal('modalIngresoStock');
  });
}

const btnOpenMerma = document.getElementById('btnOpenMermaModal');
if (btnOpenMerma) {
  btnOpenMerma.addEventListener('click', () => {
    openModal('modalMerma');
  });
}

let inventory = [];

async function loadInventory() {
  try {
    const res = await fetch(`${API_BASE_URL}/productos`, {
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
    if (!data.success) {
      throw new Error(data.error || 'Error al cargar productos');
    }

    inventory = Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    inventory = [];
    showToast(err.message || 'Error al cargar productos', true);
  }

  renderInventory(inventory);
  populateSelects(inventory);
  checkStockAlerts(inventory);
}

function checkStockAlerts(items) {
  const lowStock = (items || []).filter(i => parseFloat(i.stock_actual) <= parseFloat(i.stock_minimo));
  const pill = document.getElementById('lowStockCounter');
  const text = document.getElementById('lowStockText');

  if (!pill || !text) return;

  if (lowStock.length > 0) {
    pill.style.display = 'inline-flex';
    text.textContent = `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} crítico`;
  } else {
    pill.style.display = 'none';
  }
}

function populateSelects(items) {
  const options = '<option value="">Seleccione el corte...</option>' +
    (items || []).map(i => `<option value="${i.id}">${i.nombre} (${i.stock_actual} lb en stock)</option>`).join('');

  const selectIngreso = document.getElementById('ingresoProductoSelect');
  const selectMerma = document.getElementById('mermaProductoSelect');

  if (selectIngreso) selectIngreso.innerHTML = options;
  if (selectMerma) selectMerma.innerHTML = options;
}

function renderInventory(items) {
  const tableBody = document.getElementById('productosTableBody');
  if (!tableBody) return;

  if (!items || items.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--color-text-muted); padding: 2.5rem;">No hay productos registrados en el inventario.</td></tr>';
    return;
  }

  tableBody.innerHTML = items.map(p => {
    const stock = parseFloat(p.stock_actual || 0);
    const minStock = parseFloat(p.stock_minimo || 0);
    const isCritical = stock <= minStock;
    const ganancia = parseFloat(p.precio_venta || 0) - parseFloat(p.precio_compra || 0);

    let gananciaCol = '';
    if (userRole === 'administrador') {
      gananciaCol = `<td style="font-weight: 700; color: var(--color-success);">${formatMoney(ganancia)}</td>`;
    }

    let accionesCol = '';
    if (userRole === 'gerente') {
      const deleteDisabled = p.ha_sido_vendido;
      accionesCol = `
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditarModal(${p.id})" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
            Editar
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="eliminarProducto(${p.id})" ${deleteDisabled ? 'disabled title="No se puede eliminar: tiene ventas asociadas"' : ''} style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: var(--color-danger);">
            Eliminar
          </button>
        </td>
      `;
    }

    return `
      <tr>
        <td><strong>#${String(p.id).padStart(4, '0')}</strong></td>
        <td>
          <div style="font-weight: 600; color: var(--color-text-main);">${p.nombre}</div>
        </td>
        <td>${p.unidad_medida || 'lb'}</td>
        <td>${formatMoney(p.precio_compra)}</td>
        <td style="font-weight: 700; color: var(--color-primary);">${formatMoney(p.precio_venta)}</td>
        ${gananciaCol}
        <td>
          <span class="stock-badge ${isCritical ? 'critical' : 'normal'}">
            ${stock.toFixed(2)} lb
          </span>
        </td>
        <td>${minStock.toFixed(2)} lb</td>
        <td>
          <span class="badge ${isCritical ? 'badge-danger' : 'badge-success'}">${isCritical ? 'Stock Bajo' : 'Normal'}</span>
        </td>
        ${accionesCol}
      </tr>
    `;
  }).join('');
}

const searchInput = document.getElementById('searchProductoInput') || document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = inventory.filter(i =>
      (i.nombre && i.nombre.toLowerCase().includes(q)) || String(i.id).includes(q)
    );
    renderInventory(filtered);
  });
}

const formNuevoProducto = document.getElementById('formNuevoProducto');
if (formNuevoProducto) {
  formNuevoProducto.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('prodNombre').value.trim();
    const unidad_medida = 'lb';
    const precio_compra = parseFloat(document.getElementById('prodPrecioCompra').value);
    const precio_venta = parseFloat(document.getElementById('prodPrecioVenta').value);
    const stock_actual = parseFloat(document.getElementById('prodStockInicial').value);
    const stock_minimo = parseFloat(document.getElementById('prodStockMinimo').value);

    if (precio_venta < precio_compra) {
      showToast('El precio de venta no puede ser menor al de compra', true);
      return;
    }

    const payload = {
      nombre,
      unidad_medida,
      precio_compra,
      precio_venta,
      stock_actual,
      stock_minimo
    };

    try {
      const res = await fetch(`${API_BASE_URL}/productos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar producto');
      }

      showToast('Producto creado exitosamente');
      closeModal('modalProducto');
      formNuevoProducto.reset();
      await loadInventory();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

window.openEditarModal = function(id) {
  const prod = inventory.find(i => i.id === id);
  if (!prod) return;

  const idEl = document.getElementById('editProdId');
  const nomEl = document.getElementById('editProdNombre');
  const pcEl = document.getElementById('editProdPrecioCompra');
  const pvEl = document.getElementById('editProdPrecioVenta');
  const smEl = document.getElementById('editProdStockMinimo');

  if (idEl) idEl.value = prod.id;
  if (nomEl) nomEl.value = prod.nombre;
  if (pcEl) pcEl.value = prod.precio_compra;
  if (pvEl) pvEl.value = prod.precio_venta;
  if (smEl) smEl.value = prod.stock_minimo;

  openModal('modalEditarProducto');
};

const formEditarProducto = document.getElementById('formEditarProducto');
if (formEditarProducto) {
  formEditarProducto.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editProdId').value;
    const nombre = document.getElementById('editProdNombre').value.trim();
    const precio_compra = parseFloat(document.getElementById('editProdPrecioCompra').value);
    const precio_venta = parseFloat(document.getElementById('editProdPrecioVenta').value);
    const stock_minimo = parseFloat(document.getElementById('editProdStockMinimo').value);

    if (precio_venta < precio_compra) {
      showToast('El precio de venta no puede ser menor al de compra', true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, precio_compra, precio_venta, stock_minimo })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar producto');
      }

      showToast('Producto actualizado exitosamente');
      closeModal('modalEditarProducto');
      await loadInventory();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

const formIngresoStock = document.getElementById('formIngresoStock');
if (formIngresoStock) {
  formIngresoStock.addEventListener('submit', async (e) => {
    e.preventDefault();

    const producto_id = parseInt(document.getElementById('ingresoProductoSelect').value, 10);
    const cantidad = parseFloat(document.getElementById('ingresoCantidad').value);

    if (isNaN(cantidad) || cantidad <= 0) {
      showToast('Ingrese una cantidad válida mayor a 0', true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/inventario/ingreso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ producto_id, cantidad })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar ingreso de stock');
      }

      showToast('Ingreso de stock procesado correctamente');
      closeModal('modalIngresoStock');
      formIngresoStock.reset();
      await loadInventory();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

const formMerma = document.getElementById('formMerma') || document.getElementById('formMermaStock');
if (formMerma) {
  formMerma.addEventListener('submit', async (e) => {
    e.preventDefault();

    const producto_id = parseInt(document.getElementById('mermaProductoSelect').value, 10);
    const cantidad = parseFloat(document.getElementById('mermaCantidad').value);
    const motivo = document.getElementById('mermaMotivo').value.trim();

    if (isNaN(cantidad) || cantidad <= 0) {
      showToast('Ingrese una cantidad válida mayor a 0', true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/inventario/merma`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ producto_id, cantidad, motivo })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al descontar merma');
      }

      showToast('Merma registrada y stock actualizado');
      closeModal('modalMerma');
      formMerma.reset();
      await loadInventory();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

window.eliminarProducto = async function(id) {
  const prod = inventory.find(p => p.id === id);
  if (prod && prod.ha_sido_vendido) {
    showToast('No se puede eliminar un producto con historial de ventas', true);
    return;
  }

  if (!confirm('¿Confirma que desea eliminar este producto?')) return;

  try {
    const res = await fetch(`${API_BASE_URL}/productos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al eliminar');
    }

    showToast('Producto eliminado');
    await loadInventory();
  } catch (err) {
    showToast(err.message, true);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadInventory);
} else {
  loadInventory();
}