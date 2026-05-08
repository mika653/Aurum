/* ============================================
   AURUM · CONCEPT 03 — CLINICAL LUX
   ============================================ */
(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const Store = window.AurumStore;

  /* Service catalog augment for cards */
  const META = {
    'botox':         { sub: 'Wrinkle reduction · 3–4 month duration',  flag: 'Doctor-led' },
    'fillers':       { sub: 'Volume & contour · 6–12 month duration', flag: 'Doctor-led' },
    'thread-lift':   { sub: 'Non-surgical lift · Progressive results', flag: 'Doctor-led' },
    'prp':           { sub: 'Autologous · Collagen induction',         flag: 'Doctor-led' },
    'gluta-drip':    { sub: 'IV nutrition · Skin & immunity',          flag: 'Most chosen' },
    'laser':         { sub: 'Hair · pigment · resurfacing',            flag: 'Doctor-led' },
    'hydrafacial':   { sub: 'Multi-step cleanse, extract, hydrate' },
    'chemical-peel': { sub: 'Resurfacing · Brightening' },
    'microneedling': { sub: 'Collagen induction therapy' },
    'wart-removal':  { sub: 'Cautery · 14-day healing' },
    'hilot':         { sub: 'Filipino healing massage' },
    'swedish':       { sub: 'Classic relaxation' },
    'deep-tissue':   { sub: 'Targeted muscle release' },
    'post-flight':   { sub: 'Traveller protocol · 90 min',             flag: "Traveller's choice" },
  };

  /* Mobile menu */
  const burger = $('#clBurger');
  if (burger) {
    let drawer = $('.cl-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'cl-drawer';
      drawer.innerHTML = $('.cl-nav-links').innerHTML +
        '<a href="tel:+639171234567">+63 917 123 4567</a>' +
        '<a href="#book">Book consultation</a>';
      document.body.appendChild(drawer);
    }
    burger.addEventListener('click', () => {
      const open = burger.classList.toggle('active');
      drawer.classList.toggle('active', open);
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        burger.classList.remove('active');
        drawer.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  /* Smooth scroll */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      const offset = ($('#clNav')?.offsetHeight || 80) + 12;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    });
  });

  /* Render promos (Mother's Day) */
  function renderPromos() {
    const mount = $('#clPromosMount');
    if (!mount || !Store.PROMOS) return;
    mount.innerHTML = Store.PROMOS.map(p => `
      <article class="cl-promo">
        <div class="cl-promo-poster" style="background-image:url('../${p.image}');" role="img" aria-label="${p.title}">
          <span class="cl-promo-occasion">${p.occasion}</span>
        </div>
        <div class="cl-promo-body">
          <header class="cl-promo-headline">
            <p class="cl-promo-kicker">${p.kicker}</p>
            <h3 class="cl-promo-title">${p.title}</h3>
            <span class="cl-promo-tagline">${p.tagline}</span>
          </header>
          <div class="cl-promo-pkgs">
            ${p.packages.map(pkg => `
              <div class="cl-promo-pkg">
                <div class="cl-promo-pkg-head">
                  <span class="cl-promo-pkg-no">No.${pkg.no}</span>
                  <span class="cl-promo-pkg-name">${pkg.name}</span>
                  ${pkg.price ? `<span class="cl-promo-pkg-price">${pkg.price}${pkg.subprice ? `<small>${pkg.subprice}</small>` : ''}</span>` : ''}
                </div>
                <ul class="cl-promo-pkg-extras">
                  ${pkg.extras.map(x => `<li>${x}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          ${p.pillars ? `<div class="cl-promo-pillars">${p.pillars.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
          ${p.addon ? `
            <div class="cl-promo-addon">
              <div>
                <strong>${p.addon.label}</strong>
                <span class="cl-promo-addon-note">${p.addon.note}</span>
              </div>
              <span class="cl-promo-addon-price">${p.addon.price}</span>
            </div>` : ''}
          <p class="cl-promo-foot">${p.footer}</p>
          <div class="cl-promo-cta">
            <div class="cl-promo-headline-price">
              <span class="cl-promo-price">${p.headlinePrice}</span>
              <span class="cl-promo-price-note">${p.headlinePriceNote}</span>
            </div>
            <button class="cl-promo-book" data-promo="${p.bookKey}">Book →</button>
          </div>
        </div>
      </article>
    `).join('');
    $$('.cl-promo-book', mount).forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = $('#clService');
        if (sel) sel.value = btn.dataset.promo;
        const target = $('#book');
        if (target) {
          const offset = ($('#clNav')?.offsetHeight || 80) + 12;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        }
      });
    });
  }
  renderPromos();

  /* Render service grid */
  const grid = $('#clServiceGrid');
  function renderServices(filter = 'aesthetic') {
    if (!Store) return;
    const all = Store.SERVICES;
    const want = (cat) => {
      if (filter === 'all') return true;
      if (filter === 'aesthetic') return cat === 'Aesthetic';
      if (filter === 'skin') return cat === 'Skin Care';
      if (filter === 'wellness') return cat === 'Wellness';
      return true;
    };
    grid.innerHTML = Object.entries(all).filter(([_,s]) => want(s.category)).map(([key, s]) => {
      const m = META[key] || {};
      return `
        <article class="cl-svc">
          <div class="cl-svc-head">
            <span class="cl-svc-cat">${s.category}</span>
            ${m.flag ? `<span class="cl-svc-flag">${m.flag}</span>` : ''}
          </div>
          <h3>${s.name}</h3>
          <p class="cl-svc-sub">${m.sub || ''}</p>
          <div class="cl-svc-grid-meta">
            <div><span>Duration</span><span>${s.duration} min</span></div>
            <div><span>Price</span><span>${s.priceLabel}</span></div>
          </div>
          <div class="cl-svc-cta">
            <span class="cl-svc-cat">${s.doctorLed ? '⚕ Doctor-led' : 'Therapist-led'}</span>
            <button class="cl-svc-book" data-book="${key}">Book →</button>
          </div>
        </article>
      `;
    }).join('');
    bindBookButtons();
  }
  function bindBookButtons() {
    $$('.cl-svc-book').forEach(btn => {
      btn.addEventListener('click', () => {
        $('#clService').value = btn.dataset.book;
        const target = $('#book');
        if (target) {
          const offset = ($('#clNav')?.offsetHeight || 80) + 12;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        }
      });
    });
  }
  renderServices();

  $$('.cl-cat-tab').forEach(t => t.addEventListener('click', () => {
    $$('.cl-cat-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    renderServices(t.dataset.cat);
  }));

  /* Booking form */
  const form = $('#clForm');
  const dateInput = $('#clDate');
  const timeInput = $('#clTime');
  const errorOut  = $('#clFormError');
  const nextSlot  = $('#clNextSlot');

  function fmtDate(d) { return d.toISOString().slice(0,10); }
  if (dateInput) {
    const today = new Date();
    const max = new Date(today); max.setDate(max.getDate() + 30);
    dateInput.min = fmtDate(today);
    dateInput.max = fmtDate(max);
    dateInput.addEventListener('change', refreshTimes);
  }

  function refreshTimes() {
    if (!Store || !timeInput) return;
    const slots = Store.TIME_SLOTS;
    const taken = dateInput.value ? Store.takenSlotsFor(dateInput.value) : new Set();
    timeInput.innerHTML = '<option value="">Choose a time…</option>' +
      slots.map(s => {
        const t = Store.formatTime(s);
        const isTaken = taken.has(s);
        return `<option value="${s}" ${isTaken ? 'disabled' : ''}>${t}${isTaken ? ' — booked' : ''}</option>`;
      }).join('');
  }
  refreshTimes();

  /* Next available slot in aside */
  function findNextAvailable() {
    if (!Store) return;
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const dateStr = fmtDate(d);
      const taken = Store.takenSlotsFor(dateStr);
      const free = Store.TIME_SLOTS.find(s => !taken.has(s));
      if (free) {
        const dateLbl = d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });
        nextSlot.textContent = `${dateLbl} · ${Store.formatTime(free)}`;
        return;
      }
    }
    nextSlot.textContent = 'Fully booked for the next 14 days. Please call us.';
  }
  findNextAvailable();
  if (Store) Store.subscribe(() => { findNextAvailable(); refreshTimes(); });

  /* Submit */
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    errorOut.textContent = '';

    const data = {
      service: $('#clService').value,
      date:    dateInput.value,
      time:    timeInput.value,
      name:    $('#clName').value.trim(),
      phone:   $('#clPhone').value.trim(),
      email:   $('#clEmail').value.trim(),
      notes:   $('#clNotes').value.trim(),
      source:  'iteration-3',
    };
    const consent = $('#clConsent').checked;

    if (!data.service) return errorOut.textContent = 'Please choose a service.';
    if (!data.date) return errorOut.textContent = 'Please select a date.';
    if (!data.time) return errorOut.textContent = 'Please select a time.';
    if (!data.name || data.name.length < 2) return errorOut.textContent = 'Please enter your full name.';
    if (!/^[\d\s+()-]{7,15}$/.test(data.phone)) return errorOut.textContent = 'Please enter a valid phone number.';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return errorOut.textContent = 'Please check your email.';
    if (!consent) return errorOut.textContent = 'Please consent to the medical screening to proceed.';

    if (Store && Store.isSlotTaken(data.date, data.time)) {
      return errorOut.textContent = 'That slot was just taken. Please choose another.';
    }

    const booking = Store ? Store.create(data) : { id: Date.now().toString(36), ...data };
    showModal(booking);
    form.reset();
    refreshTimes();
  });

  /* Modal */
  const modal = $('#clModal');
  function showModal(b) {
    const svc = (Store && Store.SERVICES[b.service]) || { name: b.serviceName || b.service };
    $('#clModalDetails').innerHTML = `
      <div><span>Service</span><span>${svc.name}</span></div>
      <div><span>Date</span><span>${Store ? Store.formatDate(b.date) : b.date}</span></div>
      <div><span>Time</span><span>${Store ? Store.formatTime(b.time) : b.time}</span></div>
      <div><span>Reference</span><span>${(b.id || '').toString().toUpperCase()}</span></div>
    `;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  $('#clModalClose')?.addEventListener('click', closeModal);
  $('.cl-modal-overlay')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  /* Reveal */
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  $$('.cl-section-head, .cl-tier, .cl-ev-card, .cl-svc, .cl-trust-grid > div')
    .forEach(el => { el.classList.add('cl-reveal'); obs.observe(el); });
})();
