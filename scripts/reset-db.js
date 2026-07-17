import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '..', 'data', 'travel_manager.db');
for (const suffix of ['', '-wal', '-shm']) {
  const target = `${dbPath}${suffix}`;
  if (fs.existsSync(target)) fs.rmSync(target);
}
console.log(`Base de datos eliminada: ${dbPath}`);
console.log('Al iniciar de nuevo se crearán las tablas y se cargará China 2026, salvo que uses SEED_CHINA=false.');
