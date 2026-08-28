/**
 * api/book.js - Calaméo Metadata Extractor Serverless Function
 * Fetches publication title, page count, and CDN page asset URLs from Calaméo API.
 */

export default async function handler(req, res) {
  // CORS Headers
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
        error: 'Please provide a valid Calameo URL or Book ID (bkcode).'
      });
    }

    input = input.trim();

    // 1. Extraire le bkcode (identifiant unique de 15 à 30 caractères)
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
        error: 'Invalid Calameo URL format. Expected format: https://www.calameo.com/read/007907577e17cb97dca09'
      });
    }

    // 2. Interroger l'API publique de configuration Calaméo
    const calameoApiUrl = `https://d.calameo.com/3.0.0/book.php?bkcode=${encodeURIComponent(bkcode)}`;
    
    const response = await fetch(calameoApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/xml,application/xml,text/plain,*/*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Calameo API returned error status HTTP ${response.status}. Please check if the publication is public.`
      });
    }

    const xmlText = await response.text();

    // 3. Parser les métadonnées depuis le XML / format de réponse Calaméo
    const extractXmlTag = (tag) => {
      const match = xmlText.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match && match[1] ? match[1].trim() : '';
    };

    const title = extractXmlTag('title') || extractXmlTag('Name') || 'Calaméo Document';
    const rawPages = extractXmlTag('pages') || extractXmlTag('Pages') || '0';
    const totalPages = parseInt(rawPages, 10) || 0;
    const accountId = extractXmlTag('AccountID') || extractXmlTag('account_id') || extractXmlTag('AccountId') || '';
    const authId = extractXmlTag('AuthID') || extractXmlTag('auth_id') || '';
    const viewUrl = extractXmlTag('url') || `https://www.calameo.com/read/${bkcode}`;
    const isSvg = /<svg>1<\/svg>|<svgz>1<\/svgz>/i.test(xmlText);

    if (totalPages <= 0) {
      return res.status(422).json({
        success: false,
        error: 'Unable to detect pages for this publication. The document might be private or password-protected.'
      });
    }

    // 4. Construire les URLs des pages CDN Calaméo
    const pageUrls = [];
    const proxyBase = '/api/proxy?url=';

    for (let i = 1; i <= totalPages; i++) {
      // Structure standard de CDN Calaméo pour les pages :
      // https://p.calameoassets.com/{AccountId}/{BookCode}/p{Index}.jpg (ou .svgz)
      let cdnUrl = '';
      if (accountId) {
        cdnUrl = isSvg
          ? `https://p.calameoassets.com/${accountId}/${bkcode}/p${i}.svgz`
          : `https://p.calameoassets.com/${accountId}/${bkcode}/p${i}.jpg`;
      } else {
        cdnUrl = `https://p.calameoassets.com/${bkcode}/p${i}.jpg`;
      }

      pageUrls.push({
        pageNumber: i,
        cdnUrl: cdnUrl,
        proxyUrl: `${proxyBase}${encodeURIComponent(cdnUrl)}`,
        fallbackJpgUrl: accountId ? `https://p.calameoassets.com/${accountId}/${bkcode}/p${i}.jpg` : cdnUrl
      });
    }

    const coverUrl = pageUrls[0]?.proxyUrl || '';

    return res.status(200).json({
      success: true,
      bkcode,
      title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      totalPages,
      accountId,
      authId,
      viewUrl,
      isSvg,
      coverUrl,
      pages: pageUrls
    });

  } catch (error) {
    console.error('API /api/book error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while inspecting Calameo publication.'
    });
  }
}
