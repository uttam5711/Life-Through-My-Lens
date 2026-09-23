/**
 * MOMENTS & CLICKS • GALLERY CONTROLLER
 * Handles fetching photos, category filters, live search, sorting, and full-screen lightbox.
 */

// Global state
export const state = {
  allPhotos: [],
  filteredPhotos: [],
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'newest',
  currentLightboxIndex: 0,
};

// DOM Elements
const galleryContainer = document.getElementById('gallery-container');
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

/**
 * Initialize Gallery
 */
export async function initGallery() {
  initTheme();
  setupEventListeners();
  await loadPhotos();
  checkUrlHash();
}

/**
 * Fetch photos from data/photos.json
 */
export async function loadPhotos() {
  try {
    const response = await fetch('data/photos.json?t=' + Date.now());
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    state.allPhotos = Array.isArray(data) ? data : [];
    renderCategories();
    applyFilters();
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
  }
}

/**
 * Render category navigation pills dynamically based on photos data
 */
function renderCategories() {
  if (!categoryPillsWrapper) return;

  const categories = new Set();
  state.allPhotos.forEach(p => {
    if (p.category) categories.add(p.category);
  });

  categoryPillsWrapper.innerHTML = `
    <button class="pill ${state.activeCategory === 'all' ? 'active' : ''}" data-category="all">
      All Photos
    </button>
  `;

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `pill ${state.activeCategory === cat ? 'active' : ''}`;
    btn.dataset.category = cat;
    btn.textContent = cat;
    categoryPillsWrapper.appendChild(btn);
  });
}

/**
 * Filter, sort, and render photos
 */
export function applyFilters() {
  let list = [...state.allPhotos];

  // 1. Filter by category
  if (state.activeCategory !== 'all') {
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
  renderGallery();
  updateStats();
}

/**
 * Render cards into the gallery container
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
    const card = document.createElement('article');
    card.className = 'photo-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View ${photo.title || 'photo'}`);
    
    // Thumbnail fallback
    const thumbUrl = photo.thumbnail || photo.url;
    const formattedDate = formatDate(photo.date);

    card.innerHTML = `
      <div class="photo-thumb-container">
        <img 
          src="${thumbUrl}" 
          alt="${escapeHtml(photo.title || 'Photo')}" 
          class="photo-thumb" 
          loading="lazy" 
          decoding="async"
        />
        <div class="photo-card-overlay">
          <span class="card-category-badge">${escapeHtml(photo.category || 'Moments')}</span>
          <h3 class="card-title">${escapeHtml(photo.title || 'Untitled')}</h3>
          ${photo.description ? `<p class="card-snippet">${escapeHtml(photo.description)}</p>` : ''}
          <div class="card-footer-info">
            <span>${formattedDate}</span>
            <span>${photo.location ? escapeHtml(photo.location) : ''}</span>
          </div>
        </div>
      </div>
    `;

    // Click & Keyboard Enter to open lightbox
    card.addEventListener('click', () => openLightbox(index));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(index);
      }
    });

    galleryContainer.appendChild(card);
  });
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
  if (!state.filteredPhotos[index]) return;
  state.currentLightboxIndex = index;
  updateLightboxView();
  
  if (typeof lightboxDialog.showModal === 'function') {
    if (!lightboxDialog.open) {
      lightboxDialog.showModal();
    }
  } else {
    lightboxDialog.setAttribute('open', '');
  }
}

function updateLightboxView() {
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
  };
  fullImg.onerror = () => {
    lbImage.src = photo.thumbnail || photo.url;
    lbImage.style.opacity = '1';
    lbSpinner.hidden = true;
  };

  // Metadata
  lbTitle.textContent = photo.title || 'Untitled';
  lbCategory.textContent = photo.category || 'Moments';
  lbDesc.textContent = photo.description || '';
  lbDate.textContent = formatDate(photo.date);

  if (photo.location) {
    lbLocationRow.style.display = 'flex';
    lbLocation.textContent = photo.location;
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

  // Update URL hash for sharing
  if (photo.id) {
    history.replaceState(null, '', `#photo-${photo.id}`);
  }
}

function nextPhoto() {
  if (state.filteredPhotos.length <= 1) return;
  state.currentLightboxIndex = (state.currentLightboxIndex + 1) % state.filteredPhotos.length;
  updateLightboxView();
}

function prevPhoto() {
  if (state.filteredPhotos.length <= 1) return;
  state.currentLightboxIndex = (state.currentLightboxIndex - 1 + state.filteredPhotos.length) % state.filteredPhotos.length;
  updateLightboxView();
}

function closeLightbox() {
  if (typeof lightboxDialog.close === 'function') {
    lightboxDialog.close();
  } else {
    lightboxDialog.removeAttribute('open');
  }
  history.replaceState(null, '', window.location.pathname);
}

function toggleZoom() {
  lbImage.classList.toggle('zoomed');
}

async function downloadCurrentPhoto() {
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
  const photo = state.filteredPhotos[state.currentLightboxIndex];
  if (!photo) return;
  const shareUrl = window.location.origin + window.location.pathname + `#photo-${photo.id || state.currentLightboxIndex}`;
  
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl);
    showToast('Link copied to clipboard!', 'success');
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
    applyFilters();
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
    applyFilters();
  });

  // Sort dropdown
  sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    applyFilters();
  });

  // Reset empty state
  emptyResetBtn.addEventListener('click', () => {
    state.activeCategory = 'all';
    state.searchQuery = '';
    searchInput.value = '';
    clearSearchBtn.hidden = true;
    renderCategories();
    applyFilters();
  });

  // Layout switcher
  viewMasonryBtn.addEventListener('click', () => {
    viewMasonryBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    galleryContainer.className = 'gallery-grid masonry-view';
  });

  viewGridBtn.addEventListener('click', () => {
    viewGridBtn.classList.add('active');
    viewMasonryBtn.classList.remove('active');
    galleryContainer.className = 'gallery-grid uniform-view';
  });

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gallery-theme', next);
  });

  // Lightbox controls
  lbPrevBtn.addEventListener('click', prevPhoto);
  lbNextBtn.addEventListener('click', nextPhoto);
  lbZoomBtn.addEventListener('click', toggleZoom);
  lbImage.addEventListener('click', toggleZoom);
  lbDownloadBtn.addEventListener('click', downloadCurrentPhoto);
  lbShareBtn.addEventListener('click', shareCurrentPhoto);
  lbCloseBtn.addEventListener('click', closeLightbox);

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
    if (e.key === 'z' || e.key === 'Z') toggleZoom();
  });

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
      if (diff < 0) nextPhoto(); // swipe left
      else prevPhoto(); // swipe right
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
 * Toast Notification Utility
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
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

// Start on DOM ready
document.addEventListener('DOMContentLoaded', initGallery);
