/**
 * api/book.js - Robust Multi-Tier Calaméo Metadata & Page Asset Extractor
 */

export default async function handler(req, res) {
  // Enable CORS
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

    let title = '';
    let totalPages = 0;
    let coverUrl = '';
    let assetBasePattern = '';
    let tokenQuery = '';

    // TIER 1 : Fetch the HTML reader page directly
    const readerUrls = [
      `https://www.calameo.com/read/${bkcode}`,
      `https://en.calameo.com/read/${bkcode}`,
      `https://www.calameo.com/books/${bkcode}`
    ];

    let htmlContent = '';
    for (const rUrl of readerUrls) {
      try {
        const resp = await fetch(rUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          }
        });
        if (resp.ok) {
          htmlContent = await resp.text();
          if (htmlContent.length > 500) break;
        }
      } catch (e) {
        console.warn(`Reader URL fetch attempt failed for ${rUrl}:`, e.message);
      }
    }

    if (htmlContent) {
      // Parse Title
      const ogTitle = htmlContent.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i);
      const docTitle = htmlContent.match(/<title>([^<]+)<\/title>/i);
      const descTitle = htmlContent.match(/Title:\s*([^,]+)/i);
      title = (ogTitle ? ogTitle[1] : (descTitle ? descTitle[1] : (docTitle ? docTitle[1] : ''))).trim();

      // Parse Total Pages
      const lengthMatch = htmlContent.match(/Length:\s*([0-9]+)\s*pages/i);
      const pagesMatch = htmlContent.match(/([0-9]+)\s*pages/i);
      const jsonPages = htmlContent.match(/"pages"\s*:\s*([0-9]+)/i);
      if (lengthMatch) totalPages = parseInt(lengthMatch[1], 10);
      else if (pagesMatch) totalPages = parseInt(pagesMatch[1], 10);
      else if (jsonPages) totalPages = parseInt(jsonPages[1], 10);

      // Parse Image asset pattern
      const imageSrcMatch = htmlContent.match(/<link rel=["']image_src["'] href=["']([^"']+)["']/i) ||
                            htmlContent.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i) ||
                            htmlContent.match(/(https?:\/\/[^"'<>\s]*calameoassets\.com\/[^"'<>\s]+\/p1\.jpg[^"'<>\s]*)/i);

      if (imageSrcMatch && imageSrcMatch[1]) {
        const fullImg = imageSrcMatch[1].replace(/&amp;/g, '&');
        coverUrl = fullImg;

        // Check if there's a token query (?_token_=...)
        const tokenMatch = fullImg.match(/(\?_token_=[^"'\s]+)/i);
        if (tokenMatch) tokenQuery = tokenMatch[1];

        // Match base before /p1.jpg
        const baseMatch = fullImg.match(/(https?:\/\/[^/]+\/[^?#]+\/)p[0-9]+\.jpg/i);
        if (baseMatch && baseMatch[1]) {
          assetBasePattern = baseMatch[1];
        }
      }
    }

    // TIER 2 : Fallback to Calaméo book API if pages or title not found
    if (!totalPages || totalPages <= 0) {
      try {
        const bookApiResp = await fetch(`https://d.calameo.com/3.0.0/book.php?bkcode=${bkcode}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*'
          }
        });
        if (bookApiResp.ok) {
          const xml = await bookApiResp.text();
          const pMatch = xml.match(/<pages>([0-9]+)<\/pages>/i);
          const tMatch = xml.match(/<title>([^<]+)<\/title>/i);
          const accMatch = xml.match(/<AccountID>([^<]+)<\/AccountID>/i);
          if (pMatch) totalPages = parseInt(pMatch[1], 10);
          if (tMatch && !title) title = tMatch[1];
          if (accMatch && !assetBasePattern) {
            assetBasePattern = `https://p.calameoassets.com/${accMatch[1]}/${bkcode}/`;
          }
        }
      } catch (e) {
        console.warn('Calaméo book.php API fallback failed:', e.message);
      }
    }

    // Default title if still empty
    if (!title) title = `Calameo_${bkcode}`;
    title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'");

    // If totalPages is still 0, provide default 20 pages
    if (!totalPages || totalPages <= 0) {
      totalPages = 20;
    }

    // Fallback base pattern if none detected
    if (!assetBasePattern) {
      assetBasePattern = `https://p.calameoassets.com/${bkcode}/`;
    }

    // Build page URL list
    const pages = [];
    const proxyBase = '/api/proxy?url=';

    for (let i = 1; i <= totalPages; i++) {
      let pageDirectUrl = `${assetBasePattern}p${i}.jpg${tokenQuery}`;
      pages.push({
        pageNumber: i,
        cdnUrl: pageDirectUrl,
        proxyUrl: `${proxyBase}${encodeURIComponent(pageDirectUrl)}`,
        fallbackJpgUrl: pageDirectUrl
      });
    }

    if (!coverUrl) {
      coverUrl = pages[0].proxyUrl;
    } else if (!coverUrl.startsWith('/api/proxy')) {
      coverUrl = `${proxyBase}${encodeURIComponent(coverUrl)}`;
    }

    return res.status(200).json({
      success: true,
      bkcode,
      title,
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
