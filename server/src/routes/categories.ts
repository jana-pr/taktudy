import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';

export const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    return db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  });
};
