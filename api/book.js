/**
 * api/book.js - Calaméo Metadata & Tokenized Vector Asset Extractor
 * Connects to Calaméo API, extracts wildcard page tokens and high-res vector assets.
 */

import https from 'https';

function fetchCalameoBookApi(bkcode) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'd.calameo.com',
      port: 443,
      path: `/3.0.0/book.php?bkcode=${encodeURIComponent(bkcode)}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.calameo.com/',
        'Accept': '*/*'
      },
      timeout: 12000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timeout to Calameo API'));
    });
    req.end();
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let input = req.query.url || req.query.bkcode || '';

    if (req.method === 'POST' && req.body) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      input = body.url || body.bkcode || input;
    }

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid Calameo URL or Book ID.'
      });
    }

    input = input.trim();

    // 1. Extract bkcode
    let bkcode = '';
    const readMatch = input.match(/\/read\/([a-zA-Z0-9_-]+)/i);
    const booksMatch = input.match(/\/books\/([a-zA-Z0-9_-]+)/i);
    const queryMatch = input.match(/[?&]bkcode=([a-zA-Z0-9_-]+)/i);

    if (readMatch && readMatch[1]) {
      bkcode = readMatch[1];
    } else if (booksMatch && booksMatch[1]) {
      bkcode = booksMatch[1];
    } else if (queryMatch && queryMatch[1]) {
      bkcode = queryMatch[1];
    } else if (/^[a-zA-Z0-9_-]{10,35}$/.test(input)) {
      bkcode = input;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid Calameo URL format. Expected: https://www.calameo.com/read/007907577e17cb97dca09'
      });
    }

    // 2. Fetch book details and authorization headers from Calameo
    const apiResult = await fetchCalameoBookApi(bkcode);

    if (apiResult.statusCode !== 200) {
      return res.status(apiResult.statusCode).json({
        success: false,
        error: `Calameo returned HTTP ${apiResult.statusCode}. Document may be private or password-protected.`
      });
    }

    // Parse JSON callback body
    let rawJson = apiResult.body.trim();
    rawJson = rawJson.replace(/^callback\s*\(/i, '').replace(/\);?$/i, '');
    const bookData = JSON.parse(rawJson);

    const content = bookData.content || {};
    const key = content.key || bkcode;
    const title = content.name || `Calameo_${bkcode}`;
    const totalPages = (content.document && content.document.pages) ? content.document.pages : 20;

    // 3. Extract wildcard signature token from Calaméo response headers
    const exp = apiResult.headers['x-calameo-hash-expires'] || '';
    const acl = apiResult.headers['x-calameo-hash-path'] || '';
    const hmac = apiResult.headers['x-calameo-hash-signature'] || '';

    const tokenQuery = (exp && acl && hmac)
      ? `?_token_=exp=${exp}~acl=${acl}~hmac=${hmac}`
      : '';

    // 4. Build page asset URLs with token authorization
    const pages = [];
    const proxyBase = '/api/proxy?url=';

    for (let i = 1; i <= totalPages; i++) {
      // Primary: High-fidelity Vector SVGZ
      const svgzUrl = `https://ps.calameoassets.com/${key}/p${i}.svgz${tokenQuery}`;
      // Fallback: High-resolution JPG
      const jpgUrl = `https://ps.calameoassets.com/${key}/p${i}.jpg${tokenQuery}`;
      const fallbackUrl = `https://i.calameoassets.com/${key}/p${i}.jpg`;

      pages.push({
        pageNumber: i,
        cdnUrl: svgzUrl,
        proxyUrl: `${proxyBase}${encodeURIComponent(svgzUrl)}`,
        fallbackJpgUrl: jpgUrl,
        fallbackThumbUrl: fallbackUrl
      });
    }

    // Cover thumbnail
    const coverCdnUrl = `https://i.calameoassets.com/${key}/p1.jpg`;
    const coverUrl = `${proxyBase}${encodeURIComponent(coverCdnUrl)}`;

    return res.status(200).json({
      success: true,
      bkcode,
      title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      totalPages,
      coverUrl,
      viewUrl: `https://www.calameo.com/read/${bkcode}`,
      pages
    });

  } catch (error) {
    console.error('API /api/book error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while inspecting Calameo publication.'
    });
  }
}
