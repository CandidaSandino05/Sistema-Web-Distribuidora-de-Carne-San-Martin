const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
  ? 'http://localhost:3000/api'
  : '/api';

const token = localStorage.getItem('san_martin_token');
const userStr = localStorage.getItem('san_martin_user');

if (!token || !userStr) {
  window.location.href = './login.html';
}

const user = JSON.parse(userStr || '{}');

document.getElementById('userName').textContent = user.nombre || 'Vendedor';
document.getElementById('userRole').textContent = (user.rol || 'vendedor').toUpperCase();
document.getElementById('userAvatar').textContent = (user.nombre || 'V').charAt(0).toUpperCase();

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

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

window.openModal = openModal;
window.closeModal = closeModal;

const toastEl = document.getElementById('toast');
function showToast(message, isError = false) {
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

let catalog = [];
let clients = [];
let cart = [];
let selectedClient = null;

const searchClienteInput = document.getElementById('searchClienteInput');
const selectClienteId = document.getElementById('selectClienteId');
const clientDropdownResults = document.getElementById('clientDropdownResults');
const selectTipoPago = document.getElementById('selectTipoPago');
const diasCreditoGroup = document.getElementById('diasCreditoGroup');
const creditAlertBanner = document.getElementById('creditAlertBanner');
const creditAlertText = document.getElementById('creditAlertText');
const btnConfirmarVenta = document.getElementById('btnConfirmarVenta');
const clientStatusCard = document.getElementById('clientStatusCard');

document.getElementById('btnAbrirModalCorte').addEventListener('click', () => {
  renderModalCatalog(catalog);
  openModal('modalAgregarCorte');
  setTimeout(() => {
    const input = document.getElementById('modalSearchInput');
    if (input) input.focus();
  }, 100);
});

searchClienteInput.addEventListener('focus', () => {
  if (selectTipoPago.value === 'credito' && !searchClienteInput.disabled) {
    filterClientDropdown(searchClienteInput.value);
  }
});

searchClienteInput.addEventListener('click', () => {
  if (selectTipoPago.value === 'credito' && !searchClienteInput.disabled) {
    filterClientDropdown(searchClienteInput.value);
  }
});

searchClienteInput.addEventListener('input', () => {
  if (selectTipoPago.value === 'credito' && !searchClienteInput.disabled) {
    const val = searchClienteInput.value.trim();
    if (selectedClient && selectedClient.nombre !== val) {
      selectedClient = null;
      selectClienteId.value = '';
      clientStatusCard.style.display = 'none';
      validateCartState();
    }
    filterClientDropdown(searchClienteInput.value);
  }
});

searchClienteInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (selectTipoPago.value === 'contado') {
      searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
      selectClienteId.value = 'cf';
    } else {
      if (!selectedClient) {
        searchClienteInput.value = '';
        selectClienteId.value = '';
        validateCartState();
      } else {
        searchClienteInput.value = selectedClient.nombre;
      }
    }
  }, 250);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.pos-search-select-wrap')) {
    clientDropdownResults.style.display = 'none';
  }
});

function filterClientDropdown(query) {
  if (selectTipoPago.value === 'contado' || searchClienteInput.disabled) {
    clientDropdownResults.style.display = 'none';
    return;
  }

  let q = (query || '').toLowerCase().trim();

  const list = [];
  clients.forEach(c => {
    if (!c.nombre.toLowerCase().includes('consumidor final')) {
      list.push(c);
    }
  });

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
  clientDropdownResults.style.display = 'none';

  if (clientId === 'cf' || !clientId) {
    if (selectTipoPago.value === 'credito') {
      searchClienteInput.value = '';
      selectClienteId.value = '';
      selectedClient = null;
      clientStatusCard.style.display = 'none';
      validateCartState();
      return;
    }
    selectClienteId.value = 'cf';
    searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
    selectedClient = null;
    clientStatusCard.style.display = 'none';
  } else {
    selectedClient = clients.find(c => String(c.id) === String(clientId)) || null;
    if (selectedClient) {
      selectClienteId.value = selectedClient.id;
      searchClienteInput.value = selectedClient.nombre;
      clientStatusCard.style.display = 'block';

      const limite = parseFloat(selectedClient.limite_credito || 0);
      const deuda = parseFloat(selectedClient.saldo_pendiente || 0);
      const disponible = Math.max(0, limite - deuda);

      document.getElementById('cliInfoLimite').textContent = formatMoney(limite);
      document.getElementById('cliInfoDeuda').textContent = formatMoney(deuda);
      document.getElementById('cliInfoDisponible').textContent = formatMoney(disponible);
    }
  }

  validateCartState();
};

selectTipoPago.addEventListener('change', () => {
  const tipo = selectTipoPago.value;
  clientDropdownResults.style.display = 'none';

  if (tipo === 'contado') {
    searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
    searchClienteInput.disabled = true;
    selectClienteId.value = 'cf';
    selectedClient = null;
    clientStatusCard.style.display = 'none';
    diasCreditoGroup.style.display = 'none';
  } else {
    searchClienteInput.value = '';
    searchClienteInput.disabled = false;
    selectClienteId.value = '';
    selectedClient = null;
    clientStatusCard.style.display = 'none';
    diasCreditoGroup.style.display = 'block';
    setTimeout(() => {
      searchClienteInput.focus();
    }, 50);
  }

  validateCartState();
});

function calculateTotal() {
  return cart.reduce((acc, item) => {
    const qty = parseFloat(item.cantidad);
    if (!isNaN(qty) && qty > 0 && item.subtotal > 0) {
      return acc + item.subtotal;
    }
    return acc;
  }, 0);
}

function validateCartState() {
  const total = calculateTotal();
  const grandTotalEl = document.getElementById('posGrandTotal');
  if (grandTotalEl) {
    grandTotalEl.textContent = formatMoney(total);
  }

  const tipoPago = selectTipoPago.value;

  if (cart.length === 0) {
    creditAlertBanner.style.display = 'none';
    btnConfirmarVenta.disabled = true;
    return;
  }

  let hasError = false;

  for (const item of cart) {
    const qty = parseFloat(item.cantidad);
    const prod = catalog.find(p => p.id === item.producto_id);
    const maxStock = parseFloat(prod ? prod.stock_actual : item.stock_max);

    if (isNaN(qty) || qty <= 0 || qty > maxStock) {
      hasError = true;
      break;
    }
  }

  if (hasError) {
    btnConfirmarVenta.disabled = true;
    return;
  }

  if (tipoPago === 'credito') {
    if (!selectedClient || !selectClienteId.value || selectClienteId.value === 'cf') {
      creditAlertText.textContent = 'Debe seleccionar un cliente registrado para ventas a crédito';
      creditAlertBanner.style.display = 'flex';
      btnConfirmarVenta.disabled = true;
      return;
    }

    const limite = parseFloat(selectedClient.limite_credito || 0);
    const deuda = parseFloat(selectedClient.saldo_pendiente || 0);
    const disponible = Math.max(0, limite - deuda);

    if (total > disponible) {
      creditAlertText.innerHTML = `Límite de crédito excedido. Disponible: <strong>${formatMoney(disponible)}</strong> | Total orden: <strong>${formatMoney(total)}</strong>`;
      creditAlertBanner.style.display = 'flex';
      btnConfirmarVenta.disabled = true;
      return;
    }
  }

  creditAlertBanner.style.display = 'none';
  btnConfirmarVenta.disabled = false;
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

    let cxcBalances = {};
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
    showToast(err.message, true);
  }

  selectTipoPago.value = 'contado';
  searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
  searchClienteInput.disabled = true;
  selectClienteId.value = 'cf';
  selectedClient = null;
  clientStatusCard.style.display = 'none';
  diasCreditoGroup.style.display = 'none';

  renderModalCatalog(catalog);
}

function renderModalCatalog(list) {
  const container = document.getElementById('modalCatalogTableBody');
  if (!list || list.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No se encontraron cortes coincidentes.</td></tr>';
    return;
  }

  container.innerHTML = list.map(item => {
    const stock = parseFloat(item.stock_actual);
    const isOutOfStock = stock <= 0;
    return `
      <tr>
        <td><strong>#${String(item.id).padStart(4, '0')}</strong></td>
        <td><strong style="color: var(--color-text-main);">${item.nombre}</strong></td>
        <td style="font-weight: 700; color: var(--color-primary);">${formatMoney(item.precio_venta)}</td>
        <td>
          <span style="font-weight: 600; ${isOutOfStock ? 'color: var(--color-danger);' : 'color: var(--color-text-main);'}">
            ${stock.toFixed(2)} lb
          </span>
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-primary btn-sm" onclick="addToCartFromModal(${item.id})" ${isOutOfStock ? 'disabled' : ''}>
            + Agregar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

document.getElementById('modalSearchInput').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const filtered = catalog.filter(item =>
    item.nombre.toLowerCase().includes(query) || String(item.id).includes(query)
  );
  renderModalCatalog(filtered);
});

window.addToCartFromModal = function(productId) {
  const product = catalog.find(p => p.id === productId);
  if (!product) return;

  const currentStock = parseFloat(product.stock_actual);
  if (currentStock <= 0) {
    showToast(`Stock insuficiente para ${product.nombre}. Disponible: 0 lb`, true);
    return;
  }

  const existingItem = cart.find(i => i.producto_id === product.id);
  const currentCartQty = existingItem ? parseFloat(existingItem.cantidad || 0) : 0;
  const newQty = currentCartQty + 1;

  if (newQty > currentStock) {
    showToast(`Stock insuficiente para ${product.nombre}. Disponible: ${currentStock} lb`, true);
    return;
  }

  if (existingItem) {
    existingItem.cantidad = newQty;
    existingItem.subtotal = existingItem.cantidad * existingItem.precio_unitario;
  } else {
    const rowId = Date.now() + Math.random();
    cart.push({
      rowId: rowId,
      producto_id: product.id,
      nombre: product.nombre,
      precio_unitario: parseFloat(product.precio_venta),
      cantidad: 1,
      stock_max: currentStock,
      subtotal: parseFloat(product.precio_venta)
    });
  }

  closeModal('modalAgregarCorte');
  renderCart();
  showToast(`"${product.nombre}" agregado`);
};

window.onQtyInputChanged = function(rowId, val, inputEl) {
  const item = cart.find(i => i.rowId === rowId);
  if (!item) return;

  const input = inputEl || document.getElementById(`qtyInput_${rowId}`);
  const parsed = parseFloat(val);
  const subtotalEl = document.getElementById(`subtotalRow_${rowId}`);

  if (isNaN(parsed) || parsed <= 0) {
    item.cantidad = isNaN(parsed) ? 0 : parsed;
    item.subtotal = 0;
    if (input) {
      input.style.borderColor = '#D32F2F';
      input.style.outline = '1px solid #D32F2F';
    }
    if (subtotalEl) {
      subtotalEl.textContent = formatMoney(0);
    }
    validateCartState();
    btnConfirmarVenta.disabled = true;
    return;
  }

  const prod = catalog.find(p => p.id === item.producto_id);
  const currentStock = parseFloat(prod ? prod.stock_actual : item.stock_max);

  if (parsed > currentStock) {
    item.cantidad = parsed;
    item.subtotal = 0;
    if (input) {
      input.style.borderColor = '#D32F2F';
      input.style.outline = '1px solid #D32F2F';
    }
    if (subtotalEl) {
      subtotalEl.textContent = formatMoney(0);
    }
    showToast(`Stock insuficiente para ${item.nombre}. Disponible: ${currentStock} lb`, true);
    validateCartState();
    btnConfirmarVenta.disabled = true;
    return;
  }

  if (input) {
    input.style.borderColor = '';
    input.style.outline = '';
  }
  item.cantidad = parsed;
  item.subtotal = item.cantidad * item.precio_unitario;

  if (subtotalEl) {
    subtotalEl.textContent = formatMoney(item.subtotal);
  }

  validateCartState();
};

window.removeFromCartByRow = function(rowId) {
  cart = cart.filter(i => i.rowId !== rowId);
  renderCart();
};

document.getElementById('btnClearCart').addEventListener('click', () => {
  if (cart.length > 0) {
    cart = [];
    renderCart();
  }
});

function renderCart() {
  const container = document.getElementById('cartTableBody');
  const grandTotalEl = document.getElementById('posGrandTotal');

  if (cart.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 3rem 1rem;">
          <div style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--color-text-main);">La orden está vacía</div>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Haga clic en el botón inferior para abrir el catálogo cárnico.</p>
        </td>
      </tr>
    `;
    grandTotalEl.textContent = 'C$0.00';
    validateCartState();
    return;
  }

  let totalAmount = 0;

  container.innerHTML = cart.map((item, index) => {
    const isInvalid = isNaN(item.cantidad) || item.cantidad <= 0 || item.cantidad > item.stock_max;
    if (!isInvalid && item.subtotal > 0) {
      totalAmount += item.subtotal;
    }
    const borderStyle = isInvalid ? 'border-color: #D32F2F; outline: 1px solid #D32F2F;' : '';

    return `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--color-text-main);">${item.nombre}</div>
          <span style="font-size: 0.72rem; color: var(--color-text-muted);">Pesaje #${index + 1}</span>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--color-primary);">${formatMoney(item.precio_unitario)}</span>
          <span style="font-size: 0.72rem; color: var(--color-text-muted);">/ lb</span>
        </td>
        <td>
          <input type="number" id="qtyInput_${item.rowId}" class="qty-input-pos" value="${item.cantidad}" min="0.1" step="0.01" style="${borderStyle}" oninput="onQtyInputChanged(${item.rowId}, this.value, this)">
        </td>
        <td>
          <strong id="subtotalRow_${item.rowId}" style="color: var(--color-text-main); font-size: 0.95rem;">${formatMoney(item.subtotal)}</strong>
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="removeFromCartByRow(${item.rowId})" style="color: var(--color-danger); padding: 0.25rem 0.5rem;" title="Eliminar">&times;</button>
        </td>
      </tr>
    `;
  }).join('');

  grandTotalEl.textContent = formatMoney(totalAmount);
  validateCartState();
}

document.getElementById('posCheckoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (cart.length === 0) {
    showToast('La orden está vacía', true);
    return;
  }

  for (const item of cart) {
    const qty = parseFloat(item.cantidad);
    if (isNaN(qty) || qty <= 0) {
      showToast(`Cantidad inválida para ${item.nombre}. Debe ser mayor a 0`, true);
      btnConfirmarVenta.disabled = true;
      return;
    }
    const prod = catalog.find(p => p.id === item.producto_id);
    const availableStock = parseFloat(prod ? prod.stock_actual : item.stock_max);
    if (qty > availableStock) {
      showToast(`Stock insuficiente para ${item.nombre}. Disponible: ${availableStock} lb`, true);
      btnConfirmarVenta.disabled = true;
      return;
    }
  }

  const tipo_pago = selectTipoPago.value;
  const cliVal = selectClienteId.value;

  if (tipo_pago === 'credito') {
    if (!selectedClient || !cliVal || cliVal === 'cf') {
      showToast('Debe seleccionar un cliente registrado para ventas a crédito', true);
      creditAlertText.textContent = 'Debe seleccionar un cliente registrado para ventas a crédito';
      creditAlertBanner.style.display = 'flex';
      btnConfirmarVenta.disabled = true;
      return;
    }

    const limite = parseFloat(selectedClient.limite_credito || 0);
    const deuda = parseFloat(selectedClient.saldo_pendiente || 0);
    const disponible = Math.max(0, limite - deuda);
    const total = calculateTotal();

    if (total > disponible) {
      showToast('Límite de crédito superado. Venta rechazada.', true);
      creditAlertText.innerHTML = `Límite de crédito excedido. Disponible: <strong>${formatMoney(disponible)}</strong> | Total orden: <strong>${formatMoney(total)}</strong>`;
      creditAlertBanner.style.display = 'flex';
      btnConfirmarVenta.disabled = true;
      return;
    }
  }

  const cliente_id = cliVal === 'cf' ? 'cf' : parseInt(cliVal, 10);
  const dias_credito = tipo_pago === 'credito'
    ? parseInt(document.getElementById('inputDiasCredito').value || 15, 10)
    : 0;

  btnConfirmarVenta.disabled = true;
  btnConfirmarVenta.textContent = 'Procesando Venta...';

  const payload = {
    cliente_id,
    tipo_pago,
    dias_credito,
    items: cart.map(i => ({
      producto_id: i.producto_id,
      cantidad: parseFloat(i.cantidad),
      precio_unitario: i.precio_unitario,
      descuento: 0
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
    showToast(`¡Venta registrada con éxito! Factura: ${numFactura}`, false);
    cart = [];
    renderCart();

    selectTipoPago.value = 'contado';
    searchClienteInput.value = 'Consumidor Final (Venta al Contado)';
    searchClienteInput.disabled = true;
    selectClienteId.value = 'cf';
    selectedClient = null;
    clientStatusCard.style.display = 'none';
    diasCreditoGroup.style.display = 'none';

    await loadInitialData();
  } catch (err) {
    showToast(err.message || 'Error al emitir factura', true);
  } finally {
    btnConfirmarVenta.disabled = false;
    btnConfirmarVenta.textContent = 'Confirmar y Registrar Venta';
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadInitialData);
} else {
  loadInitialData();
}