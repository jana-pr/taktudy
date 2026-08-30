import { FastifyPluginAsync } from 'fastify';
import { db, saveTripsBackupToJson } from '../db.js';
import { z } from 'zod';
import crypto from 'node:crypto';

const ReminderSchema = z.object({
  title: z.string().min(1, 'Název připomínky nesmí být prázdný'),
  category: z.enum(['restaurant', 'tickets', 'transport', 'activity', 'general']).default('general'),
  remind_at: z.string().min(1, 'Datum a čas připomínky je povinné'),
  notes: z.string().nullable().optional(),
  is_completed: z.boolean().default(false),
});

const UpdateReminderSchema = ReminderSchema.partial();

export const remindersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /:tripId/reminders
  fastify.get('/:tripId/reminders', async (request, reply) => {
    const { tripId } = request.params as { tripId: string };
    const userId = (request.user as any).id;

    // Verify trip ownership
    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const reminders = db
      .prepare('SELECT * FROM reminders WHERE trip_id = ? ORDER BY remind_at ASC, created_at ASC')
      .all(tripId)
      .map((r: any) => ({
        ...r,
        is_completed: Boolean(r.is_completed),
        notification_sent: Boolean(r.notification_sent),
      }));

    return reminders;
  });

  // POST /:tripId/reminders
  fastify.post('/:tripId/reminders', async (request, reply) => {
    const { tripId } = request.params as { tripId: string };
    const userId = (request.user as any).id;

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const parse = ReminderSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data pro připomínku.', details: parse.error.issues });
    }

    const { title, category, remind_at, notes, is_completed } = parse.data;
    const id = `rem_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reminders (
        id, trip_id, title, category, remind_at, notes, is_completed, notification_sent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, tripId, title, category, remind_at, notes || null, is_completed ? 1 : 0, now, now);

    saveTripsBackupToJson();

    const created = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as any;
    return reply.status(201).send({
      ...created,
      is_completed: Boolean(created.is_completed),
      notification_sent: Boolean(created.notification_sent),
    });
  });

  // PUT /:tripId/reminders/:id
  fastify.put('/:tripId/reminders/:id', async (request, reply) => {
    const { tripId, id } = request.params as { tripId: string; id: string };
    const userId = (request.user as any).id;

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND trip_id = ?').get(id, tripId) as any;
    if (!reminder) {
      return reply.status(404).send({ error: 'Připomínka nebyla nalezena.' });
    }

    const parse = UpdateReminderSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data pro úpravu.', details: parse.error.issues });
    }

    const data = parse.data;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE reminders SET
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        remind_at = COALESCE(?, remind_at),
        notes = COALESCE(?, notes),
        is_completed = CASE WHEN ? IS NOT NULL THEN ? ELSE is_completed END,
        updated_at = ?
      WHERE id = ? AND trip_id = ?
    `).run(
      data.title ?? null,
      data.category ?? null,
      data.remind_at ?? null,
      data.notes !== undefined ? (data.notes || null) : null,
      data.is_completed !== undefined ? (data.is_completed ? 1 : 0) : null,
      data.is_completed !== undefined ? (data.is_completed ? 1 : 0) : null,
      now,
      id,
      tripId
    );

    saveTripsBackupToJson();

    const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as any;
    return {
      ...updated,
      is_completed: Boolean(updated.is_completed),
      notification_sent: Boolean(updated.notification_sent),
    };
  });

  // POST /:tripId/reminders/:id/toggle
  fastify.post('/:tripId/reminders/:id/toggle', async (request, reply) => {
    const { tripId, id } = request.params as { tripId: string; id: string };
    const userId = (request.user as any).id;

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND trip_id = ?').get(id, tripId) as any;
    if (!reminder) {
      return reply.status(404).send({ error: 'Připomínka nebyla nalezena.' });
    }

    const newCompleted = reminder.is_completed ? 0 : 1;
    const now = new Date().toISOString();

    db.prepare('UPDATE reminders SET is_completed = ?, updated_at = ? WHERE id = ?').run(newCompleted, now, id);
    saveTripsBackupToJson();

    return {
      ...reminder,
      is_completed: Boolean(newCompleted),
      notification_sent: Boolean(reminder.notification_sent),
      updated_at: now,
    };
  });

  // DELETE /:tripId/reminders/:id
  fastify.delete('/:tripId/reminders/:id', async (request, reply) => {
    const { tripId, id } = request.params as { tripId: string; id: string };
    const userId = (request.user as any).id;

    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(tripId, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const res = db.prepare('DELETE FROM reminders WHERE id = ? AND trip_id = ?').run(id, tripId);
    if (res.changes === 0) {
      return reply.status(404).send({ error: 'Připomínka nebyla nalezena.' });
    }

    saveTripsBackupToJson();
    return { success: true };
  });
};
