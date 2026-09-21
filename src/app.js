import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './database.js';
import {
  listTrips,
  createTrip,
  getTripBundle,
  updateTrip,
  deleteTrip,
  createActivity,
  updateActivity,
  moveActivity,
  deleteActivity,
  importItinerary,
  createTodo,
  updateTodo,
  toggleTodoItem,
  deleteTodo,
  createExpense,
  updateExpense,
  deleteExpense,
  createTraveler,
  updateTraveler,
  deleteTraveler,
  createPackingItem,
  updatePackingItem,
  deletePackingItem,
  createResource,
  updateResource,
  deleteResource,
} from './repository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function normalizeBasePath(value) {
  const cleaned = `/${String(value || '/viajes').trim()}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return cleaned === '' ? '/' : cleaned;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendNoContent(res) {
  res.writeHead(204);
  res.end();
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      const error = new Error('La petición es demasiado grande.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('El cuerpo de la petición no contiene JSON válido.');
    error.status = 400;
    throw error;
  }
}

function serveStatic(res, relativePath, basePath) {
  const requested = relativePath === '' || relativePath === '/' ? 'index.html' : relativePath.replace(/^\/+/, '');
  const filePath = path.resolve(publicDir, requested);
  if (!filePath.startsWith(publicDir)) return false;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;

  const extension = path.extname(filePath).toLowerCase();
  let content = fs.readFileSync(filePath);
  if (requested === 'index.html') {
    content = Buffer.from(content.toString('utf8').replaceAll('__BASE_PATH__', basePath));
  }
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'Content-Length': content.length,
    'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=3600',
  });
  res.end(content);
  return true;
}

function matchRoute(pathname, method, basePath) {
  const apiRoot = basePath === '/' ? '/api' : `${basePath}/api`;
  if (!pathname.startsWith(apiRoot)) return null;
  const route = pathname.slice(apiRoot.length) || '/';

  const definitions = [
    ['GET', /^\/health$/, 'health'],
    ['GET', /^\/template-itinerary\.json$/, 'downloadTemplate'],
    ['GET', /^\/trips$/, 'listTrips'],
    ['POST', /^\/trips$/, 'createTrip'],
    ['GET', /^\/trips\/(\d+)$/, 'getTrip'],
    ['PUT', /^\/trips\/(\d+)$/, 'updateTrip'],
    ['DELETE', /^\/trips\/(\d+)$/, 'deleteTrip'],
    ['POST', /^\/trips\/(\d+)\/activities$/, 'createActivity'],
    ['POST', /^\/trips\/(\d+)\/import-itinerary$/, 'importItinerary'],
    ['PUT', /^\/activities\/(\d+)$/, 'updateActivity'],
    ['PATCH', /^\/activities\/(\d+)\/move$/, 'moveActivity'],
    ['DELETE', /^\/activities\/(\d+)$/, 'deleteActivity'],
    ['POST', /^\/trips\/(\d+)\/todos$/, 'createTodo'],
    ['PUT', /^\/todos\/(\d+)$/, 'updateTodo'],
    ['PATCH', /^\/todo-items\/(\d+)$/, 'toggleTodoItem'],
    ['DELETE', /^\/todos\/(\d+)$/, 'deleteTodo'],
    ['POST', /^\/trips\/(\d+)\/expenses$/, 'createExpense'],
    ['PUT', /^\/expenses\/(\d+)$/, 'updateExpense'],
    ['DELETE', /^\/expenses\/(\d+)$/, 'deleteExpense'],
    ['POST', /^\/trips\/(\d+)\/travelers$/, 'createTraveler'],
    ['PUT', /^\/travelers\/(\d+)$/, 'updateTraveler'],
    ['DELETE', /^\/travelers\/(\d+)$/, 'deleteTraveler'],
    ['POST', /^\/trips\/(\d+)\/packing$/, 'createPacking'],
    ['PUT', /^\/packing\/(\d+)$/, 'updatePacking'],
    ['DELETE', /^\/packing\/(\d+)$/, 'deletePacking'],
    ['POST', /^\/trips\/(\d+)\/resources$/, 'createResource'],
    ['PUT', /^\/resources\/(\d+)$/, 'updateResource'],
    ['DELETE', /^\/resources\/(\d+)$/, 'deleteResource'],
  ];

  for (const [routeMethod, regex, name] of definitions) {
    if (method !== routeMethod) continue;
    const match = route.match(regex);
    if (match) return { name, id: match[1] ? Number(match[1]) : null };
  }
  return { name: 'notFound' };
}

async function handleApi(req, res, db, route) {
  const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readJsonBody(req) : {};
  switch (route.name) {
    case 'health':
      return sendJson(res, 200, { ok: true, database: 'sqlite', timestamp: new Date().toISOString() });
    case 'downloadTemplate': {
      const templatePath = path.resolve(__dirname, '..', 'data', 'template-itinerario.json');
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      res.setHeader('Content-Disposition', 'attachment; filename="template-itinerario.json"');
      return sendJson(res, 200, template);
    }
    case 'listTrips':
      return sendJson(res, 200, listTrips(db));
    case 'createTrip':
      return sendJson(res, 201, createTrip(db, body));
    case 'getTrip':
      return sendJson(res, 200, getTripBundle(db, route.id));
    case 'updateTrip':
      return sendJson(res, 200, updateTrip(db, route.id, body));
    case 'deleteTrip':
      deleteTrip(db, route.id);
      return sendNoContent(res);
    case 'createActivity':
      return sendJson(res, 201, createActivity(db, route.id, body));
    case 'importItinerary':
      return sendJson(res, 201, importItinerary(db, route.id, body));
    case 'updateActivity':
      return sendJson(res, 200, updateActivity(db, route.id, body));
    case 'moveActivity':
      return sendJson(res, 200, moveActivity(db, route.id, body));
    case 'deleteActivity':
      deleteActivity(db, route.id);
      return sendNoContent(res);
    case 'createTodo':
      return sendJson(res, 201, createTodo(db, route.id, body));
    case 'updateTodo':
      return sendJson(res, 200, updateTodo(db, route.id, body));
    case 'toggleTodoItem':
      return sendJson(res, 200, toggleTodoItem(db, route.id, body));
    case 'deleteTodo':
      deleteTodo(db, route.id);
      return sendNoContent(res);
    case 'createExpense':
      return sendJson(res, 201, createExpense(db, route.id, body));
    case 'updateExpense':
      return sendJson(res, 200, updateExpense(db, route.id, body));
    case 'deleteExpense':
      deleteExpense(db, route.id);
      return sendNoContent(res);
    case 'createTraveler':
      return sendJson(res, 201, createTraveler(db, route.id, body));
    case 'updateTraveler':
      return sendJson(res, 200, updateTraveler(db, route.id, body));
    case 'deleteTraveler':
      deleteTraveler(db, route.id);
      return sendNoContent(res);
    case 'createPacking':
      return sendJson(res, 201, createPackingItem(db, route.id, body));
    case 'updatePacking':
      return sendJson(res, 200, updatePackingItem(db, route.id, body));
    case 'deletePacking':
      deletePackingItem(db, route.id);
      return sendNoContent(res);
    case 'createResource':
      return sendJson(res, 201, createResource(db, route.id, body));
    case 'updateResource':
      return sendJson(res, 200, updateResource(db, route.id, body));
    case 'deleteResource':
      deleteResource(db, route.id);
      return sendNoContent(res);
    default:
      return sendJson(res, 404, { error: 'Ruta no encontrada.' });
  }
}

export function createApp(options = {}) {
  const basePath = normalizeBasePath(options.basePath ?? process.env.BASE_PATH ?? '/viajes');
  const db = options.db || openDatabase(options.databaseOptions);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = decodeURIComponent(url.pathname).replace(/\/{2,}/g, '/');
      const route = matchRoute(pathname, req.method, basePath);
      if (route) return await handleApi(req, res, db, route);

      if (pathname === '/' && basePath !== '/') return redirect(res, `${basePath}/`);
      if (basePath !== '/' && pathname === basePath) return redirect(res, `${basePath}/`);

      const isInsideBase = basePath === '/' || pathname === basePath || pathname.startsWith(`${basePath}/`);
      if (!isInsideBase) return sendJson(res, 404, { error: 'Ruta no encontrada.' });

      const relativePath = basePath === '/' ? pathname : pathname.slice(basePath.length);
      if (serveStatic(res, relativePath, basePath)) return;

      // SPA fallback: las secciones internas las controla el navegador.
      if (!path.extname(relativePath)) {
        serveStatic(res, 'index.html', basePath);
        return;
      }
      sendJson(res, 404, { error: 'Archivo no encontrado.' });
    } catch (error) {
      console.error(error);
      sendJson(res, error.status || 500, {
        error: error.status ? error.message : 'Se ha producido un error interno.',
        details: process.env.NODE_ENV === 'development' && !error.status ? error.message : undefined,
      });
    }
  });

  server.on('close', () => {
    try { db.close(); } catch { /* already closed */ }
  });

  return { server, db, basePath };
}
