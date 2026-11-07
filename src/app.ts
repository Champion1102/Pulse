import express from 'express';
import { existsSync } from 'fs';
import { createServer, Server as HttpServer } from 'http';
import path from 'path';
import { Server as IoServer } from 'socket.io';
import { Container, ContainerOverrides, createContainer } from './config/container';
import { apiRouter, errorHandler } from './transport/http/routes';
import { SocketBroadcaster } from './transport/socket/SocketBroadcaster';
import { SocketGateway } from './transport/socket/SocketGateway';

export interface PulseApp {
  http: HttpServer;
  io: IoServer;
  container: Container;
}

/** Built React app (npm run build:web). In dev, Vite serves it instead and proxies /api + /socket.io here. */
const WEB_DIST = path.resolve(process.cwd(), 'web', 'dist');

/** Wires HTTP + Socket.IO around a container. Used by server.ts and integration tests. */
export function createApp(overrides: ContainerOverrides = {}): PulseApp {
  const container = createContainer(overrides);
  const app = express();
  app.set('trust proxy', 1); // behind Render's proxy: real client IPs for rate limiting
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.use('/api', apiRouter(container));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST, { index: false, maxAge: '1h' }));
    // Single-page app: every other GET returns index.html and the client router takes over.
    app.get(/^(?!\/socket\.io\/).*/, (_req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
  }
  app.use(errorHandler);

  const http = createServer(app);
  const io = new IoServer(http, { cors: { origin: false } });
  new SocketBroadcaster(io, container.rooms).attach(container.bus);
  new SocketGateway(io, container.live).listen();
  return { http, io, container };
}
