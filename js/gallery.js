/**
 * MOMENTS & CLICKS • GALLERY CONTROLLER
 * Handles fetching photos, category filters, live search, sorting, full-screen lightbox,
 * 3D card tilt physics, specular sheen, favorites system, scroll progress, and audio feedback.
 */

// Global state
export const state = {
  allPhotos: [],
  filteredPhotos: [],
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'newest',
  currentLightboxIndex: 0,
  currentView: 'masonry', // 'masonry' | 'grid' | 'timeline' | 'map'
  isSlideshowActive: false,
  slideshowTimer: null,
  slideshowVariant: 0,
};

// Configurable Google Sheet Web App URL for visitor registry:
export const DEFAULT_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzHdiSW_633zEnKwYu2Hmpx-Q3UkpTOuotpcsEk1F2mNOObb9YJWwvXy6R-pJIlssan/exec';
export function getGoogleSheetUrl() {
  return DEFAULT_GOOGLE_SHEET_URL || localStorage.getItem('gh_gallery_sheet_url') || (typeof window !== 'undefined' && window.GALLERY_SHEET_URL) || '';
}

// DOM Elements
const galleryContainer = document.getElementById('gallery-container');
const timelineContainer = document.getElementById('timeline-container');
const mapContainer = document.getElementById('map-container');
const mapPhotoCount = document.getElementById('map-photo-count');
const mapRecenterBtn = document.getElementById('map-recenter-btn');

const categoryPillsWrapper = document.getElementById('category-pills');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const sortSelect = document.getElementById('sort-select');
const emptyState = document.getElementById('empty-state');
const emptyResetBtn = document.getElementById('empty-reset-btn');
const photoCounter = document.getElementById('counter-text');
const themeToggle = document.getElementById('theme-toggle');
const viewMasonryBtn = document.getElementById('view-masonry');
const viewGridBtn = document.getElementById('view-grid');
const viewTimelineBtn = document.getElementById('view-timeline');
const viewMapBtn = document.getElementById('view-map');
const startSlideshowBtn = document.getElementById('start-slideshow-btn');
const soundToggle = document.getElementById('sound-toggle');

// Lightbox Elements
const lightboxDialog = document.getElementById('lightbox-dialog');
const lbImage = document.getElementById('lb-image');
const lbSpinner = document.getElementById('lb-spinner');
const lbTitle = document.getElementById('lb-title');
const lbDesc = document.getElementById('lb-desc');
const lbCategory = document.getElementById('lb-category');
const lbDate = document.getElementById('lb-date');
const lbLocation = document.getElementById('lb-location');
const lbLocationRow = document.getElementById('lb-location-row');
const lbLocationLink = document.getElementById('lb-location-link');
const mapOpenGmapsBtn = document.getElementById('map-open-gmaps-btn');
const navMapBtn = document.getElementById('nav-map-btn');
const lbCamera = document.getElementById('lb-camera');
const lbCameraRow = document.getElementById('lb-camera-row');
const lbTags = document.getElementById('lb-tags');
const lbCurrentIndex = document.getElementById('lb-current-index');
const lbTotalCount = document.getElementById('lb-total-count');
const lbPrevBtn = document.getElementById('lb-prev-btn');
const lbNextBtn = document.getElementById('lb-next-btn');
const lbZoomBtn = document.getElementById('lb-zoom-btn');
const lbDownloadBtn = document.getElementById('lb-download-btn');
const lbShareBtn = document.getElementById('lb-share-btn');
const lbCloseBtn = document.getElementById('lb-close-btn');
const lbFavBtn = document.getElementById('lb-fav-btn');
const lbSlideshowBtn = document.getElementById('lb-slideshow-btn');
const lbFullscreenBtn = document.getElementById('lb-fullscreen-btn');
const lbSlideshowProgress = document.getElementById('lb-slideshow-progress');
const lbSlideshowBar = document.getElementById('lb-slideshow-bar');
const lbAmbientGlow = document.getElementById('lb-ambient-glow');


/* ==========================================================
   WEB AUDIO API SOUND FX SYNTHESIZER
   ========================================================== */
class SoundFX {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('gallery_sound_muted') === 'true';
  }

  init() {
    if (!this.ctx && typeof window.AudioContext !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (e) {
        // AudioContext not supported
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShutter() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // White noise buffer for crisp mechanical camera shutter click
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.045);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    } catch (e) { }
  }

  playPop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) { }
  }

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) { }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('gallery_sound_muted', this.isMuted ? 'true' : 'false');
    return this.isMuted;
  }
}

export const soundFX = new SoundFX();

/* ==========================================================
   FAVORITES SYSTEM
   ========================================================== */
export function getFavorites() {
  try {
    const raw = localStorage.getItem('gallery_favorites');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveFavorites(favs) {
  try {
    localStorage.setItem('gallery_favorites', JSON.stringify(favs));
  } catch (e) { }
}

export function toggleFavorite(photoId, btnElement, event) {
  const favs = getFavorites();
  const idStr = String(photoId);
  const idx = favs.indexOf(idStr);
  let isNowFav = false;

  if (idx > -1) {
    favs.splice(idx, 1);
    isNowFav = false;
  } else {
    favs.push(idStr);
    isNowFav = true;
  }
  saveFavorites(favs);

  if (btnElement) {
    btnElement.classList.toggle('is-fav', isNowFav);
    btnElement.classList.remove('pulse-pop');
    void btnElement.offsetWidth;
    btnElement.classList.add('pulse-pop');
    btnElement.title = isNowFav ? 'Remove from favorites' : 'Add to favorites';
  }

  if (isNowFav) {
    soundFX.playPop();
    if (event) {
      createParticleBurst(event.clientX, event.clientY);
    }
  } else {
    soundFX.playClick();
  }

  // Update lightbox heart if open
  if (lbFavBtn) {
    const currentPhoto = state.filteredPhotos[state.currentLightboxIndex];
    if (currentPhoto && String(currentPhoto.id || state.currentLightboxIndex) === idStr) {
      lbFavBtn.classList.toggle('is-fav', isNowFav);
      lbFavBtn.title = isNowFav ? 'Remove from favorites (L)' : 'Add to favorites (L)';
    }
  }

  renderCategories();

  if (state.activeCategory === '__favorites__') {
    applyFilters();
  }
}

function createParticleBurst(x, y) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count = 7;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'heart-particle';
    p.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 38 + Math.random() * 45;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 30;
    const rot = (Math.random() - 0.5) * 60;
    p.style.setProperty('--p-dx', `${dx.toFixed(1)}px`);
    p.style.setProperty('--p-dy', `${dy.toFixed(1)}px`);
    p.style.setProperty('--p-rot', `${rot.toFixed(1)}deg`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 920);
  }
}

/* ==========================================================
   INITIALIZE GALLERY
   ========================================================== */
export async function initGallery() {
  initTheme();
  initSoundToggle();
  initPreloader();
  initScrollFeatures();
  initAmbientParallax();
  updateHeroGreeting();
  setupEventListeners();
  setupUnlockModalEvents();
  await loadPhotos();
  checkUrlHash();
}

/* ==========================================================
   PRELOADER CONTROLLER
   ========================================================== */
function initPreloader() {
  const preloader = document.getElementById('site-preloader');
  const bar = document.getElementById('preloader-bar');
  const percentText = document.getElementById('preloader-percent');
  const irisFlash = document.getElementById('iris-flash');
  if (!preloader) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    preloader.classList.add('loaded');
    document.body.classList.add('site-loaded');
    return;
  }

  let progress = 18;
  if (bar) bar.style.width = '18%';
  if (percentText) percentText.textContent = '18%';

  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 22) + 12;
    if (progress > 90) progress = 90;
    if (bar) bar.style.width = `${progress}%`;
    if (percentText) percentText.textContent = `${progress}%`;
  }, 90);

  function finishPreloader() {
    clearInterval(interval);
    if (bar) bar.style.width = '100%';
    if (percentText) percentText.textContent = '100%';

    setTimeout(() => {
      if (irisFlash) irisFlash.classList.add('flashing');
      soundFX.playShutter();
      setTimeout(() => {
        preloader.classList.add('loaded');
        document.body.classList.add('site-loaded');
        window.dispatchEvent(new CustomEvent('siteopened'));
      }, 350);
    }, 180);
  }

  // Safety timeout so site NEVER hangs
  const safetyTimeout = setTimeout(finishPreloader, 850);
  window.addEventListener('photosloaded', () => {
    clearTimeout(safetyTimeout);
    finishPreloader();
  }, { once: true });
}

/* ==========================================================
   SCROLL FEATURES & BACK TO TOP BUTTON
   ========================================================== */
function initScrollFeatures() {
  const scrollProgress = document.getElementById('scroll-progress');
  const backToTopBtn = document.getElementById('back-to-top-btn');
  const progressRingFill = document.getElementById('progress-ring-fill');
  const ringCircumference = 2 * Math.PI * 19; // ~119.38

  function updateScroll() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const pct = scrollable > 0 ? Math.min(Math.max(scrolled / scrollable, 0), 1) : 0;

    // Fallback if browser doesn't support native CSS scroll-timeline
    if (scrollProgress && !CSS.supports('animation-timeline', 'scroll()')) {
      scrollProgress.style.transform = `scaleX(${pct})`;
    }

    if (backToTopBtn && progressRingFill) {
      if (scrolled > 240) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
      const offset = ringCircumference - (pct * ringCircumference);
      progressRingFill.style.strokeDashoffset = offset;
    }
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      soundFX.playClick();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* ==========================================================
   AMBIENT GLOW MOUSE PARALLAX
   ========================================================== */
function initAmbientParallax() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  let ticking = false;
  window.addEventListener('mousemove', (e) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = ((e.clientX - cx) / cx) * 25;
        const dy = ((e.clientY - cy) / cy) * 25;
        document.documentElement.style.setProperty('--parallax-x', `${dx.toFixed(1)}px`);
        document.documentElement.style.setProperty('--parallax-y', `${dy.toFixed(1)}px`);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ==========================================================
   DYNAMIC HERO GREETING & ANIMATED COUNTER
   ========================================================== */
function updateHeroGreeting() {
  const badge = document.querySelector('.hero-badge span:last-child');
  if (!badge) return;
  const hour = new Date().getHours();
  let greeting = 'A Visual Journal';
  if (hour >= 5 && hour < 12) greeting = '🌅 Good Morning';
  else if (hour >= 12 && hour < 17) greeting = '☀️ Good Afternoon';
  else if (hour >= 17 && hour < 21) greeting = '🌆 Good Evening';
  else greeting = '✨ Quiet Night Moments';
  badge.textContent = `${greeting} • A Visual Journal by Uttam Sangani`;
}

function animateNumber(element, start, end, duration = 600) {
  if (!element || start === end) return;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * ease);
    element.textContent = current;
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

/* ==========================================================
   SOUND TOGGLE CONTROLLER
   ========================================================== */
function initSoundToggle() {
  if (!soundToggle) return;
  soundToggle.classList.toggle('is-muted', soundFX.isMuted);

  soundToggle.addEventListener('click', () => {
    const isMuted = soundFX.toggleMute();
    soundToggle.classList.toggle('is-muted', isMuted);
    if (!isMuted) {
      soundFX.playPop();
      showToast('Sound effects enabled 🎵', 'success');
    } else {
      showToast('Sound muted', 'info');
    }
  });
}

/**
 * Local in-browser photos storage helpers
 */
export function getLocalPhotos() {
  try {
    const raw = localStorage.getItem('gallery_local_photos');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to parse local photos:', e);
    return [];
  }
}

export function saveLocalPhoto(photo) {
  try {
    let local = getLocalPhotos();
    local = local.filter(p => String(p.id) !== String(photo.id));
    local.unshift(photo);
    while (local.length > 0) {
      try {
        localStorage.setItem('gallery_local_photos', JSON.stringify(local));
        break;
      } catch (err) {
        if (local.length > 1) {
          local.pop(); // Remove oldest stored local photo to fit quota
        } else {
          console.warn('LocalStorage quota exceeded for photo:', err);
          break;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to save photo to localStorage:', e);
  }
}

export function removeLocalPhoto(photoId) {
  try {
    const local = getLocalPhotos();
    const filtered = local.filter(p => String(p.id) !== String(photoId));
    localStorage.setItem('gallery_local_photos', JSON.stringify(filtered));
  } catch (e) {}
}

/**
 * Fetch photos from data/photos.json and merge with local browser photos
 */
export async function loadPhotos() {
  try {
    let serverPhotos = [];
    try {
      const response = await fetch('data/photos.json?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        serverPhotos = Array.isArray(data) ? data : [];
      }
    } catch (fetchErr) {
      console.warn('Direct fetch from data/photos.json was bypassed or failed:', fetchErr);
    }

    // Merge with any locally added photos saved in localStorage
    const localPhotos = getLocalPhotos();
    const existingIds = new Set(serverPhotos.map(p => String(p.id)));
    const uniqueLocal = localPhotos.filter(p => !existingIds.has(String(p.id)));

    state.allPhotos = [...uniqueLocal, ...serverPhotos];
    renderCategories();
    applyFilters();
    window.dispatchEvent(new CustomEvent('photosloaded'));
  } catch (error) {
    console.error('Failed to load photos:', error);
    showToast('Could not load photos from data/photos.json', 'error');
    if (galleryContainer) {
      galleryContainer.innerHTML = `
        <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
          <p>Failed to load photos data.</p>
        </div>
      `;
    }
    window.dispatchEvent(new CustomEvent('photosloaded'));
  }
}

/**
 * Render category navigation pills dynamically based on photos data
 */
function renderCategories() {
  if (!categoryPillsWrapper) return;

  const categoryCounts = {};
  state.allPhotos.forEach(p => {
    if (p.category) {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    }
  });

  const totalCount = state.allPhotos.length;
  const isAllActive = state.activeCategory === 'all';

  let html = `
    <button class="pill ${isAllActive ? 'active' : ''}" data-category="all">
      <span>All Photos</span>
      <span class="pill-count">${totalCount}</span>
    </button>
  `;

  // Favorites pill if any photos are liked
  const favs = getFavorites();
  const favCount = state.allPhotos.filter(p => favs.includes(String(p.id))).length;
  if (favCount > 0) {
    const isFavActive = state.activeCategory === '__favorites__';
    html += `
      <button class="pill ${isFavActive ? 'active' : ''}" data-category="__favorites__">
        <span>❤️ Favorites</span>
        <span class="pill-count">${favCount}</span>
      </button>
    `;
  }

  categoryPillsWrapper.innerHTML = html;

  Object.keys(categoryCounts).sort().forEach(cat => {
    const isActive = state.activeCategory.toLowerCase() === cat.toLowerCase();
    const btn = document.createElement('button');
    btn.className = `pill ${isActive ? 'active' : ''}`;
    btn.dataset.category = cat;
    btn.innerHTML = `
      <span>${escapeHtml(cat)}</span>
      <span class="pill-count">${categoryCounts[cat]}</span>
    `;
    categoryPillsWrapper.appendChild(btn);
  });
}

/**
 * Filter, sort, and render photos
 */
export function applyFilters() {
  let list = [...state.allPhotos];

  // 1. Filter by category
  if (state.activeCategory === '__favorites__') {
    const favs = getFavorites();
    list = list.filter(p => favs.includes(String(p.id)));
  } else if (state.activeCategory !== 'all') {
    list = list.filter(p => (p.category || '').toLowerCase() === state.activeCategory.toLowerCase());
  }

  // 2. Filter by search query
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    list = list.filter(p => {
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchLoc = (p.location || '').toLowerCase().includes(q);
      const matchCam = (p.camera || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchLoc || matchCam || matchCat || matchTags;
    });
  }

  // 3. Sort
  list.sort((a, b) => {
    if (state.sortBy === 'newest') {
      return new Date(b.date || 0) - new Date(a.date || 0);
    } else if (state.sortBy === 'oldest') {
      return new Date(a.date || 0) - new Date(b.date || 0);
    } else if (state.sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  state.filteredPhotos = list;
  renderActiveView();
  updateStats();
}

/**
 * Dispatch rendering to active layout view
 */
export function renderActiveView() {
  if (state.currentView === 'timeline') {
    renderTimeline();
  } else if (state.currentView === 'map') {
    renderMap();
  } else {
    renderGallery();
  }
}

/**
 * Reusable Photo Card Builder
 */
function createPhotoCard(photo, index) {
  const card = document.createElement('article');
  card.className = 'photo-card group';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View ${photo.title || 'photo'}`);
  card.style.setProperty('--card-idx', index);

  const thumbUrl = photo.thumbnail || photo.url;
  const formattedDate = formatDate(photo.date);
  const favs = getFavorites();
  const isFav = favs.includes(String(photo.id || index));
  const isUnlocked = isVisitorUnlocked();

  card.innerHTML = `
    <div class="photo-thumb-container">
      <div class="card-sheen" aria-hidden="true"></div>
      <img 
        src="${thumbUrl}" 
        alt="${escapeHtml(photo.title || 'Photo')}" 
        class="photo-thumb" 
        loading="lazy" 
        decoding="async"
      />
      <div class="card-floating-badge">
        <span class="card-category-badge">${escapeHtml(photo.category || 'Moments')}</span>
      </div>
      <button class="card-edit-btn admin-only" data-id="${photo.id || index}" title="Edit details (Admin)" aria-label="Edit photo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button class="card-delete-btn admin-only" data-id="${photo.id || index}" title="Delete photo (Admin)" aria-label="Delete photo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
      <button class="card-fav-btn ${isFav ? 'is-fav' : ''}" data-id="${photo.id || index}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Favorite photo">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>
      <div class="card-zoom-indicator ${isUnlocked ? '' : 'locked-indicator'}" aria-hidden="true" title="${isUnlocked ? 'View full photo' : 'Unlock full photo'}">
        ${isUnlocked ? `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        ` : `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        `}
      </div>
      <div class="photo-card-overlay">
        <h3 class="card-title">${escapeHtml(photo.title || 'Untitled')}</h3>
        ${photo.description ? `<p class="card-snippet">${escapeHtml(photo.description)}</p>` : ''}
        <div class="card-meta-row">
          ${!isUnlocked ? `
            <span class="meta-chip lock-chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Enter details to view
            </span>
          ` : ''}
          ${photo.location ? `
            <a 
              href="${getGoogleMapsUrl(photo.location)}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="meta-chip location-chip location-link-chip" 
              title="Open ${escapeHtml(formatLocationDisplayName(photo.location))} in Google Maps ↗"
              onclick="event.stopPropagation();"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${escapeHtml(formatLocationDisplayName(photo.location))}</span>
              <svg class="external-icon" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </a>` : ''}
          ${photo.camera ? `
            <span class="meta-chip camera-chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              ${escapeHtml(photo.camera)}
            </span>` : ''}
          <span class="meta-chip date-chip">${formattedDate}</span>
        </div>
      </div>
    </div>
  `;

  // 3D Card Tilt Physics & Specular Sheen on Desktop
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (hasFinePointer) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -6.5;
      const ry = ((x - cx) / cx) * 6.5;
      card.style.setProperty('--card-rx', `${rx.toFixed(2)}deg`);
      card.style.setProperty('--card-ry', `${ry.toFixed(2)}deg`);
      card.style.setProperty('--card-scale', '1.025');
      card.style.setProperty('--sheen-x', `${((x / rect.width) * 100).toFixed(1)}%`);
      card.style.setProperty('--sheen-y', `${((y / rect.height) * 100).toFixed(1)}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--card-rx', '0deg');
      card.style.setProperty('--card-ry', '0deg');
      card.style.setProperty('--card-scale', '1');
    });
  }

  // Edit button click handler (Admin only)
  const editBtn = card.querySelector('.card-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundFX.playClick();
      window.dispatchEvent(new CustomEvent('requestphotoedit', { detail: { photo, index } }));
    });
  }

  // Delete button click handler (Admin only)
  const delBtn = card.querySelector('.card-delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundFX.playClick();
      window.dispatchEvent(new CustomEvent('requestphotodelete', { detail: { photo } }));
    });
  }

  // Favorite button click handler
  const favBtn = card.querySelector('.card-fav-btn');
  if (favBtn) {
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isVisitorUnlocked()) {
        openUnlockModal(index, 'Please enter your name & email to add photos to favorites!');
        return;
      }
      toggleFavorite(photo.id || index, favBtn, e);
    });
  }

  // Click & Keyboard Enter to open lightbox
  card.addEventListener('click', () => {
    if (!isVisitorUnlocked()) {
      openUnlockModal(index);
      return;
    }
    openLightbox(index);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isVisitorUnlocked()) {
        openUnlockModal(index);
        return;
      }
      openLightbox(index);
    }
  });

  return card;
}

/**
 * Render standard masonry/grid view
 */
function renderGallery() {
  if (!galleryContainer) return;
  galleryContainer.innerHTML = '';

  if (state.filteredPhotos.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  state.filteredPhotos.forEach((photo, index) => {
    const card = createPhotoCard(photo, index);
    galleryContainer.appendChild(card);
  });
}

/**
 * FEATURE 4: Chronological Memories Timeline View
 */
function renderTimeline() {
  if (!timelineContainer) return;
  timelineContainer.innerHTML = '';

  if (state.filteredPhotos.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  // Luminous timeline spine
  const spine = document.createElement('div');
  spine.className = 'timeline-spine';
  spine.setAttribute('aria-hidden', 'true');
  timelineContainer.appendChild(spine);

  // Group photos by Month & Year
  const groups = {};
  state.filteredPhotos.forEach((photo, index) => {
    let key = 'Undated Memories';
    let sortVal = 0;
    if (photo.date) {
      const d = new Date(photo.date);
      if (!isNaN(d.getTime())) {
        key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        sortVal = d.getTime();
      }
    }
    if (!groups[key]) {
      groups[key] = { label: key, sortVal, items: [] };
    }
    groups[key].items.push({ photo, index });
  });

  Object.values(groups).forEach(group => {
    const section = document.createElement('section');
    section.className = 'timeline-month-section';

    // Glowing Node
    const node = document.createElement('div');
    node.className = 'timeline-node';
    node.setAttribute('aria-hidden', 'true');
    section.appendChild(node);

    // Sticky Month Header
    const header = document.createElement('div');
    header.className = 'timeline-month-header';
    header.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span class="timeline-month-title">${escapeHtml(group.label)}</span>
      <span class="timeline-month-count">${group.items.length} ${group.items.length === 1 ? 'Moment' : 'Moments'}</span>
    `;
    section.appendChild(header);

    // Cards Grid
    const grid = document.createElement('div');
    grid.className = 'timeline-cards-grid';
    group.items.forEach(({ photo, index }) => {
      const card = createPhotoCard(photo, index);
      grid.appendChild(card);
    });
    section.appendChild(grid);

    timelineContainer.appendChild(section);
  });
}

/**
 * FEATURE 2: Interactive Travel & Photo Map (Leaflet)
 */
let leafletMapInstance = null;
let leafletMarkersLayer = null;
let leafletTileLayer = null;

const KNOWN_COORDINATES = {
  'junagadh': [21.5222, 70.4579],
  'ahmedabad': [23.0225, 72.5714],
  'bjp party': [23.0300, 72.5800],
  'harley davidson': [23.0550, 72.5100],
  'surat': [21.1702, 72.8311],
  'rajkot': [22.3039, 70.8022],
  'vadodara': [22.3072, 73.1812],
  'gandhinagar': [23.2156, 72.6369],
  'mumbai': [19.0760, 72.8777],
  'delhi': [28.6139, 77.2090],
  'goa': [15.2993, 74.1240],
  'gir': [21.1243, 70.7963],
  'sasan gir': [21.1243, 70.7963],
  'somnath': [20.8880, 70.4012],
  'dwarka': [22.2442, 68.9685],
  'diu': [20.7144, 70.9874],
  'kutch': [23.7337, 69.8597]
};

/**
 * Parse coordinates from string (handles raw "lat, lng" and Google Maps URLs)
 */
export function parseCoordinates(locStr) {
  if (!locStr) return null;
  const str = String(locStr).trim();

  // 1. Direct "lat, lng" e.g. "23.04390849092569, 72.51680471500633" or "23.0439,72.5168"
  const plainMatch = str.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1]);
    const lng = parseFloat(plainMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }

  // 2. Google Maps URL or query string containing @lat,lng or ?q=lat,lng
  const urlMatch = str.match(/[@?&](?:q=|ll=)?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lng = parseFloat(urlMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }

  return null;
}

/**
 * Clean user-facing location display name (formats GPS coords into elegant coordinates)
 */
export function formatLocationDisplayName(locStr) {
  if (!locStr) return '';
  const coords = parseCoordinates(locStr);
  if (coords) {
    const latDir = coords[0] >= 0 ? 'N' : 'S';
    const lngDir = coords[1] >= 0 ? 'E' : 'W';
    return `${Math.abs(coords[0]).toFixed(4)}° ${latDir}, ${Math.abs(coords[1]).toFixed(4)}° ${lngDir}`;
  }
  return locStr;
}

/**
 * Universal real Google Maps link generator
 */
export function getGoogleMapsUrl(locStr) {
  if (!locStr) return 'https://www.google.com/maps';
  const coords = parseCoordinates(locStr);
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locStr)}`;
}

function resolvePhotoCoordinates(photo, index) {
  if (photo.lat && photo.lng) {
    return [Number(photo.lat), Number(photo.lng)];
  }
  const locStr = (photo.location || '').trim();

  // Check if coordinates can be parsed from raw lat,lng or Google Maps URL
  const parsed = parseCoordinates(locStr);
  if (parsed) {
    return parsed;
  }

  const lower = locStr.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (lower.includes(key)) {
      const angle = (index % 8) * (Math.PI / 4);
      const jitter = 0.0035;
      return [coords[0] + Math.sin(angle) * jitter, coords[1] + Math.cos(angle) * jitter];
    }
  }
  // Fallback anchor: Gujarat region with clean distributed offset
  const baseLat = 22.2587 + ((index % 5) - 2) * 0.28;
  const baseLng = 71.1924 + ((index % 4) - 1.5) * 0.32;
  return [baseLat, baseLng];
}


let currentMapLayerType = 'street'; // 'street' | 'satellite' | 'dark'

export function setMapLayer(type) {
  currentMapLayerType = type;
  if (!leafletMapInstance || typeof L === 'undefined') return;

  if (leafletTileLayer) {
    leafletMapInstance.removeLayer(leafletTileLayer);
  }

  let tileUrl;
  let maxZoom = 19;
  let subdomains = 'abc';

  if (type === 'satellite') {
    // Real Satellite Imagery from space (Esri World Imagery)
    tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    maxZoom = 19;
  } else if (type === 'street') {
    // Real Street Map with road names, highways, landmarks (OpenStreetMap)
    tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    maxZoom = 19;
  } else {
    // Sleek Dark Minimalist theme
    tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    subdomains = 'abcd';
  }

  leafletTileLayer = L.tileLayer(tileUrl, {
    maxZoom,
    subdomains
  }).addTo(leafletMapInstance);

  // Update active state on buttons
  document.querySelectorAll('.map-layer-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layer === type);
  });
}

function initMapIfNeeded() {
  if (typeof L === 'undefined') {
    const mapEl = document.getElementById('leaflet-map');
    if (mapEl) mapEl.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--text-muted)">Map library loading... please check network connection.</div>';
    return;
  }
  if (!leafletMapInstance) {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl) return;
    leafletMapInstance = L.map(mapEl, {
      zoomControl: true,
      attributionControl: false
    }).setView([22.2587, 71.1924], 7);

    setMapLayer(currentMapLayerType);
    leafletMarkersLayer = L.layerGroup().addTo(leafletMapInstance);

    // Setup layer switcher buttons
    document.querySelectorAll('.map-layer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerType = btn.dataset.layer || 'street';
        setMapLayer(layerType);
        soundFX.playClick();
      });
    });

    if (mapRecenterBtn) {
      mapRecenterBtn.addEventListener('click', () => {
        if (leafletMarkersLayer && leafletMarkersLayer.getLayers().length > 0) {
          const group = L.featureGroup(leafletMarkersLayer.getLayers());
          leafletMapInstance.fitBounds(group.getBounds().pad(0.18), { animate: true });
          soundFX.playClick();
        }
      });
    }
  }
}

export function updateMapTileLayer() {
  // Only change automatically if user hasn't selected Satellite
  if (currentMapLayerType === 'satellite') return;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  setMapLayer(isDark ? 'dark' : 'street');
}


function renderMap() {
  initMapIfNeeded();
  if (!leafletMapInstance) return;

  setTimeout(() => {
    leafletMapInstance.invalidateSize();
    updateMapMarkers();
  }, 120);
}

function updateMapMarkers() {
  if (!leafletMapInstance || !leafletMarkersLayer || typeof L === 'undefined') return;
  leafletMarkersLayer.clearLayers();

  if (state.filteredPhotos.length === 0) {
    emptyState.hidden = false;
    if (mapPhotoCount) mapPhotoCount.textContent = '0 Photos Mapped';
    return;
  }
  emptyState.hidden = true;

  const validBounds = [];
  let mappedCount = 0;

  state.filteredPhotos.forEach((photo, index) => {
    const coords = resolvePhotoCoordinates(photo, index);
    if (!coords) return;
    mappedCount++;
    validBounds.push(coords);

    const thumbUrl = photo.thumbnail || photo.url;
    const title = escapeHtml(photo.title || 'Untitled Click');
    const locationName = escapeHtml(photo.location || 'Gujarat, India');
    const dateFormatted = formatDate(photo.date);
    const category = escapeHtml(photo.category || 'Moments');

    const customIcon = L.divIcon({
      className: 'map-photo-pin-container',
      html: `
        <div class="map-photo-pin" title="${title}">
          <div class="pin-pulse"></div>
          <div class="pin-thumb-wrapper">
            <img src="${thumbUrl}" alt="${title}" class="pin-img" loading="lazy" />
          </div>
          <div class="pin-tip"></div>
        </div>
      `,
      iconSize: [48, 56],
      iconAnchor: [24, 56],
      popupAnchor: [0, -56]
    });

    const marker = L.marker(coords, { icon: customIcon });

    const popupHtml = `
      <div class="map-popup-card">
        <div class="map-popup-img-wrap">
          <img src="${thumbUrl}" alt="${title}" class="map-popup-img" />
          <span class="map-popup-badge">${category}</span>
        </div>
        <div class="map-popup-info">
          <h4 class="map-popup-title">${title}</h4>
          <div class="map-popup-meta">
            <span>📍 ${escapeHtml(formatLocationDisplayName(photo.location || 'Gujarat, India'))}</span>
            <span>•</span>
            <span>${dateFormatted}</span>
          </div>
          <div class="map-popup-actions">
            <button type="button" class="map-popup-btn primary" onclick="window.openGalleryLightbox(${index})">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
              <span>View Photo</span>
            </button>
            <a href="${getGoogleMapsUrl(photo.location || coords.join(','))}" target="_blank" rel="noopener noreferrer" class="map-popup-btn secondary" title="Open real location in Google Maps">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>Google Maps ↗</span>
            </a>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 290, className: 'custom-leaflet-popup' });
    leafletMarkersLayer.addLayer(marker);
  });

  if (mapPhotoCount) {
    mapPhotoCount.textContent = `${mappedCount} Location${mappedCount === 1 ? '' : 's'} Mapped`;
  }

  if (mapOpenGmapsBtn && state.filteredPhotos.length > 0) {
    const firstWithLoc = state.filteredPhotos.find(p => p.location) || state.filteredPhotos[0];
    mapOpenGmapsBtn.href = getGoogleMapsUrl(firstWithLoc?.location || 'Gujarat, India');
  }

  if (validBounds.length > 0) {
    const group = L.featureGroup(leafletMarkersLayer.getLayers());
    leafletMapInstance.fitBounds(group.getBounds().pad(0.18), { animate: true });
  }
}

export function scrollToMap() {
  if (!mapContainer) return;
  const headerOffset = 155;
  const elementPosition = mapContainer.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  window.scrollTo({
    top: Math.max(0, offsetPosition),
    behavior: 'smooth'
  });
}

/**
 * Switch layout views
 */
export function switchView(viewName) {
  state.currentView = viewName;

  [viewMasonryBtn, viewGridBtn, viewTimelineBtn, viewMapBtn].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });
  if (navMapBtn) {
    navMapBtn.classList.toggle('active', viewName === 'map');
  }

  if (viewName === 'masonry') {
    if (viewMasonryBtn) viewMasonryBtn.classList.add('active');
    if (galleryContainer) {
      galleryContainer.hidden = false;
      galleryContainer.className = 'gallery-grid masonry-view';
    }
    if (timelineContainer) timelineContainer.hidden = true;
    if (mapContainer) mapContainer.hidden = true;
    renderGallery();
  } else if (viewName === 'grid') {
    if (viewGridBtn) viewGridBtn.classList.add('active');
    if (galleryContainer) {
      galleryContainer.hidden = false;
      galleryContainer.className = 'gallery-grid uniform-view';
    }
    if (timelineContainer) timelineContainer.hidden = true;
    if (mapContainer) mapContainer.hidden = true;
    renderGallery();
  } else if (viewName === 'timeline') {
    if (viewTimelineBtn) viewTimelineBtn.classList.add('active');
    if (galleryContainer) galleryContainer.hidden = true;
    if (timelineContainer) timelineContainer.hidden = false;
    if (mapContainer) mapContainer.hidden = true;
    renderTimeline();
  } else if (viewName === 'map') {
    if (viewMapBtn) viewMapBtn.classList.add('active');
    if (galleryContainer) galleryContainer.hidden = true;
    if (timelineContainer) timelineContainer.hidden = true;
    if (mapContainer) mapContainer.hidden = false;
    renderMap();
    scrollToMap();
  }
}


/**
 * Update header counter stats
 */
function updateStats() {
  if (!photoCounter) return;
  const count = state.filteredPhotos.length;
  const total = state.allPhotos.length;
  if (state.activeCategory === 'all' && !state.searchQuery) {
    photoCounter.textContent = `${total} Photo${total === 1 ? '' : 's'}`;
  } else {
    photoCounter.textContent = `Showing ${count} of ${total} Photo${total === 1 ? '' : 's'}`;
  }
}

/**
 * ==========================================================
 * LIGHTBOX VIEWER
 * ==========================================================
 */
export function openLightbox(index) {
  if (!isVisitorUnlocked()) {
    openUnlockModal(index);
    return;
  }
  if (!state.filteredPhotos[index]) return;
  state.currentLightboxIndex = index;
  updateLightboxView();
  soundFX.playShutter();

  document.body.classList.add('modal-open');
  if (typeof lightboxDialog.showModal === 'function') {
    if (!lightboxDialog.open) {
      lightboxDialog.showModal();
    }
  } else {
    lightboxDialog.setAttribute('open', '');
  }
  window.dispatchEvent(new CustomEvent('modalstatechange', { detail: { open: true, dialog: lightboxDialog } }));
}

export function updateLightboxView() {
  const photo = state.filteredPhotos[state.currentLightboxIndex];
  if (!photo) return;

  // Reset zoom
  lbImage.classList.remove('zoomed');

  // Update counters
  lbCurrentIndex.textContent = (state.currentLightboxIndex + 1).toString();
  lbTotalCount.textContent = state.filteredPhotos.length.toString();

  // Show spinner while high-res loads
  lbSpinner.hidden = false;
  lbImage.style.opacity = '0.3';

  const fullImg = new Image();
  fullImg.src = photo.url;
  fullImg.onload = () => {
    lbImage.src = photo.url;
    lbImage.alt = photo.title || 'Full size photo';
    lbImage.style.opacity = '1';
    lbSpinner.hidden = true;
    applyAmbientGlow(fullImg);
    if (state.isSlideshowActive) {
      cycleKenBurnsVariant();
    }
  };
  fullImg.onerror = () => {
    lbImage.src = photo.thumbnail || photo.url;
    lbImage.style.opacity = '1';
    lbSpinner.hidden = true;
    applyAmbientGlow(lbImage);
  };

  // Metadata
  lbTitle.textContent = photo.title || 'Untitled';
  lbCategory.textContent = photo.category || 'Moments';
  lbDesc.textContent = photo.description || '';
  lbDate.textContent = formatDate(photo.date);

  if (photo.location) {
    lbLocationRow.style.display = 'flex';
    lbLocation.textContent = formatLocationDisplayName(photo.location);
    if (lbLocationLink) {
      lbLocationLink.href = getGoogleMapsUrl(photo.location);
      lbLocationLink.setAttribute('aria-label', `Open ${photo.location} in Google Maps`);
      lbLocationLink.title = `Open ${photo.location} in Google Maps ↗`;
    }
  } else {
    lbLocationRow.style.display = 'none';
  }

  if (photo.camera) {
    lbCameraRow.style.display = 'flex';
    lbCamera.textContent = photo.camera;
  } else {
    lbCameraRow.style.display = 'none';
  }

  // Tags
  lbTags.innerHTML = '';
  if (Array.isArray(photo.tags) && photo.tags.length > 0) {
    photo.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = `#${tag}`;
      lbTags.appendChild(chip);
    });
  }

  // Update lightbox heart button
  if (lbFavBtn) {
    const isFav = getFavorites().includes(String(photo.id || state.currentLightboxIndex));
    lbFavBtn.classList.toggle('is-fav', isFav);
    lbFavBtn.title = isFav ? 'Remove from favorites (L)' : 'Add to favorites (L)';
  }

  // Update URL hash for sharing
  if (photo.id) {
    history.replaceState(null, '', `#photo-${photo.id}`);
  }
}

/**
 * FEATURE 2: Dynamic Ambient Glow (Offscreen Canvas Color Sampling)
 */
function applyAmbientGlow(img) {
  if (!lbAmbientGlow) return;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 32;
    canvas.height = 32;
    ctx.drawImage(img, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;

    const candidates = [];
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 30 || brightness > 230 || delta < 20) continue;
      candidates.push({ r, g, b, delta });
    }

    candidates.sort((a, b) => b.delta - a.delta);

    const c1 = candidates[0] || { r: 16, g: 185, b: 129 };
    const c2 = candidates.find(c => Math.hypot(c.r - c1.r, c.g - c1.g, c.b - c1.b) > 60)
      || candidates[Math.floor(candidates.length / 2)]
      || { r: 6, g: 182, b: 212 };

    lbAmbientGlow.style.setProperty('--ambient-r1', c1.r);
    lbAmbientGlow.style.setProperty('--ambient-g1', c1.g);
    lbAmbientGlow.style.setProperty('--ambient-b1', c1.b);
    lbAmbientGlow.style.setProperty('--ambient-r2', c2.r);
    lbAmbientGlow.style.setProperty('--ambient-g2', c2.g);
    lbAmbientGlow.style.setProperty('--ambient-b2', c2.b);
  } catch (e) {
    // Canvas CORS fallback
  }
}

/**
 * FEATURE 1: Cinematic Slideshow Mode Controller
 */
export function startSlideshow() {
  if (state.filteredPhotos.length === 0) return;
  if (!isVisitorUnlocked()) {
    openUnlockModal(state.currentLightboxIndex || 0, 'Please enter details to start cinematic slideshow!');
    return;
  }
  if (!lightboxDialog.open) {
    openLightbox(state.currentLightboxIndex || 0);
  }
  state.isSlideshowActive = true;
  updateSlideshowUI(true);

  const lbStage = document.querySelector('.lightbox-stage');
  if (lbStage) lbStage.classList.add('ken-burns-active');

  resetSlideshowProgress();
  cycleKenBurnsVariant();

  clearInterval(state.slideshowTimer);
  state.slideshowTimer = setInterval(() => {
    if (!state.isSlideshowActive || !lightboxDialog.open) {
      stopSlideshow();
      return;
    }
    nextPhoto();
    resetSlideshowProgress();
  }, 5000);

  showToast('▶ Cinematic Slideshow started (5s per photo)', 'info');
}

export function stopSlideshow() {
  state.isSlideshowActive = false;
  if (state.slideshowTimer) {
    clearInterval(state.slideshowTimer);
    state.slideshowTimer = null;
  }
  updateSlideshowUI(false);
  const lbStage = document.querySelector('.lightbox-stage');
  if (lbStage) lbStage.classList.remove('ken-burns-active');
  if (lbImage) {
    lbImage.classList.remove('ken-burns-1', 'ken-burns-2', 'ken-burns-3', 'ken-burns-4');
  }
  if (lbSlideshowProgress) lbSlideshowProgress.hidden = true;
  if (lbSlideshowBar) lbSlideshowBar.classList.remove('is-progressing');
}

export function toggleSlideshow() {
  if (state.isSlideshowActive) {
    stopSlideshow();
    showToast('⏸ Slideshow paused', 'info');
  } else {
    startSlideshow();
  }
}

function updateSlideshowUI(active) {
  if (lbSlideshowBtn) {
    lbSlideshowBtn.classList.toggle('active', active);
    const playIcon = lbSlideshowBtn.querySelector('.lb-play-icon');
    const pauseIcon = lbSlideshowBtn.querySelector('.lb-pause-icon');
    if (playIcon) playIcon.style.display = active ? 'none' : 'block';
    if (pauseIcon) pauseIcon.style.display = active ? 'block' : 'none';
  }
}

function resetSlideshowProgress() {
  if (!lbSlideshowProgress || !lbSlideshowBar) return;
  lbSlideshowProgress.hidden = false;
  lbSlideshowBar.classList.remove('is-progressing');
  void lbSlideshowBar.offsetWidth; // force reflow
  lbSlideshowBar.classList.add('is-progressing');
}

function cycleKenBurnsVariant() {
  if (!lbImage) return;
  state.slideshowVariant = (state.slideshowVariant + 1) % 4;
  lbImage.classList.remove('ken-burns-1', 'ken-burns-2', 'ken-burns-3', 'ken-burns-4');
  void lbImage.offsetWidth;
  lbImage.classList.add(`ken-burns-${state.slideshowVariant + 1}`);
}

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const el = lightboxDialog || document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
}

function nextPhoto() {
  if (state.filteredPhotos.length <= 1) return;
  state.currentLightboxIndex = (state.currentLightboxIndex + 1) % state.filteredPhotos.length;
  triggerSlideAnimation('slide-next');
  updateLightboxView();
  soundFX.playClick();
}

function prevPhoto() {
  if (state.filteredPhotos.length <= 1) return;
  state.currentLightboxIndex = (state.currentLightboxIndex - 1 + state.filteredPhotos.length) % state.filteredPhotos.length;
  triggerSlideAnimation('slide-prev');
  updateLightboxView();
  soundFX.playClick();
}

function triggerSlideAnimation(cls) {
  lbImage.classList.remove('slide-next', 'slide-prev');
  void lbImage.offsetWidth;
  lbImage.classList.add(cls);
}

export function closeLightbox() {
  stopSlideshow();
  if (typeof lightboxDialog.close === 'function') {
    if (lightboxDialog.open) lightboxDialog.close();
  } else {
    lightboxDialog.removeAttribute('open');
  }
  if (!document.querySelector('dialog[open]')) {
    document.body.classList.remove('modal-open');
  }
  window.dispatchEvent(new CustomEvent('modalstatechange', { detail: { open: false, dialog: lightboxDialog } }));
  history.replaceState(null, '', window.location.pathname + window.location.search);
}


function toggleZoom() {
  lbImage.classList.toggle('zoomed');
  soundFX.playClick();
}

async function downloadCurrentPhoto() {
  if (!isVisitorUnlocked()) {
    openUnlockModal(state.currentLightboxIndex, 'Please enter your name & email to download photos!');
    return;
  }
  const photo = state.filteredPhotos[state.currentLightboxIndex];
  if (!photo) return;
  try {
    showToast('Starting photo download...', 'success');
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = `${(photo.title || 'photo').toLowerCase().replace(/\s+/g, '-')}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    showToast('Could not download image directly', 'error');
  }
}

async function shareCurrentPhoto() {
  if (!isVisitorUnlocked()) {
    openUnlockModal(state.currentLightboxIndex, 'Please enter your name & email to share photos!');
    return;
  }
  const photo = state.filteredPhotos[state.currentLightboxIndex];
  if (!photo) return;
  const shareUrl = window.location.origin + window.location.pathname + `#photo-${photo.id || state.currentLightboxIndex}`;

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl);
    showToast('Link copied to clipboard!', 'success');
    soundFX.playPop();
  } else {
    showToast(`Photo URL: ${shareUrl}`, 'success');
  }
}

/**
 * Handle URL hash on initial page load (e.g. #photo-photo-3)
 */
function checkUrlHash() {
  const hash = window.location.hash;
  if (!hash.startsWith('#photo-')) return;
  const targetId = hash.replace('#photo-', '');
  const index = state.filteredPhotos.findIndex(p => String(p.id) === targetId);
  if (index !== -1) {
    openLightbox(index);
  }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Category Pills delegation
  categoryPillsWrapper.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.activeCategory = pill.dataset.category || 'all';
    soundFX.playClick();
    applyFilters();
  });

  // Quick search button in menubar
  const quickSearchTrigger = document.getElementById('quick-search-trigger');
  if (quickSearchTrigger && searchInput) {
    quickSearchTrigger.addEventListener('click', () => {
      soundFX.playClick();
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Global ⌘K or Ctrl+K shortcut to focus search
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchInput) {
        soundFX.playClick();
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // Search input
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    clearSearchBtn.hidden = !state.searchQuery;
    applyFilters();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.hidden = true;
    searchInput.focus();
    soundFX.playClick();
    applyFilters();
  });

  // Sort dropdown
  sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    soundFX.playClick();
    applyFilters();
  });

  // Reset empty state
  emptyResetBtn.addEventListener('click', () => {
    state.activeCategory = 'all';
    state.searchQuery = '';
    searchInput.value = '';
    clearSearchBtn.hidden = true;
    soundFX.playClick();
    renderCategories();
    applyFilters();
  });

  // Layout switcher
  if (viewMasonryBtn) {
    viewMasonryBtn.addEventListener('click', () => {
      switchView('masonry');
      soundFX.playClick();
    });
  }

  if (viewGridBtn) {
    viewGridBtn.addEventListener('click', () => {
      switchView('grid');
      soundFX.playClick();
    });
  }

  if (viewTimelineBtn) {
    viewTimelineBtn.addEventListener('click', () => {
      switchView('timeline');
      soundFX.playClick();
    });
  }

  if (viewMapBtn) {
    viewMapBtn.addEventListener('click', () => {
      soundFX.playClick();
      switchView('map');
    });
  }

  // Navigation Header Direct Map Button
  if (navMapBtn) {
    navMapBtn.addEventListener('click', (e) => {
      e.preventDefault();
      soundFX.playClick();
      switchView('map');
    });
  }

  // Quick Slideshow trigger button
  if (startSlideshowBtn) {
    startSlideshowBtn.addEventListener('click', () => {
      soundFX.playClick();
      startSlideshow();
    });
  }


  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gallery-theme', next);
    updateMapTileLayer();
    soundFX.playClick();
  });

  // Lightbox controls
  lbPrevBtn.addEventListener('click', prevPhoto);
  lbNextBtn.addEventListener('click', nextPhoto);
  lbZoomBtn.addEventListener('click', toggleZoom);
  lbImage.addEventListener('click', toggleZoom);
  lbDownloadBtn.addEventListener('click', downloadCurrentPhoto);
  lbShareBtn.addEventListener('click', shareCurrentPhoto);
  lbCloseBtn.addEventListener('click', closeLightbox);

  // Slideshow & Fullscreen Lightbox buttons
  if (lbSlideshowBtn) {
    lbSlideshowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundFX.playClick();
      toggleSlideshow();
    });
  }

  if (lbFullscreenBtn) {
    lbFullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundFX.playClick();
      toggleFullscreen();
    });
  }

  document.addEventListener('fullscreenchange', () => {
    if (lbFullscreenBtn) {
      const isFs = Boolean(document.fullscreenElement);
      const expIcon = lbFullscreenBtn.querySelector('.lb-expand-icon');
      const compIcon = lbFullscreenBtn.querySelector('.lb-compress-icon');
      if (expIcon) expIcon.style.display = isFs ? 'none' : 'block';
      if (compIcon) compIcon.style.display = isFs ? 'block' : 'none';
    }
  });

  // Lightbox favorite button
  if (lbFavBtn) {
    lbFavBtn.addEventListener('click', (e) => {
      const currentPhoto = state.filteredPhotos[state.currentLightboxIndex];
      if (currentPhoto) {
        toggleFavorite(currentPhoto.id || state.currentLightboxIndex, lbFavBtn, e);
      }
    });
  }

  // Lightbox edit button (Admin only)
  const lbEditBtn = document.getElementById('lb-edit-btn');
  if (lbEditBtn) {
    lbEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundFX.playClick();
      const currentPhoto = state.filteredPhotos[state.currentLightboxIndex];
      if (currentPhoto) {
        window.dispatchEvent(new CustomEvent('requestphotoedit', { detail: { photo: currentPhoto, index: state.currentLightboxIndex } }));
      }
    });
  }

  // Lightbox delete button (Admin only)
  const lbDeleteBtn = document.getElementById('lb-delete-btn');
  if (lbDeleteBtn) {
    lbDeleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundFX.playClick();
      const currentPhoto = state.filteredPhotos[state.currentLightboxIndex];
      if (currentPhoto) {
        window.dispatchEvent(new CustomEvent('requestphotodelete', { detail: { photo: currentPhoto } }));
      }
    });
  }

  // Close lightbox on backdrop click
  lightboxDialog.addEventListener('click', (e) => {
    if (e.target === lightboxDialog) {
      closeLightbox();
    }
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (!lightboxDialog.open) return;
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'z' || e.key === 'Z' || e.key === ' ') {
      e.preventDefault();
      toggleZoom();
    }
    if (e.key === 'l' || e.key === 'L') {
      const currentPhoto = state.filteredPhotos[state.currentLightboxIndex];
      if (currentPhoto) {
        toggleFavorite(currentPhoto.id || state.currentLightboxIndex, lbFavBtn, null);
      }
    }
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      toggleSlideshow();
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  // Global window hook for map popups
  window.openGalleryLightbox = (idx) => {
    openLightbox(idx);
  };


  // Touch Swipe for mobile lightbox
  let touchStartX = 0;
  let touchEndX = 0;

  lightboxDialog.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightboxDialog.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) nextPhoto();
      else prevPhoto();
    }
  }
}

/**
 * Initialize Theme
 */
function initTheme() {
  const saved = localStorage.getItem('gallery-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

/**
 * Toast Notification Utility (Supports top-layer dialogs)
 */
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  
  // If a dialog is open (in the browser's top layer), attach toast inside the dialog so it is visible
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog) {
    let dialogToastContainer = openDialog.querySelector('.dialog-toast-container');
    if (!dialogToastContainer) {
      dialogToastContainer = document.createElement('div');
      dialogToastContainer.className = 'toast-container dialog-toast-container';
      openDialog.appendChild(dialogToastContainer);
    }
    container = dialogToastContainer;
  }

  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Helpers
function formatDate(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ==========================================================
   VISITOR REGISTRATION & FULL ACCESS GATEKEEPER
   ========================================================== */
let pendingUnlockPhotoIndex = null;

export function isVisitorUnlocked() {
  if (document.body.classList.contains('admin-mode') || document.documentElement.classList.contains('admin-mode')) {
    return true;
  }
  try {
    return localStorage.getItem('gallery_visitor_unlocked') === 'true';
  } catch {
    return false;
  }
}

export function openUnlockModal(photoIndex = null, contextHint = null) {
  pendingUnlockPhotoIndex = photoIndex;
  const dialog = document.getElementById('unlock-access-dialog');
  if (!dialog) return;

  const hintBox = document.getElementById('unlock-context-hint');
  const hintText = document.getElementById('unlock-context-text');
  if (hintBox && hintText) {
    if (contextHint) {
      hintBox.hidden = false;
      hintText.textContent = contextHint;
    } else {
      hintBox.hidden = true;
    }
  }

  const statusBanner = document.getElementById('unlock-status');
  if (statusBanner) statusBanner.hidden = true;

  document.body.classList.add('modal-open');
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  window.dispatchEvent(new CustomEvent('modalstatechange', { detail: { open: true, dialog } }));

  setTimeout(() => {
    const nameInput = document.getElementById('visitor-name');
    if (nameInput) nameInput.focus();
  }, 120);
}

function closeUnlockModal() {
  const dialog = document.getElementById('unlock-access-dialog');
  if (!dialog) return;
  if (typeof dialog.close === 'function') {
    if (dialog.open) dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
  if (!document.querySelector('dialog[open]')) {
    document.body.classList.remove('modal-open');
  }
  window.dispatchEvent(new CustomEvent('modalstatechange', { detail: { open: false, dialog } }));
}

function setupUnlockModalEvents() {
  const dialog = document.getElementById('unlock-access-dialog');
  if (!dialog) return;

  const closeBtn = document.getElementById('close-unlock-dialog-btn');
  const browseSmallBtn = document.getElementById('browse-small-btn');
  const form = document.getElementById('unlock-access-form');
  const statusBanner = document.getElementById('unlock-status');
  const statusMsg = document.getElementById('unlock-status-msg');
  const submitBtn = document.getElementById('submit-unlock-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeUnlockModal);
  if (browseSmallBtn) browseSmallBtn.addEventListener('click', closeUnlockModal);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeUnlockModal();
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('visitor-name');
      const emailInput = document.getElementById('visitor-email');
      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';

      if (!name || !email) {
        showToast('Please enter both your name and email!', 'error');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (statusBanner) statusBanner.hidden = false;
      if (statusMsg) statusMsg.textContent = 'Saving details and unlocking full gallery...';

      // Record visitor details in localStorage
      const visitorInfo = {
        name,
        email,
        unlockedAt: new Date().toISOString()
      };
      localStorage.setItem('gallery_visitor_unlocked', 'true');
      localStorage.setItem('gallery_visitor_info', JSON.stringify(visitorInfo));

      const photo = (pendingUnlockPhotoIndex !== null && state.filteredPhotos[pendingUnlockPhotoIndex])
        ? state.filteredPhotos[pendingUnlockPhotoIndex]
        : null;
      const photoTitle = photo ? (photo.title || 'Untitled Click') : 'Gallery Browse';

      // 1. Post to Google Sheet Web App (supports both POST FormData & GET query)
      const sheetUrl = getGoogleSheetUrl();
      if (sheetUrl) {
        const payload = {
          timestamp: new Date().toLocaleString(),
          name: name,
          email: email,
          photoTitle: photoTitle,
          userAgent: navigator.userAgent
        };

        // Method A: POST via FormData (works with e.parameter in Google Apps Script)
        try {
          const fd = new FormData();
          for (const k in payload) fd.append(k, payload[k]);
          fetch(sheetUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: fd
          }).catch(err => console.warn('Google Sheet POST notice:', err));
        } catch (err) { }

        // Method B: GET query fallback (works with doGet(e) in Google Apps Script without CORS blocks)
        try {
          const query = new URLSearchParams(payload).toString();
          const beaconUrl = sheetUrl + (sheetUrl.includes('?') ? '&' : '?') + query;
          const img = new Image();
          img.src = beaconUrl;
        } catch (err) { }
      }

      // 2. Also send notification to FormSubmit so owner is notified
      try {
        const formData = new FormData();
        formData.append('_subject', `👤 [Gallery Visitor] ${name} (${email}) unlocked full photos`);
        formData.append('Visitor Name', name);
        formData.append('Visitor Email', email);
        formData.append('Photo Explored', photoTitle);
        formData.append('Registration Date', new Date().toLocaleString());
        formData.append('Device Info', navigator.userAgent);
        formData.append('_template', 'table');
        formData.append('_captcha', 'false');

        fetch('https://formsubmit.co/ajax/sanganiuttam0@gmail.com', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData
        }).catch(() => { });
      } catch (err) { }

      // Clean up modal
      if (submitBtn) submitBtn.disabled = false;
      if (statusBanner) statusBanner.hidden = true;
      closeUnlockModal();

      // Refresh gallery cards to reveal unlocked zoom indicators & remove lock badges
      renderGallery();
      showToast(`✨ Welcome, ${name}! Full gallery access unlocked.`, 'success');

      // If user clicked a specific photo, immediately open it in Lightbox
      if (pendingUnlockPhotoIndex !== null && state.filteredPhotos[pendingUnlockPhotoIndex]) {
        openLightbox(pendingUnlockPhotoIndex);
      }
      pendingUnlockPhotoIndex = null;
    });
  }
}

// Start on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGallery);
} else {
  initGallery();
}
