/* ============================================
   AURUM · CONCEPT 02 — EDITORIAL GOLD
   ============================================ */
(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const Store = window.AurumStore;

  /* Mobile menu */
  const burger = $('#edBurger');
  const headerInner = $('.ed-header-inner');
  if (burger) {
    let drawer = $('.ed-drawer-panel');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'ed-drawer';
      drawer.innerHTML = $('.ed-nav').innerHTML + '<a href="#book" class="italic">Reserve</a>';
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

  /* Smooth-scroll */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      const offset = ($('#edHeader')?.offsetHeight || 80) + 12;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    });
  });

  /* Render promos (Mother's Day) */
  function renderPromos() {
    const mount = $('#edPromosMount');
    if (!mount || !Store || !Store.PROMOS) return;
    mount.innerHTML = Store.PROMOS.map((p, i) => `
      <article class="ed-promo">
        <div class="ed-promo-poster" style="background-image:url('../${p.image}');" role="img" aria-label="${p.title}">
          <span class="ed-promo-occasion">${p.occasion}</span>
          <span class="ed-promo-no-stamp">N°&nbsp;${String(i+1).padStart(2,'0')}</span>
        </div>
        <div class="ed-promo-body">
          <header class="ed-promo-headline">
            <p class="ed-promo-kicker">${p.kicker}</p>
            <h3 class="ed-promo-title">${p.title}</h3>
            <span class="ed-promo-tagline">${p.tagline}</span>
          </header>
          <div class="ed-promo-pkgs">
            ${p.packages.map(pkg => `
              <div class="ed-promo-pkg">
                <div class="ed-promo-pkg-head">
                  <span class="ed-promo-pkg-no">${pkg.no}.</span>
                  <span class="ed-promo-pkg-name">${pkg.name}</span>
                  ${pkg.price ? `<span class="ed-promo-pkg-price">${pkg.price}${pkg.subprice ? `<small>${pkg.subprice}</small>` : ''}</span>` : ''}
                </div>
                <ul class="ed-promo-pkg-extras">
                  ${pkg.extras.map(x => `<li>${x}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          ${p.pillars ? `<div class="ed-promo-pillars">${p.pillars.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
          ${p.addon ? `
            <div class="ed-promo-addon">
              <div>
                <strong>${p.addon.label}</strong>
                <span class="ed-promo-addon-note">${p.addon.note}</span>
              </div>
              <span class="ed-promo-addon-price">${p.addon.price}</span>
            </div>` : ''}
          <p class="ed-promo-foot">${p.footer}</p>
          <div class="ed-promo-cta">
            <div class="ed-promo-headline-price">
              <span class="ed-promo-price">${p.headlinePrice}</span>
              <span class="ed-promo-price-note">${p.headlinePriceNote}</span>
            </div>
            <button class="ed-promo-book" data-promo="${p.bookKey}">Reserve →</button>
          </div>
        </div>
      </article>
    `).join('');
    $$('.ed-promo-book', mount).forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = $('#edService');
        if (sel) sel.value = btn.dataset.promo;
        const target = $('#book');
        if (target) {
          const offset = ($('#edHeader')?.offsetHeight || 80) + 12;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        }
      });
    });
  }
  renderPromos();

  /* Reveal animations */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  $$('.ed-section-head, .ed-atelier-card, .ed-circle-card, .ed-review, .ed-feature-text, .ed-manifesto-body')
    .forEach(el => { el.classList.add('ed-reveal'); observer.observe(el); });

  /* Carte → form prefill */
  $$('.ed-carte-book').forEach(btn => {
    btn.addEventListener('click', () => {
      const svc = btn.dataset.book;
      $('#edService').value = svc;
      const target = $('#book');
      if (target) {
        const offset = ($('#edHeader')?.offsetHeight || 80) + 12;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
      }
    });
  });

  /* Booking form */
  const form = $('#edBookingForm');
  const dateInput = $('#edDate');
  const timeInput = $('#edTime');
  const timeHelp = $('#edTimeHelp');
  const errorOut = $('#edFormError');

  // Date constraints
  if (dateInput) {
    const today = new Date();
    const max = new Date(today); max.setDate(max.getDate() + 30);
    const fmt = (d) => d.toISOString().slice(0,10);
    dateInput.min = fmt(today);
    dateInput.max = fmt(max);
    dateInput.addEventListener('change', refreshTimes);
  }

  function buildTimeOptions(dateStr) {
    const slots = Store ? Store.TIME_SLOTS : ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
    const taken = (Store && dateStr) ? Store.takenSlotsFor(dateStr) : new Set();
    timeInput.innerHTML = '<option value="">— select an hour —</option>' +
      slots.map(s => {
        const isTaken = taken.has(s);
        const [h, m] = s.split(':');
        const hour = parseInt(h, 10);
        const label = (hour > 12 ? `${hour - 12}:${m} pm` : hour === 12 ? `12:${m} pm` : `${hour}:${m} am`);
        return `<option value="${s}" ${isTaken ? 'disabled' : ''}>${label}${isTaken ? ' — booked' : ''}</option>`;
      }).join('');
  }
  function refreshTimes() {
    if (!timeInput) return;
    if (!dateInput.value) {
      timeInput.innerHTML = '<option value="">— select an hour —</option>';
      if (timeHelp) timeHelp.textContent = 'Available hours appear once a date is selected.';
      return;
    }
    buildTimeOptions(dateInput.value);
    if (timeHelp) timeHelp.textContent = 'Hours marked “booked” are unavailable on this date.';
  }
  buildTimeOptions(null);
  if (Store) Store.subscribe(() => { if (dateInput.value) buildTimeOptions(dateInput.value); });

  /* Submit */
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    errorOut.textContent = '';

    const data = {
      service: $('#edService').value,
      date:    dateInput.value,
      time:    timeInput.value,
      name:    $('#edName').value.trim(),
      phone:   $('#edPhone').value.trim(),
      email:   $('#edEmail').value.trim(),
      notes:   $('#edNotes').value.trim(),
      source:  'iteration-2',
    };

    if (!data.service) return errorOut.textContent = 'Please select a treatment.';
    if (!data.date)    return errorOut.textContent = 'Please select a date.';
    if (!data.time)    return errorOut.textContent = 'Please select an hour.';
    if (!data.name || data.name.length < 2) return errorOut.textContent = 'Please enter your full name.';
    if (!/^[\d\s+()-]{7,15}$/.test(data.phone)) return errorOut.textContent = 'Please enter a valid telephone number.';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return errorOut.textContent = 'Please check your email address.';

    if (Store && Store.isSlotTaken(data.date, data.time)) {
      return errorOut.textContent = 'That hour was just taken. Please choose another.';
    }

    const booking = Store
      ? Store.create(data)
      : { id: Date.now().toString(36), ...data, serviceName: data.service };

    showModal(booking);
    form.reset();
    refreshTimes();
  });

  /* Modal */
  const modal = $('#edModal');
  function showModal(b) {
    const svc = (Store && Store.SERVICES[b.service]) || { name: b.serviceName, priceLabel: '' };
    $('#edModalDetails').innerHTML = `
      <div><span>Treatment</span><span>${svc.name}</span></div>
      <div><span>Date</span><span>${Store ? Store.formatDate(b.date) : b.date}</span></div>
      <div><span>Hour</span><span>${Store ? Store.formatTime(b.time) : b.time}</span></div>
      <div><span>Reference</span><span>${(b.id || '').toString().toUpperCase()}</span></div>
      <div><span>Status</span><span>Pending — concierge will confirm</span></div>
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
  $('#edModalClose')?.addEventListener('click', closeModal);
  $('.ed-modal-overlay')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
})();
