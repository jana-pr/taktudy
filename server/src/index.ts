import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase } from './db.js';
import { authRoutes } from './routes/auth.js';
import { tripRoutes } from './routes/trips.js';
import { poiRoutes } from './routes/pois.js';
import { shareRoutes } from './routes/share.js';
import { syncRoutes } from './routes/sync.js';
import { importRoutes } from './routes/import.js';
import { categoryRoutes } from './routes/categories.js';
import { tipsRoutes } from './routes/tips.js';
import { accommodationsRoutes } from './routes/accommodations.js';
import { bookingsRoutes } from './routes/bookings.js';

// Fastify TypeScript augmentation
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  bodyLimit: 15 * 1024 * 1024, // 15MB limit for photo uploads
});

async function main() {
  // Init DB
  initDatabase();

  // Allow empty body with Content-Type: application/json (e.g. from fetch without body) without throwing 400 Bad Request
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, defaultDone) {
    if (!body || !body.toString().trim()) {
      defaultDone(null, {});
      return;
    }
    try {
      const json = JSON.parse(body.toString());
      defaultDone(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      defaultDone(err, undefined);
    }
  });

  // CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Cookies
  await fastify.register(cookie);

  // Rate Limiting (set to generous 5000/min to avoid 429 during syncing/batch operations)
  await fastify.register(rateLimit, {
    max: 5000,
    timeWindow: '1 minute',
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'taktudy-super-secure-outdoor-secret-key-12345678',
  });

  // Auth decorator
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Neautorizovaný přístup. Přihlaste se prosím.' });
    }
  });

  // Register API Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(tripRoutes, { prefix: '/api/trips' });
  await fastify.register(poiRoutes, { prefix: '/api/trips' });
  await fastify.register(shareRoutes, { prefix: '/api/share' });
  await fastify.register(syncRoutes, { prefix: '/api/sync' });
  await fastify.register(importRoutes, { prefix: '/api/import' });
  await fastify.register(categoryRoutes, { prefix: '/api/categories' });
  await fastify.register(tipsRoutes, { prefix: '/api/tips' });
  await fastify.register(accommodationsRoutes, { prefix: '/api/trips' });
  await fastify.register(bookingsRoutes, { prefix: '/api/trips' });

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', time: new Date().toISOString() };
  });

  // Serve static client assets in production if dist directory exists
  const clientDist = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(clientDist)) {
    await fastify.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
    });

    fastify.setNotFoundHandler((request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        reply.status(404).send({ error: 'API endpoint nebyl nalezen.' });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  const PORT = parseInt(process.env.PORT || '3001', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Tak tudy! Backend server běží na http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
