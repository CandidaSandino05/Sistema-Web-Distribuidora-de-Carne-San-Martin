const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
  ? 'http://localhost:3000/api'
  : '/api';

const form = document.getElementById('loginForm');
const btnSubmit = document.getElementById('btnSubmit');
const toastEl = document.getElementById('toast');

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = 'toast show ' + (isError ? 'toast-error' : 'toast-success');
  setTimeout(() => {
    toastEl.className = 'toast';
  }, 3500);
}

function redirectByRole(rol) {
  if (rol === 'administrador') {
    window.location.href = './dashboard.html';
  } else if (rol === 'gerente') {
    window.location.href = './inventario.html';
  } else {
    window.location.href = './ventas.html';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value;

  if (!usuario || !password) {
    showToast('Por favor complete todos los campos', true);
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Autenticando...';

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usuario, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Credenciales no válidas');
    }

    localStorage.setItem('san_martin_token', data.data.token);
    localStorage.setItem('san_martin_user', JSON.stringify(data.data.user));

    showToast('Acceso correcto. Redirigiendo...', false);
    setTimeout(() => {
      redirectByRole(data.data.user.rol);
    }, 400);
  } catch (error) {
    showToast(error.message, true);
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Ingresar al Portal';
  }
});