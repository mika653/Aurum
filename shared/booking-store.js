/* ============================================
   AURUM — Shared Booking Store
   Single source of truth for bookings across all
   three iterations and the admin dashboard.
   Uses localStorage with a versioned schema and
   a BroadcastChannel so changes propagate live.
   ============================================ */

(function (global) {
  'use strict';

  const KEY = 'aurum_bookings';
  const SCHEMA_VERSION = 2;
  const CHANNEL_NAME = 'aurum-bookings';

  /* ---- Service catalog (canonical) ---- */
  const SERVICES = {
    'botox':         { name: 'Botox', category: 'Aesthetic', duration: 30, price: null, priceLabel: 'Consultation', doctorLed: true },
    'fillers':       { name: 'Dermal Fillers', category: 'Aesthetic', duration: 45, price: null, priceLabel: 'Consultation', doctorLed: true },
    'thread-lift':   { name: 'Thread Lift', category: 'Aesthetic', duration: 60, price: null, priceLabel: 'Consultation', doctorLed: true },
    'laser':         { name: 'Laser Treatment', category: 'Aesthetic', duration: 45, price: 500, priceLabel: 'From ₱500', doctorLed: true },
    'gluta-drip':    { name: 'IV Drip Therapy', category: 'Aesthetic', duration: 60, price: 1500, priceLabel: 'From ₱1,500', doctorLed: true },
    'prp':           { name: 'PRP Therapy', category: 'Aesthetic', duration: 60, price: null, priceLabel: 'Consultation', doctorLed: true },
    'hydrafacial':   { name: 'Hydrafacial', category: 'Skin Care', duration: 45, price: 2000, priceLabel: 'From ₱2,000', doctorLed: false },
    'chemical-peel': { name: 'Chemical Peel', category: 'Skin Care', duration: 30, price: 1500, priceLabel: 'From ₱1,500', doctorLed: false },
    'microneedling': { name: 'Microneedling', category: 'Skin Care', duration: 45, price: 3000, priceLabel: 'From ₱3,000', doctorLed: false },
    'wart-removal':  { name: 'Wart & Mole Removal', category: 'Skin Care', duration: 30, price: 500, priceLabel: 'From ₱500', doctorLed: true },
    'hilot':         { name: 'Hilot Massage', category: 'Wellness', duration: 60, price: 500, priceLabel: '₱500', doctorLed: false },
    'swedish':       { name: 'Swedish Massage', category: 'Wellness', duration: 60, price: 600, priceLabel: '₱600', doctorLed: false },
    'deep-tissue':   { name: 'Deep Tissue Massage', category: 'Wellness', duration: 60, price: 700, priceLabel: '₱700', doctorLed: false },
    'post-flight':   { name: 'Post-Flight Recovery', category: 'Wellness', duration: 90, price: 1200, priceLabel: '₱1,200', doctorLed: false },
  };

  /* ---- Time grid (clinic hours 09:00 – 19:00, last start 19:00) ---- */
  const TIME_SLOTS = [
    '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'
  ];

  /* ---- Statuses ---- */
  const STATUSES = ['pending','confirmed','completed','cancelled','no-show'];

  /* ---- Channel for cross-tab sync ---- */
  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch (_) { /* unsupported */ }

  /* ---- Listeners (in-tab) ---- */
  const listeners = new Set();
  function notify(detail) {
    listeners.forEach(fn => { try { fn(detail); } catch (_) {} });
    if (channel) channel.postMessage(detail);
  }
  if (channel) {
    channel.onmessage = (e) => {
      listeners.forEach(fn => { try { fn(e.data); } catch (_) {} });
    };
  }
  // localStorage events fire only across tabs, so wire that too
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      listeners.forEach(fn => { try { fn({ type: 'sync' }); } catch (_) {} });
    }
  });

  /* ---- Read / write ---- */
  function readRaw() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }
  function writeRaw(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (_) {}
  }

  function migrate(b) {
    // Older bookings might lack status
    if (!b.status) b.status = 'pending';
    if (!b.source) b.source = 'iteration-1';
    return b;
  }

  function all() {
    return readRaw().map(migrate);
  }

  function byId(id) {
    return all().find(b => b.id === id) || null;
  }

  function byDate(dateStr) {
    return all().filter(b => b.date === dateStr && b.status !== 'cancelled');
  }

  function isSlotTaken(dateStr, time, ignoreId) {
    return all().some(b =>
      b.date === dateStr && b.time === time &&
      b.status !== 'cancelled' && b.id !== ignoreId
    );
  }

  function takenSlotsFor(dateStr) {
    return new Set(
      all().filter(b => b.date === dateStr && b.status !== 'cancelled')
           .map(b => b.time)
    );
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function create(input) {
    const service = SERVICES[input.service];
    const booking = {
      id: generateId(),
      service: input.service,
      serviceName: service ? service.name : input.service,
      duration: service ? service.duration : null,
      price: service ? service.price : null,
      priceLabel: service ? service.priceLabel : null,
      date: input.date,
      time: input.time,
      name: (input.name || '').trim(),
      phone: (input.phone || '').trim(),
      email: (input.email || '').trim(),
      notes: (input.notes || '').trim(),
      source: input.source || 'unknown',
      status: 'pending',
      createdAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    };
    const list = readRaw();
    list.push(booking);
    writeRaw(list);
    notify({ type: 'create', id: booking.id });
    return booking;
  }

  function update(id, patch) {
    const list = readRaw();
    const idx = list.findIndex(b => b.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    writeRaw(list);
    notify({ type: 'update', id });
    return list[idx];
  }

  function setStatus(id, status) {
    if (!STATUSES.includes(status)) return null;
    return update(id, { status });
  }

  function remove(id) {
    const list = readRaw().filter(b => b.id !== id);
    writeRaw(list);
    notify({ type: 'remove', id });
  }

  function clearAll() {
    writeRaw([]);
    notify({ type: 'clear' });
  }

  function seedDemo() {
    if (readRaw().length > 0) return false;
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const offset = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
    const seed = [
      { service: 'botox', date: fmt(offset(0)), time: '10:00', name: 'Maria Reyes', phone: '+63 917 222 1010', email: 'maria.r@example.com', notes: 'First-time Botox guest. Consultation requested.', status: 'confirmed', source: 'iteration-1' },
      { service: 'gluta-drip', date: fmt(offset(0)), time: '14:00', name: 'Christine Lim', phone: '+63 917 555 2020', email: 'christine@example.com', notes: 'Monthly drip — premium Korean glutathione.', status: 'confirmed', source: 'iteration-2' },
      { service: 'post-flight', date: fmt(offset(1)), time: '11:00', name: 'James Donovan', phone: '+61 4 1234 5678', email: 'james.d@example.com', notes: 'Just landed from Sydney, flying to Boracay 3 PM.', status: 'pending', source: 'iteration-3' },
      { service: 'hydrafacial', date: fmt(offset(1)), time: '15:00', name: 'Ana Lacson', phone: '+63 917 888 3030', email: 'ana@example.com', notes: '', status: 'confirmed', source: 'iteration-1' },
      { service: 'fillers', date: fmt(offset(2)), time: '13:00', name: 'Patricia Yulo', phone: '+63 917 444 1212', email: 'pat@example.com', notes: 'Cheek + jawline. Consult booked.', status: 'confirmed', source: 'iteration-2' },
      { service: 'hilot', date: fmt(offset(2)), time: '17:00', name: 'Rico Bautista', phone: '+63 917 333 9090', email: '', notes: 'Lower-back tension.', status: 'pending', source: 'iteration-1' },
      { service: 'thread-lift', date: fmt(offset(3)), time: '10:00', name: 'Elena Castillo', phone: '+63 917 666 4040', email: 'elena@example.com', notes: 'Cheek + jowl lift. Pre-procedure photos requested.', status: 'confirmed', source: 'iteration-3' },
      { service: 'laser', date: fmt(offset(4)), time: '11:00', name: 'Mariko Tanaka', phone: '+81 80 1234 5678', email: 'mariko@example.com', notes: 'Underarm laser — session 3 of 6.', status: 'confirmed', source: 'iteration-2' },
      { service: 'microneedling', date: fmt(offset(5)), time: '14:00', name: 'Kim Soo-jin', phone: '+82 10 9876 5432', email: 'soojin@example.com', notes: 'Acne scars, mid-cheek.', status: 'pending', source: 'iteration-1' },
      { service: 'swedish', date: fmt(offset(-1)), time: '16:00', name: 'Carlos Villanueva', phone: '+63 917 121 2121', email: '', notes: '', status: 'completed', source: 'iteration-1' },
      { service: 'chemical-peel', date: fmt(offset(-2)), time: '11:00', name: 'Sofia Martinez', phone: '+63 917 232 3232', email: 'sofia@example.com', notes: '', status: 'completed', source: 'iteration-3' },
      { service: 'prp', date: fmt(offset(-3)), time: '10:00', name: 'Daniel Cruz', phone: '+63 917 343 4343', email: 'dan@example.com', notes: '', status: 'no-show', source: 'iteration-2' },
    ];
    const list = seed.map(s => {
      const svc = SERVICES[s.service];
      return migrate({
        id: generateId(),
        ...s,
        serviceName: svc.name,
        duration: svc.duration,
        price: svc.price,
        priceLabel: svc.priceLabel,
        createdAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
        schemaVersion: SCHEMA_VERSION,
      });
    });
    writeRaw(list);
    notify({ type: 'seed' });
    return true;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /* ---- Date helpers ---- */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    return hour > 12 ? `${hour - 12}:${m} PM` : hour === 12 ? `12:${m} PM` : `${hour}:${m} AM`;
  }

  /* ---- Stats ---- */
  function stats() {
    const list = all();
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = list.filter(b => b.date >= today && b.status !== 'cancelled');
    const todayList = list.filter(b => b.date === today && b.status !== 'cancelled');
    const revenue = list
      .filter(b => b.status === 'completed' && b.price)
      .reduce((sum, b) => sum + b.price, 0);
    const pending = list.filter(b => b.status === 'pending').length;
    return { total: list.length, upcoming: upcoming.length, today: todayList.length, revenue, pending };
  }

  /* ---- Public API ---- */
  global.AurumStore = {
    SERVICES,
    TIME_SLOTS,
    STATUSES,
    all, byId, byDate,
    isSlotTaken, takenSlotsFor,
    create, update, setStatus, remove, clearAll, seedDemo,
    subscribe,
    formatDate, formatTime,
    stats,
  };
})(typeof window !== 'undefined' ? window : this);
