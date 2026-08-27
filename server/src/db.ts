import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { hashPassword } from './auth.js';

const DB_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'taktudy.db');
export const db = new DatabaseSync(DB_PATH);

export function initDatabase() {
  // Foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Trips table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      motto TEXT,
      status TEXT NOT NULL DEFAULT 'planning',
      start_date TEXT,
      end_date TEXT,
      bounding_box TEXT,
      route_url TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec('ALTER TABLE trips ADD COLUMN route_url TEXT;');
  } catch {}

  // Stages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      has_detail INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
  `);

  // Days table
  db.exec(`
    CREATE TABLE IF NOT EXISTS days (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      stage_id TEXT,
      day_number INTEGER NOT NULL,
      specific_date TEXT,
      title TEXT NOT NULL,
      notes TEXT,
      has_detail INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE SET NULL
    );
  `);

  // Sub-routes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sub_routes (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      day_id TEXT,
      title TEXT NOT NULL,
      coordinates TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE SET NULL
    );
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      label_cs TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      default_color TEXT NOT NULL
    );
  `);

  // POIs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pois (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      stage_id TEXT,
      day_id TEXT,
      sub_route_id TEXT,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_top INTEGER NOT NULL DEFAULT 0,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT,
      description TEXT,
      private_notes TEXT,
      opening_hours TEXT,
      source_url TEXT,
      external_links TEXT,
      time_mode TEXT NOT NULL DEFAULT 'none',
      target_time TEXT,
      visit_status TEXT NOT NULL DEFAULT 'unvisited',
      notification_config TEXT,
      main_photo_url TEXT,
      photos TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE SET NULL,
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  // Share tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS share_tokens (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      include_notes INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
  `);

  // Seed default categories
  const categories = [
    { id: 'accommodation', label_cs: 'Ubytování / Hotel', icon_name: 'Bed', default_color: '#006D77' },
    { id: 'food', label_cs: 'Jídlo / Restaurace', icon_name: 'Utensils', default_color: '#D9544D' },
    { id: 'bar', label_cs: 'Bar / Vinárna / Kavárna', icon_name: 'Wine', default_color: '#9C27B0' },
    { id: 'monument', label_cs: 'Památka / Hrad / Chrám', icon_name: 'Landmark', default_color: '#E65100' },
    { id: 'view', label_cs: 'Vyhlídka / Panorama', icon_name: 'Eye', default_color: '#0288D1' },
    { id: 'nature', label_cs: 'Příroda / Park / Pláž', icon_name: 'Trees', default_color: '#2E7D32' },
    { id: 'transport', label_cs: 'Doprava / Nádraží / Vlak', icon_name: 'Train', default_color: '#455A64' },
    { id: 'other', label_cs: 'Ostatní místa', icon_name: 'MapPin', default_color: '#546E7A' },
  ];

  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO categories (id, label_cs, icon_name, default_color)
    VALUES (?, ?, ?, ?)
  `);

  for (const cat of categories) {
    insertCat.run(cat.id, cat.label_cs, cat.icon_name, cat.default_color);
  }

  // Seed demo user and trip if empty
  seedDemoData();
}

function seedDemoData() {
  const checkUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@taktudy.app');
  if (checkUser) return;

  const now = new Date().toISOString();
  const userId = 'usr_demo_001';
  const tripId = 'trip_srilanka_001';

  // Demo user
  db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, 'demo@taktudy.app', hashPassword('heslo123'), 'Cestovatelka Jana', now);

  // Demo trip: Srí Lanka — okruh
  db.prepare(`
    INSERT INTO trips (id, owner_id, title, motto, status, start_date, end_date, bounding_box, version, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).run(
    tripId,
    userId,
    'Srí Lanka — okruh',
    'Plánuji, abych měla svobodu.',
    'traveling',
    '2026-09-01',
    '2026-09-14',
    JSON.stringify([80.5, 6.8, 81.2, 7.3]),
    now,
    now
  );

  // Stages
  const stage1Id = 'stg_kandy_01';
  const stage2Id = 'stg_ella_02';

  db.prepare(`
    INSERT INTO stages (id, trip_id, title, notes, sort_order, has_detail, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, 1, 1, ?, ?)
  `).run(stage1Id, tripId, 'Kandy a okolí', 'Kulturní centrum, chrámy a výchozí bod slavného vlaku.', now, now);

  db.prepare(`
    INSERT INTO stages (id, trip_id, title, notes, sort_order, has_detail, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, 2, 0, 1, ?, ?)
  `).run(stage2Id, tripId, 'Ella a čajové plantáže', 'Hory, mosty a pohodová atmosféra.', now, now);

  // Days
  const day4Id = 'day_sri_04';
  db.prepare(`
    INSERT INTO days (id, trip_id, stage_id, day_number, specific_date, title, notes, has_detail, version, created_at, updated_at)
    VALUES (?, ?, ?, 4, '2026-09-04', 'Kandy → Ella (Scénický vlak)', 'Dnešní přesun legendárním modrým vlakem přes vysočinu.', 1, 1, ?, ?)
  `).run(day4Id, tripId, stage1Id, now, now);

  // POIs
  const pois = [
    {
      id: 'poi_kandy_station',
      trip_id: tripId,
      stage_id: stage1Id,
      day_id: day4Id,
      category_id: 'transport',
      name: 'Kandy Railway Station',
      is_top: 0,
      lat: 7.2906,
      lng: 80.6289,
      address: 'Station Rd, Kandy, Sri Lanka',
      description: 'Hlavní nádraží v Kandy. Koupit vodu a čerstvé ovoce do vlaku.',
      private_notes: 'Lístky 2. třídy rezervované online. Vyzvednout fyzický lístek u okénka č. 3.',
      opening_hours: '05:00 - 20:00',
      source_url: 'https://railway.gov.lk',
      time_mode: 'fixed',
      target_time: '13:50',
      visit_status: 'unvisited',
      main_photo_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      sort_order: 1,
    },
    {
      id: 'poi_train_ella',
      trip_id: tripId,
      stage_id: stage1Id,
      day_id: day4Id,
      category_id: 'transport',
      name: 'Vlak Kandy → Ella (Main Line)',
      is_top: 1,
      lat: 7.15,
      lng: 80.75,
      address: 'Scenic Train Route',
      description: 'Jedna z nejkrásnějších železničních tras světa skrz čajovníková pole a mlžné hory.',
      private_notes: 'Sedět vpravo ve směru jízdy pro nejlepší výhledy do údolí!',
      time_mode: 'fixed',
      target_time: '14:37',
      visit_status: 'unvisited',
      main_photo_url: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=800&q=80',
      sort_order: 2,
    },
    {
      id: 'poi_nine_arches',
      trip_id: tripId,
      stage_id: stage2Id,
      day_id: day4Id,
      category_id: 'monument',
      name: 'Nine Arches Bridge',
      is_top: 1,
      lat: 6.8767,
      lng: 81.0608,
      address: 'Demodara, Ella, Sri Lanka',
      description: 'Ikonický viadukt postavený výhradně z cihel a kamene bez oceli uprostřed džungle.',
      private_notes: 'Příjezd vlaku v 17:15. Skvělá kavárna na svahu Asanka Cafe.',
      opening_hours: 'Přístupno 24/7',
      time_mode: 'approximate',
      target_time: '17:00',
      visit_status: 'unvisited',
      main_photo_url: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=800&q=80',
      sort_order: 3,
    },
    {
      id: 'poi_cafe_chill',
      trip_id: tripId,
      stage_id: stage2Id,
      day_id: day4Id,
      category_id: 'food',
      name: 'Cafe Chill Ella',
      is_top: 0,
      lat: 6.8667,
      lng: 81.0465,
      address: 'Wellawaya Rd, Ella',
      description: 'Skvělá restaurace v centru Elly s venkovní terasou a autentickým lankan curry.',
      private_notes: 'Zkusit Lamprais a čerstvý mango smoothie.',
      opening_hours: '10:00 - 23:00',
      time_mode: 'approximate',
      target_time: '19:30',
      visit_status: 'unvisited',
      main_photo_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      sort_order: 4,
    },
  ];

  const insertPoi = db.prepare(`
    INSERT INTO pois (
      id, trip_id, stage_id, day_id, category_id, name, is_top, lat, lng,
      address, description, private_notes, opening_hours, source_url,
      time_mode, target_time, visit_status, main_photo_url, sort_order,
      version, is_deleted, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      1, 0, ?, ?
    )
  `);

  for (const poi of pois) {
    insertPoi.run(
      poi.id,
      poi.trip_id,
      poi.stage_id,
      poi.day_id,
      poi.category_id,
      poi.name,
      poi.is_top,
      poi.lat,
      poi.lng,
      poi.address || null,
      poi.description || null,
      poi.private_notes || null,
      poi.opening_hours || null,
      poi.source_url || null,
      poi.time_mode,
      poi.target_time || null,
      poi.visit_status,
      poi.main_photo_url || null,
      poi.sort_order,
      now,
      now
    );
  }
}
