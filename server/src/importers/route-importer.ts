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

export function parseRouteFile(content: string, filenameOrFormat: string): ImportedTripResult {
  const trimmed = content.trim();
  const format = filenameOrFormat.toLowerCase();

  if (format.endsWith('.gpx') || trimmed.includes('<gpx')) {
    return parseGpx(trimmed);
  } else if (format.endsWith('.kml') || trimmed.includes('<kml')) {
    return parseKml(trimmed);
  } else if (format.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJson(trimmed);
  }

  throw new Error('Nepodporovaný formát souboru. Podporovány jsou pouze GPX, KML a JSON.');
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
    const name = extractFirstTag(body, 'name') || 'Bod zájmu';
    const desc = extractFirstTag(body, 'desc') || extractFirstTag(body, 'cmt') || '';

    pois.push({
      name,
      lat,
      lng,
      category_id: inferCategory(name, desc),
      description: desc || undefined,
      is_mandatory: true,
      is_enabled: true,
      why_visit: desc || undefined,
      data_origin: desc ? 'imported' : 'needs_completion',
    });
  }

  // Parse track points (<trkpt lat="..." lon="...">)
  const trkptRegex = /<trkpt\s+[^>]*lat=["']([^"']+)["']\s+[^>]*lon=["']([^"']+)["'][^>]*>/gi;
  while ((match = trkptRegex.exec(xml)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      coordinates.push([lng, lat]);
    }
  }

  // If no trackpoints, build line from waypoints
  if (coordinates.length === 0 && pois.length > 1) {
    pois.forEach((p) => coordinates.push([p.lng, p.lat]));
  }

  // Create automatic days grouping
  const days: ImportedDay[] = [];
  if (pois.length > 0) {
    const poiPerDay = Math.max(1, Math.ceil(pois.length / 3));
    let dayCount = Math.ceil(pois.length / poiPerDay);
    if (dayCount < 1) dayCount = 1;

    for (let i = 1; i <= dayCount; i++) {
      days.push({
        day_number: i,
        title: `Den ${i}`,
        transport_mode: 'Auto / Veřejná doprava',
        start_location: pois[(i - 1) * poiPerDay]?.name || 'Výchozí bod',
        overnight_location: pois[Math.min(i * poiPerDay - 1, pois.length - 1)]?.name || 'Cíl dne',
      });
    }

    pois.forEach((p, idx) => {
      p.day_number = Math.min(Math.floor(idx / poiPerDay) + 1, dayCount);
    });
  } else {
    days.push({
      day_number: 1,
      title: 'Den 1',
      start_location: 'Start trasy',
      overnight_location: 'Cíl trasy',
    });
  }

  return {
    title,
    country_region: 'Neznámá oblast (doplňte)',
    days,
    pois,
    coordinates,
  };
}

function parseKml(xml: string): ImportedTripResult {
  const title = extractFirstTag(xml, 'name') || 'Importovaná trasa (KML)';
  const pois: ImportedPoi[] = [];
  const coordinates: [number, number][] = [];

  const placemarkRegex = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/gi;
  let pm;

  while ((pm = placemarkRegex.exec(xml)) !== null) {
    const body = pm[1];
    const name = extractFirstTag(body, 'name') || 'Bod na trase';
    const desc = extractFirstTag(body, 'description') || '';

    // Check if it has a Point
    const pointCoord = extractFirstTag(body, 'coordinates');
    if (pointCoord) {
      const parts = pointCoord.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          pois.push({
            name,
            lat,
            lng,
            category_id: inferCategory(name, desc),
            description: desc || undefined,
            is_mandatory: true,
            is_enabled: true,
            data_origin: desc ? 'imported' : 'needs_completion',
          });
        }
      }
    }

    // Check if it has LineString
    const lineCoord = extractFirstTag(body, 'coordinates');
    if (body.includes('<LineString') && lineCoord) {
      const rawCoords = lineCoord.split(/\s+/);
      for (const tuple of rawCoords) {
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
    return {
      title: data.title,
      country_region: data.country_region || 'Nespecifikováno',
      motto: data.motto,
      travelers_count: data.travelers_count || 3,
      primary_transport: data.primary_transport || 'Auto',
      start_date: data.start_date,
      end_date: data.end_date,
      days: (data.days || []).map((d: any, idx: number) => ({
        day_number: d.day_number || idx + 1,
        title: d.title || `Den ${idx + 1}`,
        date: d.specific_date || d.date,
        start_location: d.start_location,
        overnight_location: d.overnight_location,
        transit_time_est: d.transit_time_est,
        distance_km: d.distance_km,
        transport_mode: d.transport_mode,
        activities: d.activities,
      })),
      pois: (data.pois || []).map((p: any) => ({
        name: p.name || 'Bod zájmu',
        lat: p.lat,
        lng: p.lng,
        category_id: p.category_id || inferCategory(p.name, p.description),
        description: p.description,
        is_mandatory: p.is_mandatory ?? true,
        is_enabled: p.is_enabled ?? true,
        why_visit: p.why_visit || p.description,
        recommended_duration: p.recommended_duration,
        cost_est: p.cost_est,
        cost_category: p.cost_category,
        data_origin: p.data_origin || 'imported',
        day_number: p.day_number || 1,
      })),
      coordinates: data.coordinates || [],
    };
  }

  // GeoJSON FeatureCollection
  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    const pois: ImportedPoi[] = [];
    const coordinates: [number, number][] = [];

    for (const f of data.features) {
      if (f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
        const [lng, lat] = f.geometry.coordinates;
        const name = f.properties?.name || f.properties?.title || 'Zájmový bod';
        const desc = f.properties?.description || f.properties?.desc || '';
        pois.push({
          name,
          lat,
          lng,
          category_id: inferCategory(name, desc),
          description: desc || undefined,
          is_mandatory: true,
          is_enabled: true,
          data_origin: desc ? 'imported' : 'needs_completion',
        });
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

  throw new Error('Formát JSON nebyl rozpoznán. Očekává se formát Tak Tudy! nebo GeoJSON FeatureCollection.');
}

function inferCategory(name: string, desc: string = ''): string {
  const combined = `${name} ${desc}`.toLowerCase();
  if (combined.match(/hotel|resort|ubytov|hostel|inn|lodge|apartm|chalet/)) return 'accommodation';
  if (combined.match(/restaur|cafe|káva|jidlo|bistro|curry|food|večeře|obed/)) return 'food';
  if (combined.match(/bar|pub|vino|wine|pivo|drink/)) return 'bar';
  if (combined.match(/chrám|temple|hrad|castle|palace|ruin|fort|stupa|monument|unesco/)) return 'monument';
  if (combined.match(/vyhlídka|view|peak|rozhledna|panorama|rock/)) return 'view';
  if (combined.match(/park|pláž|beach|safari|nature|falls|vodopád|les|flora|zahrada/)) return 'nature';
  if (combined.match(/nádraží|station|vlak|train|airport|letiště|ferry|přístav/)) return 'transport';
  return 'other';
}
