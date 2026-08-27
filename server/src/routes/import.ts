import { FastifyPluginAsync } from 'fastify';
import { parseUrlSafely } from '../url-parser.js';
import { z } from 'zod';

const ImportSchema = z.object({
  url: z.string().url(),
});

export const importRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/url', async (request, reply) => {
    const parse = ImportSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Zadejte platnou URL adresu.' });
    }

    try {
      const metadata = await parseUrlSafely(parse.data.url);
      return metadata;
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Nepodařilo se načíst informace z odkazu.',
        details: err.message,
      });
    }
  });
};
