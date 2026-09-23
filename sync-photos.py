#!/usr/bin/env python3
"""
AUTOMATIC LOCAL PHOTO SYNC SCRIPT (Python)
Run with: python3 sync-photos.py
Scans the `images/` directory and indexes any new image files into `data/photos.json`.
"""

import os
import json
import time
from datetime import datetime

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(CURRENT_DIR, 'images')
DATA_FILE = os.path.join(CURRENT_DIR, 'data', 'photos.json')
VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'}

def sync_photos():
    print(f"🔍 Scanning images folder: {IMAGES_DIR}")

    if not os.path.exists(IMAGES_DIR):
        os.makedirs(IMAGES_DIR, exist_ok=True)

    existing_photos = []
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                existing_photos = json.load(f)
                if not isinstance(existing_photos, list):
                    existing_photos = []
        except Exception:
            existing_photos = []

    existing_urls = {p.get('url') for p in existing_photos if isinstance(p, dict)}
    added_count = 0

    for file in sorted(os.listdir(IMAGES_DIR)):
        _, ext = os.path.splitext(file)
        if ext.lower() not in VALID_EXTENSIONS:
            continue

        rel_url = f"images/{file}"
        if rel_url in existing_urls:
            continue

        file_path = os.path.join(IMAGES_DIR, file)
        mtime = os.path.getmtime(file_path)
        date_str = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')

        clean_name = os.path.splitext(file)[0].replace('-', ' ').replace('_', ' ').title()

        new_entry = {
            "id": f"photo-{int(time.time() * 1000)}",
            "title": clean_name,
            "category": "Random Clicks",
            "url": rel_url,
            "thumbnail": rel_url,
            "date": date_str,
            "description": "",
            "location": "",
            "camera": "",
            "tags": ["photo", "click"]
        }

        existing_photos.insert(0, new_entry)
        existing_urls.add(rel_url)
        added_count += 1
        print(f"➕ Added new photo: {file}")

    if added_count > 0:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(existing_photos, f, indent=2, ensure_ascii=False)
        print(f"\n🎉 Success! Added {added_count} new photo(s) to data/photos.json.")
    else:
        print("✅ All photos in images/ are already indexed in data/photos.json.")

if __name__ == '__main__':
    sync_photos()
