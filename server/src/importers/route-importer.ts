export interface ImportedPoi {
  name: string;
  lat: number;
  lng: number;
  category_id?: string;
  description?: string;
  is_mandatory?: boolean;
  is_enabled?: boolean;
  why_visit?: string;
  recommended_duration?: string;
  cost_est?: number;
  cost_category?: string;
  data_origin: 'imported' | 'ai_completed' | 'needs_completion';
  day_number?: number;
}

export interface ImportedDay {
  day_number: number;
  title: string;
  date?: string;
  start_location?: string;
  overnight_location?: string;
  transit_time_est?: string;
  distance_km?: number;
  transport_mode?: string;
  activities?: string;
}

export interface ImportedTripResult {
  title: string;
  country_region?: string;
  motto?: string;
  travelers_count?: number;
  primary_transport?: string;
  start_date?: string;
  end_date?: string;
  days: ImportedDay[];
  pois: ImportedPoi[];
  coordinates: [number, number][]; // LineString [lng, lat]
}

/**
 * Clean and extract JSON string from possible markdown fences or conversational wrapper text.
 */
function cleanJsonString(raw: string): string {
  let text = raw.trim();

  // Strip markdown code fences (```json ... ``` or ``` ...)
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // If there's still text around the JSON object or array, extract it
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    text = text.slice(startIdx, endIdx + 1);
  }

  return text;
}

export function parseRouteFile(content: string, filenameOrFormat: string): ImportedTripResult {
  if (!content || !content.trim()) {
    throw new Error('Soubor je prázdný.');
  }

  const trimmed = content.trim();
  const format = (filenameOrFormat || '').toLowerCase();

  // 1. GPX check
  if (format.endsWith('.gpx') || trimmed.includes('<gpx')) {
    return parseGpx(trimmed);
  }

  // 2. KML check
  if (format.endsWith('.kml') || trimmed.includes('<kml')) {
    return parseKml(trimmed);
  }

  // 3. JSON check (either .json file or text starting with json/brackets or markdown)
  try {
    const cleaned = cleanJsonString(trimmed);
    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
      return parseJson(cleaned);
    }
  } catch (err: any) {
    throw new Error(`Chyba při čtení formátu JSON: ${err.message}`);
  }

  throw new Error('Nepodporovaný formát souboru. Nahrajte platný soubor GPX, KML nebo JSON (z ChatGPT).');
}

function extractXmlTag(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const matches: string[] = [];
  let m;
  while ((m = regex.exec(xml)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

function extractFirstTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = regex.exec(xml);
  return m ? m[1].trim() : null;
}

function extractXmlAttr(xml: string, attr: string): string | null {
  const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
  const m = regex.exec(xml);
  return m ? m[1] : null;
}

function parseGpx(xml: string): ImportedTripResult {
  const title = extractFirstTag(xml, 'name') || 'Importovaná trasa (GPX)';
  const pois: ImportedPoi[] = [];
  const coordinates: [number, number][] = [];

  // Parse waypoints (<wpt lat="..." lon="...">)
  const wptRegex = /<wpt\s+[^>]*lat=["']([^"']+)["']\s+[^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/wpt>/gi;
  let match;
  while ((match = wptRegex.exec(xml)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const body = match[3];

    const name = extractFirstTag(body, 'name') || `Bod ${pois.length + 1}`;
    const desc = extractFirstTag(body, 'desc') || extractFirstTag(body, 'cmt');

    if (!isNaN(lat) && !isNaN(lng)) {
      pois.push({
        name,
        lat,
        lng,
        category_id: inferCategory(name, desc || ''),
        description: desc || undefined,
        is_mandatory: true,
        is_enabled: true,
        data_origin: desc ? 'imported' : 'needs_completion',
      });
    }
  }

  // Parse tracks (<trkpt lat="..." lon="...">)
  const trkptRegex = /<trkpt\s+[^>]*lat=["']([^"']+)["']\s+[^>]*lon=["']([^"']+)["'][^>]*>/gi;
  while ((match = trkptRegex.exec(xml)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      coordinates.push([lng, lat]);
    }
  }

  // Group POIs into logical days
  const days: ImportedDay[] = [];
  if (pois.length > 0) {
    const poiPerDay = Math.max(1, Math.ceil(pois.length / 3));
    const dayCount = Math.ceil(pois.length / poiPerDay);

    for (let i = 1; i <= dayCount; i++) {
      days.push({
        day_number: i,
        title: `Den ${i}`,
        start_location: pois[(i - 1) * poiPerDay]?.name || 'Start',
        overnight_location: pois[Math.min(i * poiPerDay - 1, pois.length - 1)]?.name || 'Cíl',
      });
    }

    pois.forEach((p, idx) => {
      p.day_number = Math.min(Math.floor(idx / poiPerDay) + 1, dayCount);
    });
  } else {
    days.push({ day_number: 1, title: 'Den 1' });
  }

  return {
    title,
    country_region: 'Neznámá oblast',
    days,
    pois,
    coordinates,
  };
}

function parseKml(xml: string): ImportedTripResult {
  const title = extractFirstTag(xml, 'name') || 'Importovaná trasa (KML)';
  const pois: ImportedPoi[] = [];
  const coordinates: [number, number][] = [];

  const placemarks = extractXmlTag(xml, 'Placemark');

  for (const pm of placemarks) {
    const name = extractFirstTag(pm, 'name') || `Bod ${pois.length + 1}`;
    const desc = extractFirstTag(pm, 'description');

    const pointMatch = /<Point[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i.exec(pm);
    if (pointMatch) {
      const coordStr = pointMatch[1].trim();
      const parts = coordStr.split(',');
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          pois.push({
            name,
            lat,
            lng,
            category_id: inferCategory(name, desc || ''),
            description: desc || undefined,
            is_mandatory: true,
            is_enabled: true,
            data_origin: desc ? 'imported' : 'needs_completion',
          });
        }
      }
    }

    const lineMatch = /<LineString[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i.exec(pm);
    if (lineMatch) {
      const tuples = lineMatch[1].trim().split(/\s+/);
      for (const tuple of tuples) {
        const parts = tuple.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates.push([lng, lat]);
          }
        }
      }
    }
  }

  const days: ImportedDay[] = [];
  if (pois.length > 0) {
    const poiPerDay = Math.max(1, Math.ceil(pois.length / 3));
    const dayCount = Math.ceil(pois.length / poiPerDay);

    for (let i = 1; i <= dayCount; i++) {
      days.push({
        day_number: i,
        title: `Den ${i}`,
        start_location: pois[(i - 1) * poiPerDay]?.name || 'Start',
        overnight_location: pois[Math.min(i * poiPerDay - 1, pois.length - 1)]?.name || 'Cíl',
      });
    }

    pois.forEach((p, idx) => {
      p.day_number = Math.min(Math.floor(idx / poiPerDay) + 1, dayCount);
    });
  } else {
    days.push({ day_number: 1, title: 'Den 1' });
  }

  return {
    title,
    country_region: 'Neznámá oblast',
    days,
    pois,
    coordinates,
  };
}

function parseJson(jsonStr: string): ImportedTripResult {
  const data = JSON.parse(jsonStr);

  // If already native Tak Tudy! format
  if (data.title && (Array.isArray(data.days) || Array.isArray(data.pois))) {
    const parsedDays: ImportedDay[] = (data.days || []).map((d: any, idx: number) => ({
      day_number: Number(d.day_number) || idx + 1,
      title: d.title || `Den ${idx + 1}`,
      date: d.specific_date || d.date,
      start_location: d.start_location,
      overnight_location: d.overnight_location,
      transit_time_est: d.transit_time_est,
      distance_km: typeof d.distance_km === 'number' ? d.distance_km : parseFloat(d.distance_km) || 0,
      transport_mode: d.transport_mode,
      activities: d.activities,
    }));

    const parsedPois: ImportedPoi[] = (data.pois || [])
      .map((p: any) => {
        const lat = typeof p.lat === 'number' ? p.lat : parseFloat(p.lat);
        const lng = typeof p.lng === 'number' ? p.lng : parseFloat(p.lng);
        if (isNaN(lat) || isNaN(lng)) return null;

        return {
          name: p.name || 'Bod zájmu',
          lat,
          lng,
          category_id: normalizeCategory(p.category_id, p.name, p.description),
          description: p.description,
          is_mandatory: p.is_mandatory !== false,
          is_enabled: p.is_enabled !== false,
          why_visit: p.why_visit || p.description,
          recommended_duration: p.recommended_duration,
          cost_est: typeof p.cost_est === 'number' ? p.cost_est : parseFloat(p.cost_est) || 0,
          cost_category: p.cost_category || 'tickets',
          data_origin: p.data_origin || 'imported',
          day_number: Number(p.day_number) || 1,
        };
      })
      .filter((p: any): p is ImportedPoi => p !== null);

    return {
      title: data.title,
      country_region: data.country_region || 'Nespecifikováno',
      motto: data.motto,
      travelers_count: Number(data.travelers_count) || 3,
      primary_transport: data.primary_transport || 'Auto',
      start_date: data.start_date,
      end_date: data.end_date,
      days: parsedDays.length > 0 ? parsedDays : [{ day_number: 1, title: 'Den 1' }],
      pois: parsedPois,
      coordinates: Array.isArray(data.coordinates) ? data.coordinates : [],
    };
  }

  // GeoJSON FeatureCollection
  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    const pois: ImportedPoi[] = [];
    const coordinates: [number, number][] = [];

    for (const f of data.features) {
      if (f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
        const lng = f.geometry.coordinates[0];
        const lat = f.geometry.coordinates[1];
        const name = f.properties?.name || f.properties?.title || `Bod ${pois.length + 1}`;
        const desc = f.properties?.description || f.properties?.desc;

        if (!isNaN(lat) && !isNaN(lng)) {
          pois.push({
            name,
            lat,
            lng,
            category_id: inferCategory(name, desc || ''),
            description: desc || undefined,
            is_mandatory: true,
            is_enabled: true,
            data_origin: desc ? 'imported' : 'needs_completion',
          });
        }
      } else if (f.geometry?.type === 'LineString' && Array.isArray(f.geometry.coordinates)) {
        f.geometry.coordinates.forEach((c: number[]) => {
          if (c.length >= 2) coordinates.push([c[0], c[1]]);
        });
      }
    }

    return {
      title: data.name || 'Importovaný GeoJSON',
      days: [{ day_number: 1, title: 'Den 1' }],
      pois,
      coordinates,
    };
  }

  throw new Error('Formát JSON nebyl rozpoznán. Očekává se platný formát Tak Tudy! nebo GeoJSON.');
}

const VALID_CATEGORIES = new Set([
  'accommodation',
  'food',
  'bar',
  'monument',
  'view',
  'nature',
  'transport',
  'other',
]);

function normalizeCategory(catId: string | undefined, name: string, desc: string = ''): string {
  if (!catId) return inferCategory(name, desc);
  const lower = catId.toLowerCase();
  if (lower === 'sight') return 'monument';
  if (lower === 'hotel') return 'accommodation';
  if (lower === 'restaurant') return 'food';
  if (VALID_CATEGORIES.has(lower)) return lower;
  return inferCategory(name, desc);
}

function inferCategory(name: string, desc: string = ''): string {
  const combined = `${name} ${desc}`.toLowerCase();
  if (combined.match(/hotel|resort|ubytov|hostel|inn|lodge|apartm|chalet|villa/)) return 'accommodation';
  if (combined.match(/restaur|cafe|káva|jidlo|bistro|curry|food|večeře|obed|snidane/)) return 'food';
  if (combined.match(/bar|pub|vino|wine|pivo|drink|cocktail/)) return 'bar';
  if (combined.match(/chrám|temple|hrad|castle|palace|ruin|fort|stupa|monument|unesco|kostel/)) return 'monument';
  if (combined.match(/vyhlídka|view|peak|rozhledna|panorama|rock/)) return 'view';
  if (combined.match(/park|pláž|beach|safari|nature|falls|vodopád|les|flora|zahrada|kopec/)) return 'nature';
  if (combined.match(/vlak|train|nádraží|station|letiště|airport|auto|car|bus|transfer/)) return 'transport';
  return 'other';
}
