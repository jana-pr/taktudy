import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { z } from 'zod';
import crypto from 'node:crypto';

const CreatePoiSchema = z.object({
  stageId: z.string().nullable().optional(),
  dayId: z.string().nullable().optional(),
  subRouteId: z.string().nullable().optional(),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  isTop: z.boolean().default(false),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  description: z.string().optional(),
  privateNotes: z.string().optional(),
  openingHours: z.string().optional(),
  sourceUrl: z.string().optional(),
  externalLinks: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
  timeMode: z.enum(['none', 'approximate', 'fixed']).default('none'),
  targetTime: z.string().optional(),
  visitStatus: z.enum(['unvisited', 'visited', 'skipped']).default('unvisited'),
  mainPhotoUrl: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

export const poiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // Create POI in trip
  fastify.post('/:tripId/pois', async (request, reply) => {
    const userId = (request.user as any).id;
    const { tripId } = request.params as { tripId: string };

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const parse = CreatePoiSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data bodu zájmu.', details: parse.error.issues });
    }

    const id = `poi_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const d = parse.data;

    // Get max sort_order
    const maxOrder = (
      db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM pois WHERE trip_id = ?').get(tripId) as any
    ).max_order;

    db.prepare(`
      INSERT INTO pois (
        id, trip_id, stage_id, day_id, sub_route_id, category_id, name, is_top, lat, lng,
        address, description, private_notes, opening_hours, source_url, external_links,
        time_mode, target_time, visit_status, main_photo_url, photos, sort_order,
        version, is_deleted, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        1, 0, ?, ?
      )
    `).run(
      id,
      tripId,
      d.stageId || null,
      d.dayId || null,
      d.subRouteId || null,
      d.categoryId,
      d.name,
      d.isTop ? 1 : 0,
      d.lat,
      d.lng,
      d.address || null,
      d.description || null,
      d.privateNotes || null,
      d.openingHours || null,
      d.sourceUrl || null,
      d.externalLinks ? JSON.stringify(d.externalLinks) : null,
      d.timeMode,
      d.targetTime || null,
      d.visitStatus,
      d.mainPhotoUrl || null,
      d.photos ? JSON.stringify(d.photos) : null,
      maxOrder + 1,
      now,
      now
    );

    return { id, tripId, ...d, sortOrder: maxOrder + 1, version: 1, createdAt: now, updatedAt: now };
  });

  // Update POI
  fastify.put('/:tripId/pois/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { tripId, id } = request.params as { tripId: string; id: string };

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const existing = db.prepare('SELECT * FROM pois WHERE id = ? AND trip_id = ?').get(id, tripId) as any;
    if (!existing) {
      return reply.status(404).send({ error: 'Bod nebyl nalezen.' });
    }

    const parse = CreatePoiSchema.partial().safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data pro aktualizaci bodu.' });
    }

    const d = parse.data;
    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    db.prepare(`
      UPDATE pois SET
        stage_id = CASE WHEN ? IS NOT NULL THEN ? ELSE stage_id END,
        day_id = CASE WHEN ? IS NOT NULL THEN ? ELSE day_id END,
        sub_route_id = CASE WHEN ? IS NOT NULL THEN ? ELSE sub_route_id END,
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        is_top = CASE WHEN ? IS NOT NULL THEN ? ELSE is_top END,
        lat = COALESCE(?, lat),
        lng = COALESCE(?, lng),
        address = CASE WHEN ? IS NOT NULL THEN ? ELSE address END,
        description = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
        private_notes = CASE WHEN ? IS NOT NULL THEN ? ELSE private_notes END,
        opening_hours = CASE WHEN ? IS NOT NULL THEN ? ELSE opening_hours END,
        source_url = CASE WHEN ? IS NOT NULL THEN ? ELSE source_url END,
        time_mode = COALESCE(?, time_mode),
        target_time = CASE WHEN ? IS NOT NULL THEN ? ELSE target_time END,
        visit_status = COALESCE(?, visit_status),
        main_photo_url = CASE WHEN ? IS NOT NULL THEN ? ELSE main_photo_url END,
        version = ?,
        updated_at = ?
      WHERE id = ? AND trip_id = ?
    `).run(
      d.stageId !== undefined ? 1 : null,
      d.stageId || null,
      d.dayId !== undefined ? 1 : null,
      d.dayId || null,
      d.subRouteId !== undefined ? 1 : null,
      d.subRouteId || null,
      d.categoryId || null,
      d.name || null,
      d.isTop !== undefined ? 1 : null,
      d.isTop ? 1 : 0,
      d.lat !== undefined ? d.lat : null,
      d.lng !== undefined ? d.lng : null,
      d.address !== undefined ? 1 : null,
      d.address || null,
      d.description !== undefined ? 1 : null,
      d.description || null,
      d.privateNotes !== undefined ? 1 : null,
      d.privateNotes || null,
      d.openingHours !== undefined ? 1 : null,
      d.openingHours || null,
      d.sourceUrl !== undefined ? 1 : null,
      d.sourceUrl || null,
      d.timeMode || null,
      d.targetTime !== undefined ? 1 : null,
      d.targetTime || null,
      d.visitStatus || null,
      d.mainPhotoUrl !== undefined ? 1 : null,
      d.mainPhotoUrl || null,
      newVersion,
      now,
      id,
      tripId
    );

    return { id, version: newVersion, updatedAt: now };
  });

  // Toggle TOP flag
  fastify.patch('/:tripId/pois/:id/top', async (request, reply) => {
    const userId = (request.user as any).id;
    const { tripId, id } = request.params as { tripId: string; id: string };

    const poi = db
      .prepare(`
        SELECT p.id, p.is_top, p.version 
        FROM pois p 
        JOIN trips t ON p.trip_id = t.id 
        WHERE p.id = ? AND p.trip_id = ? AND t.owner_id = ?
      `)
      .get(id, tripId, userId) as any;

    if (!poi) {
      return reply.status(404).send({ error: 'Bod nebyl nalezen.' });
    }

    const nextTop = poi.is_top ? 0 : 1;
    const now = new Date().toISOString();
    const newVersion = poi.version + 1;

    db.prepare('UPDATE pois SET is_top = ?, version = ?, updated_at = ? WHERE id = ?').run(
      nextTop,
      newVersion,
      now,
      id
    );

    return { id, isTop: Boolean(nextTop), version: newVersion };
  });

  // Update visit status
  fastify.patch('/:tripId/pois/:id/visit', async (request, reply) => {
    const userId = (request.user as any).id;
    const { tripId, id } = request.params as { tripId: string; id: string };
    const { status } = request.body as { status: 'unvisited' | 'visited' | 'skipped' };

    if (!['unvisited', 'visited', 'skipped'].includes(status)) {
      return reply.status(400).send({ error: 'Neplatný stav návštěvy.' });
    }

    const poi = db
      .prepare(`
        SELECT p.id, p.version 
        FROM pois p 
        JOIN trips t ON p.trip_id = t.id 
        WHERE p.id = ? AND p.trip_id = ? AND t.owner_id = ?
      `)
      .get(id, tripId, userId) as any;

    if (!poi) {
      return reply.status(404).send({ error: 'Bod nebyl nalezen.' });
    }

    const now = new Date().toISOString();
    const newVersion = poi.version + 1;

    db.prepare('UPDATE pois SET visit_status = ?, version = ?, updated_at = ? WHERE id = ?').run(
      status,
      newVersion,
      now,
      id
    );

    return { id, visitStatus: status, version: newVersion };
  });

  // Reorder POIs
  fastify.post('/:tripId/pois/reorder', async (request, reply) => {
    const userId = (request.user as any).id;
    const { tripId } = request.params as { tripId: string };
    const { orderedIds } = request.body as { orderedIds: string[] };

    if (!Array.isArray(orderedIds)) {
      return reply.status(400).send({ error: 'orderedIds musí být pole ID.' });
    }

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE pois SET sort_order = ?, updated_at = ? WHERE id = ? AND trip_id = ?');

    orderedIds.forEach((poiId, index) => {
      updateStmt.run(index + 1, now, poiId, tripId);
    });

    return { success: true };
  });

  // Delete POI
  fastify.delete('/:tripId/pois/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { tripId, id } = request.params as { tripId: string; id: string };

    const poi = db
      .prepare(`
        SELECT p.id 
        FROM pois p 
        JOIN trips t ON p.trip_id = t.id 
        WHERE p.id = ? AND p.trip_id = ? AND t.owner_id = ?
      `)
      .get(id, tripId, userId);

    if (!poi) {
      return reply.status(404).send({ error: 'Bod nebyl nalezen.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE pois SET is_deleted = 1, updated_at = ? WHERE id = ?').run(now, id);

    return { success: true, id };
  });
};
