/* ============================================
   AURUM WELLNESS CLINIC — Interactive Logic
   ============================================ */

(function () {
  'use strict';

  // ---- Service Data ----
  const SERVICES = {
    // Aesthetic Treatments
    'botox':         { name: 'Botox', duration: '30 min', price: null, priceLabel: 'Consultation' },
    'fillers':       { name: 'Dermal Fillers', duration: '45 min', price: null, priceLabel: 'Consultation' },
    'thread-lift':   { name: 'Thread Lift', duration: '60 min', price: null, priceLabel: 'Consultation' },
    'laser':         { name: 'Laser Treatment', duration: '30–60 min', price: 500, priceLabel: 'From ₱500' },
    'gluta-drip':    { name: 'IV Drip Therapy', duration: '45–60 min', price: 1500, priceLabel: 'From ₱1,500' },
    'prp':           { name: 'PRP Therapy', duration: '60 min', price: null, priceLabel: 'Consultation' },
    // Skin Care
    'hydrafacial':   { name: 'Hydrafacial', duration: '45 min', price: 2000, priceLabel: 'From ₱2,000' },
    'chemical-peel': { name: 'Chemical Peel', duration: '30 min', price: 1500, priceLabel: 'From ₱1,500' },
    'microneedling': { name: 'Microneedling', duration: '45 min', price: 3000, priceLabel: 'From ₱3,000' },
    'wart-removal':  { name: 'Wart & Mole Removal', duration: '15–30 min', price: 500, priceLabel: 'From ₱500' },
    // Wellness
    'hilot':         { name: 'Hilot Massage', duration: '60 min', price: 500, priceLabel: '₱500' },
    'swedish':       { name: 'Swedish Massage', duration: '60 min', price: 600, priceLabel: '₱600' },
    'deep-tissue':   { name: 'Deep Tissue Massage', duration: '60 min', price: 700, priceLabel: '₱700' },
    'post-flight':   { name: 'Post-Flight Recovery', duration: '90 min', price: 1200, priceLabel: '₱1,200' },
  };

  // ---- DOM Refs ----
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ---- Preloader ----
  window.addEventListener('load', () => {
    setTimeout(() => {
      const preloader = $('#preloader');
      if (preloader) preloader.classList.add('hidden');
    }, 600);
  });

  // ---- Header Scroll ----
  const header = $('#header');
  const fab = $('#fab');
  let lastScroll = 0;

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 60);
    if (fab) fab.classList.toggle('visible', y > 500);
    lastScroll = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Mobile Menu ----
  const menuToggle = $('#menuToggle');
  const mobileNav = $('#mobileNav');

  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.classList.toggle('active');
    mobileNav.classList.toggle('active', isOpen);
    mobileNav.setAttribute('aria-hidden', !isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close mobile nav on link click
  $$('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      mobileNav.classList.remove('active');
      mobileNav.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // ---- Smooth Scroll ----
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = $(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = header.offsetHeight + 16;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ---- Scroll Reveal ----
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  $$('.scroll-reveal').forEach(el => revealObserver.observe(el));

  // ---- Service Card Book Buttons ----
  $$('.service-card-book').forEach(btn => {
    btn.addEventListener('click', () => {
      const serviceKey = btn.dataset.book;
      // Select the service in the booking form
      const radio = $(`input[name="service"][value="${serviceKey}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
      // Scroll to booking
      const bookingSection = $('#booking');
      if (bookingSection) {
        const offset = header.offsetHeight + 16;
        const top = bookingSection.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ---- Booking System ----
  const bookingForm = $('#bookingForm');
  let currentStep = 1;

  function showStep(step) {
    $$('.booking-step').forEach(s => s.classList.remove('active'));
    const target = $(`.booking-step[data-step="${step}"]`);
    if (target) target.classList.add('active');
    currentStep = step;

    // Update progress
    $$('.booking-progress-step').forEach(p => {
      const pStep = parseInt(p.dataset.prog);
      p.classList.toggle('active', pStep === step);
      p.classList.toggle('completed', pStep < step);
    });
  }

  // Set min date to today
  const dateInput = $('#bookingDate');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    // Max 30 days out
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    dateInput.max = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
    dateInput.addEventListener('change', refreshTimeAvailability);
  }

  // Disable booked time slots
  function refreshTimeAvailability() {
    if (!window.AurumStore || !dateInput || !dateInput.value) return;
    const taken = window.AurumStore.takenSlotsFor(dateInput.value);
    $$('.booking-time-option').forEach(label => {
      const input = label.querySelector('input[type="radio"]');
      if (!input) return;
      const isTaken = taken.has(input.value);
      input.disabled = isTaken;
      label.classList.toggle('booking-time-option--taken', isTaken);
      // If currently selected slot just became unavailable, clear it
      if (isTaken && input.checked) input.checked = false;
    });
  }
  refreshTimeAvailability();
  if (window.AurumStore) {
    window.AurumStore.subscribe(() => refreshTimeAvailability());
  }

  // Validation
  function validateStep(step) {
    clearErrors();
    let valid = true;

    if (step === 1) {
      const service = $('input[name="service"]:checked');
      if (!service) {
        showError('serviceError', 'Please select a treatment');
        valid = false;
      }
    }

    if (step === 2) {
      const date = dateInput.value;
      const time = $('input[name="time"]:checked');

      if (!date) {
        showError('dateError', 'Please select a date');
        valid = false;
      } else {
        const selected = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected < today) {
          showError('dateError', 'Please select a future date');
          valid = false;
        }
      }

      if (!time) {
        showError('timeError', 'Please select a time slot');
        valid = false;
      }
    }

    if (step === 3) {
      const name = $('#bookingName').value.trim();
      const phone = $('#bookingPhone').value.trim();
      const email = $('#bookingEmail').value.trim();

      if (!name || name.length < 2) {
        showError('nameError', 'Please enter your full name');
        valid = false;
      }

      if (!phone) {
        showError('phoneError', 'Please enter your phone number');
        valid = false;
      } else if (!/^[\d\s+()-]{7,15}$/.test(phone)) {
        showError('phoneError', 'Please enter a valid phone number');
        valid = false;
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('emailError', 'Please enter a valid email address');
        valid = false;
      }
    }

    return valid;
  }

  function showError(id, msg) {
    const el = $(`#${id}`);
    if (el) el.textContent = msg;
  }

  function clearErrors() {
    $$('.booking-error').forEach(e => e.textContent = '');
  }

  // Build summary
  function buildSummary() {
    const serviceVal = $('input[name="service"]:checked')?.value;
    const service = SERVICES[serviceVal];
    const date = dateInput.value;
    const time = $('input[name="time"]:checked')?.value;
    const name = $('#bookingName').value.trim();
    const phone = $('#bookingPhone').value.trim();
    const email = $('#bookingEmail').value.trim();
    const notes = $('#bookingNotes').value.trim();

    // Format date
    let formattedDate = '';
    if (date) {
      const d = new Date(date + 'T00:00:00');
      formattedDate = d.toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    // Format time
    let formattedTime = '';
    if (time) {
      const [h, m] = time.split(':');
      const hour = parseInt(h);
      formattedTime = hour > 12 ? `${hour - 12}:${m} PM` : hour === 12 ? `12:${m} PM` : `${hour}:${m} AM`;
    }

    const summary = $('#bookingSummary');
    summary.innerHTML = `
      <div class="booking-summary-row">
        <span class="booking-summary-label">Treatment</span>
        <span class="booking-summary-value">${service?.name || ''}</span>
      </div>
      <div class="booking-summary-row">
        <span class="booking-summary-label">Duration</span>
        <span class="booking-summary-value">${service?.duration || ''}</span>
      </div>
      <div class="booking-summary-row">
        <span class="booking-summary-label">Date</span>
        <span class="booking-summary-value">${formattedDate}</span>
      </div>
      <div class="booking-summary-row">
        <span class="booking-summary-label">Time</span>
        <span class="booking-summary-value">${formattedTime}</span>
      </div>
      <div class="booking-summary-row">
        <span class="booking-summary-label">Name</span>
        <span class="booking-summary-value">${name}</span>
      </div>
      <div class="booking-summary-row">
        <span class="booking-summary-label">Phone</span>
        <span class="booking-summary-value">${phone}</span>
      </div>
      ${email ? `<div class="booking-summary-row">
        <span class="booking-summary-label">Email</span>
        <span class="booking-summary-value">${email}</span>
      </div>` : ''}
      ${notes ? `<div class="booking-summary-row">
        <span class="booking-summary-label">Notes</span>
        <span class="booking-summary-value">${notes}</span>
      </div>` : ''}
      <div class="booking-summary-row total">
        <span class="booking-summary-label">Total</span>
        <span class="booking-summary-value">${service?.price ? '₱' + service.price.toLocaleString() : service?.priceLabel || 'To be discussed'}</span>
      </div>
    `;
  }

  // Step navigation
  $$('.booking-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStep = parseInt(btn.dataset.next);
      if (validateStep(currentStep)) {
        if (nextStep === 4) buildSummary();
        showStep(nextStep);
      }
    });
  });

  $$('.booking-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      showStep(parseInt(btn.dataset.prev));
    });
  });

  // Form submit
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const serviceVal = $('input[name="service"]:checked')?.value;
    const service = SERVICES[serviceVal];
    const date = dateInput.value;
    const time = $('input[name="time"]:checked')?.value;
    const name = $('#bookingName').value.trim();
    const phone = $('#bookingPhone').value.trim();
    const email = $('#bookingEmail').value.trim();
    const notes = $('#bookingNotes').value.trim();

    // Use shared store if available; fallback to legacy
    let booking;
    if (window.AurumStore) {
      booking = window.AurumStore.create({
        service: serviceVal, date, time, name, phone, email, notes,
        source: 'iteration-1',
      });
    } else {
      booking = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        service: serviceVal,
        serviceName: service?.name,
        duration: service?.duration,
        price: service?.price,
        date, time, name, phone, email, notes,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const bookings = JSON.parse(localStorage.getItem('aurum_bookings') || '[]');
      bookings.push(booking);
      localStorage.setItem('aurum_bookings', JSON.stringify(bookings));
    }

    // Format for modal
    const d = new Date(date + 'T00:00:00');
    const formattedDate = d.toLocaleDateString('en-PH', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const formattedTime = hour > 12 ? `${hour - 12}:${m} PM` : hour === 12 ? `12:${m} PM` : `${hour}:${m} AM`;

    // Show success modal
    const modalDetails = $('#modalDetails');
    modalDetails.innerHTML = `
      <p><span>Treatment</span> <strong>${service?.name}</strong></p>
      <p><span>Date</span> <strong>${formattedDate}</strong></p>
      <p><span>Time</span> <strong>${formattedTime}</strong></p>
      <p><span>Ref #</span> <strong>${booking.id.toUpperCase()}</strong></p>
    `;

    const modal = $('#successModal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Reset form
    bookingForm.reset();
    showStep(1);
  });

  // Modal close
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalOverlay').addEventListener('click', closeModal);

  function closeModal() {
    const modal = $('#successModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ---- Testimonials Carousel ----
  const track = $('#testimonialsTrack');
  const dotsContainer = $('#testimDots');
  const cards = $$('.testimonial-card');
  let currentSlide = 0;
  let autoplayTimer;

  function getSlidesPerView() {
    return window.innerWidth >= 768 ? 2 : 1;
  }

  function getMaxSlide() {
    return Math.max(0, cards.length - getSlidesPerView());
  }

  // Create dots
  function buildDots() {
    dotsContainer.innerHTML = '';
    const total = getMaxSlide() + 1;
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = `testimonial-dot${i === currentSlide ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }
  buildDots();

  function goToSlide(index) {
    const maxSlide = getMaxSlide();
    currentSlide = Math.max(0, Math.min(index, maxSlide));
    // Calculate offset based on card width + gap
    const perView = getSlidesPerView();
    const gap = 24; // --space-lg = 1.5rem = 24px
    const containerWidth = track.parentElement.offsetWidth - 2; // minus padding
    const cardWidth = (containerWidth - gap * (perView - 1)) / perView;
    const offset = currentSlide * (cardWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;
    $$('.testimonial-dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
    resetAutoplay();
  }

  $('#testimPrev').addEventListener('click', () => {
    goToSlide(currentSlide === 0 ? getMaxSlide() : currentSlide - 1);
  });

  $('#testimNext').addEventListener('click', () => {
    goToSlide(currentSlide >= getMaxSlide() ? 0 : currentSlide + 1);
  });

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(() => {
      goToSlide(currentSlide >= getMaxSlide() ? 0 : currentSlide + 1);
    }, 6000);
  }
  resetAutoplay();

  // Rebuild on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildDots();
      goToSlide(Math.min(currentSlide, getMaxSlide()));
    }, 150);
  });

  // Touch swipe support for testimonials
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToSlide(currentSlide >= getMaxSlide() ? 0 : currentSlide + 1);
      } else {
        goToSlide(currentSlide === 0 ? getMaxSlide() : currentSlide - 1);
      }
    }
  }, { passive: true });

})();
