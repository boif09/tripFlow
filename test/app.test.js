import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

async function jsonFetch(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

test('flujo completo y sincronización entre itinerario, TODO y gastos', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tripflow-'));
  const dbPath = path.join(tempDir, 'test.db');
  const { server } = createApp({ basePath: '/viajes', databaseOptions: { dbPath, seed: false } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  let result = await jsonFetch(baseUrl, '/viajes/api/health');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.ok, true);

  result = await jsonFetch(baseUrl, '/viajes/api/trips', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Japón 2027', destination: 'Tokio y Kioto', startDate: '2027-04-01', endDate: '2027-04-10',
      currency: 'EUR', travelers: ['Xavi', 'Judit'],
    }),
  });
  assert.equal(result.response.status, 201);
  const tripId = result.body.trip.id;
  assert.equal(result.body.travelers.length, 2);

  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}/activities`, {
    method: 'POST',
    body: JSON.stringify({ date: '2027-04-02', title: 'Templo Kiyomizu-dera', startTime: '09:00', price: 50, currency: 'EUR' }),
  });
  assert.equal(result.response.status, 201);
  const activityId = result.body.id;
  assert.equal(result.body.price, 50);

  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}`);
  assert.equal(result.body.expenses.length, 1);
  assert.equal(result.body.expenses[0].activityId, activityId);

  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}/todos`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Comprar entrada del templo', activityId, priority: 'high', price: 75, paid: false,
      checklist: [{ text: 'Revisar horario', completed: false }, { text: 'Guardar QR', completed: false }],
    }),
  });
  assert.equal(result.response.status, 201);
  const todoId = result.body.id;

  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}`);
  assert.equal(result.body.expenses.length, 1, 'la actividad y el TODO deben compartir un gasto');
  assert.equal(result.body.expenses[0].activityId, activityId);
  assert.equal(result.body.expenses[0].todoId, todoId);
  assert.equal(result.body.activities[0].price, 75);
  assert.equal(result.body.todos[0].price, 75);

  const expense = result.body.expenses[0];
  result = await jsonFetch(baseUrl, `/viajes/api/expenses/${expense.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...expense, amount: 80, paid: true }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.amount, 80);
  assert.equal(result.body.paid, true);

  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}`);
  assert.equal(result.body.activities[0].price, 80);
  assert.equal(result.body.activities[0].paid, true);
  assert.equal(result.body.todos[0].price, 80);
  assert.equal(result.body.todos[0].paid, true);

  result = await jsonFetch(baseUrl, `/viajes/api/todos/${todoId}`, { method: 'DELETE' });
  assert.equal(result.response.status, 204);
  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}`);
  assert.equal(result.body.todos.length, 0);
  assert.equal(result.body.expenses.length, 1);
  assert.equal(result.body.expenses[0].todoId, null);
  assert.equal(result.body.activities[0].price, 80);

  result = await jsonFetch(baseUrl, `/viajes/api/activities/${activityId}/move`, {
    method: 'PATCH', body: JSON.stringify({ date: '2027-04-04', alternative: true, sortOrder: 0 }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.date, '2027-04-04');
  assert.equal(result.body.alternative, true);

  const travelerId = (await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}`)).body.travelers[0].id;
  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}/packing`, {
    method: 'POST', body: JSON.stringify({ travelerId, name: 'Pasaporte', category: 'Documentación', luggageType: 'personal' }),
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.name, 'Pasaporte');

  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}/resources`, {
    method: 'POST', body: JSON.stringify({ type: 'transport', title: 'Aeropuerto a Tokio', details: 'Usar el Skyliner.' }),
  });
  assert.equal(result.response.status, 201);

  result = await jsonFetch(baseUrl, `/viajes/api/expenses/${expense.id}`, { method: 'DELETE' });
  assert.equal(result.response.status, 204);
  result = await jsonFetch(baseUrl, `/viajes/api/trips/${tripId}`);
  assert.equal(result.body.expenses.length, 0);
  assert.equal(result.body.activities[0].price, 0);
  assert.equal(result.body.packing.length, 1);
  assert.equal(result.body.resources.length, 1);
});
