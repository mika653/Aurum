/* ============================================
   AURUM · ADMIN DASHBOARD (Demo)
   Pure-client app over AurumStore (localStorage)
   ============================================ */
(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const Store = window.AurumStore;
  if (!Store) {
    document.body.innerHTML = '<p style="padding:40px">Booking store not loaded.</p>';
    return;
  }

  // Auto-seed first run
  if (Store.all().length === 0) Store.seedDemo();

  /* ---- View routing ---- */
  const VIEW_TITLES = {
    overview: { title: 'Overview', sub: 'A quick read on today and the week ahead.' },
    calendar: { title: 'Calendar', sub: 'Click any appointment to view, edit, or change status.' },
    bookings: { title: 'All bookings', sub: 'Search, filter, sort, and manage every reservation.' },
    services: { title: 'Services', sub: 'Canonical catalogue shared across all three iterations.' },
    patients: { title: 'Patients', sub: 'Deduplicated by phone number across all bookings.' },
    settings: { title: 'Settings', sub: 'Configuration. Live ones write to localStorage; the rest require a backend.' },
  };
  function setView(name) {
    $$('.ad-view').forEach(v => v.classList.remove('ad-view--active'));
    $(`.ad-view[data-view="${name}"]`)?.classList.add('ad-view--active');
    $$('.ad-nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === name));
    const meta = VIEW_TITLES[name] || { title: name, sub: '' };
    $('#adViewTitle').textContent = meta.title;
    $('#adViewSub').textContent = meta.sub;
    history.replaceState(null, '', '#' + name);
    if (name === 'calendar') renderCalendar();
    if (name === 'bookings') renderBookingsTable();
    if (name === 'services') renderServiceList();
    if (name === 'patients') renderPatients();
  }
  $$('.ad-nav-link').forEach(l => l.addEventListener('click', (e) => {
    e.preventDefault();
    setView(l.dataset.view);
  }));

  /* ---- Overview ---- */
  function renderOverview() {
    const s = Store.stats();
    $('#adStatToday').textContent = s.today;
    $('#adStatUpcoming').textContent = s.upcoming;
    $('#adStatPending').textContent = s.pending;
    $('#adStatRevenue').textContent = '₱' + (s.revenue || 0).toLocaleString();

    // Today + tomorrow list
    const today = new Date().toISOString().slice(0,10);
    const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();
    const list = Store.all()
      .filter(b => (b.date === today || b.date === tomorrow) && b.status !== 'cancelled')
      .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
    const tEl = $('#adTodayList');
    $('#adTodayDate').textContent = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!list.length) {
      tEl.innerHTML = '<p class="ad-empty">Nothing on the books for the next 48 hours.</p>';
    } else {
      tEl.innerHTML = list.map(b => `
        <div class="ad-today-row" data-id="${b.id}">
          <div class="ad-today-time">
            <div>${Store.formatTime(b.time)}</div>
            <small style="color:var(--ad-faint);font-size:0.72rem;font-family:var(--ad-mono)">${b.date === today ? 'Today' : 'Tomorrow'}</small>
          </div>
          <div>
            <div class="ad-today-name">${escapeHtml(b.name)}</div>
            <div class="ad-today-svc">${b.serviceName} · ${b.duration} min</div>
          </div>
          <span class="ad-status ad-status--${b.status}">${b.status}</span>
          <button class="ad-btn ad-btn--ghost ad-btn--sm">Open →</button>
        </div>
      `).join('');
      $$('.ad-today-row', tEl).forEach(r => r.addEventListener('click', () => openDrawer(r.dataset.id)));
    }

    // Service mix
    const last30 = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10); })();
    const counts = {};
    Store.all().forEach(b => {
      if (b.date < last30 || b.status === 'cancelled') return;
      counts[b.serviceName] = (counts[b.serviceName] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 7);
    const mix = $('#adServiceMix');
    if (!sorted.length) {
      mix.innerHTML = '<p class="ad-empty">No bookings in the last 30 days.</p>';
    } else {
      mix.innerHTML = sorted.map(([name, n]) => `
        <div class="ad-chart-row">
          <span class="ad-chart-name">${name}</span>
          <span class="ad-chart-bar"><span style="width:${(n/total*100).toFixed(1)}%"></span></span>
          <span class="ad-chart-num">${n}</span>
        </div>
      `).join('');
    }

    // Source breakdown
    const sources = {};
    Store.all().forEach(b => { sources[b.source || 'unknown'] = (sources[b.source || 'unknown'] || 0) + 1; });
    const sourceLabels = {
      'iteration-1': 'Modern Gold',
      'iteration-2': 'Editorial Gold',
      'iteration-3': 'Clinical Lux',
      'walk-in': 'Walk-in',
      'phone': 'Phone',
      'unknown': 'Unknown',
    };
    const sg = $('#adSourceGrid');
    sg.innerHTML = Object.entries(sources).map(([k, v]) => `
      <div class="ad-source">
        <strong>${v}</strong>
        <span>${sourceLabels[k] || k}</span>
      </div>
    `).join('');
  }

  /* ---- Calendar ---- */
  let calCursor = new Date();
  let calMode = 'month';
  $('#adCalPrev').addEventListener('click', () => { shiftCal(-1); renderCalendar(); });
  $('#adCalNext').addEventListener('click', () => { shiftCal(1);  renderCalendar(); });
  $('#adCalToday').addEventListener('click', () => { calCursor = new Date(); renderCalendar(); });
  $$('.ad-cal-mode').forEach(m => m.addEventListener('click', () => {
    calMode = m.dataset.mode;
    $$('.ad-cal-mode').forEach(x => x.classList.toggle('active', x === m));
    renderCalendar();
  }));

  function shiftCal(delta) {
    if (calMode === 'month') {
      calCursor.setDate(1);
      calCursor.setMonth(calCursor.getMonth() + delta);
    } else if (calMode === 'week') {
      calCursor.setDate(calCursor.getDate() + delta * 7);
    } else {
      calCursor.setDate(calCursor.getDate() + delta);
    }
  }

  function renderCalendar() {
    const monthEl = $('#adCalMonth');
    const weekEl = $('#adCalWeek');
    const dayEl = $('#adCalDay');
    monthEl.classList.toggle('hidden', calMode !== 'month');
    weekEl.classList.toggle('hidden',  calMode !== 'week');
    dayEl.classList.toggle('hidden',   calMode !== 'day');
    if (calMode === 'month') renderMonth();
    if (calMode === 'week')  renderWeek();
    if (calMode === 'day')   renderDay();
  }

  function fmt(d) { return d.toISOString().slice(0,10); }
  function startOfWeek(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0,0,0,0); return x; }

  function renderMonth() {
    const cur = new Date(calCursor);
    const month = cur.getMonth();
    const year  = cur.getFullYear();
    $('#adCalLabel').textContent = cur.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

    const first = new Date(year, month, 1);
    const start = startOfWeek(first);
    const todayStr = fmt(new Date());
    const all = Store.all();

    let html = `<div class="ad-cal-weekrow ad-cal-weekrow--head">
      ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div>${d}</div>`).join('')}
    </div>`;
    let cursor = new Date(start);
    for (let week = 0; week < 6; week++) {
      html += '<div class="ad-cal-weekrow">';
      for (let i = 0; i < 7; i++) {
        const isOther = cursor.getMonth() !== month;
        const dStr = fmt(cursor);
        const events = all.filter(b => b.date === dStr).sort((a,b) => a.time.localeCompare(b.time));
        const isToday = dStr === todayStr;
        html += `
          <div class="ad-cal-day ${isOther ? 'ad-cal-day--other' : ''} ${isToday ? 'ad-cal-day--today' : ''}" data-date="${dStr}">
            <span class="ad-cal-daynum">${cursor.getDate()}</span>
            ${events.slice(0, 3).map(e => `
              <div class="ad-cal-event ad-cal-event--${e.status}" data-id="${e.id}" title="${escapeAttr(e.name + ' · ' + e.serviceName)}">
                <span class="ad-cal-event-time">${e.time.slice(0,5)}</span>${escapeHtml(e.name.split(' ')[0])} · ${escapeHtml(e.serviceName)}
              </div>
            `).join('')}
            ${events.length > 3 ? `<div class="ad-cal-more">+${events.length - 3} more</div>` : ''}
          </div>
        `;
        cursor.setDate(cursor.getDate() + 1);
      }
      html += '</div>';
      if (cursor.getMonth() !== month && week >= 4) break;
    }
    $('#adCalMonth').innerHTML = html;
    $$('.ad-cal-event', monthEl()).forEach(e => e.addEventListener('click', (ev) => { ev.stopPropagation(); openDrawer(e.dataset.id); }));
    $$('.ad-cal-day', monthEl()).forEach(d => d.addEventListener('click', () => {
      calCursor = new Date(d.dataset.date + 'T00:00:00');
      calMode = 'day';
      $$('.ad-cal-mode').forEach(x => x.classList.toggle('active', x.dataset.mode === 'day'));
      renderCalendar();
    }));
  }
  function monthEl() { return $('#adCalMonth'); }

  function renderTimeline(dates) {
    const slots = Store.TIME_SLOTS;
    const all = Store.all();
    const todayStr = fmt(new Date());
    let html = '<div class="ad-cal-time-axis">';
    html += '<div style="height:36px;border-bottom:1px solid var(--ad-line);background:var(--ad-bg)"></div>';
    slots.forEach(s => { html += `<div class="ad-cal-time">${Store.formatTime(s).replace(/:00 /, ' ')}</div>`; });
    html += '</div>';

    html += '<div class="ad-cal-week-grid" style="grid-template-columns:repeat(' + dates.length + ', 1fr)">';
    dates.forEach(d => {
      const dStr = fmt(d);
      const events = all.filter(b => b.date === dStr);
      const isToday = dStr === todayStr;
      html += `
        <div class="ad-cal-day-col">
          <div class="ad-cal-day-col-head ${isToday ? 'today' : ''}">
            <strong>${d.toLocaleDateString('en-PH', { weekday: 'short' })}</strong>
            <small>${d.getDate()} ${d.toLocaleDateString('en-PH', { month: 'short' })}</small>
          </div>
          <div class="ad-cal-slots">
            ${slots.map((_, i) => `<div class="ad-cal-slot-line" style="top:${i*60}px"></div>`).join('')}
            ${events.map(e => {
              const idx = slots.indexOf(e.time);
              if (idx === -1) return '';
              const top = idx * 60;
              const minHeight = Math.max(28, (e.duration || 30) - 4);
              return `
                <div class="ad-cal-evt ad-cal-evt--${e.status}" data-id="${e.id}" style="top:${top + 4}px;height:${minHeight}px">
                  <strong>${escapeHtml(e.name)}</strong>
                  <small>${escapeHtml(e.serviceName)}</small>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  function renderWeek() {
    const start = startOfWeek(calCursor);
    const dates = Array.from({length:7}, (_,i) => { const d = new Date(start); d.setDate(d.getDate()+i); return d; });
    const lbl = `${dates[0].toLocaleDateString('en-PH',{month:'short',day:'numeric'})} – ${dates[6].toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}`;
    $('#adCalLabel').textContent = lbl;
    $('#adCalWeek').innerHTML = renderTimeline(dates);
    $$('.ad-cal-evt', $('#adCalWeek')).forEach(e => e.addEventListener('click', () => openDrawer(e.dataset.id)));
  }

  function renderDay() {
    const d = new Date(calCursor);
    $('#adCalLabel').textContent = d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    $('#adCalDay').innerHTML = renderTimeline([d]);
    $$('.ad-cal-evt', $('#adCalDay')).forEach(e => e.addEventListener('click', () => openDrawer(e.dataset.id)));
  }

  /* ---- Bookings table ---- */
  function populateServiceFilter() {
    const sel = $('#adFilterService');
    sel.innerHTML = '<option value="">All services</option>' +
      Object.entries(Store.SERVICES).map(([k,s]) => `<option value="${k}">${s.name}</option>`).join('');
  }
  populateServiceFilter();

  function renderBookingsTable() {
    const q = $('#adSearch').value.trim().toLowerCase();
    const status = $('#adFilterStatus').value;
    const svc = $('#adFilterService').value;
    const sort = $('#adSort').value;

    let list = Store.all();
    if (q) list = list.filter(b =>
      (b.name||'').toLowerCase().includes(q) ||
      (b.phone||'').toLowerCase().includes(q) ||
      (b.email||'').toLowerCase().includes(q) ||
      (b.id||'').toLowerCase().includes(q)
    );
    if (status) list = list.filter(b => b.status === status);
    if (svc) list = list.filter(b => b.service === svc);
    list.sort((a,b) => {
      switch (sort) {
        case 'date-asc':    return (a.date+a.time).localeCompare(b.date+b.time);
        case 'date-desc':   return (b.date+b.time).localeCompare(a.date+a.time);
        case 'created-asc': return (a.createdAt||'').localeCompare(b.createdAt||'');
        case 'created-desc':return (b.createdAt||'').localeCompare(a.createdAt||'');
      }
      return 0;
    });

    const tbody = $('#adTableBody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--ad-faint)">No bookings match your filters.</td></tr>`;
      return;
    }
    const sourceLabels = {
      'iteration-1': 'Modern Gold', 'iteration-2': 'Editorial Gold', 'iteration-3': 'Clinical Lux',
      'walk-in': 'Walk-in', 'phone': 'Phone',
    };
    tbody.innerHTML = list.map(b => `
      <tr data-id="${b.id}">
        <td>
          <strong>${Store.formatDate(b.date)}</strong><br>
          <small style="color:var(--ad-mute);font-family:var(--ad-mono);font-size:0.74rem">${Store.formatTime(b.time)}</small>
        </td>
        <td class="ad-table-name">
          <strong>${escapeHtml(b.name)}</strong>
          <small>${escapeHtml(b.phone)}</small>
        </td>
        <td>${escapeHtml(b.serviceName)}<br><small style="color:var(--ad-mute);font-size:0.78rem">${b.duration} min · ${b.priceLabel || ''}</small></td>
        <td><small style="color:var(--ad-mute);font-family:var(--ad-mono);font-size:0.78rem">${sourceLabels[b.source] || b.source || '—'}</small></td>
        <td><span class="ad-status ad-status--${b.status}">${b.status}</span></td>
        <td>
          <div class="ad-table-actions">
            <button class="ad-table-action" data-act="open" data-id="${b.id}">View</button>
            ${b.status === 'pending' ? `<button class="ad-table-action" data-act="confirm" data-id="${b.id}">Confirm</button>` : ''}
            ${b.status !== 'completed' && b.status !== 'cancelled' ? `<button class="ad-table-action" data-act="complete" data-id="${b.id}">Complete</button>` : ''}
            ${b.status !== 'cancelled' ? `<button class="ad-table-action ad-table-action--danger" data-act="cancel" data-id="${b.id}">Cancel</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    $$('.ad-table-action', tbody).forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        if (act === 'open') openDrawer(id);
        else if (act === 'confirm') { Store.setStatus(id, 'confirmed'); toast('Booking confirmed'); }
        else if (act === 'complete') { Store.setStatus(id, 'completed'); toast('Marked complete'); }
        else if (act === 'cancel') {
          if (confirm('Cancel this booking? The slot will be released.')) {
            Store.setStatus(id, 'cancelled'); toast('Booking cancelled');
          }
        }
      });
    });
  }
  ['adSearch','adFilterStatus','adFilterService','adSort'].forEach(id =>
    $('#'+id).addEventListener('input', renderBookingsTable)
  );

  /* ---- Services list ---- */
  function renderServiceList() {
    $('#adServiceList').innerHTML = Object.entries(Store.SERVICES).map(([k, s]) => `
      <div class="ad-svc-item">
        <strong>${s.name}</strong>
        <small>${s.category} ${s.doctorLed ? '· Doctor-led' : ''}</small>
        <div class="ad-svc-meta">
          <span>${s.duration} min</span>
          <span>·</span>
          <span>${s.priceLabel}</span>
        </div>
      </div>
    `).join('');
  }

  /* ---- Patients ---- */
  function renderPatients() {
    const map = new Map();
    Store.all().forEach(b => {
      if (!b.phone) return;
      const k = b.phone.replace(/\s/g,'');
      const existing = map.get(k) || { phone: b.phone, name: b.name, count: 0, last: '' };
      existing.count++;
      existing.name = b.name;
      if (!existing.last || b.date > existing.last) existing.last = b.date;
      map.set(k, existing);
    });
    const list = [...map.values()].sort((a,b) => b.count - a.count);
    const wrap = $('#adPatientsList');
    if (!list.length) {
      wrap.innerHTML = '<p class="ad-empty">No patients yet.</p>';
      return;
    }
    wrap.innerHTML = list.map(p => `
      <div class="ad-patient-row">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <small>${escapeHtml(p.phone)} · last visit ${p.last}</small>
        </div>
        <span class="ad-patient-count">${p.count} visit${p.count > 1 ? 's' : ''}</span>
        <span class="ad-status ad-status--${p.count > 3 ? 'completed' : 'confirmed'}">${p.count > 3 ? 'Loyal' : 'Active'}</span>
      </div>
    `).join('');
  }

  /* ---- Drawer ---- */
  const drawer = $('#adDrawer');
  function openDrawer(id) {
    const b = Store.byId(id);
    if (!b) return;
    $('#adDrawerRef').textContent = 'REF · ' + (b.id || '').toString().toUpperCase();
    $('#adDrawerBody').innerHTML = `
      <div class="ad-drawer-section">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
          <div>
            <h2 style="margin:0;font-size:1.4rem;letter-spacing:-0.02em">${escapeHtml(b.name)}</h2>
            <p style="color:var(--ad-mute);margin:2px 0 0;font-size:0.85rem">${escapeHtml(b.phone)} ${b.email ? '· ' + escapeHtml(b.email) : ''}</p>
          </div>
          <span class="ad-status ad-status--${b.status}">${b.status}</span>
        </div>
      </div>

      <div class="ad-drawer-section">
        <h4>Appointment</h4>
        <dl>
          <div><dt>Service</dt><dd>${escapeHtml(b.serviceName)}</dd></div>
          <div><dt>Date</dt><dd>${Store.formatDate(b.date)}</dd></div>
          <div><dt>Time</dt><dd>${Store.formatTime(b.time)}</dd></div>
          <div><dt>Duration</dt><dd>${b.duration} min</dd></div>
          <div><dt>Price</dt><dd>${b.priceLabel || '—'}</dd></div>
          <div><dt>Source</dt><dd>${b.source || '—'}</dd></div>
          <div><dt>Created</dt><dd>${b.createdAt ? new Date(b.createdAt).toLocaleString('en-PH') : '—'}</dd></div>
        </dl>
      </div>

      ${b.notes ? `
      <div class="ad-drawer-section">
        <h4>Notes</h4>
        <p style="font-size:0.92rem;background:var(--ad-bg);padding:12px;border-radius:var(--ad-r-sm);border-left:3px solid var(--ad-gold);margin:0">${escapeHtml(b.notes)}</p>
      </div>` : ''}

      <div class="ad-drawer-section">
        <h4>Change status</h4>
        <div class="ad-drawer-status-grid">
          <button data-set="pending">⏳ Pending</button>
          <button data-set="confirmed">✓ Confirmed</button>
          <button data-set="completed">✓✓ Completed</button>
          <button data-set="no-show">— No-show</button>
        </div>
      </div>

      <div class="ad-drawer-actions">
        <button class="ad-btn ad-btn--ghost" id="adDrawerCall">📞 Call</button>
        <button class="ad-btn ad-btn--ghost" id="adDrawerMessage">✉ SMS</button>
        <button class="ad-btn ad-btn--danger" id="adDrawerDelete" style="margin-left:auto">Delete</button>
      </div>
    `;
    $$('.ad-drawer-status-grid button').forEach(btn => btn.addEventListener('click', () => {
      Store.setStatus(b.id, btn.dataset.set);
      toast('Status updated');
      openDrawer(b.id);
    }));
    $('#adDrawerCall').onclick = () => { window.location.href = 'tel:' + b.phone.replace(/\s/g,''); };
    $('#adDrawerMessage').onclick = () => { window.location.href = 'sms:' + b.phone.replace(/\s/g,''); };
    $('#adDrawerDelete').onclick = () => {
      if (confirm('Delete this booking permanently? This cannot be undone.')) {
        Store.remove(b.id);
        closeDrawer();
        toast('Booking deleted');
      }
    };
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer() {
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
  }
  $('#adDrawerOverlay').addEventListener('click', closeDrawer);
  $('#adDrawerClose').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); closeNewModal(); }});

  /* ---- New booking modal ---- */
  const newModal = $('#adNewModal');
  function openNewModal(prefillDate) {
    $('#anService').innerHTML = Object.entries(Store.SERVICES).map(([k,s]) => `<option value="${k}">${s.name}</option>`).join('');
    populateAnTimes(prefillDate || new Date().toISOString().slice(0,10));
    if (prefillDate) $('#anDate').value = prefillDate;
    else $('#anDate').value = new Date().toISOString().slice(0,10);
    $('#anDate').min = new Date().toISOString().slice(0,10);
    newModal.classList.add('active');
    newModal.setAttribute('aria-hidden', 'false');
  }
  function closeNewModal() {
    newModal.classList.remove('active');
    newModal.setAttribute('aria-hidden', 'true');
  }
  function populateAnTimes(dateStr) {
    const taken = dateStr ? Store.takenSlotsFor(dateStr) : new Set();
    $('#anTime').innerHTML = Store.TIME_SLOTS.map(s => `<option value="${s}" ${taken.has(s) ? 'disabled' : ''}>${Store.formatTime(s)}${taken.has(s) ? ' — booked' : ''}</option>`).join('');
  }
  $('#anDate').addEventListener('change', (e) => populateAnTimes(e.target.value));
  $('#adNewBtn').addEventListener('click', () => openNewModal());
  $('#adNewClose').addEventListener('click', closeNewModal);
  $('#adNewOverlay').addEventListener('click', closeNewModal);
  $('#anCancel').addEventListener('click', closeNewModal);
  $('#adNewForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      service: $('#anService').value,
      date:    $('#anDate').value,
      time:    $('#anTime').value,
      name:    $('#anName').value.trim(),
      phone:   $('#anPhone').value.trim(),
      email:   $('#anEmail').value.trim(),
      notes:   $('#anNotes').value.trim(),
      source:  $('#anSource').value,
    };
    const status = $('#anStatus').value;
    if (!data.name || !data.phone || !data.date || !data.time) {
      alert('Please fill in name, phone, date, and time.');
      return;
    }
    const b = Store.create(data);
    if (status !== 'pending') Store.setStatus(b.id, status);
    closeNewModal();
    e.target.reset();
    toast('Booking saved');
  });

  /* ---- CSV export ---- */
  $('#adExportBtn').addEventListener('click', () => {
    const list = Store.all();
    if (!list.length) { toast('No bookings to export'); return; }
    const cols = ['id','date','time','status','serviceName','duration','priceLabel','name','phone','email','notes','source','createdAt'];
    const csv = [cols.join(',')].concat(list.map(b =>
      cols.map(c => `"${(b[c] ?? '').toString().replace(/"/g,'""')}"`).join(',')
    )).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aurum-bookings-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast('CSV downloaded');
  });

  /* ---- Seed / clear ---- */
  $('#adSeedBtn').addEventListener('click', () => {
    if (Store.all().length > 0 && !confirm('Replace existing bookings with fresh demo data?')) return;
    Store.clearAll();
    Store.seedDemo();
    toast('Demo data reseeded');
  });
  $('#adClearBtn').addEventListener('click', () => {
    if (!confirm('Delete all bookings? This cannot be undone.')) return;
    Store.clearAll();
    toast('All bookings cleared');
  });

  /* ---- Toast ---- */
  let toastTimer;
  function toast(msg) {
    const t = $('#adToast');
    t.textContent = msg;
    t.classList.add('active');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('active'), 2400);
  }

  /* ---- Helpers ---- */
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(str) { return escapeHtml(str); }

  /* ---- Live sync ---- */
  Store.subscribe(() => {
    renderOverview();
    if ($('.ad-view--active').dataset.view === 'calendar') renderCalendar();
    if ($('.ad-view--active').dataset.view === 'bookings') renderBookingsTable();
    if ($('.ad-view--active').dataset.view === 'patients') renderPatients();
  });

  /* ---- Init ---- */
  const initView = (location.hash || '#overview').slice(1);
  setView(VIEW_TITLES[initView] ? initView : 'overview');
  renderOverview();
})();
