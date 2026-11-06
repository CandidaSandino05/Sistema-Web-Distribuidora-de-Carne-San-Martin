const API_URL = 'https://sistema-web-distribuidora-de-carne-san.onrender.com/api';

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
const navMataderoLink = document.getElementById('navMataderoLink');
const navVentasLink = document.getElementById('navVentasLink');
const navFacturasLink = document.getElementById('navFacturasLink');
const navReportesLink = document.getElementById('navReportesLink');
const navClientesLink = document.getElementById('navClientesLink');
const navCxcLink = document.getElementById('navCxcLink');
const navMermasLink = document.getElementById('navMermasLink');
const inventoryHeaderActions = document.getElementById('inventoryHeaderActions');
const adminInventoryKpis = document.getElementById('adminInventoryKpis');
const thGanancia = document.getElementById('thGanancia');
const thAcciones = document.getElementById('thAcciones');

if (userRole === 'administrador') {
  if (navDashboardLink) navDashboardLink.style.display = 'flex';
  if (navMataderoLink) navMataderoLink.style.display = 'flex';
  if (navVentasLink) navVentasLink.style.display = 'none';
  if (navFacturasLink) navFacturasLink.style.display = 'flex';
  if (navMermasLink) navMermasLink.style.display = 'flex';
  if (navReportesLink) navReportesLink.style.display = 'flex';
  if (navClientesLink) navClientesLink.style.display = 'flex';
  if (navCxcLink) navCxcLink.style.display = 'flex';
  if (inventoryHeaderActions) inventoryHeaderActions.style.display = 'none';
  if (adminInventoryKpis) adminInventoryKpis.style.display = 'grid';
  if (thGanancia) thGanancia.style.display = '';
  if (thAcciones) thAcciones.style.display = 'none';
} else if (userRole === 'gerente') {
  if (navDashboardLink) navDashboardLink.style.display = 'none';
  if (navMataderoLink) navMataderoLink.style.display = 'none';
  if (navVentasLink) navVentasLink.style.display = 'none';
  if (navFacturasLink) navFacturasLink.style.display = 'flex';
  if (navReportesLink) navReportesLink.style.display = 'none';
  if (navClientesLink) navClientesLink.style.display = 'flex';
  if (navCxcLink) navCxcLink.style.display = 'flex';
  if (inventoryHeaderActions) inventoryHeaderActions.style.display = 'flex';
  const btnMisVales = document.getElementById('btnMisVales');
  if (btnMisVales) btnMisVales.style.display = 'inline-flex';
  if (adminInventoryKpis) adminInventoryKpis.style.display = 'none';
  if (thGanancia) thGanancia.style.display = 'none';
  if (thAcciones) thAcciones.style.display = '';
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
  if (el) {
    el.classList.add('open');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

const btnAbrirModalFacturaMatadero = document.getElementById('btn-abrir-modal-producto');
if (btnAbrirModalFacturaMatadero) {
  btnAbrirModalFacturaMatadero.addEventListener('click', () => {
    mataderoTempItems = [];
    renderMataderoTempItems();
    const tipoEl = document.getElementById('matTipoDoc');
    const refEl = document.getElementById('matReferencia');
    if (tipoEl) tipoEl.value = 'vale';
    if (refEl) refEl.value = 'VALE-';
    openModal('modalFacturaMatadero');
  });
}

const matTipoDoc = document.getElementById('matTipoDoc');
const matReferencia = document.getElementById('matReferencia');

function syncMataderoPrefix() {
  if (!matTipoDoc || !matReferencia) return;
  const prefix = matTipoDoc.value === 'vale' ? 'VALE-' : 'REMI-';
  let cur = matReferencia.value.trim();
  if (cur.startsWith('VALE-') || cur.startsWith('REMI-')) {
    cur = cur.slice(5);
  }
  matReferencia.value = prefix + cur;
}

if (matTipoDoc) {
  matTipoDoc.addEventListener('change', syncMataderoPrefix);
}

if (matReferencia) {
  matReferencia.addEventListener('input', () => {
    const prefix = matTipoDoc && matTipoDoc.value === 'vale' ? 'VALE-' : 'REMI-';
    let val = matReferencia.value;
    if (!val.toUpperCase().startsWith(prefix)) {
      val = val.replace(/^VALE-|^REMI-/i, '');
      matReferencia.value = prefix + val;
    }
  });
}

const btnMisVales = document.getElementById('btnMisVales');
if (btnMisVales) {
  btnMisVales.addEventListener('click', async () => {
    const tbody = document.getElementById('valesTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">Cargando mis documentos...</td></tr>';
    }
    openModal('modalValesRemisiones');
    try {
      const res = await fetch(`${API_BASE_URL}/matadero/documentos?solo_mios=true`, {
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
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No tienes vales ni remisiones registrados.</td></tr>';
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

const btnOpenMerma = document.getElementById('btnOpenMermaModal');
if (btnOpenMerma) {
  btnOpenMerma.addEventListener('click', () => {
    openModal('modalMerma');
  });
}

const btnToggleExistente = document.getElementById('btnToggleExistente');
const btnToggleNuevo = document.getElementById('btnToggleNuevo');
const rowCorteExistente = document.getElementById('rowCorteExistente');
const rowCorteNuevo = document.getElementById('rowCorteNuevo');
const helperCorteNuevo = document.getElementById('helperCorteNuevo');

if (btnToggleExistente && btnToggleNuevo) {
  btnToggleExistente.addEventListener('click', () => {
    btnToggleExistente.classList.add('active');
    btnToggleNuevo.classList.remove('active');
    if (rowCorteExistente) rowCorteExistente.style.display = 'grid';
    if (rowCorteNuevo) rowCorteNuevo.style.display = 'none';
    if (helperCorteNuevo) helperCorteNuevo.style.display = 'none';
  });

  btnToggleNuevo.addEventListener('click', () => {
    btnToggleNuevo.classList.add('active');
    btnToggleExistente.classList.remove('active');
    if (rowCorteExistente) rowCorteExistente.style.display = 'none';
    if (rowCorteNuevo) rowCorteNuevo.style.display = 'grid';
    if (helperCorteNuevo) helperCorteNuevo.style.display = 'block';
  });
}

let inventory = [];
let mataderoTempItems = [];

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
  updateAdminKpis(inventory);
  populateSelects(inventory);
  checkStockAlerts(inventory);
}

function updateAdminKpis(items) {
  if (userRole !== 'administrador') return;
  let valorTotal = 0;
  let gananciaProyectada = 0;

  (items || []).forEach(p => {
    const stock = parseFloat(p.stock_actual || 0);
    const compra = parseFloat(p.precio_compra || 0);
    const venta = parseFloat(p.precio_venta || 0);
    if (stock > 0) {
      valorTotal += stock * compra;
      gananciaProyectada += stock * (venta - compra);
    }
  });

  const kpiValEl = document.getElementById('kpiValorInventario');
  const kpiGanEl = document.getElementById('kpiGananciaProyectada');

  if (kpiValEl) kpiValEl.textContent = formatMoney(valorTotal);
  if (kpiGanEl) kpiGanEl.textContent = formatMoney(gananciaProyectada);
}

function checkStockAlerts(items) {
  const lowStock = (items || []).filter(i => parseFloat(i.stock_actual) <= 5.00);
  const pill = document.getElementById('lowStockCounter');
  const text = document.getElementById('lowStockText');

  if (!pill || !text) return;

  if (lowStock.length > 0) {
    pill.style.display = 'inline-flex';
    text.textContent = `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} en STOCK CRÍTICO (≤ 5.00 lb)`;
  } else {
    pill.style.display = 'none';
  }
}

function populateSelects(items) {
  const options = '<option value="">Seleccione el corte...</option>' +
    (items || []).map(i => `<option value="${i.id}" data-costo="${i.precio_compra}">${i.nombre} (Stock: ${parseFloat(i.stock_actual).toFixed(2)} lb)</option>`).join('');

  const datalistMat = document.getElementById('matProdDatalist');
  const selectMerma = document.getElementById('mermaProductoSelect');

  if (datalistMat) {
    datalistMat.innerHTML = (items || []).map(i => `<option value="${i.nombre}">Stock: ${parseFloat(i.stock_actual).toFixed(2)} lb - Costo: C$${parseFloat(i.precio_compra).toFixed(2)}</option>`).join('');
  }
  if (selectMerma) selectMerma.innerHTML = options;
}

const matProdInput = document.getElementById('matProdInput');
const matProdSelect = document.getElementById('matProdSelect');
const matProdCosto = document.getElementById('matProdCosto');

function onMatProdInputChange() {
  if (!matProdInput) return;
  const val = matProdInput.value.trim().toLowerCase();
  const prod = inventory.find(p => p.nombre.toLowerCase() === val || String(p.id) === val);
  if (prod) {
    if (matProdSelect) matProdSelect.value = prod.id;
    if (matProdCosto) matProdCosto.value = parseFloat(prod.precio_compra).toFixed(2);
  } else {
    if (matProdSelect) matProdSelect.value = '';
    if (matProdCosto) matProdCosto.value = '';
  }
}

if (matProdInput) {
  matProdInput.addEventListener('input', onMatProdInputChange);
  matProdInput.addEventListener('change', onMatProdInputChange);
}

if (matProdSelect && matProdCosto) {
  matProdSelect.addEventListener('change', () => {
    const prod = inventory.find(p => String(p.id) === String(matProdSelect.value));
    if (prod) {
      matProdCosto.value = parseFloat(prod.precio_compra).toFixed(2);
    } else {
      matProdCosto.value = '';
    }
  });
}

const btnAddMataderoItem = document.getElementById('btnAddMataderoItem');
if (btnAddMataderoItem) {
  btnAddMataderoItem.addEventListener('click', () => {
    const prodId = matProdSelect ? parseInt(matProdSelect.value, 10) : NaN;
    const cantEl = document.getElementById('matProdCantidad');
    const cant = cantEl ? parseFloat(cantEl.value) : NaN;
    const costo = matProdCosto ? parseFloat(matProdCosto.value) : NaN;

    if (!prodId || isNaN(cant) || cant <= 0 || isNaN(costo) || costo <= 0) {
      showToast('Seleccione un corte existente del buscador, cantidad y costo válidos', true);
      return;
    }

    const prod = inventory.find(p => p.id === prodId);
    if (!prod) return;

    if (costo > parseFloat(prod.precio_venta)) {
      showToast(`El costo de compra (${formatMoney(costo)}) no puede superar el precio de venta (${formatMoney(prod.precio_venta)})`, true);
      return;
    }

    mataderoTempItems.push({
      rowId: Date.now() + Math.random(),
      es_nuevo: false,
      producto_id: prod.id,
      nombre: prod.nombre,
      cantidad: cant,
      costo_unitario: costo,
      precio_compra: costo,
      precio_venta: parseFloat(prod.precio_venta),
      subtotal: parseFloat((cant * costo).toFixed(2))
    });

    if (matProdInput) matProdInput.value = '';
    if (matProdSelect) matProdSelect.value = '';
    if (cantEl) cantEl.value = '';
    if (matProdCosto) matProdCosto.value = '';
    renderMataderoTempItems();
  });
}

const btnAddNuevoCorteMataderoItem = document.getElementById('btnAddNuevoCorteMataderoItem');
if (btnAddNuevoCorteMataderoItem) {
  btnAddNuevoCorteMataderoItem.addEventListener('click', () => {
    const nomEl = document.getElementById('matNuevoNombre');
    const cantEl = document.getElementById('matNuevoCantidad');
    const pcEl = document.getElementById('matNuevoPrecioCompra');
    const pvEl = document.getElementById('matNuevoPrecioVenta');

    const nombre = nomEl ? nomEl.value.trim() : '';
    const cant = cantEl ? parseFloat(cantEl.value) : NaN;
    const precioCompra = pcEl ? parseFloat(pcEl.value) : NaN;
    const precioVenta = pvEl ? parseFloat(pvEl.value) : NaN;

    if (!nombre) {
      showToast('Ingrese el nombre del nuevo corte', true);
      return;
    }

    if (isNaN(cant) || cant <= 0) {
      showToast('Ingrese una cantidad válida mayor a 0 lb', true);
      return;
    }

    if (isNaN(precioCompra) || precioCompra <= 0) {
      showToast('Ingrese un precio de compra válido mayor a C$0.00', true);
      return;
    }

    if (isNaN(precioVenta) || precioVenta <= 0) {
      showToast('Ingrese un precio de venta válido mayor a C$0.00', true);
      return;
    }

    if (precioVenta < precioCompra) {
      showToast('El precio de venta no puede ser menor al precio de compra', true);
      return;
    }

    const existeEnCatalogo = inventory.some(p => p.nombre.trim().toLowerCase() === nombre.toLowerCase());
    if (existeEnCatalogo) {
      showToast(`El producto "${nombre}" ya existe en el catálogo. Debe seleccionarlo de la lista para ingresar stock.`, true);
      return;
    }

    const existeEnItems = mataderoTempItems.some(i => i.nombre.trim().toLowerCase() === nombre.toLowerCase());
    if (existeEnItems) {
      showToast(`El producto "${nombre}" ya está en la lista de ingreso actual.`, true);
      return;
    }

    mataderoTempItems.push({
      rowId: Date.now() + Math.random(),
      es_nuevo: true,
      nombre,
      cantidad: cant,
      costo_unitario: precioCompra,
      precio_compra: precioCompra,
      precio_venta: precioVenta,
      subtotal: parseFloat((cant * precioCompra).toFixed(2))
    });

    if (nomEl) nomEl.value = '';
    if (cantEl) cantEl.value = '';
    if (pcEl) pcEl.value = '';
    if (pvEl) pvEl.value = '';

    renderMataderoTempItems();
  });
}

window.removeMataderoTempItem = function(rowId) {
  mataderoTempItems = mataderoTempItems.filter(i => i.rowId !== rowId);
  renderMataderoTempItems();
};

function renderMataderoTempItems() {
  const tbody = document.getElementById('mataderoItemsTableBody');
  const totalEl = document.getElementById('mataderoTotalCargo');
  if (!tbody) return;

  if (mataderoTempItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 1rem;">Añada uno o más cortes recibidos en el vale o remisión.</td></tr>';
    if (totalEl) totalEl.textContent = formatMoney(0);
    return;
  }

  let total = 0;
  tbody.innerHTML = mataderoTempItems.map(item => {
    total += item.subtotal;
    const badgeNuevo = item.es_nuevo
      ? '<span class="badge badge-warning" style="font-size: 0.68rem; margin-left: 0.4rem; padding: 0.15rem 0.4rem;">NUEVO</span>'
      : '';
    const pVentaStr = formatMoney(item.precio_venta);

    return `
      <tr>
        <td><strong>${item.nombre}</strong>${badgeNuevo}</td>
        <td style="text-align: right; font-weight: 600;">${item.cantidad.toFixed(2)} lb</td>
        <td style="text-align: right;">${formatMoney(item.costo_unitario)}</td>
        <td style="text-align: right; color: var(--color-success); font-weight: 600;">${pVentaStr}</td>
        <td style="text-align: right; font-weight: 700; color: var(--color-primary);">${formatMoney(item.subtotal)}</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="removeMataderoTempItem(${item.rowId})" style="color: var(--color-danger); padding: 0.15rem 0.45rem;">&times;</button>
        </td>
      </tr>
    `;
  }).join('');

  if (totalEl) totalEl.textContent = formatMoney(total);
}

const formFacturaMatadero = document.getElementById('formFacturaMatadero');
if (formFacturaMatadero) {
  formFacturaMatadero.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipoEl = document.getElementById('matTipoDoc');
    const refEl = document.getElementById('matReferencia');
    const tipo_movimiento = tipoEl ? tipoEl.value : 'vale';
    let referencia = refEl ? refEl.value.trim().toUpperCase() : '';

    const prefix = tipo_movimiento === 'vale' ? 'VALE-' : 'REMI-';
    if (!referencia.startsWith(prefix) || referencia.length <= prefix.length) {
      showToast(`El documento debe incluir el prefijo ${prefix} seguido del correlativo (Ej. ${prefix}001)`, true);
      return;
    }

    if (mataderoTempItems.length === 0) {
      showToast('Debe añadir al menos un corte cárnico con su cantidad recibida', true);
      return;
    }

    const btnSubmit = document.getElementById('btnGuardarFacturaMatadero');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Registrando...';
    }

    try {
      const res = await fetch(`${API_BASE_URL}/matadero/factura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo_movimiento,
          referencia,
          items: mataderoTempItems
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar factura de matadero');
      }

      showToast(`Documento ${referencia} registrado: stock y deuda actualizados`);
      closeModal('modalFacturaMatadero');
      formFacturaMatadero.reset();
      mataderoTempItems = [];
      renderMataderoTempItems();
      await loadInventory();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Confirmar Ingreso y Registrar Deuda';
      }
    }
  });
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
    const minStock = 5.00;
    const isCritical = stock <= 5.00;
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
      <tr class="${isCritical ? 'row-stock-critico' : ''}">
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
          <span class="badge ${isCritical ? 'badge-danger' : 'badge-success'}">${isCritical ? 'STOCK CRÍTICO' : 'NORMAL'}</span>
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

window.openEditarModal = function(id) {
  const prod = inventory.find(i => i.id === id);
  if (!prod) return;

  const idEl = document.getElementById('editProdId');
  const nomEl = document.getElementById('editProdNombre');
  const pcEl = document.getElementById('editProdPrecioCompra');
  const pvEl = document.getElementById('editProdPrecioVenta');

  if (idEl) idEl.value = prod.id;
  if (nomEl) nomEl.value = prod.nombre;
  if (pcEl) pcEl.value = prod.precio_compra;
  if (pvEl) pvEl.value = prod.precio_venta;

  openModal('modalEditarProducto');
};

const formEditarProducto = document.getElementById('formEditarProducto');
if (formEditarProducto) {
  formEditarProducto.addEventListener('submit', async (e) => {
    e.preventDefault();

    const idEl = document.getElementById('editProdId');
    const nomEl = document.getElementById('editProdNombre');
    const pcEl = document.getElementById('editProdPrecioCompra');
    const pvEl = document.getElementById('editProdPrecioVenta');

    const id = idEl ? idEl.value : '';
    const nombre = nomEl ? nomEl.value.trim() : '';
    const precio_compra = pcEl ? parseFloat(pcEl.value) : 0;
    const precio_venta = pvEl ? parseFloat(pvEl.value) : 0;

    if (isNaN(precio_compra) || isNaN(precio_venta) || precio_venta < precio_compra) {
      showToast('El Precio de Venta no puede ser menor al Precio de Compra', true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, precio_compra, precio_venta })
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

const formMerma = document.getElementById('formMerma') || document.getElementById('formMermaStock');
if (formMerma) {
  formMerma.addEventListener('submit', async (e) => {
    e.preventDefault();

    const prodEl = document.getElementById('mermaProductoSelect');
    const cantEl = document.getElementById('mermaCantidad');
    const motEl = document.getElementById('mermaMotivo');

    const producto_id = prodEl ? parseInt(prodEl.value, 10) : NaN;
    const cantidad = cantEl ? parseFloat(cantEl.value) : NaN;
    const motivo = motEl ? motEl.value.trim() : 'Merma operativa';

    if (isNaN(producto_id) || isNaN(cantidad) || cantidad <= 0) {
      showToast('Ingrese un producto y una cantidad válida mayor a 0', true);
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

  const motivo = prompt('Ingrese el motivo de la baja del producto del inventario:', 'Descontinuado / Baja operativa');
  if (motivo === null) return;

  try {
    const res = await fetch(`${API_BASE_URL}/productos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ motivo: motivo.trim() || 'Eliminado por Gerencia' })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al eliminar');
    }

    showToast('Producto dado de baja y registrado en auditoría');
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
