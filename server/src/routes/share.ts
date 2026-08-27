import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { generateToken } from '../auth.js';
import crypto from 'node:crypto';

export const shareRoutes: FastifyPluginAsync = async (fastify) => {
  // Public Read-Only access via share token (No auth required)
  fastify.get('/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const share = db
      .prepare('SELECT * FROM share_tokens WHERE token = ? AND is_active = 1')
      .get(token) as any;

    if (!share) {
      return reply.status(404).send({ error: 'Sdílená cesta nebyla nalezena nebo byl odkaz zrušen.' });
    }

    const trip = db
      .prepare('SELECT id, title, motto, status, start_date, end_date, bounding_box, created_at, updated_at FROM trips WHERE id = ? AND is_deleted = 0')
      .get(share.trip_id) as any;

    if (!trip) {
      return reply.status(404).send({ error: 'Cesta již neexistuje.' });
    }

    const stages = db
      .prepare('SELECT id, trip_id, title, notes, sort_order, has_detail FROM stages WHERE trip_id = ? ORDER BY sort_order ASC')
      .all(trip.id)
      .map((s: any) => ({ ...s, has_detail: Boolean(s.has_detail) }));

    const days = db
      .prepare('SELECT id, trip_id, stage_id, day_number, specific_date, title, notes, has_detail FROM days WHERE trip_id = ? ORDER BY day_number ASC')
      .all(trip.id)
      .map((d: any) => ({ ...d, has_detail: Boolean(d.has_detail) }));

    const subRoutes = db
      .prepare('SELECT id, trip_id, day_id, title, coordinates FROM sub_routes WHERE trip_id = ?')
      .all(trip.id)
      .map((sr: any) => ({ ...sr, coordinates: JSON.parse(sr.coordinates || '[]') }));

    const pois = db
      .prepare(`
        SELECT p.id, p.trip_id, p.stage_id, p.day_id, p.sub_route_id, p.category_id, p.name,
               p.is_top, p.lat, p.lng, p.address, p.description, 
               CASE WHEN ? = 1 THEN p.private_notes ELSE NULL END as private_notes,
               p.opening_hours, p.source_url, p.external_links, p.time_mode, p.target_time,
               p.visit_status, p.main_photo_url, p.photos, p.sort_order,
               c.label_cs as category_label, c.icon_name as category_icon, c.default_color as category_color
        FROM pois p
        JOIN categories c ON p.category_id = c.id
        WHERE p.trip_id = ? AND p.is_deleted = 0
        ORDER BY p.sort_order ASC
      `)
      .all(share.include_notes ? 1 : 0, trip.id)
      .map((p: any) => ({
        ...p,
        is_top: Boolean(p.is_top),
        external_links: p.external_links ? JSON.parse(p.external_links) : [],
        photos: p.photos ? JSON.parse(p.photos) : [],
      }));

    return {
      ...trip,
      isReadOnly: true,
      bounding_box: trip.bounding_box ? JSON.parse(trip.bounding_box) : null,
      stages,
      days,
      subRoutes,
      pois,
    };
  });

  // Authenticated endpoints for trip owner
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', fastify.authenticate);

    // Generate or get active share token for trip
    authGroup.post('/generate', async (request, reply) => {
      const userId = (request.user as any).id;
      const { tripId, includeNotes = true } = request.body as { tripId: string; includeNotes?: boolean };

      const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(tripId, userId);
      if (!trip) {
        return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
      }

      // Check if active token exists
      let existing = db
        .prepare('SELECT * FROM share_tokens WHERE trip_id = ? AND is_active = 1')
        .get(tripId) as any;

      if (existing) {
        db.prepare('UPDATE share_tokens SET include_notes = ? WHERE id = ?').run(includeNotes ? 1 : 0, existing.id);
        return { token: existing.token, includeNotes };
      }

      const id = `sh_${crypto.randomUUID()}`;
      const token = generateToken(24);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO share_tokens (id, trip_id, token, is_active, include_notes, created_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(id, tripId, token, includeNotes ? 1 : 0, now);

      return { token, includeNotes };
    });

    // Revoke share token
    authGroup.post('/revoke', async (request, reply) => {
      const userId = (request.user as any).id;
      const { tripId } = request.body as { tripId: string };

      const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(tripId, userId);
      if (!trip) {
        return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
      }

      db.prepare('UPDATE share_tokens SET is_active = 0 WHERE trip_id = ?').run(tripId);
      return { success: true, message: 'Sdílení cesty bylo zrušeno.' };
    });
  });
};
