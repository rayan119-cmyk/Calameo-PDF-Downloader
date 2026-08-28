# 📰 Calaméo to PDF Web Downloader & Compressor

> Convert and download any Calaméo magazine, newspaper, or publication to High-Definition or compressed PDF online for free without installing any browser extensions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rayan119-cmyk/Calameo-PDF-Downloader)

---

## ✨ Features

- 🌐 **100% Online & No Install** : Works seamlessly on PC, Mac, iPhone, iPad, and Android.
- ⚡ **Multi-Threaded Parallel Download** : Retrieves all pages concurrently in seconds.
- 📰 **Newspaper & Document Mode** : Intelligent algorithm for pure white background clamping (`#FFFFFF`) and ink boost.
- 🗜️ **3 Smart Compression Modes** :
  1. `⭐ Standard HD` : Uncompressed raw original resolution.
  2. `📰 Newspaper Mode` : Optimized for reading & press (~7-8 MB / 20p).
  3. `⚡ Ultimate Compression` : Ultra-lightweight for fast WhatsApp / Email sharing (~4 MB / 20p).
- 🔒 **100% Private & Client-Side** : PDF compilation happens locally inside the user's browser.

---

## 🚀 1-Click Deployment to Vercel (Free Forever)

### Option A: Via GitHub (Recommended)
1. Fork or push this repository to your GitHub account:
   ```bash
   git add .
   git commit -m "Translate to English & update Vercel config"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com), click **"Add New Project"**, import your GitHub repository, and click **Deploy**.
3. Your web app will be instantly live with a free URL like `https://your-project.vercel.app`!

---

## 💻 Local Development

To run and test the application on your computer:

```bash
# 1. Navigate to directory
cd calameo-pdf-web

# 2. Start local server
node server.js
```

Open your browser at: **`http://localhost:3000`**

---

## 🛠️ Tech Stack

- **Frontend** : HTML5, Modern Vanilla CSS (Dark Mode & Glassmorphism), JavaScript ES6+
- **PDF Engine** : [jsPDF](https://github.com/parallax/jsPDF)
- **Backend Serverless** : Vercel Functions (Node.js) for Calaméo book API metadata and SVGZ/CORS proxy
- **Decompression** : Native Node.js `zlib`

---

## 📄 License
Distributed under the MIT License. Free for personal and commercial use.
