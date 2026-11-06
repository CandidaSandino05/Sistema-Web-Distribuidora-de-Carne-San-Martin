const API_URL = 'https://sistema-web-distribuidora-de-carne-san.onrender.com/api';

let failedAttempts = 0;
let isLocked = false;

const form = document.getElementById('loginForm');
const btnSubmit = document.getElementById('btnSubmit');
const toastEl = document.getElementById('toast');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const passwordInput = document.getElementById('password');
const usuarioInput = document.getElementById('usuario');

if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePasswordBtn.innerHTML = isPassword
      ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  });
}

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

function lockForm() {
  isLocked = true;
  if (usuarioInput) usuarioInput.disabled = true;
  if (passwordInput) passwordInput.disabled = true;
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Ingresar al Portal';
  const originalText = btnSubmit.innerText;
  btnSubmit.innerText = 'Bloqueado. Espere 5s...';

  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      btnSubmit.innerText = `Espere ${countdown}s...`;
    } else {
      clearInterval(countdownInterval);
      if (usuarioInput) usuarioInput.disabled = false;
      if (passwordInput) {
        passwordInput.disabled = false;
        passwordInput.value = '';
      }
      btnSubmit.disabled = false;
      btnSubmit.innerText = originalText;
      failedAttempts = 0;
      isLocked = false;
    }
  }, 1000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (isLocked) {
    return;
  }

  const usuario = usuarioInput ? usuarioInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

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
      failedAttempts++;
      showToast(`Credenciales incorrectas. Intento ${failedAttempts} de 3`, true);
      if (failedAttempts >= 3) {
        lockForm();
      } else {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Ingresar al Portal';
      }
      return;
    }

    failedAttempts = 0;
    localStorage.setItem('san_martin_token', data.data.token);
    localStorage.setItem('san_martin_user', JSON.stringify(data.data.user));

    showToast('Acceso correcto. Redirigiendo...', false);
    setTimeout(() => {
      redirectByRole(data.data.user.rol);
    }, 400);
  } catch (error) {
    if (failedAttempts < 3 && !isLocked) {
      showToast(error.message || 'Error de conexión', true);
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Ingresar al Portal';
    }
  }
});