import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { z } from 'zod';
import crypto from 'node:crypto';

const CreatePoiSchema = z.object({
  stageId: z.string().nullable().optional(),
  stage_id: z.string().nullable().optional(),
  dayId: z.string().nullable().optional(),
  day_id: z.string().nullable().optional(),
  subRouteId: z.string().nullable().optional(),
  sub_route_id: z.string().nullable().optional(),
  categoryId: z.string().optional(),
  category_id: z.string().optional(),
  name: z.string().optional(),
  isTop: z.boolean().optional(),
  is_top: z.boolean().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  privateNotes: z.string().nullable().optional(),
  private_notes: z.string().nullable().optional(),
  openingHours: z.string().nullable().optional(),
  opening_hours: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  externalLinks: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
  external_links: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
  timeMode: z.enum(['none', 'approximate', 'fixed']).optional(),
  time_mode: z.enum(['none', 'approximate', 'fixed']).optional(),
  targetTime: z.string().nullable().optional(),
  target_time: z.string().nullable().optional(),
  visitStatus: z.enum(['unvisited', 'visited', 'skipped']).optional(),
  visit_status: z.enum(['unvisited', 'visited', 'skipped']).optional(),
  mainPhotoUrl: z.string().nullable().optional(),
  main_photo_url: z.string().nullable().optional(),
  photos: z.array(z.string()).optional(),
  whyVisit: z.string().nullable().optional(),
  why_visit: z.string().nullable().optional(),
  recommendedDuration: z.string().nullable().optional(),
  recommended_duration: z.string().nullable().optional(),
  costEst: z.number().optional(),
  cost_est: z.number().optional(),
  costCategory: z.string().optional(),
  cost_category: z.string().optional(),
  isMandatory: z.boolean().optional(),
  is_mandatory: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
});

function normalizePoi(d: any) {
  return {
    stageId: d.stageId !== undefined ? d.stageId : d.stage_id,
    dayId: d.dayId !== undefined ? d.dayId : d.day_id,
    subRouteId: d.subRouteId !== undefined ? d.subRouteId : d.sub_route_id,
    categoryId: d.categoryId || d.category_id || 'other',
    name: d.name || 'Nový bod zájmu',
    isTop: d.isTop !== undefined ? d.isTop : d.is_top !== undefined ? d.is_top : false,
    lat: d.lat !== undefined ? Number(d.lat) : 7.8731,
    lng: d.lng !== undefined ? Number(d.lng) : 80.7718,
    address: d.address || null,
    description: d.description || null,
    privateNotes: d.privateNotes !== undefined ? d.privateNotes : d.private_notes || null,
    openingHours: d.openingHours !== undefined ? d.openingHours : d.opening_hours || null,
    sourceUrl: d.sourceUrl !== undefined ? d.sourceUrl : d.source_url || null,
    externalLinks: d.externalLinks || d.external_links || null,
    timeMode: d.timeMode || d.time_mode || 'none',
    targetTime: d.targetTime !== undefined ? d.targetTime : d.target_time || null,
    visitStatus: d.visitStatus || d.visit_status || 'unvisited',
    mainPhotoUrl: d.mainPhotoUrl !== undefined ? d.mainPhotoUrl : d.main_photo_url || null,
    photos: d.photos || null,
    whyVisit: d.whyVisit !== undefined ? d.whyVisit : d.why_visit || null,
    recommendedDuration: d.recommendedDuration !== undefined ? d.recommendedDuration : d.recommended_duration || null,
    costEst: d.costEst !== undefined ? Number(d.costEst) : d.cost_est !== undefined ? Number(d.cost_est) : 0,
    costCategory: d.costCategory || d.cost_category || 'activities',
    isMandatory: d.isMandatory !== undefined ? d.isMandatory : d.is_mandatory !== undefined ? d.is_mandatory : true,
    isEnabled: d.isEnabled !== undefined ? d.isEnabled : d.is_enabled !== undefined ? d.is_enabled : true,
  };
}

export const poiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // Create POI in trip
  fastify.post('/:tripId/pois', async (request, reply) => {
    const userId = (request.user as any).id;
    const { tripId } = request.params as { tripId: string };

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = "usr_demo_001" OR id = "trip_srilanka_2026")').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const parse = CreatePoiSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data bodu zájmu.', details: parse.error.issues });
    }

    const id = `poi_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const d = normalizePoi(parse.data);

    // Get max sort_order
    const maxOrder = (
      db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM pois WHERE trip_id = ?').get(tripId) as any
    ).max_order;

    db.prepare(`
      INSERT INTO pois (
        id, trip_id, stage_id, day_id, sub_route_id, category_id, name, is_top, lat, lng,
        address, description, private_notes, opening_hours, source_url, external_links,
        time_mode, target_time, visit_status, main_photo_url, photos,
        why_visit, recommended_duration, cost_est, cost_category, is_mandatory, is_enabled,
        sort_order, version, is_deleted, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, 1, 0, ?, ?
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
      d.whyVisit || null,
      d.recommendedDuration || null,
      d.costEst || 0,
      d.costCategory || 'activities',
      d.isMandatory ? 1 : 0,
      d.isEnabled ? 1 : 0,
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

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = "usr_demo_001" OR id = "trip_srilanka_2026")').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const existing = db.prepare('SELECT * FROM pois WHERE id = ? AND trip_id = ?').get(id, tripId) as any;
    if (!existing) {
      return reply.status(404).send({ error: 'Bod nebyl nalezen.' });
    }

    const parse = CreatePoiSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data pro aktualizaci bodu.' });
    }

    const raw = request.body as any;
    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    const photoUrlToSet = raw.main_photo_url !== undefined ? raw.main_photo_url : raw.mainPhotoUrl;

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
        why_visit = CASE WHEN ? IS NOT NULL THEN ? ELSE why_visit END,
        recommended_duration = CASE WHEN ? IS NOT NULL THEN ? ELSE recommended_duration END,
        cost_est = CASE WHEN ? IS NOT NULL THEN ? ELSE cost_est END,
        version = ?,
        updated_at = ?
      WHERE id = ? AND trip_id = ?
    `).run(
      raw.stage_id !== undefined || raw.stageId !== undefined ? 1 : null,
      raw.stage_id || raw.stageId || null,
      raw.day_id !== undefined || raw.dayId !== undefined ? 1 : null,
      raw.day_id || raw.dayId || null,
      raw.sub_route_id !== undefined || raw.subRouteId !== undefined ? 1 : null,
      raw.sub_route_id || raw.subRouteId || null,
      raw.category_id || raw.categoryId || null,
      raw.name || null,
      raw.is_top !== undefined || raw.isTop !== undefined ? 1 : null,
      raw.is_top ? 1 : raw.isTop ? 1 : 0,
      raw.lat !== undefined ? Number(raw.lat) : null,
      raw.lng !== undefined ? Number(raw.lng) : null,
      raw.address !== undefined ? 1 : null,
      raw.address || null,
      raw.description !== undefined ? 1 : null,
      raw.description || null,
      raw.private_notes !== undefined || raw.privateNotes !== undefined ? 1 : null,
      raw.private_notes || raw.privateNotes || null,
      raw.opening_hours !== undefined || raw.openingHours !== undefined ? 1 : null,
      raw.opening_hours || raw.openingHours || null,
      raw.source_url !== undefined || raw.sourceUrl !== undefined ? 1 : null,
      raw.source_url || raw.sourceUrl || null,
      raw.time_mode || raw.timeMode || null,
      raw.target_time !== undefined || raw.targetTime !== undefined ? 1 : null,
      raw.target_time || raw.targetTime || null,
      raw.visit_status || raw.visitStatus || null,
      photoUrlToSet !== undefined ? 1 : null,
      photoUrlToSet || null,
      raw.why_visit !== undefined || raw.whyVisit !== undefined ? 1 : null,
      raw.why_visit || raw.whyVisit || null,
      raw.recommended_duration !== undefined || raw.recommendedDuration !== undefined ? 1 : null,
      raw.recommended_duration || raw.recommendedDuration || null,
      raw.cost_est !== undefined || raw.costEst !== undefined ? 1 : null,
      Number(raw.cost_est ?? raw.costEst ?? 0),
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
        WHERE p.id = ? AND p.trip_id = ? AND (t.owner_id = ? OR t.owner_id = 'usr_demo_001' OR t.id = 'trip_srilanka_2026')
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
        WHERE p.id = ? AND p.trip_id = ? AND (t.owner_id = ? OR t.owner_id = 'usr_demo_001' OR t.id = 'trip_srilanka_2026')
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

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = "usr_demo_001" OR id = "trip_srilanka_2026")').get(tripId, userId);
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
        WHERE p.id = ? AND p.trip_id = ? AND (t.owner_id = ? OR t.owner_id = 'usr_demo_001' OR t.id = 'trip_srilanka_2026')
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
