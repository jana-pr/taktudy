import { describe, it, expect, beforeAll } from 'vitest';
import { parseRouteFile } from '../src/importers/route-importer.js';
import { proposeTrip, optimizeRoute } from '../src/services/ai-planner.js';
import { initDatabase, db, seedSriLanka2026Trip } from '../src/db.js';

describe('Tak tudy! — Rozšíření o import a AI návrh trasy (Tests)', () => {
  beforeAll(() => {
    initDatabase();
    const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@taktudy.app') as any;
    const existing = db.prepare('SELECT id FROM trips WHERE id = ?').get('trip_srilanka_2026');
    if (existing) {
      db.prepare('UPDATE trips SET is_deleted = 0 WHERE id = ?').run('trip_srilanka_2026');
      db.prepare('UPDATE pois SET is_deleted = 0 WHERE trip_id = ?').run('trip_srilanka_2026');
    } else if (demoUser) {
      seedSriLanka2026Trip(demoUser.id);
    }
  });

  it('1. GPX Import: správně parsuje body zájmu, trasu a vytvoří dny', () => {
    const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" creator="Garmin Connect">
      <name>Okruh kolem Sigiriya</name>
      <wpt lat="7.9570" lon="80.7603">
        <name>Sigiriya Rock</name>
        <desc>Skalní pevnost krále Kasyapy</desc>
      </wpt>
      <wpt lat="7.9600" lon="80.7650">
        <name>Pidurangala Rock</name>
        <desc>Vyhlídka na Sigiriyi</desc>
      </wpt>
      <trk>
        <name>Cesta ke skále</name>
        <trkseg>
          <trkpt lat="7.9500" lon="80.7500" />
          <trkpt lat="7.9550" lon="80.7550" />
          <trkpt lat="7.9570" lon="80.7603" />
        </trkseg>
      </trk>
    </gpx>`;

    const parsed = parseRouteFile(sampleGpx, 'sigiriya.gpx');
    expect(parsed.title).toBe('Okruh kolem Sigiriya');
    expect(parsed.pois.length).toBe(2);
    expect(parsed.pois[0].name).toBe('Sigiriya Rock');
    expect(parsed.pois[0].lat).toBe(7.957);
    expect(parsed.pois[0].data_origin).toBe('imported');
    expect(parsed.coordinates.length).toBe(3);
    expect(parsed.days.length).toBeGreaterThanOrEqual(1);
  });

  it('2. KML Import: správně načte Placemark objekty', () => {
    const sampleKml = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>
        <name>Kulturní trojúhelník KML</name>
        <Placemark>
          <name>Dambulla Cave Temple</name>
          <description>Jeskynní chrámy</description>
          <Point>
            <coordinates>80.6483,7.8567,0</coordinates>
          </Point>
        </Placemark>
      </Document>
    </kml>`;

    const parsed = parseRouteFile(sampleKml, 'dambulla.kml');
    expect(parsed.title).toBe('Kulturní trojúhelník KML');
    expect(parsed.pois.length).toBe(1);
    expect(parsed.pois[0].name).toBe('Dambulla Cave Temple');
    expect(parsed.pois[0].lng).toBeCloseTo(80.6483);
    expect(parsed.pois[0].lat).toBeCloseTo(7.8567);
  });

  it('2b. ChatGPT JSON s markdown blokem a textem: ořízne ```json a správně naimportuje data', () => {
    const rawChatGpt = `Zde je váš navržený itinerář pro Srí Lanku:
    \`\`\`json
    {
      "title": "Srí Lanka Dobrodružství 2026",
      "country_region": "Srí Lanka",
      "travelers_count": 3,
      "primary_transport": "Soukromé auto s řidičem",
      "days": [
        {
          "day_number": 1,
          "title": "Přílet Colombo CMB",
          "start_location": "CMB",
          "overnight_location": "Negombo"
        }
      ],
      "pois": [
        {
          "name": "Sigiriya Rock Fortress",
          "lat": "7.9570",
          "lng": "80.7603",
          "category_id": "sight",
          "description": "Starověká skalní pevnost",
          "is_mandatory": true,
          "cost_est": "36"
        }
      ]
    }
    \`\`\`
    Doufám, že se vám plán líbí!`;

    const parsed = parseRouteFile(rawChatGpt, 'chatgpt-plan.txt');
    expect(parsed.title).toBe('Srí Lanka Dobrodružství 2026');
    expect(parsed.pois.length).toBe(1);
    expect(parsed.pois[0].name).toBe('Sigiriya Rock Fortress');
    expect(parsed.pois[0].lat).toBeCloseTo(7.957);
    expect(parsed.pois[0].category_id).toBe('monument'); // Normalized from 'sight'
    expect(parsed.pois[0].cost_est).toBe(36);
  });

  it('3. AI Návrh trasy: vygeneruje strukturovaný návrh s varováním na dlouhé přejezdy', async () => {
    const proposal = await proposeTrip(
      'Srí Lanka, 26. 12. 2026–10. 1. 2027, 3 dospělí, soukromý řidič, chceme přírodu, historii, pěší výlety a několik dní u moře.'
    );

    expect(proposal.title).toContain('Srí Lanka');
    expect(proposal.travelers_count).toBe(3);
    expect(proposal.days_count).toBe(16);
    expect(proposal.long_transit_warnings.length).toBeGreaterThan(0);
    expect(proposal.days.length).toBeGreaterThan(0);
  });

  it('4. Optimalizace trasy: detekuje nevhodné umístění Dambulla a navrhne přesun', () => {
    const pois = [
      { id: 'p1', name: 'Dambulla Cave Temple', day_id: 'day_sl_02' },
      { id: 'p2', name: 'Sigiriya Rock Fortress', day_id: 'day_sl_03' },
    ];

    const opt = optimizeRoute('Srí Lanka 2026', pois);
    expect(opt.has_recommendation).toBe(true);
    expect(opt.recommendation_text).toContain('Dambulla');
    expect(opt.distance_saved_km).toBeGreaterThan(0);
  });

  it('5. Cesta Srí Lanka 2026/2027: existuje v DB se všemi 16 dny, ubytováním i dopravou', () => {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get('trip_srilanka_2026') as any;
    expect(trip).toBeDefined();
    expect(trip.travelers_count).toBe(3);
    expect(trip.start_date).toBe('2026-12-26');
    expect(trip.end_date).toBe('2027-01-10');

    const days = db.prepare('SELECT * FROM days WHERE trip_id = ? ORDER BY day_number ASC').all('trip_srilanka_2026');
    expect(days.length).toBe(16);

    const accommodations = db.prepare('SELECT * FROM accommodations WHERE trip_id = ?').all('trip_srilanka_2026');
    expect(accommodations.length).toBe(15);

    const transport = db.prepare('SELECT * FROM transport_services WHERE trip_id = ?').all('trip_srilanka_2026') as any[];
    expect(transport.length).toBe(1);
    expect(transport[0].total_price).toBe(855);
  });
});
