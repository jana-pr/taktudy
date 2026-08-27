import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { z } from 'zod';
import crypto from 'node:crypto';

const CreateTripSchema = z.object({
  title: z.string().min(1),
  motto: z.string().optional(),
  status: z.enum(['idea', 'planning', 'ready', 'traveling', 'completed', 'archived']).default('planning'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  routeUrl: z.string().optional(),
});

const UpdateTripSchema = CreateTripSchema.partial();

export const tripRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // List all user's trips
  fastify.get('/', async (request) => {
    const userId = (request.user as any).id;
    const trips = db
      .prepare(`
        SELECT t.*, 
               (SELECT COUNT(*) FROM pois p WHERE p.trip_id = t.id AND p.is_deleted = 0) as poi_count,
               (SELECT COUNT(*) FROM days d WHERE d.trip_id = t.id) as day_count
        FROM trips t
        WHERE t.owner_id = ? AND t.is_deleted = 0
        ORDER BY t.created_at DESC
      `)
      .all(userId);

    return trips.map((t: any) => ({
      ...t,
      is_deleted: Boolean(t.is_deleted),
      bounding_box: t.bounding_box ? JSON.parse(t.bounding_box) : null,
    }));
  });

  // Get specific trip with full tree (BOLA checked)
  fastify.get('/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const trip = db
      .prepare(`
        SELECT * FROM trips 
        WHERE id = ? AND owner_id = ? AND is_deleted = 0
      `)
      .get(id, userId) as any;

    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena nebo k ní nemáte přístup.' });
    }

    const stages = db
      .prepare('SELECT * FROM stages WHERE trip_id = ? ORDER BY sort_order ASC')
      .all(id)
      .map((s: any) => ({ ...s, has_detail: Boolean(s.has_detail) }));

    const days = db
      .prepare('SELECT * FROM days WHERE trip_id = ? ORDER BY day_number ASC')
      .all(id)
      .map((d: any) => ({ ...d, has_detail: Boolean(d.has_detail) }));

    const subRoutes = db
      .prepare('SELECT * FROM sub_routes WHERE trip_id = ?')
      .all(id)
      .map((sr: any) => ({ ...sr, coordinates: JSON.parse(sr.coordinates || '[]') }));

    const pois = db
      .prepare(`
        SELECT p.*, c.label_cs as category_label, c.icon_name as category_icon, c.default_color as category_color
        FROM pois p
        JOIN categories c ON p.category_id = c.id
        WHERE p.trip_id = ? AND p.is_deleted = 0
        ORDER BY p.sort_order ASC
      `)
      .all(id)
      .map((p: any) => ({
        ...p,
        is_top: Boolean(p.is_top),
        is_deleted: Boolean(p.is_deleted),
        external_links: p.external_links ? JSON.parse(p.external_links) : [],
        notification_config: p.notification_config ? JSON.parse(p.notification_config) : null,
        photos: p.photos ? JSON.parse(p.photos) : [],
      }));

    return {
      ...trip,
      is_deleted: Boolean(trip.is_deleted),
      bounding_box: trip.bounding_box ? JSON.parse(trip.bounding_box) : null,
      stages,
      days,
      subRoutes,
      pois,
    };
  });

  // Create new trip
  fastify.post('/', async (request, reply) => {
    const userId = (request.user as any).id;
    const parse = CreateTripSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data pro vytvoření cesty.', details: parse.error.issues });
    }

    const id = `trip_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const { title, motto, status, startDate, endDate, routeUrl } = parse.data;

    db.prepare(`
      INSERT INTO trips (id, owner_id, title, motto, status, start_date, end_date, route_url, version, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    `).run(id, userId, title, motto || null, status, startDate || null, endDate || null, routeUrl || null, now, now);

    return { id, title, motto, status, startDate, endDate, routeUrl, version: 1, createdAt: now, updatedAt: now };
  });

  // Update trip
  fastify.put('/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const parse = UpdateTripSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data pro úpravu cesty.' });
    }

    const existing = db.prepare('SELECT id, version FROM trips WHERE id = ? AND owner_id = ?').get(id, userId) as any;
    if (!existing) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;
    const { title, motto, status, startDate, endDate, routeUrl } = parse.data;

    db.prepare(`
      UPDATE trips 
      SET title = COALESCE(?, title),
          motto = COALESCE(?, motto),
          status = COALESCE(?, status),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          route_url = CASE WHEN ? IS NOT NULL THEN ? ELSE route_url END,
          version = ?,
          updated_at = ?
      WHERE id = ? AND owner_id = ?
    `).run(
      title || null,
      motto || null,
      status || null,
      startDate || null,
      endDate || null,
      routeUrl !== undefined ? 1 : null,
      routeUrl || null,
      newVersion,
      now,
      id,
      userId
    );

    return { id, version: newVersion, updatedAt: now };
  });

  // Duplicate trip
  fastify.post('/:id/duplicate', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const original = db.prepare('SELECT * FROM trips WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(id, userId) as any;
    if (!original) {
      return reply.status(404).send({ error: 'Původní cesta nebyla nalezena.' });
    }

    const newTripId = `trip_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO trips (id, owner_id, title, motto, status, start_date, end_date, bounding_box, version, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'planning', ?, ?, ?, 1, 0, ?, ?)
    `).run(
      newTripId,
      userId,
      `${original.title} (Kopie)`,
      original.motto,
      original.start_date,
      original.end_date,
      original.bounding_box,
      now,
      now
    );

    // Duplicate stages
    const stageMap = new Map<string, string>();
    const originalStages = db.prepare('SELECT * FROM stages WHERE trip_id = ?').all(id) as any[];
    for (const stg of originalStages) {
      const newStageId = `stg_${crypto.randomUUID()}`;
      stageMap.set(stg.id, newStageId);
      db.prepare(`
        INSERT INTO stages (id, trip_id, title, notes, sort_order, has_detail, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(newStageId, newTripId, stg.title, stg.notes, stg.sort_order, stg.has_detail, now, now);
    }

    // Duplicate days
    const dayMap = new Map<string, string>();
    const originalDays = db.prepare('SELECT * FROM days WHERE trip_id = ?').all(id) as any[];
    for (const d of originalDays) {
      const newDayId = `day_${crypto.randomUUID()}`;
      dayMap.set(d.id, newDayId);
      const mappedStageId = d.stage_id ? stageMap.get(d.stage_id) || null : null;
      db.prepare(`
        INSERT INTO days (id, trip_id, stage_id, day_number, specific_date, title, notes, has_detail, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(newDayId, newTripId, mappedStageId, d.day_number, d.specific_date, d.title, d.notes, d.has_detail, now, now);
    }

    // Duplicate POIs
    const originalPois = db.prepare('SELECT * FROM pois WHERE trip_id = ? AND is_deleted = 0').all(id) as any[];
    for (const p of originalPois) {
      const newPoiId = `poi_${crypto.randomUUID()}`;
      const mappedStageId = p.stage_id ? stageMap.get(p.stage_id) || null : null;
      const mappedDayId = p.day_id ? dayMap.get(p.day_id) || null : null;

      db.prepare(`
        INSERT INTO pois (
          id, trip_id, stage_id, day_id, category_id, name, is_top, lat, lng,
          address, description, private_notes, opening_hours, source_url, external_links,
          time_mode, target_time, visit_status, notification_config, main_photo_url,
          photos, sort_order, version, is_deleted, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, 1, 0, ?, ?
        )
      `).run(
        newPoiId,
        newTripId,
        mappedStageId,
        mappedDayId,
        p.category_id,
        p.name,
        p.is_top,
        p.lat,
        p.lng,
        p.address,
        p.description,
        p.private_notes,
        p.opening_hours,
        p.source_url,
        p.external_links,
        p.time_mode,
        p.target_time,
        p.visit_status,
        p.notification_config,
        p.main_photo_url,
        p.photos,
        p.sort_order,
        now,
        now
      );
    }

    return { id: newTripId, title: `${original.title} (Kopie)` };
  });

  // Soft delete trip
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(id, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE trips SET is_deleted = 1, updated_at = ? WHERE id = ?').run(now, id);
    return { success: true, id };
  });

  // Create stage in trip
  fastify.post('/:id/stages', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { title, notes, hasDetail = false } = request.body as { title: string; notes?: string; hasDetail?: boolean };

    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Název etapy je povinný.' });
    }

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(id, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const maxOrder = (
      db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM stages WHERE trip_id = ?').get(id) as any
    ).max_order;

    const stageId = `stg_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO stages (id, trip_id, title, notes, sort_order, has_detail, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(stageId, id, title.trim(), notes || null, maxOrder + 1, hasDetail ? 1 : 0, now, now);

    return { id: stageId, tripId: id, title: title.trim(), notes, sortOrder: maxOrder + 1, hasDetail };
  });

  // Delete stage
  fastify.delete('/:id/stages/:stageId', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id, stageId } = request.params as { id: string; stageId: string };

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(id, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    // Set stage_id = NULL on affected pois
    db.prepare('UPDATE pois SET stage_id = NULL WHERE stage_id = ? AND trip_id = ?').run(stageId, id);
    // Delete stage
    db.prepare('DELETE FROM stages WHERE id = ? AND trip_id = ?').run(stageId, id);

    return { success: true, stageId };
  });
};
