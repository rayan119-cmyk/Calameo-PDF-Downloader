# 📰 Calaméo to PDF Web Downloader & Compressor

> Convertissez et téléchargez n'importe quel magazine ou journal Calaméo en fichier PDF haute définition ou compressé, directement en ligne sans extension.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/calameo-pdf-web)

---

## ✨ Fonctionnalités

- 🌐 **100% En Ligne & Sans Installation** : Fonctionne sur PC, Mac, iPhone, iPad et Android.
- ⚡ **Téléchargement Parallèle Multi-Thread** : Récupère toutes les pages simultanément en quelques secondes.
- 📰 **Mode Journal & Presse** : Algorithme intelligent de blanchiment du fond (`#FFFFFF`) et renforcement de l'encre du texte.
- 🗜️ **3 Modes de Compression** :
  1. `⭐ Standard HD` : Résolution brute d'origine.
  2. `📰 Mode Journal` : Optimisé pour lecture écran (~7-8 Mo).
  3. `⚡ Compression Ultime` : Ultra-léger pour partage WhatsApp / Email (~4 Mo).
- 🔒 **100% Privé** : L'assemblage du document PDF s'effectue en local dans le navigateur du visiteur.

---

## 🚀 Déploiement en 1 Clic sur Vercel (Gratuit à vie)

### Option A : Depuis GitHub (Recommandé)
1. Créez un nouveau dépôt sur votre compte GitHub (ex: `calameo-pdf-web`).
2. Poussez le contenu de ce dossier sur GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Calameo to PDF Web"
   git branch -M main
   git remote add origin https://github.com/VOTRE_PSEUDO/calameo-pdf-web.git
   git push -u origin main
   ```
3. Rendez-vous sur [vercel.com](https://vercel.com), cliquez sur **"Add New Project"**, importez votre dépôt GitHub et cliquez sur **Deploy**.
4. Votre site sera instantanément en ligne avec une URL gratuite du type `https://votre-projet.vercel.app` !

---

## 💻 Test en local sur votre ordinateur

Pour tester l'application directement sur votre machine sans rien installer :

```bash
# 1. Naviguer dans le dossier
cd calameo-pdf-web

# 2. Lancer le serveur local
node server.js
```

Ouvrez ensuite votre navigateur sur : **`http://localhost:3000`**

---

## 🛠️ Stack Technique

- **Frontend** : HTML5, Vanilla Modern CSS (Dark Mode & Glassmorphism), JavaScript ES6+
- **Moteur PDF** : [jsPDF](https://github.com/parallax/jsPDF)
- **Backend Serverless** : Vercel Functions (Node.js) pour l'API de métadonnées et le décompresseur SVGZ/CORS
- **Décompression** : Node.js `zlib` natif

---

## 📄 Licence
Distribué sous licence MIT. Libre d'utilisation et de modification.
