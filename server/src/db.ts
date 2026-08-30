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
      country_region TEXT,
      travelers_count INTEGER NOT NULL DEFAULT 3,
      primary_transport TEXT DEFAULT 'Private car + driver',
      room_scenario TEXT DEFAULT '2+1',
      budget_currency TEXT DEFAULT 'USD',
      notes TEXT,
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
      start_location TEXT,
      overnight_location TEXT,
      transit_time_est TEXT,
      distance_km REAL DEFAULT 0,
      transport_mode TEXT,
      recommended_departure TEXT,
      activities TEXT,
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
      is_mandatory INTEGER NOT NULL DEFAULT 1,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      why_visit TEXT,
      recommended_duration TEXT,
      cost_est REAL DEFAULT 0,
      cost_currency TEXT DEFAULT 'USD',
      cost_category TEXT DEFAULT 'activities',
      data_origin TEXT DEFAULT 'user',
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

  // Accommodations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accommodations (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      day_id TEXT,
      hotel_name TEXT NOT NULL,
      location TEXT,
      lat REAL,
      lng REAL,
      booking_url TEXT,
      price_total REAL DEFAULT 0,
      price_single REAL DEFAULT 0,
      price_currency TEXT DEFAULT 'USD',
      rooms_count INTEGER DEFAULT 2,
      room_type TEXT,
      breakfast_included INTEGER DEFAULT 1,
      cancellation_policy TEXT,
      booking_status TEXT DEFAULT 'confirmed',
      booking_reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE SET NULL
    );
  `);

  // Bookings / Vouchers / Tickets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      title TEXT NOT NULL,
      provider TEXT,
      confirmation_number TEXT,
      booking_date TEXT,
      start_datetime TEXT,
      end_datetime TEXT,
      price REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'confirmed',
      contact_phone TEXT,
      contact_email TEXT,
      document_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
  `);

  // Transport services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transport_services (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      provider TEXT,
      total_price REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      includes_description TEXT,
      split_between INTEGER DEFAULT 3,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
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

  // Tips / Wishlist table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      trip_id TEXT,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL DEFAULT 'other',
      location_name TEXT,
      lat REAL,
      lng REAL,
      notes TEXT,
      source_url TEXT,
      photo_url TEXT,
      is_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
    );
  `);

  // Run dynamic migrations safely
  runMigrations();

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

  // Seed demo user and trips
  seedDemoData();
}

function runMigrations() {
  const migrations = [
    'ALTER TABLE trips ADD COLUMN route_url TEXT;',
    'ALTER TABLE trips ADD COLUMN country_region TEXT;',
    'ALTER TABLE trips ADD COLUMN travelers_count INTEGER DEFAULT 3;',
    "ALTER TABLE trips ADD COLUMN primary_transport TEXT DEFAULT 'Private car + driver';",
    "ALTER TABLE trips ADD COLUMN room_scenario TEXT DEFAULT '2+1';",
    "ALTER TABLE trips ADD COLUMN budget_currency TEXT DEFAULT 'USD';",
    'ALTER TABLE trips ADD COLUMN notes TEXT;',

    'ALTER TABLE days ADD COLUMN start_location TEXT;',
    'ALTER TABLE days ADD COLUMN overnight_location TEXT;',
    'ALTER TABLE days ADD COLUMN transit_time_est TEXT;',
    'ALTER TABLE days ADD COLUMN distance_km REAL DEFAULT 0;',
    'ALTER TABLE days ADD COLUMN transport_mode TEXT;',
    'ALTER TABLE days ADD COLUMN recommended_departure TEXT;',
    'ALTER TABLE days ADD COLUMN activities TEXT;',

    'ALTER TABLE pois ADD COLUMN is_mandatory INTEGER DEFAULT 1;',
    'ALTER TABLE pois ADD COLUMN is_enabled INTEGER DEFAULT 1;',
    'ALTER TABLE pois ADD COLUMN why_visit TEXT;',
    'ALTER TABLE pois ADD COLUMN recommended_duration TEXT;',
    'ALTER TABLE pois ADD COLUMN cost_est REAL DEFAULT 0;',
    "ALTER TABLE pois ADD COLUMN cost_currency TEXT DEFAULT 'USD';",
    "ALTER TABLE pois ADD COLUMN cost_category TEXT DEFAULT 'activities';",
    "ALTER TABLE pois ADD COLUMN data_origin TEXT DEFAULT 'user';",

    'ALTER TABLE accommodations ADD COLUMN lat REAL;',
    'ALTER TABLE accommodations ADD COLUMN lng REAL;',
    'ALTER TABLE tips ADD COLUMN photo_url TEXT;',
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {}
  }

  // Backfill accommodation GPS coordinates based on known location keywords
  const locationCoords: Record<string, [number, number]> = {
    'negombo': [7.2089, 79.8358],
    'habarana': [8.0336, 80.7516],
    'kandy': [7.2906, 80.6337],
    'nuwara eliya': [6.9697, 80.7674],
    'ella': [6.8667, 81.0466],
    'tissamaharama': [6.2778, 81.2861],
    'yala': [6.2778, 81.2861],
    'mirissa': [5.9482, 80.4568],
    'katunayake': [7.1650, 79.8880],
    'colombo': [7.1650, 79.8880],
  };

  for (const [loc, [lat, lng]] of Object.entries(locationCoords)) {
    try {
      db.prepare(`
        UPDATE accommodations
        SET lat = ?, lng = ?
        WHERE (lat IS NULL OR lng IS NULL) AND LOWER(location) LIKE ?
      `).run(lat, lng, `%${loc}%`);
    } catch {}
  }
}

function seedDemoData() {
  let user = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@taktudy.app') as any;
  const now = new Date().toISOString();

  if (!user) {
    const userId = 'usr_demo_001';
    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, 'demo@taktudy.app', hashPassword('heslo123'), 'Cestovatelka Jana', now);
    user = { id: userId };
  }

  // Check if Sri Lanka 2026/2027 trip exists
  const checkTrip = db.prepare('SELECT id FROM trips WHERE id = ?').get('trip_srilanka_2026');
  if (!checkTrip) {
    seedSriLanka2026Trip(user.id);
  }

  // Seed demo bookings if empty
  try {
    const bookingsCount = (db.prepare('SELECT COUNT(*) as c FROM bookings WHERE trip_id = ?').get('trip_srilanka_2026') as any)?.c || 0;
    if (bookingsCount === 0) {
      const insertBooking = db.prepare(`
        INSERT INTO bookings (
          id, trip_id, type, title, provider, confirmation_number, booking_date,
          price, currency, status, contact_phone, contact_email, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?)
      `);

      insertBooking.run(
        'bkg_1',
        'trip_srilanka_2026',
        'transport',
        'Soukromé auto s anglicky mluvícím řidičem (15 dní)',
        'Lanka Travel Drivers Co.',
        'LTD-2026-SRI-091',
        '2026-11-15',
        855,
        'confirmed',
        '+94 77 123 4567',
        'driver@lankatravel.lk',
        'Zahrnuje: auto, řidiče, palivo, mýtné, ubytování i stravu řidiče a převoz zavazadel.',
        now,
        now
      );

      insertBooking.run(
        'bkg_2',
        'trip_srilanka_2026',
        'train',
        'Scénický horský vlak: Kandy → Ella (1. třída vyhlídkový vůz)',
        'Sri Lanka Railways',
        'SLR-2027-EX-408',
        '2026-12-01',
        45,
        'confirmed',
        '+94 11 242 1281',
        'reservations@railway.gov.lk',
        'Rezervovaná sedadla v 1. třídě vyhlídkového vagónu Observation Saloon.',
        now,
        now
      );

      insertBooking.run(
        'bkg_3',
        'trip_srilanka_2026',
        'flight',
        'Zpáteční letenky Praha (PRG) ⇄ Colombo (CMB)',
        'Qatar Airways',
        'QR-CEZ-8942',
        '2026-10-05',
        2400,
        'confirmed',
        '+420 222 123 456',
        'support@qatarairways.com',
        'Odlet 26. 12. 2026 z PRG, návrat 10. 1. 2027. Zavazadla 30 kg / osoba v ceně.',
        now,
        now
      );

      insertBooking.run(
        'bkg_4',
        'trip_srilanka_2026',
        'activity',
        'Privátní ranní safari džíp v NP Yala s licencovaným stopařem',
        'Yala Wild Safaris',
        'YWS-7712',
        '2026-12-10',
        75,
        'confirmed',
        '+94 71 998 8776',
        'safari@yalawild.lk',
        'Odjezd z hotelu v 05:30, otevřený safari džíp 4x4 se sledováním levhartů a slonů.',
        now,
        now
      );

      insertBooking.run(
        'bkg_5',
        'trip_srilanka_2026',
        'visa',
        'Turistická víza ETA Srí Lanka (3x dospělý)',
        'Department of Immigration & Emigration',
        'ETA-LK-771239',
        '2026-12-15',
        150,
        'confirmed',
        null,
        'eta@immigration.gov.lk',
        'Schválená turistická víza s platností na 30 dní po vstupu do země.',
        now,
        now
      );
    }
  } catch {}

  // Seed demo tips if empty
  const tipsCount = (db.prepare('SELECT COUNT(*) as c FROM tips WHERE user_id = ?').get(user.id) as any).c;
  if (tipsCount === 0) {
    const insertTip = db.prepare(`
      INSERT INTO tips (id, user_id, trip_id, title, category_id, location_name, lat, lng, notes, is_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);
    insertTip.run('tip_1', user.id, 'trip_srilanka_2026', 'Coconut Tree Hill', 'view', 'Mirissa', 5.9450, 80.4610, 'Ikonický kopec s palmami na útesu nad oceánem – nejlepší při západu slunce.', now, now);
    insertTip.run('tip_2', user.id, 'trip_srilanka_2026', 'Cafe Chill', 'food', 'Ella', 6.8745, 81.0460, 'Vyhlášené bistro a bar s výborným curry, burgerem a skvělou večerní atmosférou.', now, now);
    insertTip.run('tip_3', user.id, 'trip_srilanka_2026', 'Ambuluwawa Tower', 'view', 'Gampola (u Kandy)', 7.1697, 80.5489, 'Spirálovitá věž biodiverzity na skalním vrcholu s 360° panoramatem.', now, now);
  }
}

export function seedSriLanka2026Trip(userId: string) {
  const tripId = 'trip_srilanka_2026';
  const now = new Date().toISOString();

  // Create main trip
  db.prepare(`
    INSERT INTO trips (
      id, owner_id, title, motto, status, country_region, travelers_count,
      primary_transport, room_scenario, budget_currency, notes,
      start_date, end_date, bounding_box, version, is_deleted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).run(
    tripId,
    userId,
    'Srí Lanka – Vánoce & Nový rok 2026/2027',
    'Plánuji, abych měla svobodu.',
    'planning',
    'Srí Lanka',
    3,
    'Private car + English-speaking driver',
    '2+1',
    'USD',
    'Okruh po Srí Lance: kultura, hory, čajové plantáže, pěší turistika, safari slonů a levhartů a závěrečný odpočinek u oceánu.',
    '2026-12-26',
    '2027-01-10',
    JSON.stringify([79.8, 5.9, 81.6, 8.4]),
    now,
    now
  );

  // Transport service: Driver
  db.prepare(`
    INSERT INTO transport_services (
      id, trip_id, service_name, provider, total_price, currency,
      includes_description, split_between, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ts_driver_01',
    tripId,
    'Private car + English-speaking driver',
    'Lanka Travel Drivers Co.',
    855,
    'USD',
    'Zahrnuje: auto, řidiče, palivo, mýtné, parkovné, ubytování i stravu řidiče, letištní transfery a převoz zavazadel při cestě vlakem.',
    3,
    now,
    now
  );

  // Stages
  const stagesData = [
    { id: 'stg_arrival', title: '1. Přílet a západní pobřeží', notes: 'Přílet do Colomba, aklimatizace v Negombu.' },
    { id: 'stg_cultural_triangle', title: '2. Kulturní trojúhelník & Safari', notes: 'Anuradhapura, Sigiriya, Polonnaruwa a Dambulla.' },
    { id: 'stg_highlands', title: '3. Vysočina, čaj & scénický vlak', notes: 'Kandy, Silvestr, Nuwara Eliya, Horton Plains a vlak do Elly.' },
    { id: 'stg_safari_coast', title: '4. Safari v Yala & jižní pláže', notes: 'Tissamaharama, Yala leopardí safari, Mirissa a Galle.' },
  ];

  const insertStage = db.prepare(`
    INSERT INTO stages (id, trip_id, title, notes, sort_order, has_detail, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)
  `);

  stagesData.forEach((s, idx) => {
    insertStage.run(s.id, tripId, s.title, s.notes, idx + 1, now, now);
  });

  // Days specification (16 days)
  const daysData = [
    {
      id: 'day_sl_01',
      stage_id: 'stg_arrival',
      day_number: 1,
      date: '2026-12-26',
      title: 'Přílet na Srí Lanku & Negombo',
      start: 'CMB Airport',
      overnight: 'Negombo',
      transit: '30 min',
      distance: 15,
      transport: 'Soukromé auto s řidičem',
      departure: '16:45',
      activities: 'Přílet letadlem v 16:20, setkání s řidičem, ubytování v Negombu, procházka po pláži, večeře s čerstvými mořskými plody.',
      hotel: {
        name: 'Camelot Beach Hotel',
        location: 'Negombo',
        url: 'https://www.booking.com/hotel/lk/camelot-beach.html',
        price_total: 110,
        price_single: 85,
        rooms: 2,
        type: 'Deluxe Room s výhledem na moře',
        breakfast: 1,
        cancel: 'Zdarma do 20. 12. 2026',
        ref: 'BK-NEG-2026-01',
      },
    },
    {
      id: 'day_sl_02',
      stage_id: 'stg_cultural_triangle',
      day_number: 2,
      date: '2026-12-27',
      title: 'Negombo → Anuradhapura → Habarana',
      start: 'Negombo',
      overnight: 'Habarana',
      transit: '4 hod 30 min',
      distance: 210,
      transport: 'Soukromé auto s řidičem',
      departure: '08:00',
      activities: 'Přesun do starobylého hlavního města Anuradhapura, posvátný strom Jaya Sri Maha Bodhi, stúpa Ruwanwelisaya, přejezd do Habarana.',
      hotel: {
        name: 'Habarana Village by Cinnamon',
        location: 'Habarana',
        url: 'https://www.booking.com/hotel/lk/habarana-village-cinnamon.html',
        price_total: 130,
        price_single: 95,
        rooms: 2,
        type: 'Cottage Room v zahradě',
        breakfast: 1,
        cancel: 'Zdarma do 22. 12. 2026',
        ref: 'BK-HAB-2026-02',
      },
    },
    {
      id: 'day_sl_03',
      stage_id: 'stg_cultural_triangle',
      day_number: 3,
      date: '2026-12-28',
      title: 'Sigiriya & Sloní safari',
      start: 'Habarana',
      overnight: 'Habarana',
      transit: '1 hod',
      distance: 45,
      transport: 'Soukromé auto s řidičem / Safari džíp',
      departure: '07:00',
      activities: 'Ranní výstup na Lví skálu Sigiriya před poledním horkem. Odpoledne sloní safari – park (Minneriya / Kaudulla / Hurulu) vybereme na místě podle aktuálního pohybu stád slonů.',
      hotel: {
        name: 'Habarana Village by Cinnamon',
        location: 'Habarana',
        url: 'https://www.booking.com/hotel/lk/habarana-village-cinnamon.html',
        price_total: 130,
        price_single: 95,
        rooms: 2,
        type: 'Cottage Room v zahradě',
        breakfast: 1,
        cancel: 'Zdarma do 22. 12. 2026',
        ref: 'BK-HAB-2026-03',
      },
    },
    {
      id: 'day_sl_04',
      stage_id: 'stg_cultural_triangle',
      day_number: 4,
      date: '2026-12-29',
      title: 'Královské město Polonnaruwa',
      start: 'Habarana',
      overnight: 'Habarana',
      transit: '1 hod 45 min',
      distance: 60,
      transport: 'Soukromé auto s řidičem / na místě na kole nebo tuk-tukem',
      departure: '08:30',
      activities: 'Prohlídka UNESCO památek Polonnaruwa, monumentální sochy Gal Vihara, královský palác, volitelný oběd u rýžových polí.',
      hotel: {
        name: 'Habarana Village by Cinnamon',
        location: 'Habarana',
        url: 'https://www.booking.com/hotel/lk/habarana-village-cinnamon.html',
        price_total: 130,
        price_single: 95,
        rooms: 2,
        type: 'Cottage Room v zahradě',
        breakfast: 1,
        cancel: 'Zdarma do 22. 12. 2026',
        ref: 'BK-HAB-2026-04',
      },
    },
    {
      id: 'day_sl_05',
      stage_id: 'stg_cultural_triangle',
      day_number: 5,
      date: '2026-12-30',
      title: 'Habarana → Dambulla → Kandy',
      start: 'Habarana',
      overnight: 'Kandy',
      transit: '3 hod',
      distance: 95,
      transport: 'Soukromé auto s řidičem',
      departure: '08:30',
      activities: 'Skalní jeskynní chrámy Dambulla, přejezd přes plantáže koření do Kandy, podvečerní obřad v Chrámu Buddhova zubu a procházka kolem jezera.',
      hotel: {
        name: "Earl's Regency Hotel",
        location: 'Kandy',
        url: 'https://www.booking.com/hotel/lk/earls-regency.html',
        price_total: 140,
        price_single: 105,
        rooms: 2,
        type: 'Premium Room s výhledem na řeku Mahaweli',
        breakfast: 1,
        cancel: 'Zdarma do 24. 12. 2026',
        ref: 'BK-KAN-2026-05',
      },
    },
    {
      id: 'day_sl_06',
      stage_id: 'stg_highlands',
      day_number: 6,
      date: '2026-12-31',
      title: 'Kandy – Botanická zahrada & Silvestr',
      start: 'Kandy',
      overnight: 'Kandy',
      transit: '45 min',
      distance: 25,
      transport: 'Soukromé auto s řidičem / pěšky',
      departure: '09:30',
      activities: 'Královská botanická zahrada Peradeniya s alejí palem a obřími orchidejemi. Odpolední volno a čajovna v Kandy. Večerní silvestrovská oslava v hotelu.',
      hotel: {
        name: "Earl's Regency Hotel",
        location: 'Kandy',
        url: 'https://www.booking.com/hotel/lk/earls-regency.html',
        price_total: 155,
        price_single: 115,
        rooms: 2,
        type: 'Premium Room s výhledem na řeku Mahaweli',
        breakfast: 1,
        cancel: 'Zdarma do 24. 12. 2026',
        ref: 'BK-KAN-2026-06',
      },
    },
    {
      id: 'day_sl_07',
      stage_id: 'stg_highlands',
      day_number: 7,
      date: '2027-01-01',
      title: 'Kandy → Nuwara Eliya (Hory & Čajová pole)',
      start: 'Kandy',
      overnight: 'Nuwara Eliya',
      transit: '3 hod',
      distance: 80,
      transport: 'Soukromé auto s řidičem',
      departure: '09:00',
      activities: 'Novoroční přejezd horskými serpentinami. Zastávka u vodopádů Ramboda Falls. Návštěva čajové plantáže (výběr konkrétní továrny 1. 1. podle sváteční otevírací doby). Koloniální městečko Nuwara Eliya.',
      hotel: {
        name: 'The Grand Hotel Nuwara Eliya',
        location: 'Nuwara Eliya',
        url: 'https://www.booking.com/hotel/lk/the-grand-hotel.html',
        price_total: 165,
        price_single: 120,
        rooms: 2,
        type: 'Colonial Deluxe Room',
        breakfast: 1,
        cancel: 'Zdarma do 25. 12. 2026',
        ref: 'BK-NUW-2027-07',
      },
    },
    {
      id: 'day_sl_08',
      stage_id: 'stg_highlands',
      day_number: 8,
      date: '2027-01-02',
      title: 'Horton Plains – Pěší trek na Konec světa',
      start: 'Nuwara Eliya',
      overnight: 'Nuwara Eliya',
      transit: '2 hod',
      distance: 65,
      transport: 'Soukromé auto s řidičem / pěšky',
      departure: '05:30',
      activities: 'Brzký ranní výjezd na náhorní plošinu Horton Plains. Pěší okruh 9 km: sráz World\'s End s kilometrovým propadem do údolí a vodopády Baker\'s Falls.',
      hotel: {
        name: 'The Grand Hotel Nuwara Eliya',
        location: 'Nuwara Eliya',
        url: 'https://www.booking.com/hotel/lk/the-grand-hotel.html',
        price_total: 165,
        price_single: 120,
        rooms: 2,
        type: 'Colonial Deluxe Room',
        breakfast: 1,
        cancel: 'Zdarma do 25. 12. 2026',
        ref: 'BK-NUW-2027-08',
      },
    },
    {
      id: 'day_sl_09',
      stage_id: 'stg_highlands',
      day_number: 9,
      date: '2027-01-03',
      title: 'Nuwara Eliya → Vlak Nanu Oya → Ella',
      start: 'Nuwara Eliya',
      overnight: 'Ella',
      transit: '3 hod 30 min',
      distance: 65,
      transport: 'Paralelní: My vlakem / Řidič autem s kufry',
      departure: '11:30',
      activities: 'Auto na nádraží Nanu Oya. Nasednutí na legendární scénický vlak do Elly přes viadukty a čajová údolí. Řidič veze velká zavazadla autem a čeká na nádraží v Ella. Ubytování v Ella.',
      hotel: {
        name: '98 Acres Resort & Spa / Zion View',
        location: 'Ella',
        url: 'https://www.booking.com/hotel/lk/98-acres-resort.html',
        price_total: 150,
        price_single: 110,
        rooms: 2,
        type: 'Superior Chalet s výhledem na Ella Gap',
        breakfast: 1,
        cancel: 'Zdarma do 26. 12. 2026',
        ref: 'BK-ELL-2027-09',
      },
    },
    {
      id: 'day_sl_10',
      stage_id: 'stg_highlands',
      day_number: 10,
      date: '2027-01-04',
      title: 'Ella – Nine Arch Bridge & Vrcholy',
      start: 'Ella',
      overnight: 'Ella',
      transit: '30 min',
      distance: 15,
      transport: 'Pěšky / tuk-tuk',
      departure: '08:00',
      activities: 'Ranní výšlap na Little Adam\'s Peak, ikonický most devíti oblouků Nine Arch Bridge při průjezdu vlaku. Odpoledne volitelně Ella Rock (náročnější pěší varianta). Večer Cafe Chill.',
      hotel: {
        name: '98 Acres Resort & Spa / Zion View',
        location: 'Ella',
        url: 'https://www.booking.com/hotel/lk/98-acres-resort.html',
        price_total: 150,
        price_single: 110,
        rooms: 2,
        type: 'Superior Chalet s výhledem na Ella Gap',
        breakfast: 1,
        cancel: 'Zdarma do 26. 12. 2026',
        ref: 'BK-ELL-2027-10',
      },
    },
    {
      id: 'day_sl_11',
      stage_id: 'stg_safari_coast',
      day_number: 11,
      date: '2027-01-05',
      title: 'Ella → Ravana Falls → Tissamaharama',
      start: 'Ella',
      overnight: 'Tissamaharama',
      transit: '2 hod 30 min',
      distance: 90,
      transport: 'Soukromé auto s řidičem',
      departure: '09:00',
      activities: 'Zastávka u hučícího vodopádu Ravana Falls. Návštěva starobylých skalních reliéfů Buduruwagala vytesaných do stěny uprostřed lesa. Příjezd k jezeru Tissa před branami Yala.',
      hotel: {
        name: 'Kithala Resort Yala',
        location: 'Tissamaharama',
        url: 'https://www.booking.com/hotel/lk/kithala-resort.html',
        price_total: 100,
        price_single: 75,
        rooms: 2,
        type: 'Deluxe Room s výhledem na rýžová pole',
        breakfast: 1,
        cancel: 'Zdarma do 28. 12. 2026',
        ref: 'BK-TIS-2027-11',
      },
    },
    {
      id: 'day_sl_12',
      stage_id: 'stg_safari_coast',
      day_number: 12,
      date: '2027-01-06',
      title: 'Ranní Safari v NP Yala → Mirissa',
      start: 'Tissamaharama',
      overnight: 'Mirissa',
      transit: '3 hod',
      distance: 140,
      transport: 'Safari džíp ráno, poté soukromé auto s řidičem',
      departure: '05:30',
      activities: 'Ranní safari v národním parku Yala (06:00–10:00) za levharty, medvědy pyskatými a krokodýly. Po safari návrat, sprcha a přejezd podél jižního pobřeží na pláže v Mirissa.',
      hotel: {
        name: 'Mandara Resort Mirissa',
        location: 'Mirissa',
        url: 'https://www.booking.com/hotel/lk/mandara-resort.html',
        price_total: 135,
        price_single: 95,
        rooms: 2,
        type: 'Sea View Suite',
        breakfast: 1,
        cancel: 'Zdarma do 30. 12. 2026',
        ref: 'BK-MIR-2027-12',
      },
    },
    {
      id: 'day_sl_13',
      stage_id: 'stg_safari_coast',
      day_number: 13,
      date: '2027-01-07',
      title: 'Mirissa – Pláž, Relaxace & Velryby',
      start: 'Mirissa',
      overnight: 'Mirissa',
      transit: '15 min',
      distance: 10,
      transport: 'Pěšky / loď / tuk-tuk',
      departure: '06:15',
      activities: 'Brzy ráno volitelný lodní výlet za velrybami a delfíny (závisí na počasí a vlnách oceánu). Odpoledne odpočinek na pláži, západ slunce na Coconut Tree Hill a Parrot Rock.',
      hotel: {
        name: 'Mandara Resort Mirissa',
        location: 'Mirissa',
        url: 'https://www.booking.com/hotel/lk/mandara-resort.html',
        price_total: 135,
        price_single: 95,
        rooms: 2,
        type: 'Sea View Suite',
        breakfast: 1,
        cancel: 'Zdarma do 30. 12. 2026',
        ref: 'BK-MIR-2027-13',
      },
    },
    {
      id: 'day_sl_14',
      stage_id: 'stg_safari_coast',
      day_number: 14,
      date: '2027-01-08',
      title: 'Galle Fort – Koloniální pevnost UNESCO',
      start: 'Mirissa',
      overnight: 'Mirissa',
      transit: '1 hod 30 min',
      distance: 70,
      transport: 'Soukromé auto s řidičem',
      departure: '09:00',
      activities: 'Výlet do historického opevněného města Galle: holandské hradby, maják Galle Lighthouse, kavárny a obchůdky s drahokamy. Zpáteční koupání na pláži Unawatuna.',
      hotel: {
        name: 'Mandara Resort Mirissa',
        location: 'Mirissa',
        url: 'https://www.booking.com/hotel/lk/mandara-resort.html',
        price_total: 135,
        price_single: 95,
        rooms: 2,
        type: 'Sea View Suite',
        breakfast: 1,
        cancel: 'Zdarma do 30. 12. 2026',
        ref: 'BK-MIR-2027-14',
      },
    },
    {
      id: 'day_sl_15',
      stage_id: 'stg_safari_coast',
      day_number: 15,
      date: '2027-01-09',
      title: 'Mirissa – Pláž & Odpolední přesun k letišti',
      start: 'Mirissa',
      overnight: 'Katunayake / Airport',
      transit: '2 hod 15 min',
      distance: 160,
      transport: 'Soukromé auto s řidičem (Southern Expressway)',
      departure: '14:00',
      activities: 'Dopolední koupání a závěrečný nákup suvenýrů na pobřeží. Po obědě přejezd po dálnici do oblasti letiště Katunayake. Klidný večer před ranním odletem.',
      hotel: {
        name: 'Amagi Aria Airport Transit Hotel',
        location: 'Katunayake',
        url: 'https://www.booking.com/hotel/lk/amagi-aria.html',
        price_total: 90,
        price_single: 70,
        rooms: 2,
        type: 'Standard King Room',
        breakfast: 1,
        cancel: 'Zdarma do 05. 01. 2027',
        ref: 'BK-AIR-2027-15',
      },
    },
    {
      id: 'day_sl_16',
      stage_id: 'stg_arrival',
      day_number: 16,
      date: '2027-01-10',
      title: 'Odlet ze Srí Lanky (CMB)',
      start: 'Katunayake',
      overnight: 'Letadlo / Praha',
      transit: '15 min',
      distance: 8,
      transport: 'Soukromé auto s řidičem (Airport transfer)',
      departure: '06:30',
      activities: 'Ranní transfer z hotelu na mezinárodní letiště Bandaranaike (CMB). Odbavení, bezpečnostní kontrola a odlet v 09:15 zpět domů.',
      hotel: null,
    },
  ];

  const insertDay = db.prepare(`
    INSERT INTO days (
      id, trip_id, stage_id, day_number, specific_date, title, notes,
      start_location, overnight_location, transit_time_est, distance_km,
      transport_mode, recommended_departure, activities,
      has_detail, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `);

  const insertAcc = db.prepare(`
    INSERT INTO accommodations (
      id, trip_id, day_id, hotel_name, location, booking_url,
      price_total, price_single, price_currency, rooms_count, room_type,
      breakfast_included, cancellation_policy, booking_status, booking_reference, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)
  `);

  for (const d of daysData) {
    insertDay.run(
      d.id,
      tripId,
      d.stage_id,
      d.day_number,
      d.date,
      d.title,
      d.activities,
      d.start,
      d.overnight,
      d.transit,
      d.distance,
      d.transport,
      d.departure,
      d.activities,
      now,
      now
    );

    if (d.hotel) {
      insertAcc.run(
        `acc_${d.id}`,
        tripId,
        d.id,
        d.hotel.name,
        d.hotel.location,
        d.hotel.url,
        d.hotel.price_total,
        d.hotel.price_single,
        d.hotel.rooms,
        d.hotel.type,
        d.hotel.breakfast,
        d.hotel.cancel,
        d.hotel.ref,
        `Rezervace pro 3 osoby (${d.hotel.rooms} pokoje).`,
        now,
        now
      );
    }
  }

  // Detailed POIs with GPS, mandatory/optional flags, why_visit, duration, prices
  const poisData = [
    // Day 1
    {
      id: 'poi_sl_01_cmb',
      day_id: 'day_sl_01',
      stage_id: 'stg_arrival',
      category_id: 'transport',
      name: 'Bandaranaike International Airport (CMB)',
      lat: 7.1804,
      lng: 79.8841,
      is_top: 0,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'fixed',
      target_time: '16:20',
      why_visit: 'Mezinárodní letiště Colombo – přílet, směna peněz a setkání s řidičem.',
      duration: '1 hod',
      cost: 0,
      cost_cat: 'transport',
      photo: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=800&q=80',
      notes: 'Přílet v 16:20. V příletové hale koupit lokální SIM kartu Dialog a vyměnit hotovost.',
    },
    {
      id: 'poi_sl_01_negombo',
      day_id: 'day_sl_01',
      stage_id: 'stg_arrival',
      category_id: 'nature',
      name: 'Negombo Beach & Pobřežní promenáda',
      lat: 7.2094,
      lng: 79.8358,
      is_top: 0,
      is_mandatory: 0,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '18:30',
      why_visit: 'Příjemná plážová atmosféra na aklimatizaci po dlouhém letu.',
      duration: '1.5 hod',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      notes: 'Západ slunce nad Indickým oceánem a večeře v plážové restauraci.',
    },

    // Day 2
    {
      id: 'poi_sl_02_bodhi',
      day_id: 'day_sl_02',
      stage_id: 'stg_cultural_triangle',
      category_id: 'monument',
      name: 'Jaya Sri Maha Bodhi (Posvátný fikovník)',
      lat: 8.3448,
      lng: 80.3965,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '13:30',
      why_visit: 'Nejstarší historicky doložený člověkem vysazený strom na světě (z roku 288 př. n. l.).',
      duration: '1 hod',
      cost: 5,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      notes: 'Vyžadováno bílé nebo světlé oblečení zahalující ramena a kolena.',
    },
    {
      id: 'poi_sl_02_ruwan',
      day_id: 'day_sl_02',
      stage_id: 'stg_cultural_triangle',
      category_id: 'monument',
      name: 'Ruwanwelisaya Stupa',
      lat: 8.3500,
      lng: 80.3964,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '14:45',
      why_visit: 'Obrovská zářivě bílá stúpa z 2. století př. n. l. obehnaná zdí se stovkami soch slonů.',
      duration: '1.5 hod',
      cost: 10,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=800&q=80',
      notes: 'Vstupné se platí v rámci komplexu starobylého města.',
    },

    // Day 3
    {
      id: 'poi_sl_03_sigiriya',
      day_id: 'day_sl_03',
      stage_id: 'stg_cultural_triangle',
      category_id: 'monument',
      name: 'Sigiriya Rock Fortress (Lví skála UNESCO)',
      lat: 7.9570,
      lng: 80.7603,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'fixed',
      target_time: '07:30',
      why_visit: 'Ikonická 200 m vysoká stolová skála s pozůstatky královského paláce krále Kasyapy na vrcholu.',
      duration: '3.5 hod',
      cost: 36,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=800&q=80',
      notes: 'Začít brzy ráno kvůli horku! Pevná obuv, voda s sebou.',
    },
    {
      id: 'poi_sl_03_safari',
      day_id: 'day_sl_03',
      stage_id: 'stg_cultural_triangle',
      category_id: 'nature',
      name: 'Odpolední Safari slonů – Vybereme na místě podle slonů',
      lat: 8.0333,
      lng: 80.8333,
      is_top: 1,
      is_mandatory: 0,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '14:30',
      why_visit: 'Pozorování divokých stád slonů v jejich přirozeném prostředí.',
      duration: '3.5 hod',
      cost: 80,
      cost_cat: 'safari',
      photo: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80',
      notes: 'Alternativy: Minneriya / Kaudulla / Hurulu. Výběr provede řidič dopoledne podle hlášení rangerů.',
    },

    // Day 4
    {
      id: 'poi_sl_04_polonnaruwa',
      day_id: 'day_sl_04',
      stage_id: 'stg_cultural_triangle',
      category_id: 'monument',
      name: 'Ancient City of Polonnaruwa (Královský komplex UNESCO)',
      lat: 7.9403,
      lng: 81.0028,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '09:00',
      why_visit: 'Druhé královské hlavní město Srí Lanky z 11.–13. století s nádherně zachovalými chrámy.',
      duration: '3 hod',
      cost: 30,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      notes: 'Areál lze projíždět na kole, tuk-tukem nebo autem.',
    },
    {
      id: 'poi_sl_04_galvihara',
      day_id: 'day_sl_04',
      stage_id: 'stg_cultural_triangle',
      category_id: 'monument',
      name: 'Gal Vihara (Skalní chrámy s ležícím Buddhou)',
      lat: 7.9647,
      lng: 81.0048,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '11:30',
      why_visit: 'Vrcholné dílo sinhálského sochařství – 4 monumentální sochy Buddhy vytesané do žuly.',
      duration: '1 hod',
      cost: 0,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1566833945056-126a111b15d0?auto=format&fit=crop&w=800&q=80',
      notes: 'Zahrnuto ve vstupném Polonnaruwa.',
    },

    // Day 5
    {
      id: 'poi_sl_05_dambulla',
      day_id: 'day_sl_05',
      stage_id: 'stg_cultural_triangle',
      category_id: 'monument',
      name: 'Dambulla Cave Temple (Zlatý skalní chrám)',
      lat: 7.8567,
      lng: 80.6483,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '09:30',
      why_visit: 'Pět jeskynních svatyní plných nástěnných maleb a více než 150 soch Buddhy.',
      duration: '2 hod',
      cost: 10,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
      notes: 'Výstup po schodech cca 15 minut. Boty se nechávají před vstupem u úschovny.',
    },
    {
      id: 'poi_sl_05_tooth',
      day_id: 'day_sl_05',
      stage_id: 'stg_highlands',
      category_id: 'monument',
      name: 'Temple of the Sacred Tooth Relic (Chrám Buddhova zubu)',
      lat: 7.2936,
      lng: 80.6413,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'fixed',
      target_time: '18:00',
      why_visit: 'Nejposvátnější buddhistické místo na Srí Lance chránící zub samotného Buddhy.',
      duration: '2 hod',
      cost: 15,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      notes: 'Podvečerní puja obřad v 18:30 s bubeníky. Zahalená ramena i kolena.',
    },

    // Day 6
    {
      id: 'poi_sl_06_peradeniya',
      day_id: 'day_sl_06',
      stage_id: 'stg_highlands',
      category_id: 'nature',
      name: 'Royal Botanic Gardens Peradeniya',
      lat: 7.2683,
      lng: 80.5966,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '10:00',
      why_visit: 'Bývalá královská zahrada s alejemi královských palem a slavným domem orchidejí.',
      duration: '2.5 hod',
      cost: 12,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
      notes: 'Nádherná procházka pod korunami stromů a koloniální atmosféra.',
    },

    // Day 7
    {
      id: 'poi_sl_07_ramboda',
      day_id: 'day_sl_07',
      stage_id: 'stg_highlands',
      category_id: 'nature',
      name: 'Ramboda Falls (Vyhlídka u vodopádu)',
      lat: 7.0542,
      lng: 80.6975,
      is_top: 0,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '11:00',
      why_visit: 'Dramatický 109 m vysoký horský vodopád přímo u silnice do hor.',
      duration: '45 min',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1546587348-d12660c30c50?auto=format&fit=crop&w=800&q=80',
      notes: 'Výborné místo na zastávku na čaj s výhledem na vodopád.',
    },
    {
      id: 'poi_sl_07_tea_plant',
      day_id: 'day_sl_07',
      stage_id: 'stg_highlands',
      category_id: 'monument',
      name: 'Tea plantation – vybereme podle otevírací doby 1. 1. 2027',
      lat: 7.0000,
      lng: 80.7333,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '13:00',
      why_visit: 'Prohlídka výroby pravého cejlonského čaje, sběr čaje a ochutnávka.',
      duration: '1.5 hod',
      cost: 8,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=800&q=80',
      notes: 'Placeholder: konkrétní plantáž (Damro / Blue Field / Pedro) vybere řidič 1. 1. podle svátečního provozu.',
    },

    // Day 8
    {
      id: 'poi_sl_08_horton',
      day_id: 'day_sl_08',
      stage_id: 'stg_highlands',
      category_id: 'nature',
      name: 'Horton Plains National Park & World\'s End',
      lat: 6.8028,
      lng: 80.8092,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'fixed',
      target_time: '06:30',
      why_visit: 'Tajemná mlžná plošina ve výšce 2 100 m n. m. a dechberoucí vyhlídka World\'s End.',
      duration: '4 hod',
      cost: 35,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      notes: 'Brzký ranní start v 5:30. Teplé oblečení (ráno bývá okolo 8 °C). Okruh cca 9 km.',
    },

    // Day 9
    {
      id: 'poi_sl_09_train',
      day_id: 'day_sl_09',
      stage_id: 'stg_highlands',
      category_id: 'transport',
      name: 'Vyhlídkový vlak Nanu Oya → Ella (Paralelní přesun)',
      lat: 6.9589,
      lng: 80.7428,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'fixed',
      target_time: '12:45',
      why_visit: 'Nejkrásnější železniční trasa Asie. My jedeme vlakem, řidič veze zavazadla autem a čeká v Ella.',
      duration: '3 hod',
      cost: 8,
      cost_cat: 'train',
      photo: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=800&q=80',
      notes: 'Cestující: vlak 2. třídy. Řidič: převoz kufrů autem po silnici, sraz před nádražím v Ella.',
    },

    // Day 10
    {
      id: 'poi_sl_10_nine_arch',
      day_id: 'day_sl_10',
      stage_id: 'stg_highlands',
      category_id: 'monument',
      name: 'Nine Arch Bridge (Demodara viadukt)',
      lat: 6.8767,
      lng: 81.0608,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '09:00',
      why_visit: 'Kamenný viadukt uprostřed džungle a čajovníků, focení projíždějícího vlaku.',
      duration: '2 hod',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=800&q=80',
      notes: 'Zkontrolovat jízdní řád vlaků pro fotku na viaduktu.',
    },
    {
      id: 'poi_sl_10_little_adam',
      day_id: 'day_sl_10',
      stage_id: 'stg_highlands',
      category_id: 'view',
      name: 'Little Adam\'s Peak',
      lat: 6.8617,
      lng: 81.0617,
      is_top: 0,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '11:30',
      why_visit: 'Nenáročný vyhlídkový vrchol s panoramatickým 360° rozhledem na hory a Ella Gap.',
      duration: '1.5 hod',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      notes: 'Snadný výstup po upravené stezce, vhodné i pro odpočinkový den.',
    },
    {
      id: 'poi_sl_10_ella_rock',
      day_id: 'day_sl_10',
      stage_id: 'stg_highlands',
      category_id: 'view',
      name: 'Ella Rock (Náročnější pěší varianta)',
      lat: 6.8550,
      lng: 81.0500,
      is_top: 0,
      is_mandatory: 0,
      is_enabled: 0,
      time_mode: 'approximate',
      target_time: '14:30',
      why_visit: 'Strmý trek na skalní útes tyčící se nad celým údolím.',
      duration: '4 hod',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
      notes: 'Volitelné – fyzicky náročnější varianta (strmé stoupání lesem).',
    },

    // Day 11
    {
      id: 'poi_sl_11_ravana',
      day_id: 'day_sl_11',
      stage_id: 'stg_safari_coast',
      category_id: 'nature',
      name: 'Ravana Falls',
      lat: 6.8406,
      lng: 81.0544,
      is_top: 0,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '09:30',
      why_visit: 'Jeden z nejširších vodopádů na ostrově přímo u horské silnice do nížiny.',
      duration: '30 min',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1546587348-d12660c30c50?auto=format&fit=crop&w=800&q=80',
      notes: 'Rychlá fotografická zastávka.',
    },
    {
      id: 'poi_sl_11_buduru',
      day_id: 'day_sl_11',
      stage_id: 'stg_safari_coast',
      category_id: 'monument',
      name: 'Buduruwagala Temple (Skalní reliéfy)',
      lat: 6.6853,
      lng: 81.0808,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '11:15',
      why_visit: 'Skalní stěna s vytesanými sedmi obřími postavami z 10. století uprostřed lesního ticha.',
      duration: '1 hod',
      cost: 5,
      cost_cat: 'tickets',
      photo: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
      notes: 'Méně turistické, velmi klidné spirituální místo.',
    },

    // Day 12
    {
      id: 'poi_sl_12_yala',
      day_id: 'day_sl_12',
      stage_id: 'stg_safari_coast',
      category_id: 'nature',
      name: 'Yala National Park Safari (Levhartí safari 06:00–10:00)',
      lat: 6.3667,
      lng: 81.5167,
      is_top: 1,
      is_mandatory: 0,
      is_enabled: 1,
      time_mode: 'fixed',
      target_time: '06:00',
      why_visit: 'Nejslavnější národní park s nejvyšší hustotou levhartů cejlonských na světě.',
      duration: '4 hod',
      cost: 80,
      cost_cat: 'safari',
      photo: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=800&q=80',
      notes: 'Volitelná aktivita ($80/osoba). Odjezd ze safari kempu v 05:30 ráno.',
    },

    // Day 13
    {
      id: 'poi_sl_13_whale',
      day_id: 'day_sl_13',
      stage_id: 'stg_safari_coast',
      category_id: 'nature',
      name: 'Mirissa Whale Watching (Pozorování plejtváků obrovských)',
      lat: 5.9439,
      lng: 80.4550,
      is_top: 1,
      is_mandatory: 0,
      is_enabled: 1,
      time_mode: 'fixed',
      target_time: '06:30',
      why_visit: 'Pozorování největších tvorů planety – plejtváků obrovských v Indickém oceánu.',
      duration: '4 hod',
      cost: 60,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?auto=format&fit=crop&w=800&q=80',
      notes: 'Volitelné ($60/osoba) – aktivita přísně závislá na počasí a vlnách!',
    },
    {
      id: 'poi_sl_13_coconut',
      day_id: 'day_sl_13',
      stage_id: 'stg_safari_coast',
      category_id: 'view',
      name: 'Coconut Tree Hill Mirissa',
      lat: 5.9400,
      lng: 80.4683,
      is_top: 1,
      is_mandatory: 0,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '17:30',
      why_visit: 'Ikonický mys posetý palmami s výhledem na rozbouřený oceán při západu slunce.',
      duration: '1 hod',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      notes: 'Ideální čas na focení je hodinu před západem slunce.',
    },

    // Day 14
    {
      id: 'poi_sl_14_galle_fort',
      day_id: 'day_sl_14',
      stage_id: 'stg_safari_coast',
      category_id: 'monument',
      name: 'Galle Fort (Historická pevnost UNESCO)',
      lat: 6.0270,
      lng: 80.2170,
      is_top: 1,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '10:00',
      why_visit: 'Největší dochovaná evropská koloniální pevnost v Asii plná kaváren, butiků a historie.',
      duration: '3 hod',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
      notes: 'Procházka po mohutných hradbách a uličkách s koloniální architekturou.',
    },
    {
      id: 'poi_sl_14_lighthouse',
      day_id: 'day_sl_14',
      stage_id: 'stg_safari_coast',
      category_id: 'monument',
      name: 'Galle Lighthouse (Bílý maják na hradbách)',
      lat: 6.0247,
      lng: 80.2192,
      is_top: 0,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'approximate',
      target_time: '11:30',
      why_visit: 'Ikonický bílý maják z roku 1848 lemovaný palmami na jižním cípu hradeb.',
      duration: '30 min',
      cost: 0,
      cost_cat: 'activities',
      photo: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      notes: 'Krásné místo na společné foto.',
    },

    // Day 16
    {
      id: 'poi_sl_16_airport',
      day_id: 'day_sl_16',
      stage_id: 'stg_arrival',
      category_id: 'transport',
      name: 'Odlet – Bandaranaike International Airport (CMB)',
      lat: 7.1804,
      lng: 79.8841,
      is_top: 0,
      is_mandatory: 1,
      is_enabled: 1,
      time_mode: 'fixed',
      target_time: '07:00',
      why_visit: 'Odlet ze Srí Lanky v 09:15. Být na letišti minimálně 2 hodiny předem.',
      duration: '2.5 hod',
      cost: 0,
      cost_cat: 'transport',
      photo: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=800&q=80',
      notes: 'Let číslo např. QR665. Rozloučení s řidičem.',
    },
  ];

  const insertPoi = db.prepare(`
    INSERT INTO pois (
      id, trip_id, stage_id, day_id, category_id, name, is_top, lat, lng,
      description, private_notes, why_visit, recommended_duration, cost_est,
      cost_currency, cost_category, is_mandatory, is_enabled, data_origin,
      time_mode, target_time, visit_status, main_photo_url, sort_order,
      version, is_deleted, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 'imported',
      ?, ?, 'unvisited', ?, ?,
      1, 0, ?, ?
    )
  `);

  poisData.forEach((p, idx) => {
    insertPoi.run(
      p.id,
      tripId,
      p.stage_id,
      p.day_id,
      p.category_id,
      p.name,
      p.is_top,
      p.lat,
      p.lng,
      p.why_visit,
      p.notes,
      p.why_visit,
      p.duration,
      p.cost,
      p.cost_cat,
      p.cost_cat,
      p.is_mandatory,
      p.is_enabled,
      p.time_mode,
      p.target_time,
      p.photo,
      idx + 1,
      now,
      now
    );
  });

  console.log('✅ Cesta Srí Lanka 2026/2027 byla úspěšně založena a naplněna daty.');
}
