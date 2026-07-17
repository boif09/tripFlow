# TripFlow

Aplicación web para organizar viajes con **Node.js y SQLite**, pensada para desplegarse igual que las aplicaciones `movies_series` y `cocina_app`.

## Funcionalidades

- **Varios viajes** con destino, fechas, estado, moneda y viajeros.
- **Itinerario por días** con actividades principales y planes alternativos.
- Horas, ubicación, descripción, enlaces, reserva, referencia de entradas, notas y precio por actividad.
- Movimiento de actividades entre días y alternativas mediante **arrastrar y soltar**.
- **Gastos** manuales o vinculados a una actividad/TODO, con total, pagado y pendiente.
- **TODOs** normales o relacionados con el itinerario, incluyendo subtareas y precio.
- **Maletas por persona**, separadas entre facturada, equipaje de mano, mochila/objeto personal y material compartido.
- **Información del viaje** para traslados, enlaces, apps, documentos, reservas, emergencias y notas.
- Diseño adaptable a ordenador, tablet y móvil.

## Sincronización de precios

Una actividad o TODO con precio utiliza un único registro de gasto:

- Cambiar el precio en Itinerario actualiza Gastos.
- Cambiarlo desde TODO actualiza Itinerario y Gastos si están vinculados.
- Cambiar el importe o el estado pagado desde Gastos se refleja en las otras secciones.
- No se crean gastos duplicados cuando un TODO pertenece a una actividad.

## Datos iniciales del Excel

La primera vez que se inicia la aplicación, carga el viaje **China 2026** generado a partir del Excel adjunto:

- 31 actividades y planes alternativos.
- Gastos con un total de **2.997,79 €**.
- TODOs y pendientes de reserva.
- Maletas de Xavi y Judit.
- Traslados, enlaces y aplicaciones útiles.

Para empezar completamente vacío:

```bash
SEED_CHINA=false npm start
```

La carga inicial solo se ejecuta cuando la base de datos no contiene viajes.

## Requisitos

- Node.js **22.13 o posterior**.
- No requiere instalar dependencias de npm: utiliza `node:http`, `node:test` y `node:sqlite` incluidos en Node.js.

Comprueba la versión:

```bash
node -v
```

## Ejecutar en local

```bash
cd travel_manager_app
npm start
```

Abrir:

```text
http://localhost:3013/viajes/
```

Modo desarrollo con reinicio automático:

```bash
npm run dev
```

## Pruebas

```bash
npm run check
npm test
```

Las pruebas cubren creación de viajes, actividades, TODOs, gastos sincronizados, movimiento del itinerario, maletas e información.

## Base de datos

Por defecto se crea automáticamente aquí:

```text
data/travel_manager.db
```

También se crean los archivos temporales de SQLite `-wal` y `-shm` mientras la aplicación está funcionando.

Para utilizar otra ruta:

```bash
DB_PATH=/ruta/segura/travel_manager.db npm start
```

### Copia de seguridad

Detén temporalmente el proceso y copia la base de datos:

```bash
pm2 stop tripflow
cp data/travel_manager.db data/travel_manager-backup-$(date +%F).db
pm2 start tripflow
```

## Despliegue en Hetzner con PM2

Subir el proyecto, por ejemplo a:

```text
/var/www/travel_manager_app
```

Después:

```bash
cd /var/www/travel_manager_app
npm run check
npm test
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

La configuración incluida utiliza:

- Proceso PM2: `tripflow`
- Puerto interno: `3013`
- Ruta pública: `/viajes`
- Host interno: `127.0.0.1`

## Configuración de Nginx

El fichero `nginx-viajes.conf.example` contiene el bloque que debe añadirse dentro del `server` HTTPS de `jusboif.es`:

```nginx
location = /viajes {
    return 301 /viajes/;
}

location /viajes/ {
    proxy_pass http://127.0.0.1:3013;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Validar y recargar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

La aplicación quedará disponible en:

```text
https://jusboif.es/viajes/
```

## Variables de entorno

| Variable | Valor por defecto | Uso |
|---|---:|---|
| `PORT` | `3013` | Puerto interno de Node.js |
| `HOST` | `0.0.0.0` | Dirección en la que escucha |
| `BASE_PATH` | `/viajes` | Ruta pública de la aplicación |
| `DB_PATH` | `data/travel_manager.db` | Ruta de SQLite |
| `SEED_CHINA` | `true` | Carga China 2026 si la BD está vacía |
| `NODE_ENV` | — | Usar `production` en el servidor |

## Estructura

```text
travel_manager_app/
├── data/
│   └── china-seed.json
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── scripts/
│   └── reset-db.js
├── src/
│   ├── app.js
│   ├── database.js
│   └── repository.js
├── test/
│   └── app.test.js
├── ecosystem.config.cjs
├── nginx-viajes.conf.example
├── package.json
└── server.js
```

## Reiniciar completamente los datos

Este comando elimina la base de datos local:

```bash
npm run reset-db
```

Al volver a arrancar se recrean las tablas y, salvo que `SEED_CHINA=false`, vuelve a cargarse el viaje de China.
