/* ============================================
   AURUM · CONCEPT 04 — SANCTUARY
   ============================================ */
(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const Store = window.AurumStore;
  if (!Store) { console.warn('AurumStore not loaded'); return; }

  /* Preloader · keep visible long enough for the lotus to bloom */
  const SN_PRELOAD_MIN_MS = 2800;
  const snPreloadStart = performance.now();
  window.addEventListener('load', () => {
    const elapsed = performance.now() - snPreloadStart;
    setTimeout(() => {
      $('#snPreloader')?.classList.add('hidden');
    }, Math.max(0, SN_PRELOAD_MIN_MS - elapsed));
  });

  /* ---- Burger / drawer ---- */
  const burger = $('#snBurger');
  if (burger) {
    let drawer = $('.sn-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'sn-drawer';
      drawer.innerHTML = $('.sn-nav').innerHTML + '<a href="#book">Reserve →</a>';
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
        burger.classList.remove('active'); drawer.classList.remove('active'); document.body.style.overflow = '';
      }
    });
  }

  /* ---- Smooth scroll ---- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      const offset = ($('#snHeader')?.offsetHeight || 80) + 12;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    });
  });

  /* ---- Render promos ---- */
  function renderPromos() {
    const grid = $('#snPromosGrid');
    if (!grid || !Store.PROMOS) return;
    grid.innerHTML = Store.PROMOS.map(p => `
      <article class="sn-promo">
        <div class="sn-promo-poster" style="background-image:url('../${p.image}');" role="img" aria-label="${p.title}">
          <span class="sn-promo-occasion">${p.occasion}</span>
        </div>
        <div class="sn-promo-body">
          <header class="sn-promo-headline">
            <p class="sn-promo-kicker">${p.kicker}</p>
            <h3 class="sn-promo-title">${p.title}</h3>
            <span class="sn-promo-tagline">${p.tagline}</span>
          </header>

          <div class="sn-promo-pkgs">
            ${p.packages.map(pkg => `
              <div class="sn-promo-pkg">
                <div class="sn-promo-pkg-head">
                  <span class="sn-promo-pkg-no">№ ${pkg.no}</span>
                  <span class="sn-promo-pkg-name">${pkg.name}</span>
                  ${pkg.price ? `<span class="sn-promo-pkg-price">${pkg.price}${pkg.subprice ? `<small>${pkg.subprice}</small>` : ''}</span>` : ''}
                </div>
                <ul class="sn-promo-pkg-extras">
                  ${pkg.extras.map(x => `<li>${x}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>

          ${p.pillars ? `
            <div class="sn-promo-pillars">
              ${p.pillars.map(x => `<span>${x}</span>`).join('')}
            </div>
          ` : ''}

          ${p.addon ? `
            <div class="sn-promo-addon">
              <div>
                <div class="sn-promo-addon-l">${p.addon.note}</div>
                <div class="sn-promo-addon-name">${p.addon.label}</div>
              </div>
              <span class="sn-promo-addon-price">${p.addon.price}</span>
            </div>
          ` : ''}

          <p class="sn-promo-foot">${p.footer}</p>

          <div class="sn-promo-cta-wrap">
            <div class="sn-promo-headline-price">
              <span class="sn-promo-price">${p.headlinePrice}</span>
              <span class="sn-promo-price-note">${p.headlinePriceNote}</span>
            </div>
            <button class="sn-btn sn-btn--gold sn-promo-book" data-promo="${p.bookKey}">
              Reserve
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="14" height="14"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
      </article>
    `).join('');

    $$('.sn-promo-book', grid).forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.promo;
        const sel = $('#snService');
        if (sel) sel.value = key;
        const target = $('#book');
        if (target) {
          const offset = ($('#snHeader')?.offsetHeight || 80) + 12;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        }
      });
    });
  }
  renderPromos();

  /* ---- Render services ---- */
  function renderServices(filter = 'Aesthetic') {
    const grid = $('#snServicesGrid');
    if (!grid) return;
    const entries = Object.entries(Store.SERVICES).filter(([_,s]) => s.category === filter);
    grid.innerHTML = entries.map(([key, s]) => `
      <article class="sn-svc">
        <div class="sn-svc-head">
          <span class="sn-svc-cat">${s.category}</span>
          ${s.doctorLed ? '<span class="sn-svc-flag">Doctor-led</span>' : ''}
        </div>
        <h3>${s.name}</h3>
        <div class="sn-svc-meta">
          <div><span>Duration</span><span>${s.duration} min</span></div>
          <div><span>Price</span><span>${s.priceLabel}</span></div>
        </div>
        <div class="sn-svc-cta">
          <span class="sn-svc-led">${s.doctorLed ? '⚕ Performed by Dr. Magallanes' : 'By licensed therapists'}</span>
          <button class="sn-svc-book" data-book="${key}">Book →</button>
        </div>
      </article>
    `).join('');
    $$('.sn-svc-book', grid).forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = $('#snService');
        if (sel) sel.value = btn.dataset.book;
        const target = $('#book');
        if (target) {
          const offset = ($('#snHeader')?.offsetHeight || 80) + 12;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        }
      });
    });
  }
  renderServices();

  $$('.sn-cat-tab').forEach(t => t.addEventListener('click', () => {
    $$('.sn-cat-tab').forEach(x => x.classList.toggle('active', x === t));
    renderServices(t.dataset.cat);
  }));

  /* ---- Booking form: populate service options ---- */
  const svcSel = $('#snService');
  if (svcSel) {
    const groups = {};
    Object.entries(Store.SERVICES).forEach(([k, s]) => {
      const cat = s.category === 'Promotion' ? "Mother's Day Specials" : s.category;
      groups[cat] = groups[cat] || [];
      groups[cat].push([k, s]);
    });
    // Promotion group first if present
    const orderedCats = ["Mother's Day Specials","Aesthetic","Laser","Skin Care","Wellness"];
    const html = orderedCats
      .filter(c => groups[c])
      .map(c => `<optgroup label="${c}">${groups[c].map(([k,s]) => `<option value="${k}">${s.name} · ${s.duration} min · ${s.priceLabel}</option>`).join('')}</optgroup>`)
      .join('');
    svcSel.insertAdjacentHTML('beforeend', html);
  }

  /* ---- Date / time ---- */
  const dateInput = $('#snDate');
  const timeInput = $('#snTime');
  if (dateInput) {
    const today = new Date();
    const max = new Date(today); max.setDate(max.getDate() + 30);
    dateInput.min = today.toISOString().slice(0,10);
    dateInput.max = max.toISOString().slice(0,10);
    dateInput.addEventListener('change', refreshTimes);
  }
  function refreshTimes() {
    if (!timeInput) return;
    if (!dateInput.value) {
      timeInput.innerHTML = '<option value="">Choose a time…</option>';
      return;
    }
    const taken = Store.takenSlotsFor(dateInput.value);
    timeInput.innerHTML = '<option value="">Choose a time…</option>' +
      Store.TIME_SLOTS.map(s => {
        const isTaken = taken.has(s);
        return `<option value="${s}" ${isTaken ? 'disabled' : ''}>${Store.formatTime(s)}${isTaken ? ' — booked' : ''}</option>`;
      }).join('');
  }
  Store.subscribe(() => { if (dateInput.value) refreshTimes(); });

  /* ---- Submit ---- */
  const form = $('#snForm');
  const errorOut = $('#snFormError');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    errorOut.textContent = '';

    const data = {
      service: svcSel.value,
      date:    dateInput.value,
      time:    timeInput.value,
      name:    $('#snName').value.trim(),
      phone:   $('#snPhone').value.trim(),
      email:   $('#snEmail').value.trim(),
      notes:   $('#snNotes').value.trim(),
      source:  'iteration-4',
    };
    if (!data.service) return errorOut.textContent = 'Please select a treatment.';
    if (!data.date)    return errorOut.textContent = 'Please select a date.';
    if (!data.time)    return errorOut.textContent = 'Please select a time.';
    if (!data.name || data.name.length < 2) return errorOut.textContent = 'Please enter your full name.';
    if (!/^[\d\s+()-]{7,15}$/.test(data.phone)) return errorOut.textContent = 'Please enter a valid phone number.';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return errorOut.textContent = 'Please check your email.';

    if (Store.isSlotTaken(data.date, data.time)) {
      return errorOut.textContent = 'That hour was just taken — please choose another.';
    }
    const booking = Store.create(data);
    showModal(booking);
    form.reset();
    refreshTimes();
  });

  /* ---- Modal ---- */
  const modal = $('#snModal');
  function showModal(b) {
    const svc = Store.SERVICES[b.service] || { name: b.serviceName };
    $('#snModalDetails').innerHTML = `
      <div><span>Treatment</span><span>${svc.name}</span></div>
      <div><span>Date</span><span>${Store.formatDate(b.date)}</span></div>
      <div><span>Time</span><span>${Store.formatTime(b.time)}</span></div>
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
  $('#snModalClose')?.addEventListener('click', closeModal);
  $('.sn-modal-overlay')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  /* ---- Reveal ---- */
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  $$('.sn-section-head, .sn-promo, .sn-svc, .sn-tier, .sn-pillar, .sn-reviews figure, .sn-about-text')
    .forEach(el => { el.classList.add('sn-reveal'); obs.observe(el); });
})();
