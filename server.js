import { createApp } from './src/app.js';

const port = Number(process.env.PORT || 3013);
const host = process.env.HOST || '0.0.0.0';
const { server, basePath } = createApp();

server.listen(port, host, () => {
  console.log(`TripFlow iniciado en http://${host}:${port}${basePath}/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
