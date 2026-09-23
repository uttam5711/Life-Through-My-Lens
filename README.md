# 📸 Moments & Clicks • Personal Photo Gallery Website

A modern, aesthetic, and responsive personal photo gallery website built to showcase your random clicks, personal memories, street photography, and stories. Fully ready for **100% free hosting on GitHub Pages** with an in-browser direct upload studio!

---

## ✨ Features

- 🖼️ **Masonry & Uniform Grid**: Smooth responsive layout that adapts to any screen size (mobile, tablet, desktop, 4K).
- 🏷️ **Dynamic Categories**: Pre-configured with *Random Clicks*, *Personal & Moments*, *Street & City*, *Nature & Outdoors*, with support for custom categories.
- 🔍 **Live Search & Sort**: Instant search across titles, descriptions, camera gear, locations, and tags. Sort by newest, oldest, or alphabetical.
- 🔍 **Full-Screen Lightbox**:
  - High-res image view with 1.5x zoom toggle.
  - Keyboard navigation (Left/Right arrows, `Escape` to close, `Z` to zoom).
  - Mobile swipe gestures (swipe left for next, swipe right for previous).
  - 1-click **Download Photo** and **Share Photo Link** (`#photo-id` deep linking).
- 🌓 **Dark & Light Mode**: Seamless dark/light theme switch with persistent preference in `localStorage`.
- 🚀 **In-Browser Upload Studio**:
  - **Direct GitHub Upload**: Upload photos right from your phone or laptop browser! Enter your GitHub token once, and it will compress your image, commit it to `images/`, and update `data/photos.json` via the GitHub API automatically!
  - **Local Export Mode**: Or download the compressed image and update `data/photos.json` manually with git.
- ⚡ **Auto Local Sync Script**: Includes `python3 sync-photos.py` and `node sync-photos.js` to scan any images dropped into the `images/` directory and auto-index them.
- 🤖 **Automated GitHub Deployment**: Pre-configured GitHub Actions workflow (`.github/workflows/deploy.yml`) that publishes the site to GitHub Pages whenever changes are pushed.

---

## 🚀 Quick Start: How to Put This on GitHub

### Step 1: Initialize Git and Push to GitHub

1. Open your terminal in this project folder:
   ```bash
   cd /Users/uttamsangani/.gemini/antigravity/scratch/photo-gallery
   ```

2. Initialize Git and commit the files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Photo gallery website"
   ```

3. Create a new repository on [GitHub.com](https://github.com/new):
   - Name it (for example: `personal-photo-gallery` or `moments`).
   - Choose **Public** (required for free GitHub Pages).
   - Leave "Initialize with README" **unchecked** (since we already have one).

4. Link and push your repository:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```

---

### Step 2: Enable GitHub Pages (1-Minute Setup)

1. On your GitHub repository page, click the **Settings** tab at the top.
2. On the left sidebar, click **Pages**.
3. Under **Build and deployment** &rarr; **Source**, select:
   👉 **GitHub Actions**
4. That's it! GitHub Actions will automatically run the `.github/workflows/deploy.yml` workflow and publish your site at:
   ```
   https://<YOUR-GITHUB-USERNAME>.github.io/<YOUR-REPO-NAME>/
   ```
   *Anyone around the world can now visit this link to view your photos!*

---

## 📤 How to Upload New Photos

You have **two super easy methods** to add photos:

### Method 1: Upload Directly from the Website (Mobile & PC)

You can upload pictures on the go from your phone or computer without using the command line!

1. Open your published website in your browser.
2. Click the **"Upload Photo"** button in the header.
3. Select or drop your photo (it will be automatically compressed for fast loading).
4. Fill in the Title, Category, Date, Caption, and Tags.
5. In the **GitHub Direct Upload** tab, enter:
   - Your **GitHub Username** (e.g. `uttamsangani`)
   - Your **Repo Name** (e.g. `personal-photo-gallery`)
   - A **GitHub Personal Access Token** ([Click "How to get a free Token?" in the dialog for 30-second steps](https://github.com/settings/tokens)).
6. Click **"Publish Photo to GitHub"**.
7. The photo is committed directly to your repository, and your live site automatically updates!

> 🔒 **Security Note**: Your personal token is saved only in your own device's browser `localStorage`. No third-party server ever sees or stores your token.

---

### Method 2: Local Folder Sync (Using Git)

If you prefer to organize photos directly on your computer:

1. Drop your `.jpg`, `.png`, or `.webp` files into the `images/` directory.
2. Run the sync script to automatically register them in `data/photos.json`:
   ```bash
   python3 sync-photos.py
   # or: node sync-photos.js
   ```
3. Commit and push:
   ```bash
   git add .
   git commit -m "Add new photos"
   git push
   ```
4. GitHub Pages will automatically update with your new pictures!

---

## 📁 Project Structure

```
photo-gallery/
├── index.html                   # Main gallery webpage
├── css/
│   └── styles.css               # Modern aesthetic styles (dark/light themes, masonry)
├── js/
│   ├── gallery.js               # Gallery controller (cards, filtering, search, lightbox)
│   └── uploader.js              # Upload Studio (compression, GitHub API commit, export)
├── data/
│   └── photos.json              # Catalog storing all photo metadata
├── images/                      # Directory holding uploaded / local images
├── sync-photos.py               # Python auto-indexing script
├── sync-photos.js               # Node.js auto-indexing script
├── .github/
│   └── workflows/
│       └── deploy.yml           # Automated GitHub Pages deployment workflow
└── README.md                    # Setup and usage guide
```

---

## 💻 Local Preview

To test and view your gallery locally on your computer before pushing to GitHub:

```bash
cd /Users/uttamsangani/.gemini/antigravity/scratch/photo-gallery
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your web browser!
