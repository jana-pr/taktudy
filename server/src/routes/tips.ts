import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { db } from '../db.js';

export const tipsRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication check for all tips endpoints
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Neautorizovaný přístup.' });
    }
  });

  // GET /api/tips - list user's tips
  fastify.get('/', async (request) => {
    const userId = (request.user as any).id;
    const { trip_id } = request.query as { trip_id?: string };

    let query = `
      SELECT t.*, c.label_cs as category_label, c.icon_name as category_icon, c.default_color as category_color
      FROM tips t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE (t.user_id = ? OR t.user_id = 'usr_demo_001')
    `;
    const params: any[] = [userId];

    if (trip_id) {
      query += ' AND (t.trip_id = ? OR t.trip_id IS NULL)';
      params.push(trip_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const tips = db.prepare(query).all(...params);
    return tips;
  });

  // POST /api/tips - create new tip
  fastify.post('/', async (request, reply) => {
    const userId = (request.user as any).id;
    const {
      title,
      category_id = 'other',
      location_name,
      lat,
      lng,
      notes,
      source_url,
      photo_url,
      trip_id,
    } = request.body as any;

    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Název místa / tipu je povinný.' });
    }

    const tipId = `tip_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const validCategories = new Set([
      'accommodation', 'food', 'bar', 'monument', 'view', 'nature', 'transport', 'other'
    ]);
    const validCat = validCategories.has(category_id) ? category_id : 'other';

    db.prepare(`
      INSERT INTO tips (
        id, user_id, trip_id, title, category_id, location_name,
        lat, lng, notes, source_url, photo_url, is_used, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      tipId,
      userId,
      trip_id || null,
      title.trim(),
      validCat,
      location_name ? location_name.trim() : null,
      typeof lat === 'number' ? lat : (lat ? parseFloat(lat) : null),
      typeof lng === 'number' ? lng : (lng ? parseFloat(lng) : null),
      notes ? notes.trim() : null,
      source_url ? source_url.trim() : null,
      photo_url ? photo_url.trim() : null,
      now,
      now
    );

    const created = db.prepare(`
      SELECT t.*, c.label_cs as category_label, c.icon_name as category_icon, c.default_color as category_color
      FROM tips t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(tipId);

    return created;
  });

  // PUT /api/tips/:id - update tip
  fastify.put('/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const {
      title,
      category_id,
      location_name,
      lat,
      lng,
      notes,
      source_url,
      photo_url,
      is_used,
    } = request.body as any;

    const existing = db.prepare(`SELECT * FROM tips WHERE id = ? AND (user_id = ? OR user_id = 'usr_demo_001')`).get(id, userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Tip nebyl nalezen.' });
    }

    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (title !== undefined) { fields.push('title = ?'); values.push(title.trim()); }
    if (category_id !== undefined) { fields.push('category_id = ?'); values.push(category_id); }
    if (location_name !== undefined) { fields.push('location_name = ?'); values.push(location_name); }
    if (lat !== undefined) { fields.push('lat = ?'); values.push(typeof lat === 'number' ? lat : parseFloat(lat)); }
    if (lng !== undefined) { fields.push('lng = ?'); values.push(typeof lng === 'number' ? lng : parseFloat(lng)); }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
    if (source_url !== undefined) { fields.push('source_url = ?'); values.push(source_url); }
    if (photo_url !== undefined) { fields.push('photo_url = ?'); values.push(photo_url); }
    if (is_used !== undefined) { fields.push('is_used = ?'); values.push(is_used ? 1 : 0); }

    values.push(id);
    db.prepare(`UPDATE tips SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(`
      SELECT t.*, c.label_cs as category_label, c.icon_name as category_icon, c.default_color as category_color
      FROM tips t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    return updated;
  });

  // DELETE /api/tips/:id - delete tip
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const existing = db.prepare(`SELECT id FROM tips WHERE id = ? AND (user_id = ? OR user_id = 'usr_demo_001')`).get(id, userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Tip nebyl nalezen.' });
    }

    db.prepare('DELETE FROM tips WHERE id = ?').run(id);
    return { success: true, id };
  });

  // POST /api/tips/:id/promote-to-poi - Promote a tip into a trip itinerary POI
  fastify.post('/:id/promote-to-poi', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { tripId, dayId } = request.body as { tripId: string; dayId: string };

    if (!tripId || !dayId) {
      return reply.status(400).send({ error: 'Vyberte prosím cestu a den pro zařazení tipu.' });
    }

    const tip = db.prepare(`SELECT * FROM tips WHERE id = ? AND (user_id = ? OR user_id = 'usr_demo_001')`).get(id, userId) as any;
    if (!tip) {
      return reply.status(404).send({ error: 'Tip nebyl nalezen.' });
    }

    const now = new Date().toISOString();
    const poiId = `poi_${crypto.randomUUID()}`;

    // Get max sort order in that day
    const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM pois WHERE trip_id = ? AND day_id = ?').get(tripId, dayId) as any)?.m || 0;

    // Insert POI
    db.prepare(`
      INSERT INTO pois (
        id, trip_id, day_id, category_id, name, lat, lng,
        description, why_visit, source_url, main_photo_url, cost_est, cost_currency, cost_category,
        is_mandatory, is_enabled, data_origin, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'USD', 'activities', 0, 1, 'imported', ?, ?, ?)
    `).run(
      poiId,
      tripId,
      dayId,
      tip.category_id || 'other',
      tip.title,
      tip.lat || 0,
      tip.lng || 0,
      tip.notes || null,
      tip.notes || 'Přidáno ze Zásobárny tipů',
      tip.source_url || null,
      tip.photo_url || null,
      maxSort + 1,
      now,
      now
    );

    // Mark tip as used
    db.prepare('UPDATE tips SET is_used = 1, trip_id = ?, updated_at = ? WHERE id = ?').run(tripId, now, id);

    return {
      success: true,
      poiId,
      tripId,
      dayId,
      message: `Tip „${tip.title}“ byl úspěšně přidán do itineráře.`,
    };
  });
};
