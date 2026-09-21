import { withTransaction } from './database.js';

const VALID_STATUSES = new Set(['idea', 'planning', 'booked', 'travelling', 'completed']);
const VALID_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const VALID_RESERVATION_STATUSES = new Set(['idea', 'pending', 'reserved', 'paid', 'not_needed']);
const VALID_LUGGAGE = new Set(['checked', 'carry_on', 'personal', 'shared']);
const VALID_RESOURCE_TYPES = new Set(['note', 'link', 'transport', 'app', 'document', 'emergency', 'booking']);

function assert(condition, message, status = 400) {
  if (!condition) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }
}

function requiredText(value, name) {
  const text = String(value ?? '').trim();
  assert(text, `El campo ${name} es obligatorio.`);
  return text;
}

function optionalText(value) {
  return String(value ?? '').trim();
}

function booleanInt(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

function validIsoDate(value, fieldName, required = false) {
  if (value === null || value === undefined || value === '') {
    assert(!required, `El campo ${fieldName} es obligatorio.`);
    return null;
  }
  const text = String(value);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(text), `${fieldName} debe tener formato AAAA-MM-DD.`);
  const date = new Date(`${text}T00:00:00Z`);
  assert(!Number.isNaN(date.getTime()), `${fieldName} no es una fecha válida.`);
  return text;
}

function validTime(value) {
  if (!value) return null;
  const text = String(value);
  assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(text), 'La hora debe tener formato HH:MM.');
  return text;
}

function moneyToCents(value) {
  if (value === null || value === undefined || value === '') return 0;
  const amount = Number(value);
  assert(Number.isFinite(amount) && amount >= 0, 'El precio debe ser un número positivo.');
  return Math.round((amount + Number.EPSILON) * 100);
}

function centsToMoney(value) {
  return Number(value || 0) / 100;
}

function idNumber(value, name = 'ID') {
  const id = Number(value);
  assert(Number.isInteger(id) && id > 0, `${name} no es válido.`);
  return id;
}

function getTripOrThrow(db, tripId) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(idNumber(tripId, 'El viaje'));
  assert(trip, 'Viaje no encontrado.', 404);
  return trip;
}

function getActivityOrThrow(db, activityId) {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(idNumber(activityId, 'La actividad'));
  assert(activity, 'Actividad no encontrada.', 404);
  return activity;
}

function getTodoOrThrow(db, todoId) {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(idNumber(todoId, 'El TODO'));
  assert(todo, 'TODO no encontrado.', 404);
  return todo;
}

function getExpenseOrThrow(db, expenseId) {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(idNumber(expenseId, 'El gasto'));
  assert(expense, 'Gasto no encontrado.', 404);
  return expense;
}

function getTravelerOrThrow(db, travelerId) {
  const traveler = db.prepare('SELECT * FROM travelers WHERE id = ?').get(idNumber(travelerId, 'La persona'));
  assert(traveler, 'Persona no encontrada.', 404);
  return traveler;
}

function publicTrip(row) {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    currency: row.currency,
    status: row.status,
    description: row.description,
    coverEmoji: row.cover_emoji,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    days: row.days,
    activityCount: row.activity_count,
    todoPending: row.todo_pending,
    totalExpenses: row.total_expenses !== undefined ? centsToMoney(row.total_expenses) : undefined,
    unpaidExpenses: row.unpaid_expenses !== undefined ? centsToMoney(row.unpaid_expenses) : undefined,
  };
}

function publicActivity(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.activity_date,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    type: row.activity_type,
    location: row.location,
    description: row.description,
    interestUrl: row.interest_url,
    bookingUrl: row.booking_url,
    ticketReference: row.ticket_reference,
    reservationStatus: row.reservation_status,
    notes: row.notes,
    alternative: Boolean(row.is_alternative),
    sortOrder: row.sort_order,
    expenseId: row.expense_id || null,
    price: centsToMoney(row.amount_cents),
    currency: row.expense_currency || row.trip_currency || 'EUR',
    paid: Boolean(row.expense_paid),
    expenseCategory: row.expense_category || 'activities',
    todoId: row.todo_id || null,
  };
}

function publicTodo(row, checklist = []) {
  return {
    id: row.id,
    tripId: row.trip_id,
    activityId: row.activity_id || null,
    activityTitle: row.activity_title || null,
    activityDate: row.activity_date || null,
    title: row.title,
    details: row.details,
    priority: row.priority,
    dueDate: row.due_date,
    completed: Boolean(row.completed),
    checklist,
    expenseId: row.expense_id || null,
    price: centsToMoney(row.amount_cents),
    currency: row.expense_currency || row.trip_currency || 'EUR',
    paid: Boolean(row.expense_paid),
    expenseCategory: row.expense_category || 'other',
  };
}

function publicExpense(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    activityId: row.activity_id || null,
    todoId: row.todo_id || null,
    description: row.description,
    category: row.category,
    amount: centsToMoney(row.amount_cents),
    currency: row.currency,
    paid: Boolean(row.paid),
    payerId: row.payer_id || null,
    payerName: row.payer_name || null,
    paymentDate: row.payment_date,
    dueDate: row.due_date,
    notes: row.notes,
    sourceType: row.activity_id ? 'activity' : row.todo_id ? 'todo' : 'manual',
    activityTitle: row.activity_title || null,
    todoTitle: row.todo_title || null,
  };
}

function ensureDateWithinTrip(trip, date) {
  assert(date >= trip.start_date && date <= trip.end_date, 'La fecha debe estar dentro de las fechas del viaje.');
}

function mergeLinkedExpenses(db, { tripId, activityId = null, todoId = null, amountCents, currency, paid, description, category }) {
  const byActivity = activityId
    ? db.prepare('SELECT * FROM expenses WHERE activity_id = ?').get(activityId)
    : null;
  const byTodo = todoId
    ? db.prepare('SELECT * FROM expenses WHERE todo_id = ?').get(todoId)
    : null;

  if (amountCents <= 0) {
    const ids = new Set([byActivity?.id, byTodo?.id].filter(Boolean));
    for (const id of ids) db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return null;
  }

  let target = byActivity || byTodo;
  if (byActivity && byTodo && byActivity.id !== byTodo.id) {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(byTodo.id);
    target = byActivity;
  }

  if (target) {
    db.prepare(`
      UPDATE expenses
      SET activity_id = ?, todo_id = ?, description = ?, category = ?, amount_cents = ?,
          currency = ?, paid = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      activityId || target.activity_id || null,
      todoId || target.todo_id || null,
      description || target.description,
      category || target.category,
      amountCents,
      currency || target.currency,
      paid,
      target.id
    );
    return target.id;
  }

  const result = db.prepare(`
    INSERT INTO expenses (trip_id, activity_id, todo_id, description, category, amount_cents, currency, paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tripId, activityId, todoId, description, category || 'other', amountCents, currency || 'EUR', paid);
  return Number(result.lastInsertRowid);
}

function normalizeChecklist(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: item?.id ? Number(item.id) : null,
      text: optionalText(item?.text ?? item?.itemText ?? item),
      completed: booleanInt(item?.completed),
    }))
    .filter((item) => item.text);
}

export function listTrips(db) {
  const rows = db.prepare(`
    SELECT t.*,
      CAST(julianday(t.end_date) - julianday(t.start_date) + 1 AS INTEGER) AS days,
      COUNT(DISTINCT a.id) AS activity_count,
      COUNT(DISTINCT CASE WHEN td.completed = 0 THEN td.id END) AS todo_pending,
      COALESCE((SELECT SUM(e.amount_cents) FROM expenses e WHERE e.trip_id = t.id), 0) AS total_expenses,
      COALESCE((SELECT SUM(e.amount_cents) FROM expenses e WHERE e.trip_id = t.id AND e.paid = 0), 0) AS unpaid_expenses
    FROM trips t
    LEFT JOIN activities a ON a.trip_id = t.id
    LEFT JOIN todos td ON td.trip_id = t.id
    GROUP BY t.id
    ORDER BY t.start_date DESC, t.id DESC
  `).all();
  return rows.map(publicTrip);
}

export function createTrip(db, body) {
  const name = requiredText(body.name, 'nombre');
  const startDate = validIsoDate(body.startDate, 'Fecha de inicio', true);
  const endDate = validIsoDate(body.endDate, 'Fecha de fin', true);
  assert(startDate <= endDate, 'La fecha final no puede ser anterior a la fecha inicial.');
  const status = VALID_STATUSES.has(body.status) ? body.status : 'planning';
  const result = db.prepare(`
    INSERT INTO trips (name, destination, start_date, end_date, currency, status, description, cover_emoji)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    optionalText(body.destination),
    startDate,
    endDate,
    optionalText(body.currency || 'EUR').toUpperCase().slice(0, 3),
    status,
    optionalText(body.description),
    optionalText(body.coverEmoji || '✈️') || '✈️'
  );
  const tripId = Number(result.lastInsertRowid);
  const defaultTravelers = Array.isArray(body.travelers) && body.travelers.length ? body.travelers : ['Viajero 1'];
  const insertTraveler = db.prepare('INSERT INTO travelers (trip_id, name, is_default) VALUES (?, ?, ?)');
  defaultTravelers.forEach((traveler, index) => {
    const nameValue = optionalText(traveler?.name ?? traveler);
    if (nameValue) insertTraveler.run(tripId, nameValue, index === 0 ? 1 : 0);
  });
  return getTripBundle(db, tripId);
}

export function updateTrip(db, tripId, body) {
  const current = getTripOrThrow(db, tripId);
  const name = requiredText(body.name ?? current.name, 'nombre');
  const startDate = validIsoDate(body.startDate ?? current.start_date, 'Fecha de inicio', true);
  const endDate = validIsoDate(body.endDate ?? current.end_date, 'Fecha de fin', true);
  assert(startDate <= endDate, 'La fecha final no puede ser anterior a la fecha inicial.');
  const status = VALID_STATUSES.has(body.status) ? body.status : current.status;

  const outside = db.prepare(`
    SELECT COUNT(*) AS total FROM activities
    WHERE trip_id = ? AND (activity_date < ? OR activity_date > ?)
  `).get(current.id, startDate, endDate).total;
  assert(Number(outside) === 0, 'Hay actividades fuera de las nuevas fechas. Muévelas o elimínalas antes de acortar el viaje.');

  db.prepare(`
    UPDATE trips
    SET name = ?, destination = ?, start_date = ?, end_date = ?, currency = ?, status = ?,
        description = ?, cover_emoji = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name,
    optionalText(body.destination ?? current.destination),
    startDate,
    endDate,
    optionalText(body.currency ?? current.currency).toUpperCase().slice(0, 3),
    status,
    optionalText(body.description ?? current.description),
    optionalText(body.coverEmoji ?? current.cover_emoji) || '✈️',
    current.id
  );
  return getTripBundle(db, current.id);
}

export function deleteTrip(db, tripId) {
  const trip = getTripOrThrow(db, tripId);
  db.prepare('DELETE FROM trips WHERE id = ?').run(trip.id);
  return { deleted: true };
}

export function getTripBundle(db, tripId) {
  const tripRow = getTripOrThrow(db, tripId);
  const trip = publicTrip(tripRow);

  const travelers = db.prepare('SELECT * FROM travelers WHERE trip_id = ? ORDER BY is_default DESC, id').all(tripRow.id)
    .map((row) => ({ id: row.id, tripId: row.trip_id, name: row.name, isDefault: Boolean(row.is_default) }));

  const activityRows = db.prepare(`
    SELECT a.*, e.id AS expense_id, e.amount_cents, e.currency AS expense_currency, e.paid AS expense_paid,
           e.category AS expense_category, e.todo_id, t.currency AS trip_currency
    FROM activities a
    JOIN trips t ON t.id = a.trip_id
    LEFT JOIN expenses e ON e.activity_id = a.id
    WHERE a.trip_id = ?
    ORDER BY a.activity_date, a.is_alternative, a.sort_order, COALESCE(a.start_time, '99:99'), a.id
  `).all(tripRow.id);
  const activities = activityRows.map(publicActivity);

  const checklistRows = db.prepare(`
    SELECT ti.* FROM todo_items ti
    JOIN todos td ON td.id = ti.todo_id
    WHERE td.trip_id = ? ORDER BY ti.todo_id, ti.sort_order, ti.id
  `).all(tripRow.id);
  const checklistMap = new Map();
  for (const row of checklistRows) {
    const list = checklistMap.get(row.todo_id) || [];
    list.push({ id: row.id, text: row.item_text, completed: Boolean(row.completed), sortOrder: row.sort_order });
    checklistMap.set(row.todo_id, list);
  }

  const todoRows = db.prepare(`
    SELECT td.*, a.title AS activity_title, a.activity_date,
           e.id AS expense_id, e.amount_cents, e.currency AS expense_currency, e.paid AS expense_paid,
           e.category AS expense_category, t.currency AS trip_currency
    FROM todos td
    JOIN trips t ON t.id = td.trip_id
    LEFT JOIN activities a ON a.id = td.activity_id
    LEFT JOIN expenses e ON e.todo_id = td.id
    WHERE td.trip_id = ?
    ORDER BY td.completed, CASE td.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
             COALESCE(td.due_date, '9999-12-31'), td.id DESC
  `).all(tripRow.id);
  const todos = todoRows.map((row) => publicTodo(row, checklistMap.get(row.id) || []));

  const expenseRows = db.prepare(`
    SELECT e.*, tr.name AS payer_name, a.title AS activity_title, td.title AS todo_title
    FROM expenses e
    LEFT JOIN travelers tr ON tr.id = e.payer_id
    LEFT JOIN activities a ON a.id = e.activity_id
    LEFT JOIN todos td ON td.id = e.todo_id
    WHERE e.trip_id = ?
    ORDER BY e.paid, COALESCE(e.due_date, e.payment_date, '9999-12-31'), e.id DESC
  `).all(tripRow.id);
  const expenses = expenseRows.map(publicExpense);

  const packing = db.prepare(`
    SELECT p.*, tr.name AS traveler_name
    FROM packing_items p
    LEFT JOIN travelers tr ON tr.id = p.traveler_id
    WHERE p.trip_id = ?
    ORDER BY COALESCE(tr.name, 'ZZZ'), p.luggage_type, p.category, p.sort_order, p.id
  `).all(tripRow.id).map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    travelerId: row.traveler_id || null,
    travelerName: row.traveler_name || null,
    name: row.item_name,
    category: row.category,
    luggageType: row.luggage_type,
    quantity: row.quantity,
    packed: Boolean(row.packed),
    notes: row.notes,
    sortOrder: row.sort_order,
  }));

  const resources = db.prepare("SELECT * FROM resources WHERE trip_id = ? ORDER BY COALESCE(resource_date, '9999-12-31'), resource_type, id DESC")
    .all(tripRow.id).map((row) => ({
      id: row.id,
      tripId: row.trip_id,
      type: row.resource_type,
      title: row.title,
      details: row.details,
      url: row.url,
      date: row.resource_date,
    }));

  const totalCents = expenseRows.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const paidCents = expenseRows.filter((row) => row.paid).reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const packingTotal = packing.length;
  const packedTotal = packing.filter((item) => item.packed).length;

  return {
    trip,
    travelers,
    activities,
    todos,
    expenses,
    packing,
    resources,
    summary: {
      days: Math.floor((new Date(`${trip.endDate}T00:00:00Z`) - new Date(`${trip.startDate}T00:00:00Z`)) / 86400000) + 1,
      activities: activities.filter((a) => !a.alternative).length,
      alternatives: activities.filter((a) => a.alternative).length,
      todoPending: todos.filter((todo) => !todo.completed).length,
      totalExpenses: centsToMoney(totalCents),
      paidExpenses: centsToMoney(paidCents),
      unpaidExpenses: centsToMoney(totalCents - paidCents),
      packingTotal,
      packedTotal,
      packingPercent: packingTotal ? Math.round((packedTotal / packingTotal) * 100) : 0,
    },
  };
}

export function createActivity(db, tripId, body) {
  const trip = getTripOrThrow(db, tripId);
  const date = validIsoDate(body.date, 'Fecha', true);
  ensureDateWithinTrip(trip, date);
  const title = requiredText(body.title, 'nombre');
  const reservationStatus = VALID_RESERVATION_STATUSES.has(body.reservationStatus) ? body.reservationStatus : 'idea';
  const result = withTransaction(db, () => {
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM activities WHERE trip_id = ? AND activity_date = ? AND is_alternative = ?')
      .get(trip.id, date, booleanInt(body.alternative)).max_sort;
    const insert = db.prepare(`
      INSERT INTO activities (
        trip_id, activity_date, title, start_time, end_time, activity_type, location, description,
        interest_url, booking_url, ticket_reference, reservation_status, notes, is_alternative, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trip.id, date, title, validTime(body.startTime), validTime(body.endTime),
      optionalText(body.type || 'activity') || 'activity', optionalText(body.location), optionalText(body.description),
      optionalText(body.interestUrl), optionalText(body.bookingUrl), optionalText(body.ticketReference),
      reservationStatus, optionalText(body.notes), booleanInt(body.alternative), Number(maxSort) + 1
    );
    const activityId = Number(insert.lastInsertRowid);
    mergeLinkedExpenses(db, {
      tripId: trip.id,
      activityId,
      amountCents: moneyToCents(body.price),
      currency: optionalText(body.currency || trip.currency).toUpperCase().slice(0, 3),
      paid: booleanInt(body.paid),
      description: title,
      category: optionalText(body.expenseCategory || 'activities') || 'activities',
    });
    return activityId;
  });
  return getTripBundle(db, trip.id).activities.find((item) => item.id === result);
}

export function updateActivity(db, activityId, body) {
  const current = getActivityOrThrow(db, activityId);
  const trip = getTripOrThrow(db, current.trip_id);
  const date = validIsoDate(body.date ?? current.activity_date, 'Fecha', true);
  ensureDateWithinTrip(trip, date);
  const title = requiredText(body.title ?? current.title, 'nombre');
  const reservationStatus = VALID_RESERVATION_STATUSES.has(body.reservationStatus)
    ? body.reservationStatus
    : current.reservation_status;

  withTransaction(db, () => {
    db.prepare(`
      UPDATE activities SET
        activity_date = ?, title = ?, start_time = ?, end_time = ?, activity_type = ?, location = ?,
        description = ?, interest_url = ?, booking_url = ?, ticket_reference = ?, reservation_status = ?,
        notes = ?, is_alternative = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      date, title, validTime(body.startTime), validTime(body.endTime), optionalText(body.type ?? current.activity_type) || 'activity',
      optionalText(body.location ?? current.location), optionalText(body.description ?? current.description),
      optionalText(body.interestUrl ?? current.interest_url), optionalText(body.bookingUrl ?? current.booking_url),
      optionalText(body.ticketReference ?? current.ticket_reference), reservationStatus,
      optionalText(body.notes ?? current.notes), booleanInt(body.alternative), current.id
    );
    const existingExpense = db.prepare('SELECT * FROM expenses WHERE activity_id = ?').get(current.id);
    mergeLinkedExpenses(db, {
      tripId: trip.id,
      activityId: current.id,
      todoId: existingExpense?.todo_id || null,
      amountCents: body.price === undefined ? Number(existingExpense?.amount_cents || 0) : moneyToCents(body.price),
      currency: optionalText(body.currency || existingExpense?.currency || trip.currency).toUpperCase().slice(0, 3),
      paid: body.paid === undefined ? Number(existingExpense?.paid || 0) : booleanInt(body.paid),
      description: title,
      category: optionalText(body.expenseCategory || existingExpense?.category || 'activities') || 'activities',
    });
  });
  return getTripBundle(db, trip.id).activities.find((item) => item.id === current.id);
}

export function moveActivity(db, activityId, body) {
  const current = getActivityOrThrow(db, activityId);
  const trip = getTripOrThrow(db, current.trip_id);
  const date = validIsoDate(body.date, 'Fecha', true);
  ensureDateWithinTrip(trip, date);
  const alternative = booleanInt(body.alternative);
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.max(0, Math.floor(Number(body.sortOrder))) : 0;
  withTransaction(db, () => {
    db.prepare(`
      UPDATE activities SET sort_order = sort_order + 1
      WHERE trip_id = ? AND activity_date = ? AND is_alternative = ? AND sort_order >= ? AND id <> ?
    `).run(trip.id, date, alternative, sortOrder, current.id);
    db.prepare('UPDATE activities SET activity_date = ?, is_alternative = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(date, alternative, sortOrder, current.id);
  });
  return getTripBundle(db, trip.id).activities.find((item) => item.id === current.id);
}

export function deleteActivity(db, activityId) {
  const activity = getActivityOrThrow(db, activityId);
  withTransaction(db, () => {
    const expense = db.prepare('SELECT * FROM expenses WHERE activity_id = ?').get(activity.id);
    if (expense) {
      if (expense.todo_id) db.prepare('UPDATE expenses SET activity_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(expense.id);
      else db.prepare('DELETE FROM expenses WHERE id = ?').run(expense.id);
    }
    db.prepare('DELETE FROM activities WHERE id = ?').run(activity.id);
  });
  return { deleted: true };
}

export function createTodo(db, tripId, body) {
  const trip = getTripOrThrow(db, tripId);
  const title = requiredText(body.title, 'nombre');
  const priority = VALID_PRIORITIES.has(body.priority) ? body.priority : 'normal';
  const activityId = body.activityId ? idNumber(body.activityId, 'La actividad') : null;
  if (activityId) {
    const activity = getActivityOrThrow(db, activityId);
    assert(activity.trip_id === trip.id, 'La actividad pertenece a otro viaje.');
  }
  const checklist = normalizeChecklist(body.checklist);

  const todoId = withTransaction(db, () => {
    const result = db.prepare(`
      INSERT INTO todos (trip_id, activity_id, title, details, priority, due_date, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      trip.id, activityId, title, optionalText(body.details), priority,
      validIsoDate(body.dueDate, 'Fecha límite'), booleanInt(body.completed)
    );
    const id = Number(result.lastInsertRowid);
    const insertItem = db.prepare('INSERT INTO todo_items (todo_id, item_text, completed, sort_order) VALUES (?, ?, ?, ?)');
    checklist.forEach((item, index) => insertItem.run(id, item.text, item.completed, index));

    mergeLinkedExpenses(db, {
      tripId: trip.id,
      activityId,
      todoId: id,
      amountCents: moneyToCents(body.price),
      currency: optionalText(body.currency || trip.currency).toUpperCase().slice(0, 3),
      paid: booleanInt(body.paid),
      description: title,
      category: optionalText(body.expenseCategory || 'other') || 'other',
    });
    return id;
  });
  return getTripBundle(db, trip.id).todos.find((item) => item.id === todoId);
}

export function updateTodo(db, todoId, body) {
  const current = getTodoOrThrow(db, todoId);
  const trip = getTripOrThrow(db, current.trip_id);
  const title = requiredText(body.title ?? current.title, 'nombre');
  const priority = VALID_PRIORITIES.has(body.priority) ? body.priority : current.priority;
  const activityId = body.activityId === '' || body.activityId === null
    ? null
    : body.activityId === undefined
      ? current.activity_id
      : idNumber(body.activityId, 'La actividad');
  if (activityId) {
    const activity = getActivityOrThrow(db, activityId);
    assert(activity.trip_id === trip.id, 'La actividad pertenece a otro viaje.');
  }
  const checklist = body.checklist === undefined ? null : normalizeChecklist(body.checklist);

  withTransaction(db, () => {
    const currentExpense = db.prepare('SELECT * FROM expenses WHERE todo_id = ?').get(current.id);
    if (currentExpense && currentExpense.activity_id && currentExpense.activity_id !== activityId) {
      db.prepare('UPDATE expenses SET todo_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(currentExpense.id);
    }

    db.prepare(`
      UPDATE todos SET activity_id = ?, title = ?, details = ?, priority = ?, due_date = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      activityId, title, optionalText(body.details ?? current.details), priority,
      body.dueDate === undefined ? current.due_date : validIsoDate(body.dueDate, 'Fecha límite'),
      body.completed === undefined ? current.completed : booleanInt(body.completed), current.id
    );

    if (checklist) {
      db.prepare('DELETE FROM todo_items WHERE todo_id = ?').run(current.id);
      const insertItem = db.prepare('INSERT INTO todo_items (todo_id, item_text, completed, sort_order) VALUES (?, ?, ?, ?)');
      checklist.forEach((item, index) => insertItem.run(current.id, item.text, item.completed, index));
    }

    const expenseAfterUnlink = db.prepare('SELECT * FROM expenses WHERE todo_id = ?').get(current.id);
    mergeLinkedExpenses(db, {
      tripId: trip.id,
      activityId,
      todoId: current.id,
      amountCents: body.price === undefined ? Number(expenseAfterUnlink?.amount_cents || 0) : moneyToCents(body.price),
      currency: optionalText(body.currency || expenseAfterUnlink?.currency || trip.currency).toUpperCase().slice(0, 3),
      paid: body.paid === undefined ? Number(expenseAfterUnlink?.paid || 0) : booleanInt(body.paid),
      description: title,
      category: optionalText(body.expenseCategory || expenseAfterUnlink?.category || 'other') || 'other',
    });
  });
  return getTripBundle(db, trip.id).todos.find((item) => item.id === current.id);
}

export function toggleTodoItem(db, itemId, body) {
  const item = db.prepare(`
    SELECT ti.*, td.trip_id FROM todo_items ti JOIN todos td ON td.id = ti.todo_id WHERE ti.id = ?
  `).get(idNumber(itemId, 'El elemento'));
  assert(item, 'Elemento del TODO no encontrado.', 404);
  db.prepare('UPDATE todo_items SET completed = ? WHERE id = ?').run(booleanInt(body.completed), item.id);
  return { id: item.id, completed: Boolean(booleanInt(body.completed)) };
}

export function deleteTodo(db, todoId) {
  const todo = getTodoOrThrow(db, todoId);
  withTransaction(db, () => {
    const expense = db.prepare('SELECT * FROM expenses WHERE todo_id = ?').get(todo.id);
    if (expense) {
      if (expense.activity_id) db.prepare('UPDATE expenses SET todo_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(expense.id);
      else db.prepare('DELETE FROM expenses WHERE id = ?').run(expense.id);
    }
    db.prepare('DELETE FROM todos WHERE id = ?').run(todo.id);
  });
  return { deleted: true };
}

export function createExpense(db, tripId, body) {
  const trip = getTripOrThrow(db, tripId);
  const amountCents = moneyToCents(body.amount);
  assert(amountCents > 0, 'El gasto debe ser mayor que cero.');
  const payerId = body.payerId ? idNumber(body.payerId, 'La persona') : null;
  if (payerId) {
    const traveler = getTravelerOrThrow(db, payerId);
    assert(traveler.trip_id === trip.id, 'La persona pertenece a otro viaje.');
  }
  const result = db.prepare(`
    INSERT INTO expenses (trip_id, description, category, amount_cents, currency, paid, payer_id, payment_date, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, requiredText(body.description, 'descripción'), optionalText(body.category || 'other') || 'other',
    amountCents, optionalText(body.currency || trip.currency).toUpperCase().slice(0, 3), booleanInt(body.paid), payerId,
    validIsoDate(body.paymentDate, 'Fecha de pago'), validIsoDate(body.dueDate, 'Fecha prevista'), optionalText(body.notes)
  );
  return getTripBundle(db, trip.id).expenses.find((item) => item.id === Number(result.lastInsertRowid));
}

export function updateExpense(db, expenseId, body) {
  const current = getExpenseOrThrow(db, expenseId);
  const trip = getTripOrThrow(db, current.trip_id);
  const amountCents = body.amount === undefined ? current.amount_cents : moneyToCents(body.amount);
  assert(amountCents > 0, 'El gasto debe ser mayor que cero.');
  const payerId = body.payerId === '' || body.payerId === null
    ? null
    : body.payerId === undefined
      ? current.payer_id
      : idNumber(body.payerId, 'La persona');
  if (payerId) {
    const traveler = getTravelerOrThrow(db, payerId);
    assert(traveler.trip_id === trip.id, 'La persona pertenece a otro viaje.');
  }
  db.prepare(`
    UPDATE expenses SET description = ?, category = ?, amount_cents = ?, currency = ?, paid = ?, payer_id = ?,
      payment_date = ?, due_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    requiredText(body.description ?? current.description, 'descripción'),
    optionalText(body.category ?? current.category) || 'other', amountCents,
    optionalText(body.currency ?? current.currency).toUpperCase().slice(0, 3),
    body.paid === undefined ? current.paid : booleanInt(body.paid), payerId,
    body.paymentDate === undefined ? current.payment_date : validIsoDate(body.paymentDate, 'Fecha de pago'),
    body.dueDate === undefined ? current.due_date : validIsoDate(body.dueDate, 'Fecha prevista'),
    optionalText(body.notes ?? current.notes), current.id
  );
  return getTripBundle(db, trip.id).expenses.find((item) => item.id === current.id);
}

export function deleteExpense(db, expenseId) {
  const expense = getExpenseOrThrow(db, expenseId);
  db.prepare('DELETE FROM expenses WHERE id = ?').run(expense.id);
  return { deleted: true };
}

export function createTraveler(db, tripId, body) {
  const trip = getTripOrThrow(db, tripId);
  const result = db.prepare('INSERT INTO travelers (trip_id, name, is_default) VALUES (?, ?, ?)')
    .run(trip.id, requiredText(body.name, 'nombre'), booleanInt(body.isDefault));
  return { id: Number(result.lastInsertRowid), tripId: trip.id, name: requiredText(body.name, 'nombre'), isDefault: Boolean(booleanInt(body.isDefault)) };
}

export function updateTraveler(db, travelerId, body) {
  const traveler = getTravelerOrThrow(db, travelerId);
  db.prepare('UPDATE travelers SET name = ?, is_default = ? WHERE id = ?')
    .run(requiredText(body.name ?? traveler.name, 'nombre'), body.isDefault === undefined ? traveler.is_default : booleanInt(body.isDefault), traveler.id);
  return { id: traveler.id, tripId: traveler.trip_id, name: requiredText(body.name ?? traveler.name, 'nombre'), isDefault: Boolean(body.isDefault === undefined ? traveler.is_default : booleanInt(body.isDefault)) };
}

export function deleteTraveler(db, travelerId) {
  const traveler = getTravelerOrThrow(db, travelerId);
  db.prepare('DELETE FROM travelers WHERE id = ?').run(traveler.id);
  return { deleted: true };
}

export function createPackingItem(db, tripId, body) {
  const trip = getTripOrThrow(db, tripId);
  const travelerId = body.travelerId ? idNumber(body.travelerId, 'La persona') : null;
  if (travelerId) {
    const traveler = getTravelerOrThrow(db, travelerId);
    assert(traveler.trip_id === trip.id, 'La persona pertenece a otro viaje.');
  }
  const luggageType = VALID_LUGGAGE.has(body.luggageType) ? body.luggageType : travelerId ? 'carry_on' : 'shared';
  if (luggageType !== 'shared') assert(travelerId, 'Selecciona una persona para este tipo de equipaje.');
  const quantity = Math.max(1, Math.floor(Number(body.quantity || 1)));
  const result = db.prepare(`
    INSERT INTO packing_items (trip_id, traveler_id, item_name, category, luggage_type, quantity, packed, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, travelerId, requiredText(body.name, 'objeto'), optionalText(body.category || 'Otros') || 'Otros',
    luggageType, quantity, booleanInt(body.packed), optionalText(body.notes), Number(body.sortOrder || 0)
  );
  return getTripBundle(db, trip.id).packing.find((item) => item.id === Number(result.lastInsertRowid));
}

export function updatePackingItem(db, itemId, body) {
  const current = db.prepare('SELECT * FROM packing_items WHERE id = ?').get(idNumber(itemId, 'El objeto'));
  assert(current, 'Objeto de equipaje no encontrado.', 404);
  const travelerId = body.travelerId === '' || body.travelerId === null
    ? null
    : body.travelerId === undefined
      ? current.traveler_id
      : idNumber(body.travelerId, 'La persona');
  if (travelerId) {
    const traveler = getTravelerOrThrow(db, travelerId);
    assert(traveler.trip_id === current.trip_id, 'La persona pertenece a otro viaje.');
  }
  const luggageType = VALID_LUGGAGE.has(body.luggageType) ? body.luggageType : current.luggage_type;
  if (luggageType !== 'shared') assert(travelerId, 'Selecciona una persona para este tipo de equipaje.');
  db.prepare(`
    UPDATE packing_items SET traveler_id = ?, item_name = ?, category = ?, luggage_type = ?, quantity = ?,
      packed = ?, notes = ?, sort_order = ? WHERE id = ?
  `).run(
    travelerId, requiredText(body.name ?? current.item_name, 'objeto'), optionalText(body.category ?? current.category) || 'Otros',
    luggageType, Math.max(1, Math.floor(Number(body.quantity ?? current.quantity))),
    body.packed === undefined ? current.packed : booleanInt(body.packed), optionalText(body.notes ?? current.notes),
    Number(body.sortOrder ?? current.sort_order), current.id
  );
  return getTripBundle(db, current.trip_id).packing.find((item) => item.id === current.id);
}

export function deletePackingItem(db, itemId) {
  const item = db.prepare('SELECT * FROM packing_items WHERE id = ?').get(idNumber(itemId, 'El objeto'));
  assert(item, 'Objeto de equipaje no encontrado.', 404);
  db.prepare('DELETE FROM packing_items WHERE id = ?').run(item.id);
  return { deleted: true };
}

export function createResource(db, tripId, body) {
  const trip = getTripOrThrow(db, tripId);
  const type = VALID_RESOURCE_TYPES.has(body.type) ? body.type : 'note';
  const result = db.prepare(`
    INSERT INTO resources (trip_id, resource_type, title, details, url, resource_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, type, requiredText(body.title, 'título'), optionalText(body.details), optionalText(body.url),
    validIsoDate(body.date, 'Fecha')
  );
  return getTripBundle(db, trip.id).resources.find((item) => item.id === Number(result.lastInsertRowid));
}

export function updateResource(db, resourceId, body) {
  const current = db.prepare('SELECT * FROM resources WHERE id = ?').get(idNumber(resourceId, 'El recurso'));
  assert(current, 'Recurso no encontrado.', 404);
  const type = VALID_RESOURCE_TYPES.has(body.type) ? body.type : current.resource_type;
  db.prepare(`
    UPDATE resources SET resource_type = ?, title = ?, details = ?, url = ?, resource_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    type, requiredText(body.title ?? current.title, 'título'), optionalText(body.details ?? current.details),
    optionalText(body.url ?? current.url), body.date === undefined ? current.resource_date : validIsoDate(body.date, 'Fecha'), current.id
  );
  return getTripBundle(db, current.trip_id).resources.find((item) => item.id === current.id);
}

export function deleteResource(db, resourceId) {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(idNumber(resourceId, 'El recurso'));
  assert(resource, 'Recurso no encontrado.', 404);
  db.prepare('DELETE FROM resources WHERE id = ?').run(resource.id);
  return { deleted: true };
}

const VALID_ACTIVITY_TYPES = new Set(['activity', 'visit', 'nature', 'flight', 'train', 'transport', 'hotel', 'food']);
const VALID_EXPENSE_CATEGORIES = new Set(['flights', 'accommodation', 'transport', 'food', 'activities', 'insurance', 'shopping', 'other']);

export function importItinerary(db, tripId, data) {
  const trip = getTripOrThrow(db, tripId);

  assert(data && typeof data === 'object', 'Los datos deben ser un objeto JSON válido.');
  assert(Array.isArray(data.activities), 'Las actividades deben ser un array.');
  assert(data.activities.length > 0, 'Debe haber al menos una actividad.');

  const activities = data.activities || [];
  const expenses = data.expenses || [];
  const todos = data.todos || [];

  validateActivities(activities, trip);
  validateExpenses(expenses);
  validateTodos(todos);

  return withTransaction(db, () => {
    db.prepare('DELETE FROM todos WHERE trip_id = ?').run(trip.id);
    db.prepare('DELETE FROM expenses WHERE trip_id = ?').run(trip.id);
    db.prepare('DELETE FROM activities WHERE trip_id = ?').run(trip.id);

    const createdActivities = [];
    for (const actData of activities) {
      const actId = insertActivity(db, trip, actData);
      createdActivities.push({ id: actId, title: actData.title });
    }

    const createdExpenses = [];
    for (const expData of expenses) {
      const expId = insertExpense(db, trip, expData, createdActivities);
      if (expId) createdExpenses.push(expId);
    }

    const createdTodos = [];
    for (const todoData of todos) {
      const todoId = insertTodo(db, trip, todoData, createdActivities);
      createdTodos.push(todoId);
    }

    return {
      success: true,
      created: {
        activities: createdActivities.length,
        expenses: createdExpenses.length,
        todos: createdTodos.length,
      },
    };
  });
}

function validateActivities(activities, trip) {
  activities.forEach((act, idx) => {
    assert(act && typeof act === 'object', `Actividad ${idx} no es un objeto válido.`);
    const date = validIsoDate(act.date, `Fecha de actividad ${idx}`, true);
    ensureDateWithinTrip(trip, date);
    const title = requiredText(act.title, `Título de actividad ${idx}`);
    if (act.startTime) validTime(act.startTime);
    if (act.endTime) validTime(act.endTime);
    if (act.type) assert(VALID_ACTIVITY_TYPES.has(act.type), `Tipo inválido en actividad ${idx}: ${act.type}`);
    if (act.reservationStatus) assert(VALID_RESERVATION_STATUSES.has(act.reservationStatus), `Estado inválido en actividad ${idx}: ${act.reservationStatus}`);
  });
}

function validateExpenses(expenses) {
  expenses.forEach((exp, idx) => {
    assert(exp && typeof exp === 'object', `Gasto ${idx} no es un objeto válido.`);
    validIsoDate(exp.date, `Fecha de gasto ${idx}`, true);
    const amount = moneyToCents(exp.amount);
    assert(amount > 0, `Gasto ${idx} debe tener monto positivo.`);
    if (exp.category) assert(VALID_EXPENSE_CATEGORIES.has(exp.category), `Categoría inválida en gasto ${idx}: ${exp.category}`);
    const desc = requiredText(exp.description, `Descripción de gasto ${idx}`);
  });
}

function validateTodos(todos) {
  todos.forEach((todo, idx) => {
    assert(todo && typeof todo === 'object', `TODO ${idx} no es un objeto válido.`);
    const title = requiredText(todo.title, `Título de TODO ${idx}`);
    if (todo.priority) assert(VALID_PRIORITIES.has(todo.priority), `Prioridad inválida en TODO ${idx}: ${todo.priority}`);
    if (todo.dueDate) validIsoDate(todo.dueDate, `Vencimiento de TODO ${idx}`);
    if (Array.isArray(todo.subtasks)) {
      todo.subtasks.forEach((sub, sidx) => {
        assert(sub && typeof sub === 'object', `Subtarea ${sidx} de TODO ${idx} no es válida.`);
        requiredText(sub.text, `Texto de subtarea ${sidx} de TODO ${idx}`);
      });
    }
  });
}

function insertActivity(db, trip, actData) {
  const date = validIsoDate(actData.date, 'Fecha', true);
  const title = requiredText(actData.title, 'Título');
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM activities WHERE trip_id = ? AND activity_date = ? AND is_alternative = ?')
    .get(trip.id, date, booleanInt(actData.alternative)).max_sort;

  const reservationStatus = VALID_RESERVATION_STATUSES.has(actData.reservationStatus) ? actData.reservationStatus : 'idea';

  const result = db.prepare(`
    INSERT INTO activities (
      trip_id, activity_date, title, start_time, end_time, activity_type, location, description,
      interest_url, booking_url, ticket_reference, reservation_status, notes, is_alternative, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, date, title, validTime(actData.startTime), validTime(actData.endTime),
    optionalText(actData.type || 'activity') || 'activity', optionalText(actData.location), optionalText(actData.description),
    optionalText(actData.interestUrl), optionalText(actData.bookingUrl), optionalText(actData.ticketReference),
    reservationStatus, optionalText(actData.notes), booleanInt(actData.alternative), Number(maxSort) + 1
  );

  const activityId = Number(result.lastInsertRowid);

  if (actData.price && moneyToCents(actData.price) > 0) {
    mergeLinkedExpenses(db, {
      tripId: trip.id,
      activityId,
      amountCents: moneyToCents(actData.price),
      currency: optionalText(actData.currency || trip.currency).toUpperCase().slice(0, 3),
      paid: booleanInt(actData.paid),
      description: title,
      category: optionalText(actData.expenseCategory || 'activities') || 'activities',
    });
  }

  return activityId;
}

function insertExpense(db, trip, expData, activities) {
  const date = validIsoDate(expData.date, 'Fecha', true);
  const amountCents = moneyToCents(expData.amount);
  const description = requiredText(expData.description, 'Descripción');
  const category = VALID_EXPENSE_CATEGORIES.has(expData.category) ? expData.category : 'other';

  let activityId = null;
  if (expData.linkedActivityTitle) {
    const linked = activities.find((a) => a.title === expData.linkedActivityTitle);
    if (linked) activityId = linked.id;
  }

  const result = db.prepare(`
    INSERT INTO expenses (trip_id, expense_date, amount_cents, category, description, paid, activity_id, currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(trip.id, date, amountCents, category, description, booleanInt(expData.paid), activityId, trip.currency);

  return Number(result.lastInsertRowid);
}

function insertTodo(db, trip, todoData, activities) {
  const title = requiredText(todoData.title, 'Título');
  const priority = VALID_PRIORITIES.has(todoData.priority) ? todoData.priority : 'normal';
  const dueDate = validIsoDate(todoData.dueDate, 'Vencimiento');

  let activityId = null;
  if (todoData.linkedActivityTitle) {
    const linked = activities.find((a) => a.title === todoData.linkedActivityTitle);
    if (linked) activityId = linked.id;
  }

  const result = db.prepare(`
    INSERT INTO todos (trip_id, title, priority, due_date, completed, activity_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(trip.id, title, priority, dueDate, booleanInt(todoData.completed), activityId);

  const todoId = Number(result.lastInsertRowid);

  if (todoData.price && moneyToCents(todoData.price) > 0) {
    mergeLinkedExpenses(db, {
      tripId: trip.id,
      todoId,
      amountCents: moneyToCents(todoData.price),
      currency: trip.currency,
      paid: false,
      description: title,
      category: 'other',
    });
  }

  if (Array.isArray(todoData.subtasks)) {
    for (const sub of todoData.subtasks) {
      db.prepare(`
        INSERT INTO todo_items (todo_id, item_text, completed, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(todoId, requiredText(sub.text, 'Texto de subtarea'), booleanInt(sub.completed));
    }
  }

  return todoId;
}
