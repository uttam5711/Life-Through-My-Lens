#!/usr/bin/env node

/**
 * AUTOMATIC LOCAL PHOTO SYNC SCRIPT
 * Run with: node sync-photos.js
 * Scans the `images/` folder for any new image files and adds them to `data/photos.json`.
 */

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');
const DATA_FILE = path.join(__dirname, 'data', 'photos.json');
const VALID_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

function syncPhotos() {
  console.log('🔍 Scanning images folder:', IMAGES_DIR);

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Load existing photos.json
  let existingPhotos = [];
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      existingPhotos = JSON.parse(raw);
      if (!Array.isArray(existingPhotos)) existingPhotos = [];
    } catch (e) {
      console.warn('⚠️ Could not parse existing data/photos.json, creating a fresh one.');
      existingPhotos = [];
    }
  }

  // Set of existing relative URLs
  const existingUrls = new Set(existingPhotos.map(p => p.url));

  // Read files in images/
  const files = fs.readdirSync(IMAGES_DIR);
  let addedCount = 0;

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (!VALID_EXTENSIONS.has(ext)) return;

    const relUrl = `images/${file}`;
    if (existingUrls.has(relUrl)) return;

    // Build entry
    const stats = fs.statSync(path.join(IMAGES_DIR, file));
    const title = file
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const dateStr = stats.birthtime ? stats.birthtime.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const newEntry = {
      id: `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: title,
      category: 'Random Clicks',
      url: relUrl,
      thumbnail: relUrl,
      date: dateStr,
      description: '',
      location: '',
      camera: '',
      tags: ['photo', 'click']
    };

    existingPhotos.unshift(newEntry);
    existingUrls.add(relUrl);
    addedCount++;
    console.log(`➕ Added new photo: ${file}`);
  });

  if (addedCount > 0) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingPhotos, null, 2), 'utf-8');
    console.log(`\n🎉 Success! Added ${addedCount} new photo(s) to data/photos.json.`);
  } else {
    console.log('✅ All photos in images/ are already indexed in data/photos.json.');
  }
}

syncPhotos();
