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

if (userRole !== 'vendedor') {
  if (userRole === 'administrador') {
    window.location.href = './dashboard.html';
  } else {
    window.location.href = './inventario.html';
  }
}

const userNameEl = document.getElementById('userName');
if (userNameEl) userNameEl.textContent = user.nombre || 'Vendedor';

const userRoleEl = document.getElementById('userRole');
if (userRoleEl) userRoleEl.textContent = (user.rol || 'vendedor').toUpperCase();

const userAvatarEl = document.getElementById('userAvatar');
if (userAvatarEl) userAvatarEl.textContent = (user.nombre || 'V').charAt(0).toUpperCase();

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('san_martin_token');
    localStorage.removeItem('san_martin_user');
    window.location.href = './login.html';
  });
}

const navClientesLink = document.getElementById('navClientesLink');
if (navClientesLink) {
  navClientesLink.style.display = 'none';
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

const toastEl = document.getElementById('toast');
let toastTimeout = null;
function showToast(message, isError = false) {
  if (!toastEl) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.className = 'toast show ' + (isError ? 'toast-error' : 'toast-success');
  toastTimeout = setTimeout(() => {
    if (toastEl) toastEl.className = 'toast';
  }, 4200);
}

function showPosWarningModal(titulo, mensaje) {
  const titleEl = document.getElementById('alertaPosTitulo');
  const msgEl = document.getElementById('alertaPosMensaje');
  if (titleEl) titleEl.textContent = titulo || 'Advertencia de Validación';
  if (msgEl) msgEl.textContent = mensaje || '';
  openModal('modalAlertaPos');
  showToast(mensaje, true);
}

const currencyFormatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
function formatMoney(amount) {
  return currencyFormatter.format(parseFloat(amount || 0));
}

let catalog = [];
let clients = [];
let cart = [];
let selectedClient = null;

const searchClienteInput = document.getElementById('searchClienteInput');
const selectClienteId = document.getElementById('selectClienteId');
const clientDropdownResults = document.getElementById('clientDropdownResults');
const selectTipoPago = document.getElementById('selectTipoPago');
const diasCreditoGroup = document.getElementById('diasCreditoGroup');
const inputDescuentoManual = document.getElementById('inputDescuentoManual');
const creditAlertBanner = document.getElementById('creditAlertBanner');
const creditAlertText = document.getElementById('creditAlertText');
const btnConfirmarVenta = document.getElementById('btnConfirmarVenta');
const clientStatusCard = document.getElementById('clientStatusCard');
const posSubtotalEl = document.getElementById('posSubtotal');
const posDiscountAmountEl = document.getElementById('posDiscountAmount');
const posGrandTotalEl = document.getElementById('posGrandTotal');

const btnAbrirModalCorte = document.getElementById('btnAbrirModalCorte');
if (btnAbrirModalCorte) {
  btnAbrirModalCorte.addEventListener('click', () => {
    renderModalCatalog(catalog);
    openModal('modalAgregarCorte');
    setTimeout(() => {
      const input = document.getElementById('modalSearchInput');
      if (input) input.focus();
    }, 100);
  });
}

if (inputDescuentoManual) {
  inputDescuentoManual.addEventListener('input', () => {
    validateCartState(false);
  });
}

if (searchClienteInput) {
  searchClienteInput.addEventListener('focus', () => {
    if (selectTipoPago && selectTipoPago.value === 'credito' && !searchClienteInput.disabled) {
      filterClientDropdown(searchClienteInput.value);
    }
  });

  searchClienteInput.addEventListener('click', () => {
    if (selectTipoPago && selectTipoPago.value === 'credito' && !searchClienteInput.disabled) {
      filterClientDropdown(searchClienteInput.value);
    }
  });

  searchClienteInput.addEventListener('input', () => {
    if (selectTipoPago && selectTipoPago.value === 'credito' && !searchClienteInput.disabled) {
      const val = searchClienteInput.value.trim();
      if (selectedClient && selectedClient.nombre !== val) {
        selectedClient = null;
        if (selectClienteId) selectClienteId.value = '';
        if (clientStatusCard) clientStatusCard.style.display = 'none';
        validateCartState(false);
      }
      filterClientDropdown(searchClienteInput.value);
    }
  });

  searchClienteInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (selectTipoPago && selectTipoPago.value === 'contado') {
        searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
        if (selectClienteId) selectClienteId.value = 'cf';
      } else {
        if (!selectedClient) {
          searchClienteInput.value = '';
          if (selectClienteId) selectClienteId.value = '';
          validateCartState(false);
        } else {
          searchClienteInput.value = selectedClient.nombre;
        }
      }
    }, 250);
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.pos-search-select-wrap') && clientDropdownResults) {
    clientDropdownResults.style.display = 'none';
  }
});

function filterClientDropdown(query) {
  if (!clientDropdownResults || !selectTipoPago || !searchClienteInput) return;
  if (selectTipoPago.value === 'contado' || searchClienteInput.disabled) {
    clientDropdownResults.style.display = 'none';
    return;
  }

  const q = (query || '').toLowerCase().trim();
  const list = clients.filter(c => !c.nombre.toLowerCase().includes('consumidor final'));
  const filtered = q
    ? list.filter(c => c.nombre.toLowerCase().includes(q))
    : list;

  if (filtered.length === 0) {
    clientDropdownResults.innerHTML = '<div style="padding: 0.75rem; color: var(--color-text-muted); font-size: 0.82rem; text-align: center;">No se encontraron clientes</div>';
    clientDropdownResults.style.display = 'block';
    return;
  }

  clientDropdownResults.innerHTML = filtered.map(c => `
    <div class="pos-search-result-item" onclick="selectClient('${c.id}')">
      <div>
        <strong style="color: var(--color-text-main);">${c.nombre}</strong>
        <div style="font-size: 0.75rem; color: var(--color-text-muted);">Límite de Crédito: ${formatMoney(c.limite_credito)}</div>
      </div>
      <span class="badge badge-success">Crédito</span>
    </div>
  `).join('');

  clientDropdownResults.style.display = 'block';
}

window.selectClient = function(clientId) {
  if (clientDropdownResults) clientDropdownResults.style.display = 'none';

  if (clientId === 'cf' || !clientId) {
    if (selectTipoPago && selectTipoPago.value === 'credito') {
      if (searchClienteInput) searchClienteInput.value = '';
      if (selectClienteId) selectClienteId.value = '';
      selectedClient = null;
      if (clientStatusCard) clientStatusCard.style.display = 'none';
      validateCartState(false);
      return;
    }
    if (selectClienteId) selectClienteId.value = 'cf';
    if (searchClienteInput) searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
    selectedClient = null;
    if (clientStatusCard) clientStatusCard.style.display = 'none';
  } else {
    selectedClient = clients.find(c => String(c.id) === String(clientId)) || null;
    if (selectedClient) {
      if (selectClienteId) selectClienteId.value = selectedClient.id;
      if (searchClienteInput) searchClienteInput.value = selectedClient.nombre;
      if (clientStatusCard) clientStatusCard.style.display = 'block';

      const limite = parseFloat(selectedClient.limite_credito || 0);
      const deuda = parseFloat(selectedClient.saldo_pendiente || 0);
      const disponible = Math.max(0, limite - deuda);

      const limEl = document.getElementById('cliInfoLimite');
      const deuEl = document.getElementById('cliInfoDeuda');
      const disEl = document.getElementById('cliInfoDisponible');

      if (limEl) limEl.textContent = formatMoney(limite);
      if (deuEl) deuEl.textContent = formatMoney(deuda);
      if (disEl) disEl.textContent = formatMoney(disponible);
    }
  }

  validateCartState(true);
};

if (selectTipoPago) {
  selectTipoPago.addEventListener('change', () => {
    const tipo = selectTipoPago.value;
    if (clientDropdownResults) clientDropdownResults.style.display = 'none';

    if (tipo === 'contado') {
      if (searchClienteInput) {
        searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
        searchClienteInput.disabled = true;
      }
      if (selectClienteId) selectClienteId.value = 'cf';
      selectedClient = null;
      if (clientStatusCard) clientStatusCard.style.display = 'none';
      if (diasCreditoGroup) diasCreditoGroup.style.display = 'none';
    } else {
      if (searchClienteInput) {
        searchClienteInput.value = '';
        searchClienteInput.disabled = false;
      }
      if (selectClienteId) selectClienteId.value = '';
      selectedClient = null;
      if (clientStatusCard) clientStatusCard.style.display = 'none';
      if (diasCreditoGroup) diasCreditoGroup.style.display = 'block';
      setTimeout(() => {
        if (searchClienteInput) searchClienteInput.focus();
      }, 50);
    }

    validateCartState(false);
  });
}

function getTotalsBreakdown() {
  let subtotal = 0;

  cart.forEach(item => {
    const qty = parseFloat(item.cantidad);
    if (isNaN(qty) || qty <= 0) {
      item.subtotal = 0;
      return;
    }
    item.subtotal = parseFloat((qty * item.precio_unitario).toFixed(2));
    subtotal = parseFloat((subtotal + item.subtotal).toFixed(2));
  });

  let descuento = inputDescuentoManual ? parseFloat(inputDescuentoManual.value || 0) : 0;
  if (isNaN(descuento) || descuento < 0) descuento = 0;

  const total = parseFloat(Math.max(0, subtotal - descuento).toFixed(2));

  if (posSubtotalEl) posSubtotalEl.textContent = formatMoney(subtotal);
  if (posDiscountAmountEl) posDiscountAmountEl.textContent = '-' + formatMoney(descuento);
  if (posGrandTotalEl) posGrandTotalEl.textContent = formatMoney(total);

  return { subtotal, descuento, total };
}

function validateCartState(triggerCreditModal = false) {
  const { subtotal, descuento, total } = getTotalsBreakdown();
  const tipoPago = selectTipoPago ? selectTipoPago.value : 'contado';

  if (cart.length === 0) {
    if (creditAlertBanner) creditAlertBanner.style.display = 'none';
    if (btnConfirmarVenta) btnConfirmarVenta.disabled = true;
    return false;
  }

  if (descuento > subtotal) {
    if (btnConfirmarVenta) btnConfirmarVenta.disabled = true;
    return false;
  }

  const productQtyMap = {};
  for (const item of cart) {
    const qty = parseFloat(item.cantidad);
    if (isNaN(qty) || qty <= 0) {
      if (btnConfirmarVenta) btnConfirmarVenta.disabled = true;
      return false;
    }
    productQtyMap[item.producto_id] = (productQtyMap[item.producto_id] || 0) + qty;
  }

  for (const prodIdStr of Object.keys(productQtyMap)) {
    const prodId = parseInt(prodIdStr, 10);
    const prod = catalog.find(p => p.id === prodId);
    const maxStock = parseFloat(prod ? prod.stock_actual : 0);
    if (productQtyMap[prodId] > maxStock) {
      if (btnConfirmarVenta) btnConfirmarVenta.disabled = true;
      return false;
    }
  }

  if (tipoPago === 'credito') {
    if (!selectedClient || !selectClienteId || !selectClienteId.value || selectClienteId.value === 'cf') {
      if (creditAlertText) creditAlertText.textContent = 'Debe seleccionar un cliente registrado para ventas a crédito';
      if (creditAlertBanner) creditAlertBanner.style.display = 'flex';
      if (btnConfirmarVenta) btnConfirmarVenta.disabled = true;
      return false;
    }

    const limite = parseFloat(selectedClient.limite_credito || 0);
    const deuda = parseFloat(selectedClient.saldo_pendiente || 0);
    const disponible = Math.max(0, limite - deuda);

    if (total > disponible) {
      const msg = `El total a pagar (${formatMoney(total)}) supera el límite de crédito disponible de ${selectedClient.nombre} (${formatMoney(disponible)}).`;
      if (creditAlertText) {
        creditAlertText.innerHTML = `Límite de crédito excedido. Disponible: <strong>${formatMoney(disponible)}</strong> | Total orden: <strong>${formatMoney(total)}</strong>`;
      }
      if (creditAlertBanner) creditAlertBanner.style.display = 'flex';
      if (btnConfirmarVenta) btnConfirmarVenta.disabled = true;
      if (triggerCreditModal) {
        showPosWarningModal('Límite de Crédito Excedido', msg);
      }
      return false;
    }
  }

  if (creditAlertBanner) creditAlertBanner.style.display = 'none';
  if (btnConfirmarVenta) btnConfirmarVenta.disabled = false;
  return true;
}

async function loadInitialData() {
  try {
    const [resProds, resClientes, resCxc] = await Promise.all([
      fetch(`${API_BASE_URL}/productos`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/clientes`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/cuentas-por-cobrar`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
    ]);

    if (resProds.status === 401 || resClientes.status === 401) {
      localStorage.clear();
      window.location.href = './login.html';
      return;
    }

    const dataProds = await resProds.json();
    const dataClientes = await resClientes.json();

    if (dataProds.success && Array.isArray(dataProds.data)) {
      catalog = dataProds.data;
    } else {
      catalog = [];
    }

    const cxcBalances = {};
    if (resCxc && resCxc.ok) {
      try {
        const cxcData = await resCxc.json();
        if (cxcData.success && Array.isArray(cxcData.data)) {
          cxcData.data.forEach(c => {
            const estadoStr = String(c.estado || '').toLowerCase();
            if (estadoStr === 'pendiente') {
              cxcBalances[c.cliente_id] = (cxcBalances[c.cliente_id] || 0) + parseFloat(c.saldo_pendiente);
            }
          });
        }
      } catch (e) {}
    }

    if (dataClientes.success && Array.isArray(dataClientes.data)) {
      clients = dataClientes.data
        .filter(c => c.activo === true || c.activo === 1 || c.activo === undefined)
        .map(c => ({
          ...c,
          saldo_pendiente: cxcBalances[c.id] || 0
        }));
    } else {
      clients = [];
    }
  } catch (err) {
    catalog = [];
    clients = [];
    showToast(err.message || 'Error al cargar catálogo inicial', true);
  }

  if (selectTipoPago) selectTipoPago.value = 'contado';
  if (searchClienteInput) {
    searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
    searchClienteInput.disabled = true;
  }
  if (selectClienteId) selectClienteId.value = 'cf';
  selectedClient = null;
  if (clientStatusCard) clientStatusCard.style.display = 'none';
  if (diasCreditoGroup) diasCreditoGroup.style.display = 'none';

  renderModalCatalog(catalog);
}

function renderModalCatalog(list) {
  const container = document.getElementById('modalCatalogTableBody');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No se encontraron cortes coincidentes.</td></tr>';
    return;
  }

  container.innerHTML = list.map(item => {
    const inCart = cart
      .filter(c => c.producto_id === item.id)
      .reduce((sum, c) => sum + (parseFloat(c.cantidad) || 0), 0);
    const availableStock = Math.max(0, parseFloat(item.stock_actual) - inCart);
    const isOutOfStock = availableStock <= 0;
    const isCritical = availableStock > 0 && availableStock <= 5.0;
    return `
      <tr>
        <td><strong>#${String(item.id).padStart(4, '0')}</strong></td>
        <td><strong style="color: var(--color-text-main);">${item.nombre}</strong></td>
        <td style="font-weight: 700; color: var(--color-primary);">${formatMoney(item.precio_venta)}</td>
        <td>
          <span class="badge ${isOutOfStock || isCritical ? 'badge-danger' : 'badge-success'}">
            ${availableStock.toFixed(2)} lb ${isCritical ? '(STOCK CRÍTICO)' : (isOutOfStock ? '(AGOTADO)' : '')}
          </span>
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-primary btn-sm" onclick="addToCartFromModal(${item.id})" ${isOutOfStock ? 'disabled' : ''}>
            + Agregar Fila
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

const modalSearchInput = document.getElementById('modalSearchInput');
if (modalSearchInput) {
  modalSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = catalog.filter(item =>
      item.nombre.toLowerCase().includes(query) || String(item.id).includes(query)
    );
    renderModalCatalog(filtered);
  });
}

window.addToCartFromModal = function(productId) {
  const product = catalog.find(p => p.id === productId);
  if (!product) return;

  const currentStock = parseFloat(product.stock_actual);
  const currentProductQtyInCart = cart
    .filter(i => i.producto_id === product.id)
    .reduce((acc, i) => acc + (parseFloat(i.cantidad) || 0), 0);

  if (currentStock <= 0 || currentProductQtyInCart + 1 > currentStock) {
    closeModal('modalAgregarCorte');
    showPosWarningModal(
      'Stock Insuficiente en Inventario',
      `No se puede agregar más "${product.nombre}". Stock total disponible: ${currentStock.toFixed(2)} lb (En carrito: ${currentProductQtyInCart.toFixed(2)} lb).`
    );
    return;
  }

  const rowId = Date.now() + Math.floor(Math.random() * 100000);
  cart.push({
    rowId: rowId,
    producto_id: product.id,
    nombre: product.nombre,
    precio_unitario: parseFloat(product.precio_venta),
    cantidad: 1,
    stock_max: currentStock,
    subtotal: parseFloat(product.precio_venta)
  });

  closeModal('modalAgregarCorte');
  renderCart();
  renderModalCatalog(catalog);
  showToast(`Fila de "${product.nombre}" agregada al carrito`);
};

window.onQtyInputChanged = function(rowId, val, inputEl) {
  const item = cart.find(i => i.rowId === rowId);
  if (!item) return;

  const input = inputEl || document.getElementById(`qtyInput_${rowId}`);
  const hint = document.getElementById(`stockMsg_${rowId}`);
  const parsed = parseFloat(val);
  const subtotalEl = document.getElementById(`subtotalRow_${rowId}`);

  const prod = catalog.find(p => p.id === item.producto_id);
  const totalStock = parseFloat(prod ? prod.stock_actual : item.stock_max);
  const otherRowsQty = cart
    .filter(i => i.producto_id === item.producto_id && i.rowId !== rowId)
    .reduce((acc, i) => acc + (parseFloat(i.cantidad) || 0), 0);
  const maxAvailableForRow = Math.max(0, totalStock - otherRowsQty);

  if (isNaN(parsed) || parsed <= 0) {
    item.cantidad = isNaN(parsed) ? 0 : parsed;
    item.subtotal = 0;
    if (input) {
      input.style.borderColor = '#D32F2F';
      input.style.outline = '1px solid #D32F2F';
      input.style.backgroundColor = 'rgba(211, 47, 47, 0.08)';
    }
    if (hint) {
      hint.textContent = 'Ingrese una cantidad válida mayor a 0 lb';
      hint.style.display = 'block';
    }
    if (subtotalEl) {
      subtotalEl.textContent = formatMoney(0);
    }
    validateCartState(false);
    return;
  }

  if (parsed > maxAvailableForRow) {
    item.cantidad = parsed;
    item.subtotal = 0;
    if (input) {
      input.style.borderColor = '#D32F2F';
      input.style.outline = '1px solid #D32F2F';
      input.style.backgroundColor = 'rgba(211, 47, 47, 0.08)';
    }
    if (hint) {
      hint.textContent = `Stock insuficiente (Disponible: ${maxAvailableForRow.toFixed(2)} lb)`;
      hint.style.display = 'block';
    }
    if (subtotalEl) {
      subtotalEl.textContent = formatMoney(0);
    }
    showPosWarningModal(
      'Stock Insuficiente',
      `La cantidad solicitada de "${item.nombre}" (${(parsed + otherRowsQty).toFixed(2)} lb en total) supera el stock disponible (${totalStock.toFixed(2)} lb).`
    );
    validateCartState(false);
    return;
  }

  if (input) {
    input.style.borderColor = '';
    input.style.outline = '';
    input.style.backgroundColor = '';
  }
  if (hint) {
    hint.textContent = '';
    hint.style.display = 'none';
  }
  item.cantidad = parsed;
  item.subtotal = parseFloat((parsed * item.precio_unitario).toFixed(2));

  if (subtotalEl) {
    subtotalEl.textContent = formatMoney(item.subtotal);
  }

  renderModalCatalog(catalog);
  validateCartState(true);
};

window.removeFromCartByRow = function(rowId) {
  cart = cart.filter(i => i.rowId !== rowId);
  renderCart();
  renderModalCatalog(catalog);
};

const btnClearCart = document.getElementById('btnClearCart');
if (btnClearCart) {
  btnClearCart.addEventListener('click', () => {
    if (cart.length > 0) {
      cart = [];
      if (inputDescuentoManual) inputDescuentoManual.value = '0.00';
      renderCart();
      renderModalCatalog(catalog);
    }
  });
}

function renderCart() {
  const container = document.getElementById('cartTableBody');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 3rem 1rem;">
          <div style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--color-text-main);">La orden está vacía</div>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Haga clic en el botón inferior para abrir el catálogo cárnico.</p>
        </td>
      </tr>
    `;
    validateCartState(false);
    return;
  }

  container.innerHTML = cart.map((item, index) => {
    const prod = catalog.find(p => p.id === item.producto_id);
    const totalStock = parseFloat(prod ? prod.stock_actual : item.stock_max);
    const otherRowsQty = cart
      .filter(i => i.producto_id === item.producto_id && i.rowId !== item.rowId)
      .reduce((acc, i) => acc + (parseFloat(i.cantidad) || 0), 0);
    const maxAvailableForRow = Math.max(0, totalStock - otherRowsQty);

    const isExceeded = parseFloat(item.cantidad) > maxAvailableForRow;
    const isInvalid = isNaN(item.cantidad) || item.cantidad <= 0 || isExceeded;
    const borderStyle = isInvalid ? 'border-color: #D32F2F; outline: 1px solid #D32F2F; background-color: rgba(211, 47, 47, 0.08);' : '';
    const errorMsg = isExceeded
      ? `Stock insuficiente (Disponible: ${maxAvailableForRow.toFixed(2)} lb)`
      : (isNaN(item.cantidad) || item.cantidad <= 0 ? 'Cantidad inválida' : '');
    const errorDisplay = isInvalid ? 'block' : 'none';

    return `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--color-text-main);">${item.nombre}</div>
          <span style="font-size: 0.72rem; color: var(--color-text-muted);">Pesaje Independiente #${index + 1}</span>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--color-primary);">${formatMoney(item.precio_unitario)}</span>
          <span style="font-size: 0.72rem; color: var(--color-text-muted);">/ lb</span>
        </td>
        <td>
          <input type="number" id="qtyInput_${item.rowId}" class="qty-input-pos" value="${item.cantidad}" min="0.01" step="0.01" style="${borderStyle}" oninput="onQtyInputChanged(${item.rowId}, this.value, this)">
          <div id="stockMsg_${item.rowId}" style="display: ${errorDisplay}; color: #D32F2F; font-size: 0.72rem; font-weight: 700; margin-top: 0.25rem;">
            ${errorMsg}
          </div>
        </td>
        <td>
          <strong id="subtotalRow_${item.rowId}" style="color: var(--color-text-main); font-size: 0.95rem;">${formatMoney(item.subtotal)}</strong>
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="removeFromCartByRow(${item.rowId})" style="color: var(--color-danger); padding: 0.25rem 0.5rem;" title="Eliminar fila">&times;</button>
        </td>
      </tr>
    `;
  }).join('');

  validateCartState(true);
}

const posCheckoutForm = document.getElementById('posCheckoutForm');
if (posCheckoutForm) {
  posCheckoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      showPosWarningModal('Orden Vacía', 'Agregue al menos un corte cárnico antes de confirmar la venta.');
      return;
    }

    const { subtotal, descuento, total } = getTotalsBreakdown();

    if (descuento > subtotal) {
      showPosWarningModal('Descuento Inválido', 'El descuento en Córdobas no puede ser mayor al subtotal de la orden.');
      return;
    }

    const productQtyMap = {};
    for (const item of cart) {
      const qty = parseFloat(item.cantidad);
      if (isNaN(qty) || qty <= 0) {
        showPosWarningModal('Cantidad Inválida', `Ingrese un peso en libras mayor a 0 para "${item.nombre}".`);
        return;
      }
      productQtyMap[item.producto_id] = (productQtyMap[item.producto_id] || 0) + qty;
    }

    for (const prodIdStr of Object.keys(productQtyMap)) {
      const prodId = parseInt(prodIdStr, 10);
      const prod = catalog.find(p => p.id === prodId);
      const availableStock = parseFloat(prod ? prod.stock_actual : 0);
      if (productQtyMap[prodId] > availableStock) {
        showPosWarningModal(
          'Stock Insuficiente',
          `El corte "${prod ? prod.nombre : ''}" tiene ${availableStock.toFixed(2)} lb disponibles, pero la orden solicita ${productQtyMap[prodId].toFixed(2)} lb.`
        );
        return;
      }
    }

    const tipo_pago = selectTipoPago ? selectTipoPago.value : 'contado';
    const cliVal = selectClienteId ? selectClienteId.value : 'cf';

    if (tipo_pago === 'credito') {
      if (!selectedClient || !cliVal || cliVal === 'cf') {
        showPosWarningModal('Cliente Requerido', 'Debe seleccionar un cliente mayorista registrado para emitir una venta al crédito.');
        return;
      }

      const limite = parseFloat(selectedClient.limite_credito || 0);
      const deuda = parseFloat(selectedClient.saldo_pendiente || 0);
      const disponible = Math.max(0, limite - deuda);

      if (total > disponible) {
        showPosWarningModal(
          'Límite de Crédito Excedido',
          `El total a pagar (${formatMoney(total)}) excede el crédito disponible de ${selectedClient.nombre} (${formatMoney(disponible)}).`
        );
        return;
      }
    }

    const cliente_id = (tipo_pago === 'contado' || cliVal === 'cf') ? 'cf' : parseInt(cliVal, 10);
    const inputDias = document.getElementById('inputDiasCredito');
    const dias_credito = tipo_pago === 'credito'
      ? parseInt((inputDias && inputDias.value) ? inputDias.value : 15, 10)
      : 0;

    if (btnConfirmarVenta) {
      btnConfirmarVenta.disabled = true;
      btnConfirmarVenta.textContent = 'Procesando Venta...';
    }

    const payload = {
      cliente_id,
      tipo_pago,
      dias_credito,
      descuento,
      items: cart.map(i => ({
        producto_id: i.producto_id,
        cantidad: parseFloat(i.cantidad),
        precio_unitario: i.precio_unitario
      }))
    };

    try {
      const res = await fetch(`${API_BASE_URL}/ventas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al emitir factura');
      }

      const numFactura = data.data?.numero_factura || data.data?.venta?.numero_factura || ('FAC-' + String(data.data?.venta?.id || '').padStart(6, '0'));
      const alertas = data.data?.alertas_stock || [];
      if (alertas.length > 0) {
        const nombres = alertas.map(a => `${a.nombre} (${a.stock_actual.toFixed(1)} lb)`).join(', ');
        showToast(`Factura ${numFactura} emitida. ¡STOCK CRÍTICO en: ${nombres}!`, false);
      } else {
        showToast(`¡Venta registrada con éxito! Factura: ${numFactura}`, false);
      }

      cart = [];
      if (inputDescuentoManual) inputDescuentoManual.value = '0.00';
      renderCart();

      if (selectTipoPago) selectTipoPago.value = 'contado';
      if (searchClienteInput) {
        searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
        searchClienteInput.disabled = true;
      }
      if (selectClienteId) selectClienteId.value = 'cf';
      selectedClient = null;
      if (clientStatusCard) clientStatusCard.style.display = 'none';
      if (diasCreditoGroup) diasCreditoGroup.style.display = 'none';

      await loadInitialData();
    } catch (err) {
      showPosWarningModal('Error al Registrar Venta', err.message || 'No se pudo completar la facturación.');
    } finally {
      if (btnConfirmarVenta) {
        btnConfirmarVenta.disabled = cart.length === 0;
        btnConfirmarVenta.textContent = 'Confirmar y Registrar Venta';
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadInitialData);
} else {
  loadInitialData();
}
