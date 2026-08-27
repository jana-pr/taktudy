import dns from 'node:dns/promises';
import * as cheerio from 'cheerio';

function isPrivateIp(ip: string): boolean {
  // IPv4 checks
  if (ip.startsWith('127.') || ip === '0.0.0.0') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true; // Link-local / Cloud metadata
  
  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }

  // IPv6 checks
  if (ip === '::1' || ip === '::' || ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc00:')) {
    return true;
  }

  return false;
}

export interface ExtractedMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  address?: string;
  lat?: number;
  lng?: number;
  sourceUrl: string;
}

export async function parseUrlSafely(targetUrl: string): Promise<ExtractedMetadata> {
  const parsed = new URL(targetUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Nepovolený protokol. Povoleno je pouze HTTP a HTTPS.');
  }

  const hostname = parsed.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    throw new Error('Přístup k lokálním síťovým zdrojům je zakázán.');
  }

  // DNS lookup and SSRF check
  try {
    const lookup = await dns.lookup(hostname);
    if (isPrivateIp(lookup.address)) {
      throw new Error(`Cílová adresa ${lookup.address} směřuje do privátní sítě. Přístup zakázán.`);
    }
  } catch (err: any) {
    if (err.message.includes('privátní')) throw err;
    throw new Error(`Nepodařilo se ověřit doménu: ${hostname}`);
  }

  // Fetch HTML with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TakTudyBot/1.0 (+https://taktudy.app/bot; travel planner)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Chyba při stahování stránky: HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract OpenGraph / Meta data
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim() ||
      undefined;

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      undefined;

    let imageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      undefined;

    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = new URL(imageUrl, targetUrl).toString();
    }

    // Try schema.org JSON-LD for Geo coordinates / Address
    let lat: number | undefined;
    let lng: number | undefined;
    let address: string | undefined;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).text();
        const json = JSON.parse(text);
        const findPlace = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.geo && typeof obj.geo === 'object') {
            if (obj.geo.latitude && obj.geo.longitude) {
              lat = parseFloat(obj.geo.latitude);
              lng = parseFloat(obj.geo.longitude);
            }
          }
          if (obj.address) {
            if (typeof obj.address === 'string') {
              address = obj.address;
            } else if (obj.address.streetAddress || obj.address.addressLocality) {
              address = [obj.address.streetAddress, obj.address.addressLocality, obj.address.addressCountry]
                .filter(Boolean)
                .join(', ');
            }
          }
          for (const key of Object.keys(obj)) {
            findPlace(obj[key]);
          }
        };
        findPlace(json);
      } catch {
        // ignore JSON-LD parse errors
      }
    });

    return {
      title,
      description,
      imageUrl,
      address,
      lat,
      lng,
      sourceUrl: targetUrl,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
