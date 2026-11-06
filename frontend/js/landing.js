document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.indicator-dot');
  let currentSlide = 0;
  let carouselTimer = null;

  function setSlide(index) {
    if (!slides.length) return;
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentSlide = index;
  }

  function advanceSlide() {
    const next = (currentSlide + 1) % slides.length;
    setSlide(next);
  }

  function restartCarouselTimer() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(advanceSlide, 4000);
  }

  if (slides.length > 0) {
    setSlide(0);
    restartCarouselTimer();

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        setSlide(i);
        restartCarouselTimer();
      });
    });
  }

  const wholesaleForm = document.getElementById('wholesaleForm');
  const leadName = document.getElementById('leadName');
  const leadPhone = document.getElementById('leadPhone');
  const leadProduct = document.getElementById('leadProduct');
  const leadVolume = document.getElementById('leadVolume');
  const nameError = document.getElementById('nameError');
  const phoneError = document.getElementById('phoneError');

  if (leadPhone) {
    leadPhone.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
      if (e.target.value.length === 8) {
        phoneError.textContent = '';
        leadPhone.classList.remove('input-error');
      }
    });
  }

  if (leadName) {
    leadName.addEventListener('input', (e) => {
      if (e.target.value.trim().length > 0) {
        nameError.textContent = '';
        leadName.classList.remove('input-error');
      }
    });
  }

  if (wholesaleForm) {
    wholesaleForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;
      const nameVal = leadName ? leadName.value.trim() : '';
      const phoneVal = leadPhone ? leadPhone.value.trim() : '';
      const productVal = leadProduct ? leadProduct.options[leadProduct.selectedIndex].text : '';
      const volumeVal = leadVolume ? leadVolume.options[leadVolume.selectedIndex].text : '';

      if (!nameVal) {
        if (nameError) nameError.textContent = 'Por favor, ingresa tu nombre o el de tu negocio.';
        if (leadName) leadName.classList.add('input-error');
        isValid = false;
      } else {
        if (nameError) nameError.textContent = '';
        if (leadName) leadName.classList.remove('input-error');
      }

      if (phoneVal.length !== 8) {
        if (phoneError) phoneError.textContent = 'Ingresa los 8 dígitos exactos de tu número telefónico.';
        if (leadPhone) leadPhone.classList.add('input-error');
        isValid = false;
      } else {
        if (phoneError) phoneError.textContent = '';
        if (leadPhone) leadPhone.classList.remove('input-error');
      }

      if (!isValid) return;

      const messageText = `¡Hola Distribuidora de Carnes San Martín! Deseo solicitar una cotización de mayoreo:\n\n*Nombre / Negocio:* ${nameVal}\n*Teléfono:* +505 ${phoneVal}\n*Corte de interés:* ${productVal}\n*Volumen estimado:* ${volumeVal}\n\nQuedo a la espera de su respuesta.`;
      const whatsappUrl = `https://wa.me/50555019626?text=${encodeURIComponent(messageText)}`;

      window.open(whatsappUrl, '_blank');

      wholesaleForm.reset();
      if (leadName) leadName.classList.remove('input-error');
      if (leadPhone) leadPhone.classList.remove('input-error');
      if (nameError) nameError.textContent = '';
      if (phoneError) phoneError.textContent = '';

      showToast('Solicitud enviada a WhatsApp. ¡Te contactaremos pronto!');
    });
  }

  const legalMap = {
    'privacidad': 'modalPrivacidad',
    'terminos': 'modalTerminos',
    'seguridad': 'modalSeguridad',
    'inocuidad': 'modalInocuidad'
  };

  const legalTriggers = document.querySelectorAll('.legal-modal-trigger[data-legal]');
  legalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const key = trigger.getAttribute('data-legal');
      const targetId = legalMap[key];
      if (targetId) {
        const modal = document.getElementById(targetId);
        if (modal) {
          modal.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
      }
    });
  });

  const closeButtons = document.querySelectorAll('[data-close-modal]');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-backdrop.open');
      if (openModal) {
        openModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });

  const currentYearEl = document.getElementById('currentYear');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }
});

let toastTimeout = null;

function showToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  container.innerHTML = `
    <div class="toast-notification" id="activeToast">
      <div class="toast-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  const toastEl = document.getElementById('activeToast');
  requestAnimationFrame(() => {
    toastEl.classList.add('show');
  });

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    if (toastEl) {
      toastEl.classList.remove('show');
      setTimeout(() => {
        if (container && container.contains(toastEl)) {
          container.removeChild(toastEl);
        }
      }, 300);
    }
  }, 4500);
}
