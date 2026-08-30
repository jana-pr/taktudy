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
  source_url?: string | null;
  booking_url?: string | null;
  main_photo_url?: string | null;
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

export interface ImportedAccommodation {
  day_number?: number;
  hotel_name: string;
  location?: string;
  lat?: number;
  lng?: number;
  booking_url?: string;
  price_total?: number;
  price_single?: number;
  price_currency?: string;
  rooms_count?: number;
}

export interface ImportedBooking {
  type?: string;
  title: string;
  provider?: string;
  confirmation_number?: string;
  price?: number;
  currency?: string;
  booking_date?: string;
  notes?: string;
  document_url?: string;
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
  accommodations?: ImportedAccommodation[];
  bookings?: ImportedBooking[];
  coordinates: [number, number][]; // LineString [lng, lat]
}

/**
 * Clean and extract JSON string from possible markdown fences or conversational wrapper text.
 * Safely preserves https:// and http:// URLs inside string literals!
 */
function cleanJsonString(raw: string): string {
  let text = raw.trim();

  // 1. If text contains markdown code block with json/code, prefer inside block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1].trim().length > 0) {
    const candidate = codeBlockMatch[1].trim();
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      text = candidate;
    }
  }

  // Strip remaining markdown fences if any
  text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // Normalize smart quotes (common on iOS / iPhone / Mac clipboard)
  text = text
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  // Safe comment stripper that respects strings (preserves https://... and http://...)
  function stripCommentsSafely(str: string): string {
    let out = '';
    let inString = false;
    let quoteChar = '';
    let isEscaped = false;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const next = str[i + 1];

      if (inString) {
        out += ch;
        if (isEscaped) {
          isEscaped = false;
        } else if (ch === '\\') {
          isEscaped = true;
        } else if (ch === quoteChar) {
          inString = false;
        }
      } else {
        if (ch === '"' || ch === "'") {
          inString = true;
          quoteChar = ch;
          out += ch;
        } else if (ch === '/' && next === '/') {
          while (i < str.length && str[i] !== '\n' && str[i] !== '\r') {
            i++;
          }
          if (i < str.length) out += str[i];
        } else if (ch === '/' && next === '*') {
          i += 2;
          while (i < str.length && !(str[i] === '*' && str[i + 1] === '/')) {
            i++;
          }
          i++;
        } else {
          out += ch;
        }
      }
    }
    return out;
  }

  text = stripCommentsSafely(text);

  // Find outermost { ... } or [ ... ]
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;
  let isObject = true;

  if (firstBrace !== -1 && firstBracket !== -1) {
    if (firstBrace < firstBracket) {
      startIdx = firstBrace;
      isObject = true;
    } else {
      startIdx = firstBracket;
      isObject = false;
    }
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }

  if (startIdx !== -1) {
    const endIdx = isObject ? text.lastIndexOf('}') : text.lastIndexOf(']');
    if (endIdx !== -1 && endIdx > startIdx) {
      text = text.slice(startIdx, endIdx + 1);
    }
  }

  // Remove trailing commas before } or ]
  text = text.replace(/,(\s*[}\]])/g, '$1');

  return text.trim();
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

function parseRelaxedJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch (err: any) {
    try {
      const relaxed = str
        // replace unquoted keys: { key: "val" } -> { "key": "val" }
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        // replace single-quoted strings: 'val' -> "val"
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      return JSON.parse(relaxed);
    } catch {
      throw new Error('Neplatný formát JSON. Zkontrolujte prosím, zda je text kompletní: ' + err.message);
    }
  }
}

function parseJson(jsonStr: string): ImportedTripResult {
  let rawData: any;
  rawData = parseRelaxedJson(jsonStr);

  // If top-level array, treat as array of days or POIs
  if (Array.isArray(rawData)) {
    if (rawData.length > 0 && (rawData[0].day_number || rawData[0].day || rawData[0].den || rawData[0].activities)) {
      rawData = { days: rawData };
    } else {
      rawData = { pois: rawData };
    }
  }

  // Unwrap common wrapper keys: { itinerary: { ... } } or { trip: { ... } } or { plan: { ... } }
  const data =
    rawData.itinerary ||
    rawData.trip ||
    rawData.plan ||
    rawData.cesta ||
    rawData.data ||
    rawData.trasa ||
    rawData.exportData ||
    rawData.trip_plan ||
    rawData;

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

  // General JSON parser for ChatGPT and Tak Tudy!
  const title =
    data.title ||
    data.name ||
    data.trip_title ||
    data.nazev ||
    data.destination ||
    data.cil ||
    'Nová cesta z ChatGPT';

  const country_region =
    data.country_region ||
    data.country ||
    data.destination ||
    data.zeme ||
    data.oblast ||
    'Srí Lanka';

  const motto = data.motto || data.description || data.popis;
  const travelers_count = Number(data.travelers_count || data.travelers || data.cestujici) || 3;
  const primary_transport = data.primary_transport || data.transport || data.doprava || 'Soukromé auto s řidičem';
  const start_date = data.start_date || data.start || data.od;
  const end_date = data.end_date || data.end || data.do;

  // Extract raw days array
  const rawDays: any[] = Array.isArray(data.days)
    ? data.days
    : Array.isArray(data.dny)
    ? data.dny
    : Array.isArray(data.itinerary)
    ? data.itinerary
    : [];

  const parsedDays: ImportedDay[] = rawDays.map((d: any, idx: number) => ({
    day_number: Number(d.day_number || d.day || d.den) || idx + 1,
    title: d.title || d.name || d.nazev || `Den ${idx + 1}`,
    date: d.specific_date || d.date || d.datum,
    start_location: d.start_location || d.start || d.odkud,
    overnight_location: d.overnight_location || d.overnight || d.hotel || d.nocleh || d.kam,
    transit_time_est: d.transit_time_est || d.transit_time || d.cas_prejezdu,
    distance_km: typeof d.distance_km === 'number' ? d.distance_km : parseFloat(d.distance_km) || 0,
    transport_mode: d.transport_mode || d.transport || d.doprava || 'Auto',
    activities: d.activities || d.notes || d.popis,
  }));

  // Extract POIs from top-level array
  const rawPois: any[] = Array.isArray(data.pois)
    ? [...data.pois]
    : Array.isArray(data.places)
    ? [...data.places]
    : Array.isArray(data.mista)
    ? [...data.mista]
    : Array.isArray(data.attractions)
    ? [...data.attractions]
    : [];

  // ALSO extract POIs nested inside each day (very common in ChatGPT outputs!)
  rawDays.forEach((d: any, dIdx: number) => {
    const dayNum = Number(d.day_number || d.day || d.den) || dIdx + 1;
    const dayPois = Array.isArray(d.pois)
      ? d.pois
      : Array.isArray(d.places)
      ? d.places
      : Array.isArray(d.mista)
      ? d.mista
      : Array.isArray(d.attractions)
      ? d.attractions
      : Array.isArray(d.highlights)
      ? d.highlights
      : [];

    dayPois.forEach((dp: any) => {
      if (typeof dp === 'string') {
        rawPois.push({ name: dp, day_number: dayNum });
      } else if (typeof dp === 'object' && dp !== null) {
        rawPois.push({ ...dp, day_number: dp.day_number || dayNum });
      }
    });
  });

  // Base coordinates fallback (Sri Lanka centroid if not given)
  const baseLat = 7.8731;
  const baseLng = 80.7718;

  const parsedPois: ImportedPoi[] = rawPois.map((p: any, idx: number) => {
    const name = p.name || p.title || p.nazev || p.misto || `Místo ${idx + 1}`;
    let lat: number = typeof p.lat === 'number' ? p.lat : parseFloat(p.lat || p.latitude);
    let lng: number = typeof p.lng === 'number' ? p.lng : parseFloat(p.lng || p.longitude);

    // Support coordinates: [lng, lat] or [lat, lng]
    if ((isNaN(lat) || isNaN(lng)) && Array.isArray(p.coordinates) && p.coordinates.length >= 2) {
      if (p.coordinates[0] > 60 && p.coordinates[0] < 100) {
        lng = parseFloat(p.coordinates[0]);
        lat = parseFloat(p.coordinates[1]);
      } else {
        lat = parseFloat(p.coordinates[0]);
        lng = parseFloat(p.coordinates[1]);
      }
    }

    // Support location object { lat, lng }
    if ((isNaN(lat) || isNaN(lng)) && p.location && typeof p.location === 'object') {
      lat = parseFloat(p.location.lat || p.location.latitude);
      lng = parseFloat(p.location.lng || p.location.longitude);
    }

    // Fallback coordinates if still NaN so the place is NEVER lost
    if (isNaN(lat) || isNaN(lng)) {
      lat = baseLat + ((idx * 0.15) % 1.5) - 0.75;
      lng = baseLng + (((idx * 0.23) % 1.2) - 0.6);
    }

    const desc = p.description || p.desc || p.popis || p.note || p.notes;
    const cat = normalizeCategory(p.category_id || p.category || p.kategorie || p.type, name, desc);
    const cost = typeof p.cost_est === 'number' ? p.cost_est : parseFloat(p.cost_est || p.cost || p.price || p.cena) || 0;
    const sourceUrl = p.source_url || p.booking_url || p.website_url || p.url || p.link || p.odkaz || null;
    const bookingUrl = p.booking_url || (cat === 'accommodation' ? sourceUrl : null);

    return {
        name,
        lat,
        lng,
        category_id: cat,
        description: desc,
        is_mandatory: p.is_mandatory !== false,
        is_enabled: p.is_enabled !== false,
        why_visit: p.why_visit || p.duvod || desc,
        recommended_duration: p.recommended_duration || p.duration || p.doba_navstevy,
        cost_est: cost,
        cost_category: p.cost_category || (cat === 'accommodation' ? 'accommodation' : 'tickets'),
        data_origin: p.data_origin || 'imported',
        day_number: Number(p.day_number || p.day || p.den) || 1,
        source_url: sourceUrl,
        booking_url: bookingUrl,
        main_photo_url: p.main_photo_url || p.photo_url || p.image_url || p.image || null,
      };
    });

  // Extract accommodations from data or overnight locations
  const rawAccommodations: any[] = Array.isArray(data.accommodations)
    ? [...data.accommodations]
    : Array.isArray(data.ubytovani)
    ? [...data.ubytovani]
    : Array.isArray(data.hotels)
    ? [...data.hotels]
    : [];

  // Also auto-detect hotels from rawPois if they have booking_url or category hotel/accommodation
  rawPois.forEach((p: any) => {
    const pCat = (p.category_id || p.category || p.cost_category || '').toLowerCase();
    const isHotel = pCat === 'hotel' || pCat === 'accommodation' || Boolean(p.booking_url);
    if (isHotel && p.name) {
      if (!rawAccommodations.some((a) => (a.hotel_name || a.name || a.nazev) === p.name)) {
        rawAccommodations.push({
          day_number: Number(p.day_number || p.day || p.den) || 1,
          hotel_name: p.name,
          location: p.location || p.address || p.misto || null,
          lat: p.lat,
          lng: p.lng,
          booking_url: p.booking_url || p.source_url || p.website_url || p.url,
          price_total: typeof p.cost_est === 'number' ? p.cost_est : parseFloat(p.cost_est || p.cost || p.price || p.cena) || 0,
        });
      }
    }
  });

  rawDays.forEach((d: any, idx: number) => {
    const dayNum = Number(d.day_number || d.day || d.den) || idx + 1;
    const hotelName = d.hotel || d.overnight_location || d.nocleh || d.ubytovani;
    if (hotelName && typeof hotelName === 'string' && hotelName.length > 2) {
      if (!rawAccommodations.some((a) => (a.hotel_name || a.name || a.nazev) === hotelName)) {
        rawAccommodations.push({
          day_number: dayNum,
          hotel_name: hotelName,
          location: d.overnight_location || d.start_location,
        });
      }
    }
  });

  const parsedAccommodations: ImportedAccommodation[] = rawAccommodations.map((a: any, idx: number) => ({
    day_number: Number(a.day_number || a.day || a.den) || (idx % (parsedDays.length || 1)) + 1,
    hotel_name: a.hotel_name || a.name || a.nazev || a.hotel || `Hotel ${idx + 1}`,
    location: a.location || a.misto || a.adresa,
    lat: typeof a.lat === 'number' ? a.lat : parseFloat(a.lat || a.latitude) || undefined,
    lng: typeof a.lng === 'number' ? a.lng : parseFloat(a.lng || a.longitude) || undefined,
    booking_url: a.booking_url || a.url || a.odkaz || a.link,
    price_total: typeof a.price_total === 'number' ? a.price_total : parseFloat(a.price_total || a.cost_est || a.cost || a.price || a.cena) || 0,
    price_single: typeof a.price_single === 'number' ? a.price_single : parseFloat(a.price_single) || 0,
    price_currency: a.price_currency || a.currency || 'USD',
    rooms_count: Number(a.rooms_count || a.rooms || a.pokoje) || 2,
  }));

  // Extract bookings / reservations
  const rawBookings: any[] = Array.isArray(data.bookings)
    ? [...data.bookings]
    : Array.isArray(data.rezervace)
    ? [...data.rezervace]
    : Array.isArray(data.reservations)
    ? [...data.reservations]
    : Array.isArray(data.flights)
    ? [...data.flights]
    : [];

  const parsedBookings: ImportedBooking[] = rawBookings.map((b: any, idx: number) => {
    let bType = (b.type || b.typ || 'other').toLowerCase();
    if (bType.includes('let') || bType.includes('flight')) bType = 'flight';
    else if (bType.includes('hotel') || bType.includes('ubytov')) bType = 'hotel';
    else if (bType.includes('auto') || bType.includes('car') || bType.includes('transfer')) bType = 'car';
    else if (bType.includes('vstup') || bType.includes('ticket')) bType = 'ticket';
    else bType = 'other';

    return {
      type: bType,
      title: b.title || b.name || b.nazev || `Rezervace ${idx + 1}`,
      provider: b.provider || b.poskytovatel || b.airline || b.spolecnost,
      confirmation_number: b.confirmation_number || b.kod || b.booking_number || b.ticket_number,
      price: typeof b.price === 'number' ? b.price : parseFloat(b.price || b.cena || b.cost || b.cost_est) || 0,
      currency: b.currency || b.mena || 'USD',
      booking_date: b.booking_date || b.date || b.datum,
      notes: b.notes || b.note || b.poznamka || b.details,
      document_url: b.document_url || b.url || b.link,
    };
  });

  return {
    title,
    country_region,
    motto,
    travelers_count,
    primary_transport,
    start_date,
    end_date,
    days: parsedDays.length > 0 ? parsedDays : [{ day_number: 1, title: 'Den 1: Příjezd' }],
    pois: parsedPois,
    accommodations: parsedAccommodations,
    bookings: parsedBookings,
    coordinates: Array.isArray(data.coordinates) ? data.coordinates : [],
  };
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
