#!/usr/bin/env bash
set -Eeuo pipefail

# ============================================================
# Despliegue de TripFlow
#
# Uso normal:
#   ./deploy-tripflow.sh
#
# Variables opcionales:
#   APP_DIR=/var/www/tripFlow PM2_APP=tripflow BRANCH=main ./deploy-tripflow.sh
# ============================================================

APP_DIR="${APP_DIR:-/var/www/tripFlow}"
PM2_APP="${PM2_APP:-tripflow}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tripflow}"

log() {
  printf '\n\033[1;34m[TripFlow]\033[0m %s\n' "$1"
}

error() {
  printf '\n\033[1;31m[ERROR]\033[0m %s\n' "$1" >&2
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

PM2_EXISTED=false
APP_STOPPED=false

recover_on_error() {
  exit_code=$?

  error "El despliegue ha fallado."

  if [[ "$PM2_EXISTED" == true && "$APP_STOPPED" == true ]]; then
    log "Intentando volver a arrancar el proceso anterior de PM2..."
    pm2 restart "$PM2_APP" --update-env >/dev/null 2>&1 || true
  fi

  error "Revisa el error mostrado arriba y los logs con:"
  error "pm2 logs $PM2_APP --lines 100"

  exit "$exit_code"
}

trap recover_on_error ERR

log "Comprobando requisitos..."

for cmd in git npm node pm2 tar; do
  if ! command_exists "$cmd"; then
    error "No se encuentra el comando '$cmd'."
    exit 1
  fi
done

if [[ ! -d "$APP_DIR" ]]; then
  error "No existe el directorio: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

if [[ ! -d ".git" ]]; then
  error "$APP_DIR no es un repositorio Git."
  exit 1
fi

if [[ ! -f "package.json" ]]; then
  error "No se encuentra package.json en $APP_DIR."
  exit 1
fi

BRANCH="${BRANCH:-$(git branch --show-current)}"

if [[ -z "$BRANCH" ]]; then
  BRANCH="main"
fi

log "Aplicación: $APP_DIR"
log "Rama: $BRANCH"
log "Proceso PM2: $PM2_APP"

# No continúa si existen cambios locales en archivos controlados por Git.
# Los datos SQLite deberían estar incluidos en .gitignore.
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  error "Hay cambios locales en archivos controlados por Git."
  git status --short
  error "Guárdalos, súbelos o descártalos antes de desplegar."
  exit 1
fi

log "Descargando información del repositorio remoto..."
git fetch origin "$BRANCH"

LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse "origin/$BRANCH")"

if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  PM2_EXISTED=true
  log "Deteniendo temporalmente TripFlow..."
  pm2 stop "$PM2_APP"
  APP_STOPPED=true
fi

# Copia de seguridad de bases de datos SQLite antes de cambiar el código.
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_FILE="$BACKUP_DIR/tripflow-sqlite-$TIMESTAMP.tar.gz"

mapfile -d '' SQLITE_FILES < <(
  find . -maxdepth 5 -type f \
    \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \
       -o -name '*.db-wal' -o -name '*.db-shm' \) \
    -not -path './node_modules/*' \
    -not -path './.git/*' \
    -print0
)

if (( ${#SQLITE_FILES[@]} > 0 )); then
  log "Creando copia de seguridad de SQLite..."
  tar -czf "$BACKUP_FILE" -- "${SQLITE_FILES[@]}"
  log "Backup creado: $BACKUP_FILE"
else
  log "No se han encontrado archivos SQLite para respaldar."
fi

if [[ "$LOCAL_COMMIT" == "$REMOTE_COMMIT" ]]; then
  log "El código ya estaba actualizado. Se revisarán dependencias igualmente."
else
  log "Aplicando los nuevos cambios de Git..."
  git pull --ff-only origin "$BRANCH"
fi

log "Instalando dependencias de producción..."
if [[ -f "package-lock.json" ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

# Ejecuta el build únicamente si existe un script "build" en package.json.
if node -e "const p=require('./package.json'); process.exit(p.scripts?.build ? 0 : 1)"; then
  log "Generando la versión de producción..."
  npm run build
fi

log "Arrancando la aplicación..."

if [[ "$PM2_EXISTED" == true ]]; then
  pm2 restart "$PM2_APP" --update-env
elif [[ -f "ecosystem.config.js" ]]; then
  pm2 start ecosystem.config.js
elif [[ -f "ecosystem.config.cjs" ]]; then
  pm2 start ecosystem.config.cjs
else
  pm2 start npm --name "$PM2_APP" -- start
fi

APP_STOPPED=false

pm2 save

log "Estado final:"
pm2 status "$PM2_APP"

log "Últimas líneas del log:"
pm2 logs "$PM2_APP" --lines 25 --nostream

log "Despliegue completado correctamente."
