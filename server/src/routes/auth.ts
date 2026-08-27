import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { hashPassword, verifyPassword } from '../auth.js';
import { z } from 'zod';
import crypto from 'node:crypto';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register
  fastify.post('/register', async (request, reply) => {
    const parse = RegisterSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatné údaje', details: parse.error.issues });
    }

    const { email, password, displayName } = parse.data;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return reply.status(409).send({ error: 'Účet s tímto e-mailem již existuje.' });
    }

    const id = `usr_${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, email, passwordHash, displayName, now);

    const token = fastify.jwt.sign({ id, email, displayName });
    return { token, user: { id, email, displayName } };
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const parse = LoginSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Zadejte platný e-mail a heslo.' });
    }

    const { email, password } = parse.data;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return reply.status(401).send({ error: 'Nesprávný e-mail nebo heslo.' });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email, displayName: user.display_name });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    };
  });

  // Me
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const userPayload = request.user as { id: string };
      const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(userPayload.id) as any;
      if (!user) {
        throw new Error('Uživatel nenalezen.');
      }
      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
      };
    },
  });
};
