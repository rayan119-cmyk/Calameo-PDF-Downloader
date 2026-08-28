# 📰 Calaméo to PDF Web Downloader & Compressor

[![Live Website](https://img.shields.io/badge/🌐%20Live%20Website-Visit%20App-6366f1?style=for-the-badge&logo=vercel)](https://calameo-pdf-downloader-rust.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

> Convert and download any Calaméo magazine, newspaper, or flipbook to High-Definition or compressed PDF online directly in your browser — **no extensions or installation required**.

### 🔗 **Try it live now : [https://calameo-pdf-downloader-rust.vercel.app/](https://calameo-pdf-downloader-rust.vercel.app/)**

---

## ✨ Features

- 🌐 **100% Online & No Install** : Works seamlessly on PC, Mac, iPhone, iPad, and Android.
- ⚡ **Multi-Threaded Parallel Download** : Retrieves all pages concurrently in seconds.
- 📰 **Newspaper & Document Mode** : Intelligent algorithm for pure white background clamping (`#FFFFFF`) and ink boost.
- 🗜️ **3 Smart Compression Modes** :
  1. `⭐ Standard HD` : Uncompressed raw original resolution (~14 MB / 20p).
  2. `📰 Newspaper Mode` : Optimized for reading & press (~7-8 MB / 20p).
  3. `⚡ Ultimate Compression` : Ultra-lightweight for fast WhatsApp / Email sharing (~4 MB / 20p).
- 🔒 **100% Private & Client-Side** : PDF compilation happens locally inside the user's browser.

---

## 🚀 How It Works

1. Copy any Calaméo publication link (e.g. `https://www.calameo.com/read/007907577e17cb97dca09`).
2. Paste it on **[calameo-pdf-downloader-rust.vercel.app](https://calameo-pdf-downloader-rust.vercel.app/)**.
3. Choose your export quality and click **Generate & Download PDF**.

---

## 💻 Local Development

To run and test the application on your computer:

```bash
# 1. Clone this repository
git clone https://github.com/rayan119-cmyk/Calameo-PDF-Downloader.git
cd Calameo-PDF-Downloader

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
