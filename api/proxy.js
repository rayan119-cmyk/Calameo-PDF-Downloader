/**
 * api/proxy.js - Serverless CORS & GZIP/SVGZ Decompressor Proxy
 * Bypasses CORS restrictions and automatically decompresses .svgz streams.
 */

import zlib from 'zlib';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const parsedUrl = new URL(targetUrl);
    // Allow only legitimate CDN / Calaméo domains for security
    const isAllowedHost = /calameo\.com|calameoassets\.com/i.test(parsedUrl.hostname);
    if (!isAllowedHost) {
      return res.status(403).send('Forbidden: Only Calaméo assets can be proxied.');
    }

    let response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.calameo.com/',
        'Accept': '*/*'
      }
    });

    // Fallback: If .svgz fails with 404, try .jpg equivalent
    if (!response.ok && targetUrl.endsWith('.svgz')) {
      const fallbackUrl = targetUrl.replace(/\.svgz$/i, '.jpg');
      response = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.calameo.com/',
          'Accept': '*/*'
        }
      });
    }

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch asset: HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // Check if buffer is GZIP compressed (Magic bytes: 0x1f, 0x8b)
    const isGzip = (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) ||
                   targetUrl.includes('.svgz') ||
                   contentType.includes('gzip');

    if (isGzip) {
      try {
        const decompressed = zlib.gunzipSync(buffer);
        buffer = decompressed;

        const textSample = buffer.slice(0, 100).toString('utf-8');
        if (/<svg/i.test(textSample)) {
          res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        } else {
          res.setHeader('Content-Type', 'image/jpeg');
        }
      } catch (err) {
        console.warn('GZIP decompress warning, serving raw buffer:', err.message);
        res.setHeader('Content-Type', contentType || 'image/jpeg');
      }
    } else {
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      } else if (targetUrl.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      } else if (targetUrl.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else {
        res.setHeader('Content-Type', 'image/jpeg');
      }
    }

    // Cache control for fast subsequent downloads (1 day edge cache)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(buffer);

  } catch (error) {
    console.error('Proxy error for URL:', targetUrl, error);
    return res.status(500).send(`Proxy Error: ${error.message}`);
  }
}
