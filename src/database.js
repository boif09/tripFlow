import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

export function openDatabase(options = {}) {
  const dbPath = options.dbPath || process.env.DB_PATH || path.join(projectRoot, 'data', 'travel_manager.db');
  const seed = options.seed ?? process.env.SEED_CHINA !== 'false';

  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA busy_timeout = 5000;');
  initializeSchema(db);

  const trips = db.prepare('SELECT COUNT(*) AS total FROM trips').get().total;
  if (seed && Number(trips) === 0) {
    const seedPath = options.seedPath || path.join(projectRoot, 'data', 'china-seed.json');
    if (fs.existsSync(seedPath)) {
      seedDatabase(db, JSON.parse(fs.readFileSync(seedPath, 'utf8')));
    }
  }

  return db;
}

export function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      destination TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('idea','planning','booked','travelling','completed')),
      description TEXT NOT NULL DEFAULT '',
      cover_emoji TEXT NOT NULL DEFAULT '✈️',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS travelers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0,1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      activity_date TEXT NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      activity_type TEXT NOT NULL DEFAULT 'activity',
      location TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      interest_url TEXT NOT NULL DEFAULT '',
      booking_url TEXT NOT NULL DEFAULT '',
      ticket_reference TEXT NOT NULL DEFAULT '',
      reservation_status TEXT NOT NULL DEFAULT 'idea' CHECK(reservation_status IN ('idea','pending','reserved','paid','not_needed')),
      notes TEXT NOT NULL DEFAULT '',
      is_alternative INTEGER NOT NULL DEFAULT 0 CHECK(is_alternative IN (0,1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
      due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS todo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      item_text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
      todo_id INTEGER REFERENCES todos(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      amount_cents INTEGER NOT NULL DEFAULT 0 CHECK(amount_cents >= 0),
      currency TEXT NOT NULL DEFAULT 'EUR',
      paid INTEGER NOT NULL DEFAULT 0 CHECK(paid IN (0,1)),
      payer_id INTEGER REFERENCES travelers(id) ON DELETE SET NULL,
      payment_date TEXT,
      due_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_activity_unique
      ON expenses(activity_id) WHERE activity_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_todo_unique
      ON expenses(todo_id) WHERE todo_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS packing_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      traveler_id INTEGER REFERENCES travelers(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Otros',
      luggage_type TEXT NOT NULL DEFAULT 'carry_on' CHECK(luggage_type IN ('checked','carry_on','personal','shared')),
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1),
      packed INTEGER NOT NULL DEFAULT 0 CHECK(packed IN (0,1)),
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL DEFAULT 'note' CHECK(resource_type IN ('note','link','transport','app','document','emergency','booking')),
      title TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      resource_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_activities_trip_date ON activities(trip_id, activity_date, is_alternative, sort_order);
    CREATE INDEX IF NOT EXISTS idx_todos_trip_completed ON todos(trip_id, completed, due_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_trip_paid ON expenses(trip_id, paid, category);
    CREATE INDEX IF NOT EXISTS idx_packing_trip_traveler ON packing_items(trip_id, traveler_id, luggage_type, category);
    CREATE INDEX IF NOT EXISTS idx_resources_trip_type ON resources(trip_id, resource_type);
  `);
}

export function withTransaction(db, callback) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = callback();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

export function seedDatabase(db, seed) {
  withTransaction(db, () => {
    const trip = seed.trip;
    const tripResult = db.prepare(`
      INSERT INTO trips (name, destination, start_date, end_date, currency, status, description, cover_emoji)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trip.name,
      trip.destination || '',
      trip.startDate,
      trip.endDate,
      trip.currency || 'EUR',
      trip.status || 'planning',
      trip.description || '',
      trip.coverEmoji || '✈️'
    );
    const tripId = Number(tripResult.lastInsertRowid);

    const travelerIds = new Map();
    const insertTraveler = db.prepare('INSERT INTO travelers (trip_id, name, is_default) VALUES (?, ?, ?)');
    for (const traveler of seed.travelers || []) {
      const result = insertTraveler.run(tripId, traveler.name, traveler.isDefault ? 1 : 0);
      travelerIds.set(traveler.name, Number(result.lastInsertRowid));
    }

    const activityIds = new Map();
    const insertActivity = db.prepare(`
      INSERT INTO activities (
        trip_id, activity_date, title, start_time, end_time, activity_type, location,
        description, interest_url, booking_url, ticket_reference, reservation_status,
        notes, is_alternative, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const activity of seed.activities || []) {
      const result = insertActivity.run(
        tripId,
        activity.date,
        activity.title,
        activity.startTime || null,
        activity.endTime || null,
        activity.type || 'activity',
        activity.location || '',
        activity.description || '',
        activity.interestUrl || '',
        activity.bookingUrl || '',
        activity.ticketReference || '',
        activity.reservationStatus || 'idea',
        activity.notes || '',
        activity.alternative ? 1 : 0,
        activity.sortOrder || 0
      );
      const id = Number(result.lastInsertRowid);
      if (activity.key) activityIds.set(activity.key, id);
      if (activity.price && Number(activity.price) > 0) {
        db.prepare(`
          INSERT INTO expenses (trip_id, activity_id, description, category, amount_cents, currency, paid)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          tripId,
          id,
          activity.title,
          activity.expenseCategory || 'activities',
          Math.round(Number(activity.price) * 100),
          activity.currency || trip.currency || 'EUR',
          activity.paid ? 1 : 0
        );
      }
    }

    const insertExpense = db.prepare(`
      INSERT INTO expenses (
        trip_id, description, category, amount_cents, currency, paid, payer_id,
        payment_date, due_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const expense of seed.expenses || []) {
      insertExpense.run(
        tripId,
        expense.description,
        expense.category || 'other',
        Math.round(Number(expense.amount || 0) * 100),
        expense.currency || trip.currency || 'EUR',
        expense.paid ? 1 : 0,
        expense.payer ? travelerIds.get(expense.payer) || null : null,
        expense.paymentDate || null,
        expense.dueDate || null,
        expense.notes || ''
      );
    }

    const insertTodo = db.prepare(`
      INSERT INTO todos (trip_id, activity_id, title, details, priority, due_date, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTodoItem = db.prepare('INSERT INTO todo_items (todo_id, item_text, completed, sort_order) VALUES (?, ?, ?, ?)');
    for (const todo of seed.todos || []) {
      const activityId = todo.activityKey ? activityIds.get(todo.activityKey) || null : null;
      const result = insertTodo.run(
        tripId,
        activityId,
        todo.title,
        todo.details || '',
        todo.priority || 'normal',
        todo.dueDate || null,
        todo.completed ? 1 : 0
      );
      const todoId = Number(result.lastInsertRowid);
      (todo.items || []).forEach((item, index) => {
        insertTodoItem.run(todoId, item.text || item, item.completed ? 1 : 0, index);
      });
      if (todo.price && Number(todo.price) > 0) {
        const existing = activityId
          ? db.prepare('SELECT id FROM expenses WHERE activity_id = ?').get(activityId)
          : null;
        if (existing) {
          db.prepare('UPDATE expenses SET todo_id = ?, amount_cents = ?, paid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(todoId, Math.round(Number(todo.price) * 100), todo.paid ? 1 : 0, existing.id);
        } else {
          db.prepare(`
            INSERT INTO expenses (trip_id, activity_id, todo_id, description, category, amount_cents, currency, paid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            tripId,
            activityId,
            todoId,
            todo.title,
            todo.expenseCategory || 'other',
            Math.round(Number(todo.price) * 100),
            todo.currency || trip.currency || 'EUR',
            todo.paid ? 1 : 0
          );
        }
      }
    }

    const insertPacking = db.prepare(`
      INSERT INTO packing_items (trip_id, traveler_id, item_name, category, luggage_type, quantity, packed, notes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of seed.packing || []) {
      insertPacking.run(
        tripId,
        item.traveler ? travelerIds.get(item.traveler) || null : null,
        item.name,
        item.category || 'Otros',
        item.luggageType || (item.traveler ? 'carry_on' : 'shared'),
        item.quantity || 1,
        item.packed ? 1 : 0,
        item.notes || '',
        item.sortOrder || 0
      );
    }

    const insertResource = db.prepare(`
      INSERT INTO resources (trip_id, resource_type, title, details, url, resource_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const resource of seed.resources || []) {
      insertResource.run(
        tripId,
        resource.type || 'note',
        resource.title,
        resource.details || '',
        resource.url || '',
        resource.date || null
      );
    }
  });
}
