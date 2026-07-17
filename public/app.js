const BASE_PATH = document.querySelector('meta[name="app-base"]')?.content || '/viajes';
const API_ROOT = `${BASE_PATH === '/' ? '' : BASE_PATH}/api`;

const state = {
  trips: [],
  bundle: null,
  view: 'dashboard',
  expenseFilter: 'all',
  todoFilter: 'pending',
  resourceFilter: 'all',
  packingTraveler: 'all',
};

const content = document.getElementById('content');
const tripSelect = document.getElementById('tripSelect');
const modal = document.getElementById('modal');
const modalCard = document.getElementById('modalCard');
const modalEyebrow = document.getElementById('modalEyebrow');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');

const STATUS_LABELS = {
  idea: 'Idea', planning: 'Planificando', booked: 'Reservado', travelling: 'En viaje', completed: 'Finalizado',
};
const RESERVATION_LABELS = {
  idea: 'Idea', pending: 'Pendiente', reserved: 'Reservado', paid: 'Reservado y pagado', not_needed: 'No requiere reserva',
};
const CATEGORY_LABELS = {
  flights: 'Vuelos', accommodation: 'Alojamiento', transport: 'Transporte', activities: 'Actividades',
  food: 'Comida', insurance: 'Seguro', shopping: 'Compras', other: 'Otros',
};
const RESOURCE_LABELS = {
  note: 'Nota', link: 'Enlace', transport: 'Traslado', app: 'App', document: 'Documento', emergency: 'Emergencia', booking: 'Reserva',
};
const LUGGAGE_LABELS = {
  checked: 'Maleta facturada', carry_on: 'Equipaje de mano', personal: 'Mochila / objeto personal', shared: 'Material compartido',
};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
}

function attr(value) {
  return escapeHTML(value).replace(/\n/g, '&#10;');
}

function safeExternalUrl(value) {
  const text = String(value || '').trim();
  return /^https?:\/\//i.test(text) ? text : '';
}

function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('es-ES', options.weekday
    ? { weekday: 'long', day: 'numeric', month: 'short' }
    : { day: '2-digit', month: '2-digit', year: options.year === false ? undefined : 'numeric' }).format(date);
}

function formatMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR' }).format(Number(value || 0));
}

function daysBetween(start, end) {
  const dates = [];
  let cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function toast(message, type = 'success') {
  const region = document.getElementById('toastRegion');
  const element = document.createElement('div');
  element.className = `toast ${type === 'error' ? 'error' : ''}`;
  element.textContent = message;
  region.append(element);
  setTimeout(() => element.remove(), 3200);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se ha podido completar la operación.');
  return data;
}

function showLoading() {
  content.innerHTML = '<div class="loading-state"><div><div class="spinner"></div><p>Cargando…</p></div></div>';
}

async function loadTrips(preferredId) {
  state.trips = await api('/trips');
  fillTripSelector();
  const storedId = Number(localStorage.getItem('tripflow.tripId'));
  const targetId = Number(preferredId || storedId || state.trips[0]?.id);
  if (targetId && state.trips.some((trip) => trip.id === targetId)) {
    tripSelect.value = String(targetId);
    await loadTrip(targetId);
  } else {
    state.bundle = null;
    render();
  }
}

async function loadTrip(id, quiet = false) {
  if (!quiet) showLoading();
  state.bundle = await api(`/trips/${id}`);
  localStorage.setItem('tripflow.tripId', String(id));
  tripSelect.value = String(id);
  render();
}

async function refreshTrip() {
  if (!state.bundle) return;
  state.bundle = await api(`/trips/${state.bundle.trip.id}`);
  state.trips = await api('/trips');
  fillTripSelector();
  tripSelect.value = String(state.bundle.trip.id);
  render();
}

function fillTripSelector() {
  tripSelect.innerHTML = state.trips.length
    ? state.trips.map((trip) => `<option value="${trip.id}">${escapeHTML(trip.coverEmoji)} ${escapeHTML(trip.name)}</option>`).join('')
    : '<option value="">Sin viajes</option>';
}

function setActiveView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  document.getElementById('sidebar').classList.remove('open');
  render();
}

function render() {
  if (!state.bundle) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧭</div>
        <h2>Empieza creando vuestro primer viaje</h2>
        <p>Podréis organizar el itinerario, controlar reservas y gastos, preparar las maletas y guardar toda la información útil.</p>
        <button class="button primary" id="emptyNewTrip">+ Crear viaje</button>
      </div>`;
    document.getElementById('emptyNewTrip')?.addEventListener('click', () => openTripModal());
    return;
  }

  const renderers = {
    dashboard: renderDashboard,
    itinerary: renderItinerary,
    expenses: renderExpenses,
    todos: renderTodos,
    packing: renderPacking,
    resources: renderResources,
  };
  content.innerHTML = renderers[state.view]();
  bindViewEvents();
}

function pageHeader(title, description, actions = '') {
  return `
    <div class="page-header">
      <div><p class="eyebrow">${escapeHTML(state.bundle.trip.name)}</p><h1>${title}</h1><p>${description}</p></div>
      <div class="page-actions">${actions}</div>
    </div>`;
}

function renderDashboard() {
  const { trip, summary, activities, todos, expenses } = state.bundle;
  const nextActivities = activities.filter((activity) => !activity.alternative && activity.date >= new Date().toISOString().slice(0, 10)).slice(0, 5);
  const pendingTodos = todos.filter((todo) => !todo.completed).slice(0, 5);
  const expenseCurrency = trip.currency;
  return `
    ${pageHeader('Resumen del viaje', 'La información esencial y lo que todavía queda por preparar.')}
    <section class="hero-card">
      <div class="trip-emoji">${escapeHTML(trip.coverEmoji)}</div>
      <h2>${escapeHTML(trip.name)}</h2>
      <p>${escapeHTML(trip.description || trip.destination || 'Todo vuestro viaje organizado en un único lugar.')}</p>
      <div class="hero-meta">
        <span>📍 ${escapeHTML(trip.destination || 'Destino por definir')}</span>
        <span>📅 ${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}</span>
        <span>🗓️ ${summary.days} días</span>
        <span>● ${STATUS_LABELS[trip.status]}</span>
      </div>
    </section>
    <section class="stats-grid">
      <div class="stat-card"><span>Actividades</span><strong>${summary.activities}</strong><small>${summary.alternatives} alternativas</small></div>
      <div class="stat-card"><span>TODO pendientes</span><strong>${summary.todoPending}</strong><small>de ${todos.length} tareas</small></div>
      <div class="stat-card"><span>Coste total</span><strong>${formatMoney(summary.totalExpenses, expenseCurrency)}</strong><small>${expenses.length} gastos</small></div>
      <div class="stat-card"><span>Ya pagado</span><strong>${formatMoney(summary.paidExpenses, expenseCurrency)}</strong><small>${formatMoney(summary.unpaidExpenses, expenseCurrency)} pendiente</small></div>
      <div class="stat-card"><span>Maleta preparada</span><strong>${summary.packingPercent}%</strong><small>${summary.packedTotal}/${summary.packingTotal} objetos</small></div>
      <div class="stat-card"><span>Viajeros</span><strong>${state.bundle.travelers.length}</strong><small>${state.bundle.travelers.map((item) => escapeHTML(item.name)).join(', ')}</small></div>
    </section>
    <section class="panel-grid">
      <article class="panel">
        <div class="panel-header"><div><h2>Próximas actividades</h2><p>Primeros planes del itinerario.</p></div><button class="button small ghost" data-go="itinerary">Ver planning</button></div>
        <div class="quick-list">
          ${nextActivities.length ? nextActivities.map((activity) => `
            <button class="quick-item activity-quick" data-id="${activity.id}" style="border-left:0;border-right:0;border-top:0;background:transparent;width:100%;text-align:left">
              <span class="quick-icon">${activityIcon(activity.type)}</span>
              <span><strong>${escapeHTML(activity.title)}</strong><small>${formatDate(activity.date, { year: false })}${activity.startTime ? ` · ${activity.startTime}` : ''}</small></span>
            </button>`).join('') : '<div class="empty-zone">Todavía no hay actividades futuras.</div>'}
        </div>
      </article>
      <article class="panel">
        <div class="panel-header"><div><h2>Pendientes prioritarios</h2><p>Lo que conviene resolver primero.</p></div><button class="button small ghost" data-go="todos">Ver TODO</button></div>
        <div class="quick-list">
          ${pendingTodos.length ? pendingTodos.map((todo) => `
            <button class="quick-item todo-quick" data-id="${todo.id}" style="border-left:0;border-right:0;border-top:0;background:transparent;width:100%;text-align:left">
              <span class="quick-icon">${priorityIcon(todo.priority)}</span>
              <span><strong>${escapeHTML(todo.title)}</strong><small>${todo.dueDate ? `Antes del ${formatDate(todo.dueDate)}` : 'Sin fecha límite'}${todo.activityTitle ? ` · ${escapeHTML(todo.activityTitle)}` : ''}</small></span>
            </button>`).join('') : '<div class="empty-zone">No quedan tareas pendientes.</div>'}
        </div>
      </article>
      <article class="panel full">
        <div class="panel-header"><div><h2>Preparación de las maletas</h2><p>Progreso global de todos los viajeros.</p></div><button class="button small ghost" data-go="packing">Abrir maletas</button></div>
        <div class="progress"><span style="width:${summary.packingPercent}%"></span></div>
        <div class="progress-row"><span>${summary.packedTotal} preparados</span><span>${summary.packingTotal - summary.packedTotal} pendientes</span></div>
      </article>
    </section>`;
}

function activityIcon(type) {
  const icons = { flight: '✈️', train: '🚆', transport: '🚕', hotel: '🏨', food: '🍜', visit: '🏛️', nature: '🌿', activity: '📌' };
  return icons[type] || '📌';
}

function priorityIcon(priority) {
  return ({ urgent: '🔴', high: '🟠', normal: '🔵', low: '⚪' })[priority] || '🔵';
}

function renderItinerary() {
  const { trip, activities } = state.bundle;
  const dates = daysBetween(trip.startDate, trip.endDate);
  const today = new Date().toISOString().slice(0, 10);
  const firstDayColumn = dates.length
    ? ((new Date(`${dates[0]}T00:00:00`).getDay() + 6) % 7) + 1
    : 1;
  return `
    ${pageHeader('Itinerario', 'Arrastra los planes entre días o hacia la zona de planes alternativos.', '<button class="button primary" id="addActivity">+ Añadir actividad</button>')}
    <div class="itinerary-wrap">
      <div class="itinerary-weekdays" aria-hidden="true">
        ${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
          .map((weekday) => `<span>${weekday}</span>`).join('')}
      </div>
      <div class="itinerary-grid">
        ${Array.from({ length: firstDayColumn - 1 }, () => '<span class="itinerary-spacer" aria-hidden="true"></span>').join('')}
        ${dates.map((date, index) => {
          const main = activities.filter((item) => item.date === date && !item.alternative);
          const alternatives = activities.filter((item) => item.date === date && item.alternative);
          return `
            <article class="day-column">
              <header class="day-header ${date === today ? 'today' : ''}">
                <strong>Día ${index + 1} · ${escapeHTML(formatDate(date, { weekday: true }))}</strong>
                <span>${formatDate(date)}</span>
                <div class="day-actions"><span>${main.length} planes</span><button class="button small secondary add-day-activity" data-date="${date}" data-alternative="0">+ Plan</button></div>
              </header>
              <div class="activity-zone" data-date="${date}" data-alternative="0">
                ${main.length ? main.map(activityCard).join('') : '<div class="empty-zone">Suelta aquí una actividad</div>'}
              </div>
              <section class="alternative-block">
                <div class="alternative-title"><span>☂ Planes alternativos</span><button class="button small ghost add-day-activity" data-date="${date}" data-alternative="1">+</button></div>
                <div class="activity-zone" data-date="${date}" data-alternative="1">
                  ${alternatives.length ? alternatives.map(activityCard).join('') : '<div class="empty-zone">Por si cambia el plan</div>'}
                </div>
              </section>
            </article>`;
        }).join('')}
      </div>
    </div>`;
}

function activityCard(activity) {
  return `
    <article class="activity-card" draggable="true" data-id="${activity.id}">
      ${activity.startTime ? `<span class="activity-time">${activity.startTime}${activity.endTime ? `–${activity.endTime}` : ''}</span>` : ''}
      <h4>${activityIcon(activity.type)} ${escapeHTML(activity.title)}</h4>
      ${activity.location ? `<p>📍 ${escapeHTML(activity.location)}</p>` : ''}
      <div class="activity-badges">
        ${activity.price ? `<span class="badge linked">${formatMoney(activity.price, activity.currency)}</span>` : ''}
        ${activity.todoId ? '<span class="badge warning">TODO vinculado</span>' : ''}
        ${activity.reservationStatus !== 'idea' ? `<span class="badge ${activity.reservationStatus === 'paid' ? 'success' : 'warning'}">${RESERVATION_LABELS[activity.reservationStatus]}</span>` : ''}
      </div>
    </article>`;
}

function renderExpenses() {
  const { trip, expenses, summary } = state.bundle;
  const filtered = expenses.filter((expense) => state.expenseFilter === 'all' || (state.expenseFilter === 'paid' ? expense.paid : !expense.paid));
  return `
    ${pageHeader('Gastos', 'Todos los pagos del viaje, incluidos los vinculados al itinerario y los TODOs.', '<button class="button primary" id="addExpense">+ Añadir gasto</button>')}
    <section class="stats-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="stat-card"><span>Total previsto</span><strong>${formatMoney(summary.totalExpenses, trip.currency)}</strong></div>
      <div class="stat-card"><span>Ya pagado</span><strong>${formatMoney(summary.paidExpenses, trip.currency)}</strong></div>
      <div class="stat-card"><span>Falta pagar</span><strong>${formatMoney(summary.unpaidExpenses, trip.currency)}</strong></div>
    </section>
    <div class="filters">
      <select id="expenseFilter">
        <option value="all" ${state.expenseFilter === 'all' ? 'selected' : ''}>Todos los gastos</option>
        <option value="unpaid" ${state.expenseFilter === 'unpaid' ? 'selected' : ''}>Pendientes de pago</option>
        <option value="paid" ${state.expenseFilter === 'paid' ? 'selected' : ''}>Pagados</option>
      </select>
      <span class="badge linked">Los gastos con 🔗 están sincronizados</span>
    </div>
    <div class="table-card">
      <div class="table-scroll">
        <table>
          <thead><tr><th>Concepto</th><th>Categoría</th><th>Origen</th><th>Persona</th><th>Estado</th><th>Importe</th><th></th></tr></thead>
          <tbody>
            ${filtered.length ? filtered.map((expense) => `
              <tr>
                <td><strong>${escapeHTML(expense.description)}</strong>${expense.dueDate ? `<br><small>Previsto: ${formatDate(expense.dueDate)}</small>` : ''}</td>
                <td>${escapeHTML(CATEGORY_LABELS[expense.category] || expense.category)}</td>
                <td>${expense.sourceType === 'manual' ? '<span class="badge">Manual</span>' : `<span class="badge linked">🔗 ${expense.sourceType === 'activity' ? 'Itinerario' : 'TODO'}</span>`}</td>
                <td>${escapeHTML(expense.payerName || '—')}</td>
                <td><label class="status-toggle"><input type="checkbox" class="expense-paid" data-id="${expense.id}" ${expense.paid ? 'checked' : ''}><span class="status-dot ${expense.paid ? 'paid' : ''}"></span>${expense.paid ? 'Pagado' : 'Pendiente'}</label></td>
                <td class="money">${formatMoney(expense.amount, expense.currency)}</td>
                <td><div class="row-actions"><button class="button small ghost edit-expense" data-id="${expense.id}">Editar</button><button class="button small danger delete-expense" data-id="${expense.id}">×</button></div></td>
              </tr>`).join('') : '<tr><td colspan="7"><div class="empty-zone">No hay gastos en este filtro.</div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderTodos() {
  const todos = state.bundle.todos;
  const groups = {
    urgent: todos.filter((todo) => !todo.completed && ['urgent', 'high'].includes(todo.priority)),
    pending: todos.filter((todo) => !todo.completed && !['urgent', 'high'].includes(todo.priority)),
    completed: todos.filter((todo) => todo.completed),
  };
  return `
    ${pageHeader('TODO del viaje', 'Añade tareas, subtareas y reservas pendientes; puedes relacionarlas con una actividad.', '<button class="button primary" id="addTodo">+ Añadir TODO</button>')}
    <div class="todo-grid">
      ${todoColumn('Prioritario', groups.urgent, 'urgent')}
      ${todoColumn('Pendiente', groups.pending, 'pending')}
      ${todoColumn('Completado', groups.completed, 'completed')}
    </div>`;
}

function todoColumn(title, todos, key) {
  return `<section class="todo-column"><h3>${title}<span>${todos.length}</span></h3>${todos.length ? todos.map(todoCard).join('') : '<div class="empty-zone">Sin tareas</div>'}</section>`;
}

function todoCard(todo) {
  const completedItems = todo.checklist.filter((item) => item.completed).length;
  return `
    <article class="todo-card ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
      <div class="todo-title-row">
        <input type="checkbox" class="todo-complete" data-id="${todo.id}" ${todo.completed ? 'checked' : ''} aria-label="Completar TODO">
        <h4>${escapeHTML(todo.title)}</h4>
        <button class="icon-button edit-todo" data-id="${todo.id}" style="width:30px;height:30px;font-size:1rem">⋯</button>
      </div>
      ${todo.details ? `<p>${escapeHTML(todo.details)}</p>` : ''}
      ${todo.checklist.length ? `<div class="checklist">${todo.checklist.map((item) => `<label class="${item.completed ? 'done' : ''}"><input type="checkbox" class="todo-item-toggle" data-id="${item.id}" ${item.completed ? 'checked' : ''}><span>${escapeHTML(item.text)}</span></label>`).join('')}</div>` : ''}
      <div class="todo-meta">
        <span class="badge ${todo.priority === 'urgent' ? 'danger' : todo.priority === 'high' ? 'warning' : ''}">${priorityIcon(todo.priority)} ${todo.priority}</span>
        ${todo.activityTitle ? `<span class="badge linked">🔗 ${escapeHTML(todo.activityTitle)}</span>` : ''}
        ${todo.price ? `<span class="badge linked">${formatMoney(todo.price, todo.currency)}</span>` : ''}
        ${todo.dueDate ? `<span class="badge">📅 ${formatDate(todo.dueDate, { year: false })}</span>` : ''}
        ${todo.checklist.length ? `<span class="badge">${completedItems}/${todo.checklist.length}</span>` : ''}
      </div>
    </article>`;
}

function renderPacking() {
  const { travelers, packing, summary } = state.bundle;
  const shared = packing.filter((item) => !item.travelerId || item.luggageType === 'shared');
  return `
    ${pageHeader('Maletas', 'Cada viajero dispone de listas separadas para facturada, cabina y mochila.', '<button class="button ghost" id="addTraveler">+ Persona</button><button class="button primary" id="addPacking">+ Añadir objeto</button>')}
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-header"><div><h3>Progreso total</h3><p>${summary.packedTotal} de ${summary.packingTotal} objetos preparados</p></div><strong>${summary.packingPercent}%</strong></div>
      <div class="progress"><span style="width:${summary.packingPercent}%"></span></div>
    </div>
    ${travelers.map((traveler) => travelerPackingSection(traveler, packing.filter((item) => item.travelerId === traveler.id && item.luggageType !== 'shared'))).join('')}
    ${shared.length ? `
      <section class="traveler-section">
        <div class="traveler-heading"><h2>👥 Compartido</h2></div>
        <div class="luggage-grid"><div class="luggage-card" style="grid-column:1/-1"><h3>Material común <span>${shared.filter((item) => item.packed).length}/${shared.length}</span></h3>${packingList(shared)}</div></div>
      </section>` : ''}`;
}

function travelerPackingSection(traveler, items) {
  return `
    <section class="traveler-section">
      <div class="traveler-heading">
        <h2>🧳 ${escapeHTML(traveler.name)}</h2>
        <div class="packing-progress"><div class="progress"><span style="width:${items.length ? Math.round(items.filter((item) => item.packed).length / items.length * 100) : 0}%"></span></div><small>${items.filter((item) => item.packed).length}/${items.length}</small><button class="button small ghost edit-traveler" data-id="${traveler.id}">Editar</button></div>
      </div>
      <div class="luggage-grid">
        ${['checked', 'carry_on', 'personal'].map((type) => {
          const typeItems = items.filter((item) => item.luggageType === type);
          return `<div class="luggage-card"><h3>${LUGGAGE_LABELS[type]} <span>${typeItems.filter((item) => item.packed).length}/${typeItems.length}</span></h3>${packingList(typeItems)}</div>`;
        }).join('')}
      </div>
    </section>`;
}

function packingList(items) {
  return `<div class="packing-list">${items.length ? items.map((item) => `
    <div class="packing-item ${item.packed ? 'packed' : ''}">
      <input type="checkbox" class="packing-toggle" data-id="${item.id}" ${item.packed ? 'checked' : ''}>
      <span>${escapeHTML(item.name)}${item.quantity > 1 ? ` ×${item.quantity}` : ''}<small>${escapeHTML(item.category)}${item.notes ? ` · ${escapeHTML(item.notes)}` : ''}</small></span>
      <button class="icon-button edit-packing" data-id="${item.id}" style="width:28px;height:28px;font-size:.9rem">⋯</button>
    </div>`).join('') : '<div class="empty-zone">Lista vacía</div>'}</div>`;
}

function renderResources() {
  const resources = state.bundle.resources.filter((resource) => state.resourceFilter === 'all' || resource.type === state.resourceFilter);
  return `
    ${pageHeader('Información del viaje', 'Traslados, enlaces, apps, documentos, reservas y notas importantes.', '<button class="button primary" id="addResource">+ Añadir información</button>')}
    <div class="filters"><select id="resourceFilter"><option value="all">Todos los tipos</option>${Object.entries(RESOURCE_LABELS).map(([key, label]) => `<option value="${key}" ${state.resourceFilter === key ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
    <div class="resources-grid">
      ${resources.length ? resources.map((resource) => `
        <article class="resource-card">
          <span class="resource-type">${RESOURCE_LABELS[resource.type] || resource.type}</span>
          <h3>${escapeHTML(resource.title)}</h3>
          ${resource.details ? `<p>${escapeHTML(resource.details)}</p>` : ''}
          <footer>
            <span>${resource.date ? formatDate(resource.date) : ''}</span>
            <div>${resource.url ? `<a class="button small secondary" href="${attr(safeExternalUrl(resource.url))}" target="_blank" rel="noopener">Abrir</a>` : ''}<button class="button small ghost edit-resource" data-id="${resource.id}">Editar</button></div>
          </footer>
        </article>`).join('') : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔗</div><h2>No hay información en este filtro</h2><p>Añade enlaces, instrucciones de traslado o documentos importantes.</p></div>'}
    </div>`;
}

function bindViewEvents() {
  document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => setActiveView(button.dataset.go)));
  document.querySelectorAll('.activity-quick').forEach((button) => button.addEventListener('click', () => openActivityModal(findActivity(button.dataset.id))));
  document.querySelectorAll('.todo-quick').forEach((button) => button.addEventListener('click', () => openTodoModal(findTodo(button.dataset.id))));

  document.getElementById('addActivity')?.addEventListener('click', () => openActivityModal());
  document.querySelectorAll('.add-day-activity').forEach((button) => button.addEventListener('click', () => openActivityModal(null, button.dataset.date, button.dataset.alternative === '1')));
  bindItineraryDrag();
  document.querySelectorAll('.activity-card').forEach((card) => card.addEventListener('click', (event) => {
    if (!card.classList.contains('dragging')) openActivityModal(findActivity(card.dataset.id));
  }));

  document.getElementById('addExpense')?.addEventListener('click', () => openExpenseModal());
  document.getElementById('expenseFilter')?.addEventListener('change', (event) => { state.expenseFilter = event.target.value; render(); });
  document.querySelectorAll('.edit-expense').forEach((button) => button.addEventListener('click', () => openExpenseModal(findExpense(button.dataset.id))));
  document.querySelectorAll('.delete-expense').forEach((button) => button.addEventListener('click', () => deleteExpenseAction(button.dataset.id)));
  document.querySelectorAll('.expense-paid').forEach((input) => input.addEventListener('change', () => toggleExpensePaid(input.dataset.id, input.checked)));

  document.getElementById('addTodo')?.addEventListener('click', () => openTodoModal());
  document.querySelectorAll('.edit-todo').forEach((button) => button.addEventListener('click', () => openTodoModal(findTodo(button.dataset.id))));
  document.querySelectorAll('.todo-complete').forEach((input) => input.addEventListener('change', () => toggleTodo(input.dataset.id, input.checked)));
  document.querySelectorAll('.todo-item-toggle').forEach((input) => input.addEventListener('change', () => toggleTodoItem(input.dataset.id, input.checked)));

  document.getElementById('addTraveler')?.addEventListener('click', () => openTravelerModal());
  document.querySelectorAll('.edit-traveler').forEach((button) => button.addEventListener('click', () => openTravelerModal(findTraveler(button.dataset.id))));
  document.getElementById('addPacking')?.addEventListener('click', () => openPackingModal());
  document.querySelectorAll('.edit-packing').forEach((button) => button.addEventListener('click', () => openPackingModal(findPacking(button.dataset.id))));
  document.querySelectorAll('.packing-toggle').forEach((input) => input.addEventListener('change', () => togglePacking(input.dataset.id, input.checked)));

  document.getElementById('addResource')?.addEventListener('click', () => openResourceModal());
  document.getElementById('resourceFilter')?.addEventListener('change', (event) => { state.resourceFilter = event.target.value; render(); });
  document.querySelectorAll('.edit-resource').forEach((button) => button.addEventListener('click', () => openResourceModal(findResource(button.dataset.id))));
}

function bindItineraryDrag() {
  let draggedId = null;
  document.querySelectorAll('.activity-card').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      draggedId = Number(card.dataset.id);
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(draggedId));
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.activity-zone').forEach((zone) => zone.classList.remove('drag-over'));
    });
  });
  document.querySelectorAll('.activity-zone').forEach((zone) => {
    zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', async (event) => {
      event.preventDefault();
      zone.classList.remove('drag-over');
      const id = draggedId || Number(event.dataTransfer.getData('text/plain'));
      if (!id) return;
      const cards = [...zone.querySelectorAll('.activity-card:not(.dragging)')];
      let sortOrder = cards.length;
      const pointerCard = cards.find((card) => event.clientY < card.getBoundingClientRect().top + card.offsetHeight / 2);
      if (pointerCard) sortOrder = cards.indexOf(pointerCard);
      try {
        await api(`/activities/${id}/move`, { method: 'PATCH', body: JSON.stringify({ date: zone.dataset.date, alternative: zone.dataset.alternative === '1', sortOrder }) });
        await refreshTrip();
        toast('Actividad movida.');
      } catch (error) { toast(error.message, 'error'); }
    });
  });
}

function findActivity(id) { return state.bundle.activities.find((item) => item.id === Number(id)); }
function findTodo(id) { return state.bundle.todos.find((item) => item.id === Number(id)); }
function findExpense(id) { return state.bundle.expenses.find((item) => item.id === Number(id)); }
function findTraveler(id) { return state.bundle.travelers.find((item) => item.id === Number(id)); }
function findPacking(id) { return state.bundle.packing.find((item) => item.id === Number(id)); }
function findResource(id) { return state.bundle.resources.find((item) => item.id === Number(id)); }

function openModal({ eyebrow = '', title, body, onSave, onDelete, saveLabel = 'Guardar' }) {
  modalEyebrow.textContent = eyebrow;
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalFooter.innerHTML = `
    <div>${onDelete ? '<button type="button" class="button danger" id="modalDelete">Eliminar</button>' : ''}</div>
    <div class="right"><button type="button" class="button ghost" id="modalCancel">Cancelar</button><button type="submit" class="button primary" id="modalSave">${saveLabel}</button></div>`;
  modalCard.onsubmit = async (event) => {
    event.preventDefault();
    const saveButton = document.getElementById('modalSave');
    saveButton.disabled = true;
    try {
      await onSave(new FormData(modalCard));
      modal.close();
    } catch (error) {
      toast(error.message, 'error');
      saveButton.disabled = false;
    }
  };
  document.getElementById('modalCancel').onclick = () => modal.close();
  if (onDelete) document.getElementById('modalDelete').onclick = onDelete;
  modal.showModal();
}

function field(label, name, value = '', options = {}) {
  const full = options.full ? ' full' : '';
  const required = options.required ? ' required' : '';
  const type = options.type || 'text';
  const min = options.min !== undefined ? ` min="${options.min}"` : '';
  const step = options.step !== undefined ? ` step="${options.step}"` : '';
  const placeholder = options.placeholder ? ` placeholder="${attr(options.placeholder)}"` : '';
  return `<div class="form-field${full}"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${attr(value ?? '')}"${required}${min}${step}${placeholder}>${options.help ? `<span class="form-help">${escapeHTML(options.help)}</span>` : ''}</div>`;
}

function textarea(label, name, value = '', options = {}) {
  return `<div class="form-field${options.full ? ' full' : ''}"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" placeholder="${attr(options.placeholder || '')}">${escapeHTML(value || '')}</textarea></div>`;
}

function selectField(label, name, options, value, config = {}) {
  return `<div class="form-field${config.full ? ' full' : ''}"><label for="${name}">${label}</label><select id="${name}" name="${name}">${options.map(([key, text]) => `<option value="${attr(key)}" ${String(value ?? '') === String(key) ? 'selected' : ''}>${escapeHTML(text)}</option>`).join('')}</select></div>`;
}

function checkboxField(label, name, checked) {
  return `<div class="form-field"><label>${label}</label><label class="checkbox-field"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}> Sí</label></div>`;
}

function openTripModal(trip = state.bundle?.trip) {
  const isEdit = Boolean(trip?.id);
  openModal({
    eyebrow: isEdit ? 'Configuración' : 'Nuevo viaje',
    title: isEdit ? 'Editar viaje' : 'Crear un viaje',
    body: `<div class="form-grid">
      ${field('Nombre del viaje', 'name', trip?.name, { required: true })}
      ${field('Destino', 'destination', trip?.destination, { required: true })}
      ${field('Fecha de inicio', 'startDate', trip?.startDate, { type: 'date', required: true })}
      ${field('Fecha final', 'endDate', trip?.endDate, { type: 'date', required: true })}
      ${field('Emoji', 'coverEmoji', trip?.coverEmoji || '✈️')}
      ${selectField('Estado', 'status', Object.entries(STATUS_LABELS), trip?.status || 'planning')}
      ${field('Moneda', 'currency', trip?.currency || 'EUR')}
      ${!isEdit ? field('Viajeros iniciales', 'travelers', 'Xavi, Judit', { help: 'Separados por comas.' }) : ''}
      ${textarea('Descripción', 'description', trip?.description, { full: true, placeholder: 'Objetivo del viaje, estilo, notas generales…' })}
    </div>`,
    onSave: async (form) => {
      const payload = {
        name: form.get('name'), destination: form.get('destination'), startDate: form.get('startDate'), endDate: form.get('endDate'),
        coverEmoji: form.get('coverEmoji'), status: form.get('status'), currency: form.get('currency'), description: form.get('description'),
      };
      if (!isEdit) payload.travelers = String(form.get('travelers') || '').split(',').map((name) => name.trim()).filter(Boolean);
      if (isEdit) {
        await api(`/trips/${trip.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        await loadTrips(trip.id);
        toast('Viaje actualizado.');
      } else {
        const created = await api('/trips', { method: 'POST', body: JSON.stringify(payload) });
        await loadTrips(created.trip.id);
        toast('Viaje creado.');
      }
    },
    onDelete: isEdit ? async () => {
      if (!confirm(`¿Eliminar definitivamente “${trip.name}” y todos sus datos?`)) return;
      await api(`/trips/${trip.id}`, { method: 'DELETE' });
      modal.close();
      await loadTrips();
      toast('Viaje eliminado.');
    } : null,
  });
}

function openActivityModal(activity = null, defaultDate = state.bundle.trip.startDate, alternative = false) {
  const isEdit = Boolean(activity);
  const trip = state.bundle.trip;
  openModal({
    eyebrow: activity?.alternative || alternative ? 'Plan alternativo' : 'Itinerario',
    title: isEdit ? activity.title : 'Nueva actividad',
    body: `<div class="form-grid">
      ${field('Nombre de la actividad', 'title', activity?.title, { required: true, full: true })}
      ${field('Fecha', 'date', activity?.date || defaultDate, { type: 'date', required: true })}
      ${selectField('Tipo', 'type', [['activity','Actividad'],['visit','Visita'],['nature','Naturaleza'],['flight','Vuelo'],['train','Tren'],['transport','Traslado'],['hotel','Hotel'],['food','Comida']], activity?.type || 'activity')}
      ${field('Hora de inicio', 'startTime', activity?.startTime, { type: 'time' })}
      ${field('Hora final', 'endTime', activity?.endTime, { type: 'time' })}
      ${field('Lugar / dirección', 'location', activity?.location, { full: true })}
      ${textarea('Descripción', 'description', activity?.description, { full: true, placeholder: 'Qué hacer, cómo llegar, duración estimada…' })}
      <div class="form-section"><h3>Reservas y enlaces</h3><p>Información que aparecerá al abrir esta actividad.</p></div>
      ${selectField('Estado de reserva', 'reservationStatus', Object.entries(RESERVATION_LABELS), activity?.reservationStatus || 'idea')}
      ${field('Referencia / número de entrada', 'ticketReference', activity?.ticketReference)}
      ${field('Enlace de interés', 'interestUrl', activity?.interestUrl, { type: 'url' })}
      ${field('Enlace de reserva o entradas', 'bookingUrl', activity?.bookingUrl, { type: 'url' })}
      <div class="form-section"><h3>Precio sincronizado</h3><p>Creará o actualizará automáticamente un registro en Gastos.</p></div>
      <div class="form-field"><label>Precio</label><div class="inline-fields"><input name="price" type="number" min="0" step="0.01" value="${attr(activity?.price || '')}"><input name="currency" value="${attr(activity?.currency || trip.currency)}" maxlength="3"></div></div>
      ${selectField('Categoría del gasto', 'expenseCategory', Object.entries(CATEGORY_LABELS), activity?.expenseCategory || 'activities')}
      ${checkboxField('¿Está pagado?', 'paid', activity?.paid)}
      ${checkboxField('¿Plan alternativo?', 'alternative', activity?.alternative ?? alternative)}
      ${textarea('Notas privadas', 'notes', activity?.notes, { full: true })}
    </div>`,
    onSave: async (form) => {
      const payload = Object.fromEntries(form.entries());
      payload.paid = form.has('paid');
      payload.alternative = form.has('alternative');
      const path = isEdit ? `/activities/${activity.id}` : `/trips/${trip.id}/activities`;
      await api(path, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      await refreshTrip();
      toast(isEdit ? 'Actividad actualizada.' : 'Actividad añadida.');
    },
    onDelete: isEdit ? async () => {
      if (!confirm('¿Eliminar esta actividad? El gasto vinculado también se eliminará, salvo que esté compartido con un TODO.')) return;
      await api(`/activities/${activity.id}`, { method: 'DELETE' });
      modal.close(); await refreshTrip(); toast('Actividad eliminada.');
    } : null,
  });
}

function openExpenseModal(expense = null) {
  const isEdit = Boolean(expense);
  const trip = state.bundle.trip;
  openModal({
    eyebrow: expense?.sourceType !== 'manual' ? 'Gasto sincronizado' : 'Gastos',
    title: isEdit ? 'Editar gasto' : 'Nuevo gasto',
    body: `<div class="form-grid">
      ${field('Descripción', 'description', expense?.description, { required: true, full: true })}
      ${selectField('Categoría', 'category', Object.entries(CATEGORY_LABELS), expense?.category || 'other')}
      <div class="form-field"><label>Importe</label><div class="inline-fields"><input name="amount" type="number" min="0.01" step="0.01" required value="${attr(expense?.amount || '')}"><input name="currency" value="${attr(expense?.currency || trip.currency)}" maxlength="3"></div></div>
      ${selectField('Pagado por', 'payerId', [['','Sin especificar'], ...state.bundle.travelers.map((item) => [item.id, item.name])], expense?.payerId || '')}
      ${checkboxField('¿Está pagado?', 'paid', expense?.paid)}
      ${field('Fecha de pago', 'paymentDate', expense?.paymentDate, { type: 'date' })}
      ${field('Fecha prevista', 'dueDate', expense?.dueDate, { type: 'date' })}
      ${textarea('Notas', 'notes', expense?.notes, { full: true })}
      ${expense?.sourceType !== 'manual' ? '<div class="form-section"><p>Este gasto está vinculado. Los cambios de importe y estado también aparecerán en su actividad o TODO.</p></div>' : ''}
    </div>`,
    onSave: async (form) => {
      const payload = Object.fromEntries(form.entries()); payload.paid = form.has('paid');
      const path = isEdit ? `/expenses/${expense.id}` : `/trips/${trip.id}/expenses`;
      await api(path, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      await refreshTrip(); toast(isEdit ? 'Gasto actualizado.' : 'Gasto añadido.');
    },
    onDelete: isEdit ? async () => {
      if (!confirm(expense.sourceType === 'manual' ? '¿Eliminar este gasto?' : 'Este gasto está vinculado. Al eliminarlo, su actividad o TODO quedará sin precio. ¿Continuar?')) return;
      await api(`/expenses/${expense.id}`, { method: 'DELETE' }); modal.close(); await refreshTrip(); toast('Gasto eliminado.');
    } : null,
  });
}

async function toggleExpensePaid(id, checked) {
  const expense = findExpense(id);
  try {
    await api(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify({ ...expense, paid: checked }) });
    await refreshTrip();
  } catch (error) { toast(error.message, 'error'); render(); }
}

async function deleteExpenseAction(id) {
  const expense = findExpense(id);
  if (!confirm(expense.sourceType === 'manual' ? '¿Eliminar este gasto?' : 'Es un gasto vinculado. Su actividad o TODO quedará sin precio. ¿Eliminarlo?')) return;
  try { await api(`/expenses/${id}`, { method: 'DELETE' }); await refreshTrip(); toast('Gasto eliminado.'); } catch (error) { toast(error.message, 'error'); }
}

function checklistRows(items = []) {
  const list = items.length ? items : [{ text: '', completed: false }];
  return list.map((item) => `<div class="dynamic-row"><input type="checkbox" class="checklist-completed" ${item.completed ? 'checked' : ''}><input type="text" class="checklist-text" value="${attr(item.text)}" placeholder="Ej. Comprar la entrada"><button type="button" class="icon-button remove-checklist" style="font-size:1rem">×</button></div>`).join('');
}

function openTodoModal(todo = null) {
  const isEdit = Boolean(todo);
  const trip = state.bundle.trip;
  openModal({
    eyebrow: 'TODO',
    title: isEdit ? todo.title : 'Nueva tarea',
    body: `<div class="form-grid">
      ${field('Tarea', 'title', todo?.title, { required: true, full: true })}
      ${selectField('Prioridad', 'priority', [['low','Baja'],['normal','Normal'],['high','Alta'],['urgent','Urgente']], todo?.priority || 'normal')}
      ${field('Fecha límite', 'dueDate', todo?.dueDate, { type: 'date' })}
      ${selectField('Relacionar con actividad', 'activityId', [['','Sin relación'], ...state.bundle.activities.filter((item) => !item.alternative).map((item) => [item.id, `${formatDate(item.date, { year: false })} · ${item.title}`])], todo?.activityId || '', { full: true })}
      ${textarea('Detalles', 'details', todo?.details, { full: true })}
      <div class="form-section"><h3>Qué falta exactamente</h3><p>Puedes añadir varios pasos o elementos pendientes.</p><div class="dynamic-list" id="checklistRows">${checklistRows(todo?.checklist)}</div><button type="button" class="button small secondary" id="addChecklistRow">+ Añadir elemento</button></div>
      <div class="form-section"><h3>Precio sincronizado</h3><p>Si está relacionado con una actividad, ambos compartirán el mismo gasto.</p></div>
      <div class="form-field"><label>Precio</label><div class="inline-fields"><input name="price" type="number" min="0" step="0.01" value="${attr(todo?.price || '')}"><input name="currency" value="${attr(todo?.currency || trip.currency)}" maxlength="3"></div></div>
      ${selectField('Categoría del gasto', 'expenseCategory', Object.entries(CATEGORY_LABELS), todo?.expenseCategory || 'other')}
      ${checkboxField('¿Está pagado?', 'paid', todo?.paid)}
      ${checkboxField('¿Tarea completada?', 'completed', todo?.completed)}
    </div>`,
    onSave: async (form) => {
      const checklist = [...modalBody.querySelectorAll('.dynamic-row')].map((row) => ({
        text: row.querySelector('.checklist-text').value.trim(), completed: row.querySelector('.checklist-completed').checked,
      })).filter((item) => item.text);
      const payload = Object.fromEntries(form.entries());
      payload.checklist = checklist; payload.paid = form.has('paid'); payload.completed = form.has('completed');
      const path = isEdit ? `/todos/${todo.id}` : `/trips/${trip.id}/todos`;
      await api(path, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      await refreshTrip(); toast(isEdit ? 'TODO actualizado.' : 'TODO añadido.');
    },
    onDelete: isEdit ? async () => {
      if (!confirm('¿Eliminar este TODO? Si comparte un gasto con una actividad, el gasto se conservará para la actividad.')) return;
      await api(`/todos/${todo.id}`, { method: 'DELETE' }); modal.close(); await refreshTrip(); toast('TODO eliminado.');
    } : null,
  });
  document.getElementById('addChecklistRow').onclick = () => {
    document.getElementById('checklistRows').insertAdjacentHTML('beforeend', checklistRows([{ text: '', completed: false }]));
    bindRemoveChecklist();
  };
  bindRemoveChecklist();
}

function bindRemoveChecklist() {
  modalBody.querySelectorAll('.remove-checklist').forEach((button) => button.onclick = () => button.closest('.dynamic-row').remove());
}

async function toggleTodo(id, checked) {
  const todo = findTodo(id);
  try { await api(`/todos/${id}`, { method: 'PUT', body: JSON.stringify({ ...todo, completed: checked }) }); await refreshTrip(); } catch (error) { toast(error.message, 'error'); render(); }
}

async function toggleTodoItem(id, checked) {
  try { await api(`/todo-items/${id}`, { method: 'PATCH', body: JSON.stringify({ completed: checked }) }); await refreshTrip(); } catch (error) { toast(error.message, 'error'); render(); }
}

function openTravelerModal(traveler = null) {
  const isEdit = Boolean(traveler);
  openModal({
    eyebrow: 'Viajeros', title: isEdit ? 'Editar persona' : 'Añadir persona',
    body: `<div class="form-grid">${field('Nombre', 'name', traveler?.name, { required: true, full: true })}${checkboxField('Persona principal', 'isDefault', traveler?.isDefault)}</div>`,
    onSave: async (form) => {
      const payload = { name: form.get('name'), isDefault: form.has('isDefault') };
      const path = isEdit ? `/travelers/${traveler.id}` : `/trips/${state.bundle.trip.id}/travelers`;
      await api(path, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }); await refreshTrip(); toast(isEdit ? 'Persona actualizada.' : 'Persona añadida.');
    },
    onDelete: isEdit ? async () => {
      if (!confirm(`¿Eliminar a ${traveler.name}? También se eliminarán los objetos de su maleta.`)) return;
      await api(`/travelers/${traveler.id}`, { method: 'DELETE' }); modal.close(); await refreshTrip(); toast('Persona eliminada.');
    } : null,
  });
}

function openPackingModal(item = null) {
  const isEdit = Boolean(item);
  openModal({
    eyebrow: 'Maletas', title: isEdit ? 'Editar objeto' : 'Añadir objeto',
    body: `<div class="form-grid">
      ${field('Objeto', 'name', item?.name, { required: true, full: true })}
      ${selectField('Persona', 'travelerId', [['','Compartido'], ...state.bundle.travelers.map((traveler) => [traveler.id, traveler.name])], item?.travelerId || '')}
      ${selectField('Tipo de equipaje', 'luggageType', Object.entries(LUGGAGE_LABELS), item?.luggageType || 'carry_on')}
      ${field('Categoría', 'category', item?.category || 'Otros')}
      ${field('Cantidad', 'quantity', item?.quantity || 1, { type: 'number', min: 1 })}
      ${checkboxField('¿Ya está preparado?', 'packed', item?.packed)}
      ${textarea('Notas', 'notes', item?.notes, { full: true })}
    </div>`,
    onSave: async (form) => {
      const payload = Object.fromEntries(form.entries()); payload.packed = form.has('packed');
      if (!payload.travelerId) payload.luggageType = 'shared';
      const path = isEdit ? `/packing/${item.id}` : `/trips/${state.bundle.trip.id}/packing`;
      await api(path, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }); await refreshTrip(); toast(isEdit ? 'Objeto actualizado.' : 'Objeto añadido.');
    },
    onDelete: isEdit ? async () => {
      if (!confirm('¿Eliminar este objeto de la lista?')) return;
      await api(`/packing/${item.id}`, { method: 'DELETE' }); modal.close(); await refreshTrip(); toast('Objeto eliminado.');
    } : null,
  });
}

async function togglePacking(id, checked) {
  const item = findPacking(id);
  try { await api(`/packing/${id}`, { method: 'PUT', body: JSON.stringify({ ...item, packed: checked }) }); await refreshTrip(); } catch (error) { toast(error.message, 'error'); render(); }
}

function openResourceModal(resource = null) {
  const isEdit = Boolean(resource);
  openModal({
    eyebrow: 'Información', title: isEdit ? 'Editar información' : 'Añadir información',
    body: `<div class="form-grid">
      ${selectField('Tipo', 'type', Object.entries(RESOURCE_LABELS), resource?.type || 'note')}
      ${field('Fecha relacionada', 'date', resource?.date, { type: 'date' })}
      ${field('Título', 'title', resource?.title, { required: true, full: true })}
      ${field('Enlace', 'url', resource?.url, { type: 'url', full: true })}
      ${textarea('Detalles', 'details', resource?.details, { full: true, placeholder: 'Indicaciones, horarios, códigos, datos de contacto…' })}
    </div>`,
    onSave: async (form) => {
      const payload = Object.fromEntries(form.entries());
      const path = isEdit ? `/resources/${resource.id}` : `/trips/${state.bundle.trip.id}/resources`;
      await api(path, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }); await refreshTrip(); toast(isEdit ? 'Información actualizada.' : 'Información añadida.');
    },
    onDelete: isEdit ? async () => {
      if (!confirm('¿Eliminar esta información?')) return;
      await api(`/resources/${resource.id}`, { method: 'DELETE' }); modal.close(); await refreshTrip(); toast('Información eliminada.');
    } : null,
  });
}

tripSelect.addEventListener('change', async () => {
  if (tripSelect.value) await loadTrip(Number(tripSelect.value));
});
document.getElementById('newTripButton').addEventListener('click', () => openTripModal(null));
document.getElementById('editTripButton').addEventListener('click', () => state.bundle && openTripModal(state.bundle.trip));
document.getElementById('modalClose').addEventListener('click', () => modal.close());
document.getElementById('mobileMenu').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => setActiveView(button.dataset.view)));

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.open) modal.close();
});

loadTrips().catch((error) => {
  content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h2>No se ha podido cargar la aplicación</h2><p>${escapeHTML(error.message)}</p></div>`;
});
