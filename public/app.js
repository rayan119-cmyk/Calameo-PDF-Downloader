/**
 * public/app.js - Calaméo to PDF Client-side Engine
 * Multi-threaded page downloader, Canvas image optimizer & jsPDF assembler.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const inspectBtn = document.getElementById('inspectBtn');
  const inspectSpinner = document.getElementById('inspectSpinner');
  const inputError = document.getElementById('inputError');

  const previewSection = document.getElementById('previewSection');
  const bookCover = document.getElementById('bookCover');
  const pageCountBadge = document.getElementById('pageCountBadge');
  const bookTitle = document.getElementById('bookTitle');
  const bookCode = document.getElementById('bookCode');
  const bookLink = document.getElementById('bookLink');

  const modeCards = document.querySelectorAll('.mode-card');
  const generatePdfBtn = document.getElementById('generatePdfBtn');
  const pdfLayoutSelect = document.getElementById('pdfLayout');
  const pdfOrientationSelect = document.getElementById('pdfOrientation');

  const progressSection = document.getElementById('progressSection');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressPercent = document.getElementById('progressPercent');
  const progressBar = document.getElementById('progressBar');
  const progressDetails = document.getElementById('progressDetails');

  // State
  let currentBookData = null;
  let isProcessing = false;

  // 1. Paste Button handler
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        urlInput.focus();
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  });

  // 2. Mode selection card styling
  modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // 3. Inspect Calaméo URL handler
  async function handleInspect(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const url = urlInput.value.trim();
    if (!url) {
      showError('Please paste or type a valid Calaméo publication URL.');
      return;
    }

    showError('');
    setInspectLoading(true);
    previewSection.style.display = 'none';
    progressSection.style.display = 'none';

    try {
      const res = await fetch(`/api/book?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server error HTTP ${res.status}`);
      }

      currentBookData = data;
      displayBookPreview(data);

    } catch (err) {
      console.error('Inspect failed:', err);
      showError(err.message || 'Unable to inspect publication. Please check the URL.');
    } finally {
      setInspectLoading(false);
    }
  }

  inspectBtn.addEventListener('click', handleInspect);
  urlForm.addEventListener('submit', handleInspect);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInspect();
    }
  });

  function showError(msg) {
    if (!msg) {
      inputError.style.display = 'none';
      inputError.textContent = '';
    } else {
      inputError.style.display = 'block';
      inputError.textContent = msg;
    }
  }

  function setInspectLoading(loading) {
    inspectBtn.disabled = loading;
    if (loading) {
      inspectSpinner.style.display = 'inline-block';
      inspectBtn.querySelector('span').textContent = 'Analyzing...';
    } else {
      inspectSpinner.style.display = 'none';
      inspectBtn.querySelector('span').textContent = 'Inspect';
    }
  }

  function displayBookPreview(data) {
    bookTitle.textContent = data.title || 'Calaméo Publication';
    bookCode.textContent = data.bkcode || '-';
    pageCountBadge.textContent = `${data.totalPages} pages`;
    bookLink.href = data.viewUrl || `https://www.calameo.com/read/${data.bkcode}`;

    if (data.coverUrl) {
      bookCover.src = data.coverUrl;
    }

    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // 4. PDF Generation Action
  generatePdfBtn.addEventListener('click', async () => {
    if (!currentBookData || !currentBookData.pages || isProcessing) return;

    const mode = document.querySelector('input[name="compressionMode"]:checked')?.value || 'standard';
    const layout = pdfLayoutSelect.value || 'fill';
    const orientation = pdfOrientationSelect.value || 'portrait';

    isProcessing = true;
    generatePdfBtn.disabled = true;
    progressSection.style.display = 'flex';
    progressSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      await generatePdfPipeline(currentBookData, { mode, layout, orientation });
    } catch (err) {
      console.error('PDF creation error:', err);
      alert(`Error generating PDF: ${err.message}`);
    } finally {
      isProcessing = false;
      generatePdfBtn.disabled = false;
    }
  });

  // 5. Image & Canvas Processing Pipeline
  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Image load error for ${src}`));
      img.src = src;
    });
  }

  async function processPageImage(proxyUrl, mode) {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Fetch failed HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isSvg = /svg/i.test(contentType);

    if (isSvg) {
      // Decompress & Render SVG
      const svgText = await response.text();
      return await renderSvgToCanvas(svgText, mode);
    } else {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const img = await loadImage(objectUrl);
        return await optimizeRasterCanvas(img, mode);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  function renderSvgToCanvas(svgText, mode) {
    return new Promise((resolve, reject) => {
      const TARGET_W = mode === 'ultimate' ? 1400 : 2200;

      let vbW = 0, vbH = 0;
      const vbMatch = svgText.match(/viewBox=["']\s*[\d.+-]+\s+[\d.+-]+\s+([\d.]+)\s+([\d.]+)/i);
      if (vbMatch) {
        vbW = parseFloat(vbMatch[1]);
        vbH = parseFloat(vbMatch[2]);
      }
      if (!vbW || !vbH) {
        const wm = svgText.match(/\bwidth=["']([0-9.]+)/i);
        const hm = svgText.match(/\bheight=["']([0-9.]+)/i);
        vbW = wm ? parseFloat(wm[1]) : 1200;
        vbH = hm ? parseFloat(hm[1]) : 1600;
      }

      const ratio = vbW / vbH;
      const cw = TARGET_W;
      const ch = Math.round(TARGET_W / ratio);

      const svgFixed = svgText
        .replace(/(<svg[^>]*)\bwidth=["'][^"']*["']/i, '$1')
        .replace(/(<svg[^>]*)\bheight=["'][^"']*["']/i, '$1')
        .replace(/<svg/i, `<svg width="${cw}" height="${ch}"`);

      const blob = new Blob([svgFixed], { type: 'image/svg+xml' });
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, cw, ch);
          URL.revokeObjectURL(blobUrl);

          const q = mode === 'ultimate' ? 0.55 : (mode === 'journal' ? 0.72 : 0.88);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', q),
            width: cw,
            height: ch
          });
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = blobUrl;
    });
  }

  function optimizeRasterCanvas(img, mode) {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    let targetW = origW;
    let quality = 0.88;

    if (mode === 'journal') {
      targetW = Math.min(origW, 2000);
      quality = 0.70;
    } else if (mode === 'ultimate') {
      targetW = Math.min(origW, 1300);
      quality = 0.52;
    }

    const scale = targetW / origW;
    const w = targetW;
    const h = Math.round(origH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    if (mode === 'journal' || mode === 'ultimate') {
      const imgDataObj = ctx.getImageData(0, 0, w, h);
      const data = imgDataObj.data;
      const len = data.length;
      const whiteThreshold = mode === 'ultimate' ? 205 : 215;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);

        // 1. White Clamping (pure white background = 0 KB compression)
        if (lum > whiteThreshold && sat < 28) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
        // 2. Ink Boost (deep crisp print-like black text)
        else if (lum < 145 && sat < 30) {
          const inkFactor = mode === 'ultimate' ? 0.75 : 0.85;
          data[i] = Math.max(0, Math.floor(r * inkFactor));
          data[i + 1] = Math.max(0, Math.floor(g * inkFactor));
          data[i + 2] = Math.max(0, Math.floor(b * inkFactor));
        }
      }
      ctx.putImageData(imgDataObj, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    canvas.width = 0;
    canvas.height = 0;

    return { dataUrl, width: w, height: h };
  }

  // 6. Multi-threaded Parallel PDF Pipeline
  async function generatePdfPipeline(bookData, options) {
    const { mode, layout, orientation } = options;
    const totalPages = bookData.pages.length;
    const CONCURRENCY = 5; // Batches of 5 pages in parallel

    updateProgress(0, `Starting download of ${totalPages} pages in parallel...`, '0%');

    // Parallel download pool
    const pagesResults = new Array(totalPages);
    let completedCount = 0;

    async function processPageTask(pageObj, index) {
      try {
        updateProgress(
          (completedCount / totalPages) * 85,
          `Downloading & processing page ${index + 1}/${totalPages}...`,
          `${Math.round((completedCount / totalPages) * 85)}%`
        );

        const result = await processPageImage(pageObj.proxyUrl, mode);
        pagesResults[index] = result;
      } catch (err) {
        console.warn(`Retry page ${index + 1} with fallback URL:`, err.message);
        try {
          const fallbackProxy = `/api/proxy?url=${encodeURIComponent(pageObj.fallbackJpgUrl)}`;
          const result = await processPageImage(fallbackProxy, mode);
          pagesResults[index] = result;
        } catch (e2) {
          try {
            const thumbProxy = `/api/proxy?url=${encodeURIComponent(pageObj.fallbackThumbUrl)}`;
            const result = await processPageImage(thumbProxy, mode);
            pagesResults[index] = result;
          } catch (e3) {
            console.error(`Page ${index + 1} all fallbacks failed:`, e3);
          }
        }
      } finally {
        completedCount++;
        const pct = Math.round((completedCount / totalPages) * 85);
        updateProgress(pct, `Processing: ${completedCount}/${totalPages} pages ready`, `${pct}%`);
      }

    // Process concurrently in batches
    for (let i = 0; i < totalPages; i += CONCURRENCY) {
      const batch = bookData.pages.slice(i, i + CONCURRENCY).map((p, bIdx) => processPageTask(p, i + bIdx));
      await Promise.all(batch);
    }

    // Assembling in jsPDF
    updateProgress(90, 'Assembling final PDF document...', '90%');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    function calcImagePos(imgRatio, pWidth, pHeight, pdfLayout) {
      let imgWidth, imgHeight, x, y;
      if (pdfLayout === 'fill') {
        const pageRatio = pWidth / pHeight;
        if (imgRatio > pageRatio) {
          imgHeight = pHeight; imgWidth = imgHeight * imgRatio;
          x = (pWidth - imgWidth) / 2; y = 0;
        } else {
          imgWidth = pWidth; imgHeight = imgWidth / imgRatio;
          x = 0; y = (pHeight - imgHeight) / 2;
        }
      } else {
        const pageRatio = pWidth / pHeight;
        if (imgRatio > pageRatio) {
          imgWidth = pWidth; imgHeight = imgWidth / imgRatio;
          x = 0; y = (pHeight - imgHeight) / 2;
        } else {
          imgHeight = pHeight; imgWidth = imgHeight * imgRatio;
          x = (pWidth - imgWidth) / 2; y = 0;
        }
      }
      return { imgWidth, imgHeight, x, y };
    }

    let addedPages = 0;
    for (let i = 0; i < totalPages; i++) {
      const pageData = pagesResults[i];
      if (!pageData || !pageData.dataUrl) continue;

      if (addedPages > 0) pdf.addPage();
      addedPages++;

      const imgRatio = pageData.width / pageData.height;
      const { imgWidth, imgHeight, x, y } = calcImagePos(imgRatio, pageWidth, pageHeight, layout);

      pdf.addImage(pageData.dataUrl, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');
    }

    if (addedPages === 0) {
      throw new Error('No pages could be retrieved to assemble the PDF.');
    }

    updateProgress(100, 'Downloading your PDF file...', '100%');

    const cleanTitle = (bookData.title || 'calameo_document')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    pdf.save(`${cleanTitle}_${mode}.pdf`);

    setTimeout(() => {
      progressStatusText.textContent = '✅ PDF generated and downloaded successfully!';
      progressDetails.textContent = `File saved: ${cleanTitle}_${mode}.pdf (${addedPages} pages)`;
    }, 400);
  }

  function updateProgress(percent, statusText, percentText) {
    progressBar.style.width = `${percent}%`;
    progressStatusText.textContent = statusText;
    progressPercent.textContent = percentText;
    progressDetails.textContent = `Overall progress: ${Math.round(percent)}%`;
  }
});
