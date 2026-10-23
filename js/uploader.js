/**
 * MOMENTS & CLICKS • UPLOADER STUDIO CONTROLLER
 * Handles client-side compression, batch uploads, in-browser cropping & film presets,
 * in-place metadata editing, direct GitHub API commits, and local export.
 */

import {
  state,
  applyFilters,
  showToast,
  loadPhotos,
  closeLightbox,
  getGoogleSheetUrl,
  updateLightboxView,
  saveLocalPhoto,
  getLocalPhotos,
  removeLocalPhoto
} from './gallery.js?v=20261023_studio_fix';

// ==========================================================
// DOM ELEMENTS
// ==========================================================
const openUploadBtn = document.getElementById('open-upload-btn');
const footerUploadBtn = document.getElementById('footer-upload-btn');
const uploadDialog = document.getElementById('upload-dialog');
const closeUploadBtn = document.getElementById('close-upload-btn');
const cancelUploadBtn = document.getElementById('cancel-upload-btn');
const closeLocalBtn = document.getElementById('close-local-btn');
const uploadInlineFeedback = document.getElementById('upload-inline-feedback');

// Tabs & Target Modes
const tabButtons = document.querySelectorAll('.tab-btn');
const githubTabContent = document.getElementById('github-tab-content');
const localTabContent = document.getElementById('local-tab-content');
const saveLocalBtn = document.getElementById('save-local-btn');

// Dropzone & File Input
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const dropzoneEmpty = document.getElementById('dropzone-empty');
const dropzonePreview = document.getElementById('dropzone-preview');
const previewImg = document.getElementById('preview-img');
const previewInfo = document.getElementById('preview-info');
const removeFileBtn = document.getElementById('remove-file-btn');
const singleCropBtn = document.getElementById('single-crop-btn');

// Single Upload Section & Form
const uploadForm = document.getElementById('upload-form');
const singleUploadSection = document.getElementById('single-upload-section');
const photoTitleInput = document.getElementById('photo-title');
const photoCategorySelect = document.getElementById('photo-category');
const customCategoryGroup = document.getElementById('custom-category-group');
const customCategoryInput = document.getElementById('custom-category-input');
const photoDateInput = document.getElementById('photo-date');
const photoLocationInput = document.getElementById('photo-location');
const photoCameraInput = document.getElementById('photo-camera');
const photoDescInput = document.getElementById('photo-desc');
const photoTagsInput = document.getElementById('photo-tags');

// Batch Upload Section
const batchUploadSection = document.getElementById('batch-upload-section');
const batchCountBadge = document.getElementById('batch-count-badge');
const batchToggleGlobalBtn = document.getElementById('batch-toggle-global-btn');
const batchGlobalDrawer = document.getElementById('batch-global-drawer');
const batchGlobalCategory = document.getElementById('batch-global-category');
const batchGlobalDate = document.getElementById('batch-global-date');
const batchGlobalLocation = document.getElementById('batch-global-location');
const batchGlobalCamera = document.getElementById('batch-global-camera');
const batchApplyGlobalBtn = document.getElementById('batch-apply-global-btn');
const batchItemsList = document.getElementById('batch-items-list');

// GitHub inputs & Drawer
const toggleGhConfigBtn = document.getElementById('toggle-gh-config-btn');
const ghConfigDrawer = document.getElementById('gh-config-drawer');
const ghTargetRepoText = document.getElementById('gh-target-repo-text');
const ghOwnerInput = document.getElementById('gh-owner');
const ghRepoInput = document.getElementById('gh-repo');
const ghBranchInput = document.getElementById('gh-branch');
const ghTokenInput = document.getElementById('gh-token');
const testGhTokenBtn = document.getElementById('test-gh-token-btn');
const ghTokenTestResult = document.getElementById('gh-token-test-result');
const ghSheetUrlInput = document.getElementById('google-sheet-url');
const testSheetBtn = document.getElementById('test-sheet-btn');
const sheetTestResult = document.getElementById('sheet-test-result');
const toggleTokenBtn = document.getElementById('toggle-token-visibility');
const githubSubmitBtn = document.getElementById('github-submit-btn');
const uploadStatus = document.getElementById('upload-status');
const uploadStatusMsg = document.getElementById('upload-status-msg');

// Local Export tab elements
const downloadPhotoFileBtn = document.getElementById('download-photo-file-btn');
const downloadJsonFileBtn = document.getElementById('download-json-file-btn');
const jsonSnippetPreview = document.getElementById('json-snippet-preview');
const copyJsonBtn = document.getElementById('copy-json-btn');

// Token Guide Modal
const tokenHelpLink = document.getElementById('token-help-link');
const tokenGuideDialog = document.getElementById('token-guide-dialog');
const closeTokenGuideBtn = document.getElementById('close-token-guide-btn');
const guideUnderstoodBtn = document.getElementById('guide-understood-btn');

// Photo Studio & Film Presets Modal
const photoEditorDialog = document.getElementById('photo-editor-dialog');
const closeEditorBtn = document.getElementById('close-editor-btn');
const editorCancelBtn = document.getElementById('editor-cancel-btn');
const editorResetBtn = document.getElementById('editor-reset-btn');
const editorApplyBtn = document.getElementById('editor-apply-btn');
const editorCanvas = document.getElementById('editor-canvas');
const aspectDimensions = document.getElementById('aspect-dimensions');
const aspectButtons = document.querySelectorAll('.aspect-btn');
const presetPills = document.querySelectorAll('.preset-pill');
const grainButtons = document.querySelectorAll('.grain-btn');

// In-Place Metadata Editor Modal
const editMetadataDialog = document.getElementById('edit-metadata-dialog');
const closeEditDialogBtn = document.getElementById('close-edit-dialog-btn');
const cancelEditDialogBtn = document.getElementById('cancel-edit-dialog-btn');
const editMetadataForm = document.getElementById('edit-metadata-form');
const editPhotoId = document.getElementById('edit-photo-id');
const editPhotoUrl = document.getElementById('edit-photo-url');
const editPreviewThumb = document.getElementById('edit-preview-thumb');
const editPhotoIdDisplay = document.getElementById('edit-photo-id-display');
const editPhotoTitle = document.getElementById('edit-photo-title');
const editPhotoCategory = document.getElementById('edit-photo-category');
const editCustomCategoryGroup = document.getElementById('edit-custom-category-group');
const editCustomCategory = document.getElementById('edit-custom-category');
const editPhotoDate = document.getElementById('edit-photo-date');
const editPhotoLocation = document.getElementById('edit-photo-location');
const editPhotoCamera = document.getElementById('edit-photo-camera');
const editPhotoDesc = document.getElementById('edit-photo-desc');
const editPhotoTags = document.getElementById('edit-photo-tags');
const editMetaStatus = document.getElementById('edit-meta-status');
const editMetaSpinner = document.getElementById('edit-meta-spinner');
const editMetaStatusMsg = document.getElementById('edit-meta-status-msg');
const editSaveGhBtn = document.getElementById('edit-save-gh-btn');
const editSaveLocalBtn = document.getElementById('edit-save-local-btn');

// ==========================================================
// STATE VARIABLES
// ==========================================================
let currentProcessedImage = null; // Single photo: { file, rawImage, blob, base64, previewUrl, filename, width, height, sizeKb, cropAspect, preset, grain }
let batchQueue = []; // Multi-photo: Array of processed items
let editorTarget = null; // { type: 'single' | 'batch', item: Object | null }
let editorState = {
  originalImg: null,
  cropAspect: 'original',
  preset: 'none',
  grain: 'none'
};
let activePhotoBeingEdited = null; // Photo object currently being edited in edit-metadata-dialog

/**
 * Admin / Owner access control
 * Visitors see only photos. Admin features appear when ?admin is supplied
 * and persist for the active browser session via sessionStorage.
 */
function checkAdminAccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramAdmin = urlParams.has('admin') && urlParams.get('admin') !== 'false' && urlParams.get('admin') !== 'logout';
  const sessionAdmin = sessionStorage.getItem('gallery_admin_active') === '1' || sessionStorage.getItem('gallery_admin_active') === 'true' || localStorage.getItem('gallery_admin_active') === 'true';

  if (urlParams.get('admin') === 'logout') {
    sessionStorage.removeItem('gallery_admin_active');
    localStorage.removeItem('gallery_admin_active');
  } else if (paramAdmin) {
    sessionStorage.setItem('gallery_admin_active', 'true');
    localStorage.setItem('gallery_admin_active', 'true');
  }

  const isAdmin = (paramAdmin || sessionAdmin) && urlParams.get('admin') !== 'logout';

  // Upload Photo is always available to the owner/user
  if (openUploadBtn) openUploadBtn.hidden = false;
  if (footerUploadBtn) footerUploadBtn.hidden = false;

  const lbDeleteBtn = document.getElementById('lb-delete-btn');
  const lbEditBtn = document.getElementById('lb-edit-btn');

  if (isAdmin) {
    document.documentElement.classList.add('admin-mode');
    document.body.classList.add('admin-mode');
    if (lbDeleteBtn) lbDeleteBtn.hidden = false;
    if (lbEditBtn) lbEditBtn.hidden = false;

    // Clean URL without losing session
    if (urlParams.has('admin')) {
      urlParams.delete('admin');
      const remainingQuery = urlParams.toString();
      const cleanUrl = window.location.pathname + (remainingQuery ? '?' + remainingQuery : '') + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);
    }
  } else {
    document.documentElement.classList.remove('admin-mode');
    document.body.classList.remove('admin-mode');
    if (lbDeleteBtn) lbDeleteBtn.hidden = true;
    if (lbEditBtn) lbEditBtn.hidden = true;
  }

  return isAdmin;
}

/**
 * Inline Feedback Banner utility for the Upload Modal
 */
function showInlineFeedback(msg, type = 'info') {
  if (!uploadInlineFeedback) return;
  if (!msg) {
    uploadInlineFeedback.hidden = true;
    uploadInlineFeedback.textContent = '';
    uploadInlineFeedback.className = 'upload-inline-feedback';
    return;
  }
  uploadInlineFeedback.hidden = false;
  uploadInlineFeedback.className = `upload-inline-feedback ${type}`;
  uploadInlineFeedback.textContent = msg;
}

/**
 * Initialize Uploader & Admin Tools
 */
export function initUploader() {
  checkAdminAccess();
  loadSavedGithubSettings();
  setupUploaderEvents();
  setupPhotoEditor();
  setupMetadataEditor();
  setupDeletePhotoFlow();
  setDefaultDate();
}

/**
 * Load saved GitHub configurations from localStorage
 */
function loadSavedGithubSettings() {
  const owner = localStorage.getItem('gh_gallery_owner') || 'uttam5711';
  const repo = localStorage.getItem('gh_gallery_repo') || 'Life-Through-My-Lens';
  const branch = localStorage.getItem('gh_gallery_branch') || 'main';
  const token = localStorage.getItem('gh_gallery_token') || '';

  if (ghOwnerInput) ghOwnerInput.value = owner;
  if (ghRepoInput) ghRepoInput.value = repo;
  if (ghBranchInput) ghBranchInput.value = branch;
  if (ghTokenInput) ghTokenInput.value = token;
  if (ghSheetUrlInput) ghSheetUrlInput.value = localStorage.getItem('gh_gallery_sheet_url') || getGoogleSheetUrl();

  if (ghTargetRepoText) {
    ghTargetRepoText.textContent = `${owner}/${repo}`;
  }

  if (ghTokenTestResult && token) {
    ghTokenTestResult.textContent = 'Token saved ✓';
    ghTokenTestResult.style.color = '#10b981';
  }
}

function saveGithubSettings() {
  const owner = ghOwnerInput ? ghOwnerInput.value.trim() : 'uttam5711';
  const repo = ghRepoInput ? ghRepoInput.value.trim() : 'Life-Through-My-Lens';
  const branch = (ghBranchInput ? ghBranchInput.value.trim() : '') || 'main';
  const token = ghTokenInput ? ghTokenInput.value.trim() : '';
  const sheetUrl = ghSheetUrlInput ? ghSheetUrlInput.value.trim() : '';

  localStorage.setItem('gh_gallery_owner', owner);
  localStorage.setItem('gh_gallery_repo', repo);
  localStorage.setItem('gh_gallery_branch', branch);
  localStorage.setItem('gh_gallery_token', token);
  localStorage.setItem('gh_gallery_sheet_url', sheetUrl);

  if (ghTargetRepoText) {
    ghTargetRepoText.textContent = `${owner}/${repo}`;
  }
}

/**
 * Robust UTF-8 to Base64 and Base64 to UTF-8 using TextEncoder / TextDecoder
 * Eliminates URIError / malformed URI issues with multi-byte unicode (emojis, Gujarati, Hindi, etc.)
 */
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToUtf8(b64) {
  const clean = b64.replace(/\s/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Strip accidental 'Bearer ', 'token ', or quotes from GitHub PAT input
 */
function getSanitizedToken(raw) {
  const val = (raw !== undefined ? raw : (ghTokenInput ? ghTokenInput.value : '')).trim();
  return val.replace(/^(Bearer|token)\s+/i, '').replace(/^["']|["']$/g, '').trim();
}

/**
 * Generate standard GitHub Authorization header value
 */
function getAuthHeader(token) {
  const clean = getSanitizedToken(token);
  return `Bearer ${clean}`;
}

/**
 * Test GitHub Personal Access Token and repository write permissions
 */
async function testGithubConnection() {
  saveGithubSettings();
  const owner = (ghOwnerInput ? ghOwnerInput.value.trim() : '') || 'uttam5711';
  const repo = (ghRepoInput ? ghRepoInput.value.trim() : '') || 'Life-Through-My-Lens';
  const token = getSanitizedToken();

  if (!token) {
    if (ghTokenTestResult) {
      ghTokenTestResult.textContent = '❌ Please enter a GitHub token first';
      ghTokenTestResult.style.color = '#ef4444';
    }
    showInlineFeedback('Please enter your GitHub Personal Access Token in the settings below to test the connection.', 'error');
    if (ghConfigDrawer) ghConfigDrawer.hidden = false;
    if (ghTokenInput) ghTokenInput.focus();
    return;
  }

  if (testGhTokenBtn) {
    testGhTokenBtn.disabled = true;
    testGhTokenBtn.textContent = 'Testing...';
  }
  if (ghTokenTestResult) {
    ghTokenTestResult.textContent = 'Verifying token & repo access...';
    ghTokenTestResult.style.color = 'var(--text-muted)';
  }

  try {
    // 1. Verify token user
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': getAuthHeader(token),
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      if (userRes.status === 401) {
        throw new Error('401 Unauthorized: Invalid or expired GitHub Personal Access Token.');
      }
      throw new Error(`GitHub auth failed (${userRes.status}): ${err.message || userRes.statusText}`);
    }
    const userData = await userRes.json();
    const username = userData.login;

    // 2. Verify repo access & permissions
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': getAuthHeader(token),
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!repoRes.ok) {
      const err = await repoRes.json().catch(() => ({}));
      if (repoRes.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" not found or token lacks 'repo' scope.`);
      }
      throw new Error(`Repository error (${repoRes.status}): ${err.message || repoRes.statusText}`);
    }

    const repoData = await repoRes.json();
    const canPush = repoData.permissions ? repoData.permissions.push : true;

    if (canPush) {
      if (ghTokenTestResult) {
        ghTokenTestResult.textContent = `✓ Connected as @${username} (write access verified)`;
        ghTokenTestResult.style.color = '#10b981';
      }
      showInlineFeedback(`✓ Connected as @${username}! Push permissions confirmed on ${owner}/${repo}.`, 'success');
      showToast(`Connected to GitHub as @${username}!`, 'success');
    } else {
      if (ghTokenTestResult) {
        ghTokenTestResult.textContent = `⚠️ Connected as @${username}, but lacks push/write permissions.`;
        ghTokenTestResult.style.color = '#f59e0b';
      }
      showInlineFeedback(`⚠️ Connected as @${username}, but you do not have write access to ${owner}/${repo}. Check your token permissions.`, 'warning');
    }
  } catch (err) {
    console.error('GitHub connection test failed:', err);
    if (ghTokenTestResult) {
      ghTokenTestResult.textContent = `❌ ${err.message}`;
      ghTokenTestResult.style.color = '#ef4444';
    }
    showInlineFeedback(err.message, 'error');
    showToast(err.message, 'error');
  } finally {
    if (testGhTokenBtn) {
      testGhTokenBtn.disabled = false;
      testGhTokenBtn.textContent = '✓ Test GitHub Token';
    }
  }
}

/**
 * Save photos to browser local storage so they appear immediately in the gallery
 * and persist across page refreshes without needing a GitHub PAT.
 */
function performLocalSave() {
  if (batchQueue.length === 0 && !currentProcessedImage) {
    showInlineFeedback('Please select or drop at least one photo first!', 'error');
    showToast('Please select or drop a photo first!', 'error');
    return;
  }

  if (batchQueue.length > 0) {
    const missingTitle = batchQueue.some(item => !item.title.trim());
    if (missingTitle) {
      showInlineFeedback('Please provide a title for all photos in the batch.', 'error');
      showToast('Please provide a title for all photos in the batch', 'error');
      return;
    }

    const savedPhotos = batchQueue.map(item => {
      const photoObj = buildPhotoObjectFromBatchItem(item);
      photoObj.url = item.previewUrl;
      photoObj.thumbnail = item.previewUrl;
      saveLocalPhoto(photoObj);
      return photoObj;
    });

    state.allPhotos.unshift(...savedPhotos);
    applyFilters();
    closeModal(uploadDialog);
    resetDropzone();
    showToast(`🎉 Saved ${savedPhotos.length} photos to your gallery!`, 'success');
  } else {
    const newPhoto = buildPhotoObject();
    newPhoto.url = currentProcessedImage.previewUrl;
    newPhoto.thumbnail = currentProcessedImage.previewUrl;

    saveLocalPhoto(newPhoto);
    state.allPhotos.unshift(newPhoto);
    applyFilters();
    closeModal(uploadDialog);
    resetDropzone();
    showToast(`🎉 "${newPhoto.title}" saved to your gallery!`, 'success');
  }
}

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  if (photoDateInput && !photoDateInput.value) {
    photoDateInput.value = today;
  }
  if (batchGlobalDate && !batchGlobalDate.value) {
    batchGlobalDate.value = today;
  }
}

/**
 * Setup Event Listeners
 */
function setupUploaderEvents() {
  // Modal open (Admin only)
  if (openUploadBtn) {
    openUploadBtn.addEventListener('click', () => {
      openModal(uploadDialog);
    });
  }
  if (footerUploadBtn) {
    footerUploadBtn.addEventListener('click', () => {
      openModal(uploadDialog);
    });
  }

  // Modal close
  if (closeUploadBtn) closeUploadBtn.addEventListener('click', () => closeModal(uploadDialog));
  if (cancelUploadBtn) cancelUploadBtn.addEventListener('click', () => closeModal(uploadDialog));
  if (closeLocalBtn) closeLocalBtn.addEventListener('click', () => closeModal(uploadDialog));

  // Backdrop click to close modals with modern guidance bounding rect fallback
  if (uploadDialog && !('closedBy' in HTMLDialogElement.prototype)) {
    uploadDialog.addEventListener('click', (e) => {
      if (e.target !== uploadDialog) return;
      const rect = uploadDialog.getBoundingClientRect();
      const isInside = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInside) closeModal(uploadDialog);
    });
  }
  if (tokenGuideDialog && !('closedBy' in HTMLDialogElement.prototype)) {
    tokenGuideDialog.addEventListener('click', (e) => {
      if (e.target !== tokenGuideDialog) return;
      const rect = tokenGuideDialog.getBoundingClientRect();
      const isInside = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInside) closeModal(tokenGuideDialog);
    });
  }

  // Token guide dialog
  if (tokenHelpLink) tokenHelpLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(tokenGuideDialog);
  });
  if (closeTokenGuideBtn) closeTokenGuideBtn.addEventListener('click', () => closeModal(tokenGuideDialog));
  if (guideUnderstoodBtn) guideUnderstoodBtn.addEventListener('click', () => closeModal(tokenGuideDialog));

  // Tab switching (GitHub vs Local Gallery)
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.tab;
      showInlineFeedback(''); // Clear any stale message
      if (target === 'github-tab') {
        if (githubTabContent) githubTabContent.hidden = false;
        if (localTabContent) localTabContent.hidden = true;
        if (githubSubmitBtn) githubSubmitBtn.hidden = false;
        if (saveLocalBtn) saveLocalBtn.hidden = false;
        if (closeLocalBtn) closeLocalBtn.hidden = true;
      } else {
        if (githubTabContent) githubTabContent.hidden = true;
        if (localTabContent) localTabContent.hidden = false;
        if (githubSubmitBtn) githubSubmitBtn.hidden = true;
        if (saveLocalBtn) saveLocalBtn.hidden = false;
        if (closeLocalBtn) closeLocalBtn.hidden = false;
        updateJsonSnippetPreview();
      }
    });
  });

  // Toggle GitHub Settings Drawer
  if (toggleGhConfigBtn && ghConfigDrawer) {
    toggleGhConfigBtn.addEventListener('click', () => {
      ghConfigDrawer.hidden = !ghConfigDrawer.hidden;
      toggleGhConfigBtn.textContent = ghConfigDrawer.hidden ? '⚙️ Settings & Token' : '▲ Close Settings';
    });
  }

  // Test GitHub Connection Button
  if (testGhTokenBtn) {
    testGhTokenBtn.addEventListener('click', testGithubConnection);
  }

  // Save to Local Gallery Button
  if (saveLocalBtn) {
    saveLocalBtn.addEventListener('click', performLocalSave);
  }

  // Custom Category Toggle
  if (photoCategorySelect) {
    photoCategorySelect.addEventListener('change', () => {
      if (photoCategorySelect.value === '__custom__') {
        customCategoryGroup.hidden = false;
        customCategoryInput.focus();
      } else {
        customCategoryGroup.hidden = true;
      }
      updateJsonSnippetPreview();
    });
  }

  // File Drop & Select (Supports 1 to 10 files)
  if (dropzone) {
    // Explicit click on dropzone triggers system file dialog
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#demo-batch-btn, #single-crop-btn, #remove-file-btn, button, a')) {
        return;
      }
      if (fileInput) fileInput.click();
    });

    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (fileInput) fileInput.click();
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(Array.from(e.dataTransfer.files));
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesSelected(Array.from(e.target.files));
      }
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetDropzone();
    });
  }

  // Demo Batch button for quick testing
  const demoBatchBtn = document.getElementById('demo-batch-btn');
  if (demoBatchBtn) {
    demoBatchBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await loadDemoBatch();
    });
  }

  // Single photo crop trigger button
  if (singleCropBtn) {
    singleCropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentProcessedImage) return;
      openPhotoEditor({
        type: 'single',
        item: currentProcessedImage
      });
    });
  }

  // Batch bulk settings drawer toggle
  if (batchToggleGlobalBtn && batchGlobalDrawer) {
    batchToggleGlobalBtn.addEventListener('click', () => {
      batchGlobalDrawer.hidden = !batchGlobalDrawer.hidden;
    });
  }

  // Batch bulk settings apply button
  if (batchApplyGlobalBtn) {
    batchApplyGlobalBtn.addEventListener('click', applyBatchGlobalSettings);
  }

  // Token visibility toggle
  if (toggleTokenBtn && ghTokenInput) {
    toggleTokenBtn.addEventListener('click', () => {
      if (ghTokenInput.type === 'password') {
        ghTokenInput.type = 'text';
        toggleTokenBtn.textContent = 'Hide';
      } else {
        ghTokenInput.type = 'password';
        toggleTokenBtn.textContent = 'Show';
      }
    });
  }

  // Test Google Sheet connection
  if (testSheetBtn) {
    testSheetBtn.addEventListener('click', testGoogleSheetConnection);
  }

  // Form input changes update JSON preview
  [photoTitleInput, photoCategorySelect, customCategoryInput, photoDateInput, photoLocationInput, photoCameraInput, photoDescInput, photoTagsInput].forEach(el => {
    if (el) el.addEventListener('input', updateJsonSnippetPreview);
  });

  // Local export actions
  if (downloadPhotoFileBtn) {
    downloadPhotoFileBtn.addEventListener('click', () => {
      if (batchQueue.length > 0) {
        batchQueue.forEach((item, i) => {
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(item.blob);
            a.download = item.filename;
            a.click();
          }, i * 200);
        });
        showToast(`Downloading ${batchQueue.length} photos...`, 'success');
      } else if (currentProcessedImage) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(currentProcessedImage.blob);
        a.download = currentProcessedImage.filename;
        a.click();
        showToast(`Downloaded ${currentProcessedImage.filename}`, 'success');
      }
    });
  }

  if (downloadJsonFileBtn) {
    downloadJsonFileBtn.addEventListener('click', () => {
      let updatedCatalog;
      if (batchQueue.length > 0) {
        const newEntries = batchQueue.map(item => buildPhotoObjectFromBatchItem(item));
        updatedCatalog = [...newEntries, ...state.allPhotos];
      } else {
        const newEntry = buildPhotoObject();
        updatedCatalog = [newEntry, ...state.allPhotos];
      }
      const blob = new Blob([JSON.stringify(updatedCatalog, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'photos.json';
      a.click();
      showToast('Downloaded updated photos.json', 'success');
    });
  }

  if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', () => {
      const code = jsonSnippetPreview ? jsonSnippetPreview.textContent : '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
        showToast('JSON entry copied to clipboard!', 'success');
      }
    });
  }

  // Form submission (GitHub Upload)
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (batchQueue.length === 0 && !currentProcessedImage) {
        showInlineFeedback('Please select or drop at least one photo first!', 'error');
        showToast('Please select or drop a photo first!', 'error');
        return;
      }

      saveGithubSettings();

      const owner = ghOwnerInput ? ghOwnerInput.value.trim() : '';
      const repo = ghRepoInput ? ghRepoInput.value.trim() : '';
      const branch = (ghBranchInput ? ghBranchInput.value.trim() : '') || 'main';
      const token = getSanitizedToken();

      if (!owner || !repo || !token) {
        showInlineFeedback('Please enter your GitHub Username, Repository, and Token to commit to GitHub. Or click the "Local Gallery" tab to save locally without a token!', 'error');
        showToast('GitHub token required for cloud sync', 'error');
        if (ghConfigDrawer) ghConfigDrawer.hidden = false;
        if (ghTokenInput && !token) ghTokenInput.focus();
        return;
      }

      if (batchQueue.length > 0) {
        const missingTitle = batchQueue.some(item => !item.title.trim());
        if (missingTitle) {
          showInlineFeedback('Please provide a title for all photos in the batch queue.', 'error');
          showToast('Please provide a title for all photos in the batch', 'error');
          return;
        }
        await performBatchGitHubUpload(owner, repo, branch, token);
      } else {
        await performSingleGitHubUpload(owner, repo, branch, token);
      }
    });
  }
}

// ==========================================================
// FILE SELECTION & BATCH QUEUE
// ==========================================================

/**
 * Generate 3 synthetic demo photos to easily test and demonstrate the Batch Queue
 */
async function loadDemoBatch() {
  showToast('Creating 3 demo photos for batch upload...', 'info');

  const configs = [
    { title: 'Golden Sunset at Girnar', color1: '#f97316', color2: '#7c2d12', loc: 'Junagadh', cat: 'Nature & Outdoors' },
    { title: 'Riverfront Twilight Reflections', color1: '#0284c7', color2: '#0f172a', loc: 'Ahmedabad', cat: 'Street & City' },
    { title: 'Portrait under Palm Shade', color1: '#10b981', color2: '#064e3b', loc: 'Junagadh', cat: 'Portraits' }
  ];

  const files = await Promise.all(configs.map(async (cfg, idx) => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 800;
    const ctx = c.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, cfg.color1);
    grad.addColorStop(1, cfg.color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Subtle center highlight
    const rad = ctx.createRadialGradient(600, 400, 100, 600, 400, 650);
    rad.addColorStop(0, 'rgba(255,255,255,0.25)');
    rad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 1200, 800);

    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 12;
    ctx.fillText(cfg.title, 600, 410);

    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.88));
    return new File([blob], `demo-photo-${idx + 1}.jpg`, { type: 'image/jpeg' });
  }));

  await handleFilesSelected(files);
}
window.loadDemoBatch = loadDemoBatch;

/**
 * Check if file is HEIC or HEIF format (commonly from iPhones)
 */
function isHeifFile(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') ||
         (file.type && (file.type.includes('heic') || file.type.includes('heif')));
}

/**
 * Check if file is any supported image format (including HEIF/HEIC)
 */
function isSupportedImageFile(file) {
  if (!file) return false;
  if (file.type && (file.type.startsWith('image/') || file.type.includes('heic') || file.type.includes('heif'))) {
    return true;
  }
  const name = (file.name || '').toLowerCase();
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(name);
}

/**
 * Dynamically load heic2any library if not present
 */
function loadHeicLibrary() {
  return new Promise((resolve) => {
    if (typeof window.heic2any === 'function') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn('Failed to load heic2any library from CDN');
      resolve();
    };
    document.head.appendChild(script);
  });
}

/**
 * Check if current browser can decode HEIC natively (e.g. Safari on macOS / iOS)
 */
function canDecodeNatively(file) {
  return new Promise((resolve) => {
    if ('createImageBitmap' in window) {
      createImageBitmap(file)
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } else {
      resolve(false);
    }
  });
}

/**
 * Ensure HEIF/HEIC files are converted to high-quality JPEG for canvas processing & cross-device compatibility
 */
async function ensureJpegIfHeif(file) {
  if (!isHeifFile(file)) return file;

  // If browser can natively decode HEIC, no conversion required
  const nativeOk = await canDecodeNatively(file);
  if (nativeOk) {
    return file;
  }

  showToast(`📱 Converting iPhone HEIF/HEIC (${file.name}) to high-res JPEG...`, 'info');

  if (typeof window.heic2any !== 'function') {
    await loadHeicLibrary();
  }

  if (typeof window.heic2any === 'function') {
    try {
      const convertedBlob = await window.heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92
      });
      const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const cleanName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([finalBlob], cleanName, { type: 'image/jpeg' });
    } catch (err) {
      console.warn('heic2any conversion fallback:', err);
      return file;
    }
  }

  return file;
}

/**
 * Handle chosen file(s) - switches between single and batch modes
 */
async function handleFilesSelected(fileList) {
  const imageFiles = fileList.filter(f => isSupportedImageFile(f));

  if (imageFiles.length === 0) {
    showToast('Please select valid image files (JPG, PNG, WebP, HEIC/HEIF)', 'error');
    return;
  }

  if (imageFiles.length > 10) {
    showToast('Batch limit: Processing the first 10 photos', 'info');
  }
  const targetFiles = imageFiles.slice(0, 10);

  if (targetFiles.length === 1) {
    // Single Photo Mode
    batchQueue = [];
    if (batchUploadSection) batchUploadSection.hidden = true;
    if (singleUploadSection) singleUploadSection.hidden = false;
    await processSingleFile(targetFiles[0]);
  } else {
    // Multi-Photo Batch Mode
    currentProcessedImage = null;
    if (singleUploadSection) singleUploadSection.hidden = true;
    if (batchUploadSection) batchUploadSection.hidden = false;
    await processBatchFiles(targetFiles);
  }
}

/**
 * Process a single image file (with HEIF auto-conversion)
 */
async function processSingleFile(file) {
  let targetFile = file;
  if (isHeifFile(file)) {
    targetFile = await ensureJpegIfHeif(file);
  }

  showToast('Optimizing photo...', 'success');

  try {
    const compressed = await compressImage(targetFile, 1920, 0.85);
    currentProcessedImage = compressed;

    // Show preview
    previewImg.src = compressed.previewUrl;
    previewInfo.textContent = `${compressed.width} × ${compressed.height} • ${compressed.sizeKb} KB (optimized)`;
    dropzoneEmpty.hidden = true;
    dropzonePreview.hidden = false;

    // Default title if empty
    if (!photoTitleInput.value) {
      const cleanName = targetFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      photoTitleInput.value = capitalizeWords(cleanName);
    }

    if (downloadPhotoFileBtn) downloadPhotoFileBtn.disabled = false;
    if (downloadJsonFileBtn) downloadJsonFileBtn.disabled = false;
    updateJsonSnippetPreview();
  } catch (error) {
    console.error('Image processing failed:', error);
    showToast('Could not process this image file', 'error');
  }
}

/**
 * Process multiple image files into batchQueue (with HEIF auto-conversion)
 */
async function processBatchFiles(files) {
  showToast(`Optimizing batch of ${files.length} photos...`, 'success');
  batchQueue = [];

  const defaultDate = photoDateInput ? photoDateInput.value : new Date().toISOString().split('T')[0];
  const defaultCategory = photoCategorySelect ? photoCategorySelect.value : 'Random Clicks';
  const resolvedCategory = defaultCategory === '__custom__' ? (customCategoryInput.value.trim() || 'Random Clicks') : defaultCategory;

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (isHeifFile(file)) {
      file = await ensureJpegIfHeif(file);
    }

    try {
      const compressed = await compressImage(file, 1920, 0.85);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      batchQueue.push({
        id: `batch-${Date.now()}-${i}`,
        file: file,
        rawImage: compressed.rawImage,
        blob: compressed.blob,
        base64: compressed.base64,
        previewUrl: compressed.previewUrl,
        filename: compressed.filename,
        width: compressed.width,
        height: compressed.height,
        sizeKb: compressed.sizeKb,
        title: capitalizeWords(cleanName),
        category: resolvedCategory,
        date: defaultDate,
        location: photoLocationInput ? photoLocationInput.value.trim() : '',
        camera: photoCameraInput ? photoCameraInput.value.trim() : '',
        desc: '',
        tags: ['photo'],
        cropAspect: 'original',
        preset: 'none',
        grain: 'none'
      });
    } catch (err) {
      console.warn('Failed to compress one batch file:', file.name, err);
    }
  }

  // Update dropzone UI
  if (batchQueue.length > 0) {
    previewImg.src = batchQueue[0].previewUrl;
    previewInfo.textContent = `Batch of ${batchQueue.length} photos ready for review`;
    dropzoneEmpty.hidden = true;
    dropzonePreview.hidden = false;
    renderBatchQueue();
    if (downloadPhotoFileBtn) downloadPhotoFileBtn.disabled = false;
    if (downloadJsonFileBtn) downloadJsonFileBtn.disabled = false;
    updateJsonSnippetPreview();
    showToast(`Loaded ${batchQueue.length} photos into the batch queue!`, 'success');
  } else {
    resetDropzone();
  }
}

/**
 * Render dynamic Batch Queue item cards
 */
function renderBatchQueue() {
  if (!batchItemsList) return;
  batchItemsList.innerHTML = '';

  if (batchCountBadge) {
    batchCountBadge.textContent = `${batchQueue.length} Photo${batchQueue.length === 1 ? '' : 's'}`;
  }

  if (batchQueue.length === 0) {
    resetDropzone();
    return;
  }

  batchQueue.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'batch-item-card';
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="batch-thumb-wrap">
        <img class="batch-thumb-img" src="${item.previewUrl}" alt="${escapeHtml(item.title)}">
        <span class="batch-thumb-badge">${item.width}×${item.height} • ${item.sizeKb}KB</span>
        <button type="button" class="batch-crop-btn" data-index="${idx}" title="Open Crop & Film Presets">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>
          <span>🎨 Crop / Filter</span>
        </button>
      </div>

      <div class="batch-fields-wrap">
        <div class="batch-fields-row">
          <div class="form-group flex-2">
            <label>Title <span class="required">*</span></label>
            <input type="text" class="batch-input-title" value="${escapeHtml(item.title)}" placeholder="Photo title" required>
          </div>
          <div class="form-group flex-1">
            <label>Category</label>
            <select class="batch-select-category">
              <option value="Random Clicks" ${item.category === 'Random Clicks' ? 'selected' : ''}>Random Clicks</option>
              <option value="Personal & Moments" ${item.category === 'Personal & Moments' ? 'selected' : ''}>Personal & Moments</option>
              <option value="Street & City" ${item.category === 'Street & City' ? 'selected' : ''}>Street & City</option>
              <option value="Nature & Outdoors" ${item.category === 'Nature & Outdoors' ? 'selected' : ''}>Nature & Outdoors</option>
              <option value="Portraits" ${item.category === 'Portraits' ? 'selected' : ''}>Portraits</option>
            </select>
          </div>
        </div>

        <div class="batch-fields-row">
          <div class="form-group flex-1">
            <label>Date</label>
            <input type="date" class="batch-input-date" value="${item.date}">
          </div>
          <div class="form-group flex-1">
            <label>Location</label>
            <input type="text" class="batch-input-location" value="${escapeHtml(item.location || '')}" placeholder="e.g. Junagadh or GPS">
          </div>
          <div class="form-group flex-1">
            <label>Camera</label>
            <input type="text" class="batch-input-camera" value="${escapeHtml(item.camera || '')}" placeholder="e.g. iPhone 16">
          </div>
        </div>

        <div class="batch-fields-row">
          <div class="form-group flex-2">
            <label>Tags</label>
            <input type="text" class="batch-input-tags" value="${escapeHtml(item.tags.join(', '))}" placeholder="tags separated by comma">
          </div>
          <div class="form-group flex-2">
            <label>Caption</label>
            <input type="text" class="batch-input-desc" value="${escapeHtml(item.desc || '')}" placeholder="Short memory or story">
          </div>
        </div>
      </div>

      <button type="button" class="batch-item-remove-btn" data-index="${idx}" title="Remove this photo from queue">&times;</button>
    `;

    // Wire up live field synchronization
    const titleInput = card.querySelector('.batch-input-title');
    const categorySelect = card.querySelector('.batch-select-category');
    const dateInput = card.querySelector('.batch-input-date');
    const locationInput = card.querySelector('.batch-input-location');
    const cameraInput = card.querySelector('.batch-input-camera');
    const tagsInput = card.querySelector('.batch-input-tags');
    const descInput = card.querySelector('.batch-input-desc');

    titleInput.addEventListener('input', () => {
      item.title = titleInput.value;
      updateJsonSnippetPreview();
    });
    categorySelect.addEventListener('change', () => {
      item.category = categorySelect.value;
      updateJsonSnippetPreview();
    });
    dateInput.addEventListener('change', () => {
      item.date = dateInput.value;
      updateJsonSnippetPreview();
    });
    locationInput.addEventListener('input', () => {
      item.location = locationInput.value;
      updateJsonSnippetPreview();
    });
    cameraInput.addEventListener('input', () => {
      item.camera = cameraInput.value;
      updateJsonSnippetPreview();
    });
    tagsInput.addEventListener('input', () => {
      item.tags = tagsInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      updateJsonSnippetPreview();
    });
    descInput.addEventListener('input', () => {
      item.desc = descInput.value;
      updateJsonSnippetPreview();
    });

    // Wire Crop button for this specific item
    const cropBtn = card.querySelector('.batch-crop-btn');
    cropBtn.addEventListener('click', () => {
      openPhotoEditor({
        type: 'batch',
        item: item,
        cardElement: card
      });
    });

    // Wire Remove button
    const removeBtn = card.querySelector('.batch-item-remove-btn');
    removeBtn.addEventListener('click', () => {
      batchQueue.splice(idx, 1);
      renderBatchQueue();
      updateJsonSnippetPreview();
      showToast('Photo removed from batch', 'info');
    });

    batchItemsList.appendChild(card);
  });
}

/**
 * Apply quick bulk settings across all batch items
 */
function applyBatchGlobalSettings() {
  const cat = batchGlobalCategory ? batchGlobalCategory.value : '';
  const date = batchGlobalDate ? batchGlobalDate.value : '';
  const loc = batchGlobalLocation ? batchGlobalLocation.value.trim() : '';
  const cam = batchGlobalCamera ? batchGlobalCamera.value.trim() : '';

  let appliedCount = 0;
  batchQueue.forEach(item => {
    if (cat) item.category = cat;
    if (date) item.date = date;
    if (loc) item.location = loc;
    if (cam) item.camera = cam;
    appliedCount++;
  });

  renderBatchQueue();
  updateJsonSnippetPreview();
  if (batchGlobalDrawer) batchGlobalDrawer.hidden = true;
  showToast(`Applied bulk settings to ${appliedCount} photos!`, 'success');
}

/**
 * Reset Dropzone back to empty initial state
 */
function resetDropzone() {
  currentProcessedImage = null;
  batchQueue = [];
  if (fileInput) fileInput.value = '';
  if (dropzoneEmpty) dropzoneEmpty.hidden = false;
  if (dropzonePreview) dropzonePreview.hidden = true;
  if (previewImg) previewImg.src = '';
  if (batchUploadSection) batchUploadSection.hidden = true;
  if (singleUploadSection) singleUploadSection.hidden = false;
  if (downloadPhotoFileBtn) downloadPhotoFileBtn.disabled = true;
  if (downloadJsonFileBtn) downloadJsonFileBtn.disabled = true;
  updateJsonSnippetPreview();
}

/**
 * Compress an image file using an HTML5 Canvas and retain rawImage
 * Default max dimension 1600 and quality 0.82 ensures photos stay well below GitHub's 1MB API limit
 */
function compressImage(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Data = dataUrl.split(',')[1];

        canvas.toBlob((blob) => {
          const sizeKb = Math.round(blob.size / 1024);
          const timestamp = Date.now();
          const cleanBase = file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
          const filename = `photo-${cleanBase}-${timestamp}.jpg`;

          resolve({
            file,
            rawImage: img,
            blob,
            base64: base64Data,
            previewUrl: dataUrl,
            filename,
            width,
            height,
            sizeKb,
            cropAspect: 'original',
            preset: 'none',
            grain: 'none'
          });
        }, 'image/jpeg', quality);
      };
      img.onerror = async (err) => {
        if (isHeifFile(file)) {
          try {
            const converted = await ensureJpegIfHeif(file);
            if (converted !== file) {
              const res = await compressImage(converted, maxDimension, quality);
              resolve(res);
              return;
            }
          } catch (e2) {
            console.error('HEIF rescue conversion error:', e2);
          }
        }
        reject(err);
      };
    };
    reader.onerror = reject;
  });
}

// ==========================================================
// PHOTO STUDIO & FILM PRESETS CONTROLLER
// ==========================================================

function setupPhotoEditor() {
  if (!photoEditorDialog) return;

  if (closeEditorBtn) closeEditorBtn.addEventListener('click', () => closeModal(photoEditorDialog));
  if (editorCancelBtn) editorCancelBtn.addEventListener('click', () => closeModal(photoEditorDialog));

  // Reset button
  if (editorResetBtn) {
    editorResetBtn.addEventListener('click', () => {
      editorState.cropAspect = 'original';
      editorState.preset = 'none';
      editorState.grain = 'none';
      syncEditorControlPills();
      renderEditorCanvas();
    });
  }

  // Aspect Ratio Buttons
  aspectButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      aspectButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editorState.cropAspect = btn.dataset.aspect || 'original';
      renderEditorCanvas();
    });
  });

  // Film Preset Pills
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      editorState.preset = pill.dataset.preset || 'none';
      renderEditorCanvas();
    });
  });

  // Grain Buttons
  grainButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      grainButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editorState.grain = btn.dataset.grain || 'none';
      renderEditorCanvas();
    });
  });

  // Apply Changes Button
  if (editorApplyBtn) {
    editorApplyBtn.addEventListener('click', applyEditorChanges);
  }
}

/**
 * Open the Photo Studio modal for a specific target (single or batch item)
 */
function openPhotoEditor(target) {
  editorTarget = target;
  const item = target.item;
  if (!item) return;

  // Ensure we have an HTMLImageElement
  if (item.rawImage) {
    editorState.originalImg = item.rawImage;
    initEditorStage(item);
  } else {
    const img = new Image();
    img.src = item.previewUrl;
    img.onload = () => {
      editorState.originalImg = img;
      initEditorStage(item);
    };
  }
}

function initEditorStage(item) {
  editorState.cropAspect = item.cropAspect || 'original';
  editorState.preset = item.preset || 'none';
  editorState.grain = item.grain || 'none';

  syncEditorControlPills();
  renderEditorCanvas();
  openModal(photoEditorDialog);
}

function syncEditorControlPills() {
  aspectButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.aspect === editorState.cropAspect);
  });
  presetPills.forEach(pill => {
    pill.classList.toggle('active', pill.dataset.preset === editorState.preset);
  });
  grainButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.grain === editorState.grain);
  });
}

/**
 * Calculate crop rect (sx, sy, sw, sh) based on aspect ratio
 */
function getCropRect(sourceW, sourceH, aspect) {
  if (aspect === 'original') {
    return { sx: 0, sy: 0, sw: sourceW, sh: sourceH };
  }

  let targetRatio;
  if (aspect === '1:1') targetRatio = 1.0;
  else if (aspect === '4:5') targetRatio = 4 / 5;
  else if (aspect === '16:9') targetRatio = 16 / 9;
  else if (aspect === '3:2') targetRatio = 3 / 2;
  else targetRatio = sourceW / sourceH;

  const currentRatio = sourceW / sourceH;
  let sw, sh, sx, sy;

  if (currentRatio > targetRatio) {
    // Current is wider than target: crop sides
    sw = Math.round(sourceH * targetRatio);
    sh = sourceH;
    sx = Math.round((sourceW - sw) / 2);
    sy = 0;
  } else {
    // Current is taller than target: crop top/bottom
    sw = sourceW;
    sh = Math.round(sourceW / targetRatio);
    sx = 0;
    sy = Math.round((sourceH - sh) / 2);
  }

  return { sx, sy, sw, sh };
}

/**
 * Get CSS filter string for a given preset
 */
function getPresetFilter(preset) {
  switch (preset) {
    case 'vintage': // Kodak Portra
      return 'sepia(0.22) saturate(1.18) contrast(1.05) brightness(1.02)';
    case 'noir': // Leica Noir B&W
      return 'grayscale(1) contrast(1.35) brightness(0.96)';
    case 'golden': // Golden Hour
      return 'sepia(0.35) saturate(1.3) hue-rotate(-10deg) contrast(1.08)';
    case 'muted': // Moody Cinema
      return 'contrast(1.12) saturate(0.82) brightness(0.95) hue-rotate(5deg)';
    case 'vivid': // Fuji Velvia
      return 'saturate(1.42) contrast(1.15) brightness(1.02)';
    case 'none':
    default:
      return 'none';
  }
}

/**
 * Render the interactive editor preview canvas
 */
function renderEditorCanvas() {
  if (!editorCanvas || !editorState.originalImg) return;
  const img = editorState.originalImg;
  const ctx = editorCanvas.getContext('2d');

  const { sx, sy, sw, sh } = getCropRect(img.naturalWidth || img.width, img.naturalHeight || img.height, editorState.cropAspect);

  // Set preview canvas dimensions (max 900px wide for crisp smooth interactive rendering)
  const maxDisplayW = 900;
  let dw = sw;
  let dh = sh;
  if (dw > maxDisplayW) {
    dh = Math.round((dh * maxDisplayW) / dw);
    dw = maxDisplayW;
  }

  editorCanvas.width = dw;
  editorCanvas.height = dh;

  // Clear
  ctx.clearRect(0, 0, dw, dh);

  // Apply color preset filter
  ctx.filter = getPresetFilter(editorState.preset);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  ctx.filter = 'none';

  // Apply 35mm grain overlay if requested
  if (editorState.grain !== 'none') {
    applyGrainOverlay(ctx, dw, dh, editorState.grain);
  }

  // Update dimension label
  if (aspectDimensions) {
    aspectDimensions.textContent = `${sw} × ${sh} • ${editorState.cropAspect}`;
  }
}

/**
 * Procedurally render authentic analog 35mm film grain
 */
function applyGrainOverlay(ctx, width, height, grainLevel) {
  const noiseCanvas = document.createElement('canvas');
  const noiseW = Math.min(256, width);
  const noiseH = Math.min(256, height);
  noiseCanvas.width = noiseW;
  noiseCanvas.height = noiseH;
  const nCtx = noiseCanvas.getContext('2d');

  const imgData = nCtx.createImageData(noiseW, noiseH);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const val = (Math.random() * 255) | 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  nCtx.putImageData(imgData, 0, 0);

  // Blend onto main canvas
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grainLevel === 'subtle' ? 0.11 : 0.22;
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Apply Photo Studio edits, generate high-res JPEG, and update target item state
 */
function applyEditorChanges() {
  if (!editorTarget || !editorState.originalImg) return;
  const img = editorState.originalImg;
  const { sx, sy, sw, sh } = getCropRect(img.naturalWidth || img.width, img.naturalHeight || img.height, editorState.cropAspect);

  // Full-resolution export canvas (capped at 1600 max dimension for optimal performance & GitHub size limit)
  const maxDim = 1600;
  let outW = sw;
  let outH = sh;
  if (outW > maxDim || outH > maxDim) {
    if (outW > outH) {
      outH = Math.round((outH * maxDim) / outW);
      outW = maxDim;
    } else {
      outW = Math.round((outW * maxDim) / outH);
      outH = maxDim;
    }
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = outW;
  exportCanvas.height = outH;
  const exportCtx = exportCanvas.getContext('2d');

  // Draw filtered image
  exportCtx.filter = getPresetFilter(editorState.preset);
  exportCtx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  exportCtx.filter = 'none';

  // Draw grain
  if (editorState.grain !== 'none') {
    applyGrainOverlay(exportCtx, outW, outH, editorState.grain);
  }

  const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.82);
  const base64 = dataUrl.split(',')[1];

  exportCanvas.toBlob((blob) => {
    const sizeKb = Math.round(blob.size / 1024);

    if (editorTarget.type === 'single') {
      currentProcessedImage.blob = blob;
      currentProcessedImage.base64 = base64;
      currentProcessedImage.previewUrl = dataUrl;
      currentProcessedImage.width = outW;
      currentProcessedImage.height = outH;
      currentProcessedImage.sizeKb = sizeKb;
      currentProcessedImage.cropAspect = editorState.cropAspect;
      currentProcessedImage.preset = editorState.preset;
      currentProcessedImage.grain = editorState.grain;

      previewImg.src = dataUrl;
      previewInfo.textContent = `${outW} × ${outH} • ${sizeKb} KB (edited)`;
      updateJsonSnippetPreview();
    } else if (editorTarget.type === 'batch') {
      const item = editorTarget.item;
      item.blob = blob;
      item.base64 = base64;
      item.previewUrl = dataUrl;
      item.width = outW;
      item.height = outH;
      item.sizeKb = sizeKb;
      item.cropAspect = editorState.cropAspect;
      item.preset = editorState.preset;
      item.grain = editorState.grain;

      // Update thumbnail and badge in the batch card
      if (editorTarget.cardElement) {
        const thumbImg = editorTarget.cardElement.querySelector('.batch-thumb-img');
        const badge = editorTarget.cardElement.querySelector('.batch-thumb-badge');
        if (thumbImg) thumbImg.src = dataUrl;
        if (badge) badge.textContent = `${outW}×${outH} • ${sizeKb}KB`;
      }
      updateJsonSnippetPreview();
    }

    closeModal(photoEditorDialog);
    showToast('✨ Crop & film preset applied!', 'success');
  }, 'image/jpeg', 0.88);
}

// ==========================================================
// IN-PLACE METADATA EDITOR CONTROLLER (ADMIN ONLY)
// ==========================================================

function setupMetadataEditor() {
  if (!editMetadataDialog) return;

  if (closeEditDialogBtn) closeEditDialogBtn.addEventListener('click', () => closeModal(editMetadataDialog));
  if (cancelEditDialogBtn) cancelEditDialogBtn.addEventListener('click', () => closeModal(editMetadataDialog));

  // Custom Category Toggle
  if (editPhotoCategory) {
    editPhotoCategory.addEventListener('change', () => {
      if (editPhotoCategory.value === '__custom__') {
        if (editCustomCategoryGroup) editCustomCategoryGroup.hidden = false;
        if (editCustomCategory) editCustomCategory.focus();
      } else {
        if (editCustomCategoryGroup) editCustomCategoryGroup.hidden = true;
      }
    });
  }

  // Listen for requestphotoedit event from cards or lightbox
  window.addEventListener('requestphotoedit', (e) => {
    const photo = e.detail?.photo;
    if (!photo) return;
    openMetadataEditor(photo);
  });

  // Save Locally button
  if (editSaveLocalBtn) {
    editSaveLocalBtn.addEventListener('click', () => {
      saveMetadataLocally();
    });
  }

  // Submit to GitHub button
  if (editMetadataForm) {
    editMetadataForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveMetadataToGitHub();
    });
  }
}

/**
 * Open the In-Place Metadata Editor modal for a photo
 */
function openMetadataEditor(photo) {
  activePhotoBeingEdited = photo;

  if (editPhotoId) editPhotoId.value = photo.id || '';
  if (editPhotoUrl) editPhotoUrl.value = photo.url || '';
  if (editPreviewThumb) editPreviewThumb.src = photo.thumbnail || photo.url || '';
  if (editPhotoIdDisplay) editPhotoIdDisplay.textContent = photo.id || photo.url || '';
  if (editPhotoTitle) editPhotoTitle.value = photo.title || '';

  // Select category
  const knownCategories = ['Random Clicks', 'Personal & Moments', 'Street & City', 'Nature & Outdoors', 'Portraits'];
  if (knownCategories.includes(photo.category)) {
    editPhotoCategory.value = photo.category;
    if (editCustomCategoryGroup) editCustomCategoryGroup.hidden = true;
  } else {
    editPhotoCategory.value = '__custom__';
    if (editCustomCategoryGroup) editCustomCategoryGroup.hidden = false;
    if (editCustomCategory) editCustomCategory.value = photo.category || '';
  }

  if (editPhotoDate) editPhotoDate.value = photo.date || '';
  if (editPhotoLocation) editPhotoLocation.value = photo.location || '';
  if (editPhotoCamera) editPhotoCamera.value = photo.camera || '';
  if (editPhotoDesc) editPhotoDesc.value = photo.description || '';
  if (editPhotoTags) {
    editPhotoTags.value = Array.isArray(photo.tags) ? photo.tags.join(', ') : (photo.tags || '');
  }

  if (editMetaStatus) editMetaStatus.hidden = true;
  if (editSaveGhBtn) editSaveGhBtn.disabled = false;

  openModal(editMetadataDialog);
}

/**
 * Extract updated metadata from form
 */
function getUpdatedMetadataFromForm() {
  let category = editPhotoCategory.value;
  if (category === '__custom__') {
    category = editCustomCategory ? editCustomCategory.value.trim() : 'Random Clicks';
  }

  const tags = (editPhotoTags.value || '')
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  return {
    id: editPhotoId.value,
    url: editPhotoUrl.value,
    title: editPhotoTitle.value.trim() || 'Untitled Photo',
    category: category || 'Random Clicks',
    date: editPhotoDate.value || '',
    location: editPhotoLocation.value.trim(),
    camera: editPhotoCamera.value.trim(),
    description: editPhotoDesc.value.trim(),
    tags: tags.length ? tags : ['photo']
  };
}

/**
 * Save metadata edits locally and trigger photos.json download
 */
function saveMetadataLocally() {
  if (!activePhotoBeingEdited) return;
  const updated = getUpdatedMetadataFromForm();

  // Update in-memory state
  const target = state.allPhotos.find(p => p.id === activePhotoBeingEdited.id || p.url === activePhotoBeingEdited.url);
  if (target) {
    Object.assign(target, updated);
  }

  // Trigger JSON download
  const blob = new Blob([JSON.stringify(state.allPhotos, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'photos.json';
  a.click();

  applyFilters();
  updateLightboxView();
  closeModal(editMetadataDialog);
  showToast('💾 Photo details updated locally & photos.json downloaded!', 'success');
}

/**
 * Save metadata edits and commit directly to GitHub repository
 */
async function saveMetadataToGitHub() {
  if (!activePhotoBeingEdited) return;

  const owner = localStorage.getItem('gh_gallery_owner') || 'uttam5711';
  const repo = localStorage.getItem('gh_gallery_repo') || 'Life-Through-My-Lens';
  const branch = localStorage.getItem('gh_gallery_branch') || 'main';
  const token = localStorage.getItem('gh_gallery_token') || '';

  if (!token) {
    showToast('Please configure your GitHub Token in the Upload Studio first!', 'error');
    openModal(uploadDialog);
    return;
  }

  const updated = getUpdatedMetadataFromForm();

  if (editMetaStatus) editMetaStatus.hidden = false;
  if (editMetaSpinner) editMetaSpinner.hidden = false;
  if (editMetaStatusMsg) editMetaStatusMsg.textContent = 'Saving changes to GitHub repository...';
  if (editSaveGhBtn) editSaveGhBtn.disabled = true;

  try {
    // 1. Fetch current data/photos.json to get remote array and sha
    const jsonApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/photos.json?ref=${branch}`;
    const jsonGetRes = await fetch(jsonApiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!jsonGetRes.ok) {
      throw new Error(`Failed to fetch photos.json from GitHub (${jsonGetRes.status})`);
    }

    const getResult = await jsonGetRes.json();
    const fileSha = getResult.sha;
    const decoded = base64ToUtf8(getResult.content);
    const remoteCatalog = JSON.parse(decoded);

    // 2. Find and update the photo object in the catalog
    let matched = false;
    for (let i = 0; i < remoteCatalog.length; i++) {
      if (remoteCatalog[i].id === activePhotoBeingEdited.id || remoteCatalog[i].url === activePhotoBeingEdited.url) {
        Object.assign(remoteCatalog[i], updated);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Prepend if not found
      remoteCatalog.unshift({
        ...activePhotoBeingEdited,
        ...updated
      });
    }

    // 3. Commit updated photos.json to GitHub
    const updatedJsonString = JSON.stringify(remoteCatalog, null, 2);
    const updatedBase64 = utf8ToBase64(updatedJsonString);

    const updatePayload = {
      message: `Update photo details: "${updated.title}"`,
      content: updatedBase64,
      sha: fileSha,
      branch: branch
    };

    const jsonPutRes = await fetch(jsonApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': getAuthHeader(token),
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!jsonPutRes.ok) {
      const err = await jsonPutRes.json().catch(() => ({}));
      throw new Error(`GitHub commit failed: ${err.message || jsonPutRes.statusText}`);
    }

    // 4. Update in-memory state
    const localTarget = state.allPhotos.find(p => p.id === activePhotoBeingEdited.id || p.url === activePhotoBeingEdited.url);
    if (localTarget) {
      Object.assign(localTarget, updated);
    }
    applyFilters();
    updateLightboxView();

    if (editMetaStatus) editMetaStatus.hidden = true;
    if (editSaveGhBtn) editSaveGhBtn.disabled = false;
    closeModal(editMetadataDialog);
    showToast(`✅ "${updated.title}" updated & committed to GitHub!`, 'success');

  } catch (error) {
    console.error('Metadata GitHub update failed:', error);
    if (editMetaStatus) editMetaStatus.hidden = false;
    if (editMetaSpinner) editMetaSpinner.hidden = true;
    if (editMetaStatusMsg) editMetaStatusMsg.textContent = error.message || 'Update failed';
    if (editSaveGhBtn) editSaveGhBtn.disabled = false;
    showToast(error.message, 'error');
  }
}

// ==========================================================
// GITHUB DIRECT COMMIT FLOWS
// ==========================================================

/**
 * Perform single photo upload via GitHub REST API
 */
async function performSingleGitHubUpload(owner, repo, branch, token) {
  setUploadLoading(true, '1/2 Uploading image to GitHub repository...');

  try {
    const filename = currentProcessedImage.filename;
    const imagePath = `images/${filename}`;

    // 1. Upload the image file to images/<filename>
    const imageApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${imagePath}`;
    const imageRes = await fetch(imageApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': getAuthHeader(token),
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Add photo: ${photoTitleInput.value.trim() || filename}`,
        content: currentProcessedImage.base64,
        branch: branch
      })
    });

    if (!imageRes.ok) {
      const errData = await imageRes.json().catch(() => ({}));
      let msg = errData.message || imageRes.statusText;
      if (imageRes.status === 401) {
        msg = 'Invalid GitHub Token (401 Unauthorized). Please check your token in Settings.';
      } else if (imageRes.status === 404) {
        msg = `Repository "${owner}/${repo}" or branch "${branch}" not found (404).`;
      } else if (imageRes.status === 422) {
        msg = `Upload rejected (422): ${errData.message || 'File payload too large or conflict'}`;
      }
      throw new Error(`Image upload failed: ${msg}`);
    }

    setUploadLoading(true, '2/2 Updating data/photos.json on GitHub...');

    // 2. Fetch existing data/photos.json
    const jsonApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/photos.json?ref=${branch}`;
    const jsonGetRes = await fetch(jsonApiUrl, {
      headers: {
        'Authorization': getAuthHeader(token),
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let currentJsonData = [];
    let fileSha = null;

    if (jsonGetRes.ok) {
      const getResult = await jsonGetRes.json();
      fileSha = getResult.sha;
      try {
        const decoded = base64ToUtf8(getResult.content);
        currentJsonData = JSON.parse(decoded);
      } catch (e) {
        currentJsonData = [...state.allPhotos];
      }
    } else {
      currentJsonData = [...state.allPhotos];
    }

    // 3. Prepend newly uploaded photo
    const newPhoto = buildPhotoObject();
    const updatedList = [newPhoto, ...currentJsonData];

    const updatedJsonString = JSON.stringify(updatedList, null, 2);
    const updatedBase64 = utf8ToBase64(updatedJsonString);

    const updateJsonPayload = {
      message: `Update photos.json: Added "${newPhoto.title}"`,
      content: updatedBase64,
      branch: branch
    };
    if (fileSha) {
      updateJsonPayload.sha = fileSha;
    }

    const jsonPutRes = await fetch(jsonApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': getAuthHeader(token),
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(updateJsonPayload)
    });

    if (!jsonPutRes.ok) {
      const err = await jsonPutRes.json().catch(() => ({}));
      let msg = err.message || jsonPutRes.statusText;
      if (jsonPutRes.status === 409) {
        msg = 'Conflict updating photos.json (409). Please try again.';
      }
      throw new Error(`Failed to update photos.json: ${msg}`);
    }

    // 4. Update in-memory local gallery immediately and save local backup
    const livePhoto = { ...newPhoto, url: currentProcessedImage.previewUrl, thumbnail: currentProcessedImage.previewUrl };
    saveLocalPhoto(livePhoto);
    state.allPhotos.unshift(livePhoto);
    applyFilters();

    setUploadLoading(false);
    closeModal(uploadDialog);
    resetDropzone();
    showToast(`🎉 "${newPhoto.title}" uploaded & committed to GitHub!`, 'success');

  } catch (error) {
    console.error('GitHub direct upload failed:', error);
    setUploadLoading(false);
    showInlineFeedback(error.message, 'error');
    showToast(error.message, 'error');
  }
}

/**
 * Perform batch photo upload via GitHub REST API in one batch commit
 */
async function performBatchGitHubUpload(owner, repo, branch, token) {
  const total = batchQueue.length;
  setUploadLoading(true, `Uploading 0/${total} photos to GitHub...`);

  try {
    // 1. Upload all image files sequentially
    for (let i = 0; i < total; i++) {
      const item = batchQueue[i];
      setUploadLoading(true, `Uploading photo ${i + 1}/${total}: "${item.title}"...`);

      const imagePath = `images/${item.filename}`;
      const imageApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${imagePath}`;

      const imageRes = await fetch(imageApiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': getAuthHeader(token),
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Add photo (${i + 1}/${total}): ${item.title}`,
          content: item.base64,
          branch: branch
        })
      });

      if (!imageRes.ok) {
        const errData = await imageRes.json().catch(() => ({}));
        let msg = errData.message || imageRes.statusText;
        if (imageRes.status === 401) {
          msg = 'Invalid GitHub Token (401 Unauthorized). Check your token in Settings.';
        } else if (imageRes.status === 404) {
          msg = `Repository "${owner}/${repo}" not found.`;
        }
        throw new Error(`Failed uploading "${item.title}": ${msg}`);
      }
    }

    // 2. Fetch existing data/photos.json
    setUploadLoading(true, `Updating data/photos.json on GitHub...`);

    const jsonApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/photos.json?ref=${branch}`;
    const jsonGetRes = await fetch(jsonApiUrl, {
      headers: {
        'Authorization': getAuthHeader(token),
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let currentJsonData = [];
    let fileSha = null;

    if (jsonGetRes.ok) {
      const getResult = await jsonGetRes.json();
      fileSha = getResult.sha;
      try {
        const decoded = base64ToUtf8(getResult.content);
        currentJsonData = JSON.parse(decoded);
      } catch (e) {
        currentJsonData = [...state.allPhotos];
      }
    } else {
      currentJsonData = [...state.allPhotos];
    }

    // 3. Prepend all newly uploaded batch photos
    const newPhotos = batchQueue.map(item => buildPhotoObjectFromBatchItem(item));
    const updatedList = [...newPhotos, ...currentJsonData];

    const updatedJsonString = JSON.stringify(updatedList, null, 2);
    const updatedBase64 = utf8ToBase64(updatedJsonString);

    const updateJsonPayload = {
      message: `Batch upload: Added ${total} photos (${new Date().toLocaleDateString()})`,
      content: updatedBase64,
      branch: branch
    };
    if (fileSha) {
      updateJsonPayload.sha = fileSha;
    }

    const jsonPutRes = await fetch(jsonApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': getAuthHeader(token),
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(updateJsonPayload)
    });

    if (!jsonPutRes.ok) {
      const err = await jsonPutRes.json().catch(() => ({}));
      throw new Error(`Failed to update photos.json: ${err.message || jsonPutRes.statusText}`);
    }

    // 4. Update in-memory local gallery with live preview URLs for instant view & local persistence
    const liveBatchPhotos = batchQueue.map((item, idx) => {
      const p = {
        ...newPhotos[idx],
        url: item.previewUrl,
        thumbnail: item.previewUrl
      };
      saveLocalPhoto(p);
      return p;
    });
    state.allPhotos.unshift(...liveBatchPhotos);
    applyFilters();

    setUploadLoading(false);
    closeModal(uploadDialog);
    resetDropzone();
    showToast(`🎉 Successfully uploaded & committed ${total} photos to GitHub!`, 'success');

  } catch (error) {
    console.error('Batch upload error:', error);
    setUploadLoading(false);
    showInlineFeedback(error.message, 'error');
    showToast(error.message, 'error');
  }
}

/**
 * Build photo object for single photo
 */
function buildPhotoObject() {
  let category = photoCategorySelect ? photoCategorySelect.value : 'Random Clicks';
  if (category === '__custom__') {
    category = customCategoryInput ? customCategoryInput.value.trim() : 'Random Clicks';
  }

  const tags = (photoTagsInput ? photoTagsInput.value : '')
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  const filename = currentProcessedImage ? currentProcessedImage.filename : 'photo-sample.jpg';

  return {
    id: `photo-${Date.now()}`,
    title: (photoTitleInput ? photoTitleInput.value.trim() : '') || 'Untitled Click',
    category: category || 'Random Clicks',
    url: `images/${filename}`,
    thumbnail: `images/${filename}`,
    date: (photoDateInput ? photoDateInput.value : '') || new Date().toISOString().split('T')[0],
    description: photoDescInput ? photoDescInput.value.trim() : '',
    location: photoLocationInput ? photoLocationInput.value.trim() : '',
    camera: photoCameraInput ? photoCameraInput.value.trim() : '',
    tags: tags.length ? tags : ['photo']
  };
}

/**
 * Build photo object from a batch queue item
 */
function buildPhotoObjectFromBatchItem(item) {
  return {
    id: item.id || `photo-${Date.now()}`,
    title: item.title.trim() || 'Untitled Click',
    category: item.category || 'Random Clicks',
    url: `images/${item.filename}`,
    thumbnail: `images/${item.filename}`,
    date: item.date || new Date().toISOString().split('T')[0],
    description: item.desc ? item.desc.trim() : '',
    location: item.location ? item.location.trim() : '',
    camera: item.camera ? item.camera.trim() : '',
    tags: item.tags && item.tags.length ? item.tags : ['photo']
  };
}

/**
 * Update the live code preview in the Local Export tab
 */
function updateJsonSnippetPreview() {
  if (!jsonSnippetPreview) return;
  if (batchQueue.length > 0) {
    const batchObjects = batchQueue.map(item => buildPhotoObjectFromBatchItem(item));
    jsonSnippetPreview.textContent = JSON.stringify(batchObjects, null, 2);
  } else {
    const obj = buildPhotoObject();
    jsonSnippetPreview.textContent = JSON.stringify(obj, null, 2);
  }
}

function setUploadLoading(isLoading, message = '') {
  if (isLoading) {
    if (uploadStatus) uploadStatus.hidden = false;
    if (uploadStatusMsg) uploadStatusMsg.textContent = message;
    if (githubSubmitBtn) githubSubmitBtn.disabled = true;
    if (saveLocalBtn) saveLocalBtn.disabled = true;
    showInlineFeedback(message, 'info');
  } else {
    if (uploadStatus) uploadStatus.hidden = true;
    if (githubSubmitBtn) githubSubmitBtn.disabled = false;
    if (saveLocalBtn) saveLocalBtn.disabled = false;
  }
}

// Modal helper
function openModal(dialog) {
  if (!dialog) return;
  document.body.classList.add('modal-open');
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    }
  } else {
    dialog.setAttribute('open', '');
  }
  window.dispatchEvent(new CustomEvent('modalstatechange', { detail: { open: true, dialog } }));
}

function closeModal(dialog) {
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

function capitalizeWords(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function testGoogleSheetConnection() {
  const url = ghSheetUrlInput ? ghSheetUrlInput.value.trim() : '';
  if (!url) {
    if (sheetTestResult) {
      sheetTestResult.textContent = '❌ Please enter a Google Apps Script Web App URL first.';
      sheetTestResult.style.color = '#ef4444';
    }
    showToast('Please enter your Google Apps Script URL', 'error');
    return;
  }

  if (!url.includes('script.google.com/macros/s/')) {
    if (sheetTestResult) {
      sheetTestResult.textContent = '⚠️ URL must be a Google Apps Script Web App URL ending in /exec';
      sheetTestResult.style.color = '#f59e0b';
    }
    showToast('Invalid Apps Script Web App URL format', 'error');
    return;
  }

  saveGithubSettings();

  if (sheetTestResult) {
    sheetTestResult.textContent = '⏳ Sending test visitor entry to Google Sheet...';
    sheetTestResult.style.color = '#38bdf8';
  }

  const testPayload = {
    timestamp: new Date().toLocaleString(),
    name: 'Test Visitor (Admin Diagnostic)',
    email: 'test@example.com',
    photoTitle: 'Connection Test from Admin Studio',
    userAgent: navigator.userAgent
  };

  try {
    const fd = new FormData();
    for (const k in testPayload) fd.append(k, testPayload[k]);

    fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: fd
    }).catch(() => {});

    const query = new URLSearchParams(testPayload).toString();
    const beaconUrl = url + (url.includes('?') ? '&' : '?') + query;
    const img = new Image();
    img.src = beaconUrl;

    if (sheetTestResult) {
      sheetTestResult.textContent = '✅ Dispatched! Check your Google Sheet to verify the "Test Visitor" row appeared.';
      sheetTestResult.style.color = '#22c55e';
    }
    showToast('Test visitor dispatched to Google Sheet!', 'success');
  } catch (err) {
    if (sheetTestResult) {
      sheetTestResult.textContent = '⚠️ Dispatched. Please check your Google Sheet.';
      sheetTestResult.style.color = '#f59e0b';
    }
  }
}

// ==========================================================
// PHOTO DELETION & OTP VERIFICATION FLOW
// ==========================================================
let photoPendingDelete = null;
let activeOtpCode = null;
let activeOtpExpiry = 0;
let otpCountdownInterval = null;
let resendCooldownInterval = null;

function setupDeletePhotoFlow() {
  const deleteOtpDialog = document.getElementById('delete-otp-dialog');
  if (!deleteOtpDialog) return;

  const closeDeleteDialogBtn = document.getElementById('close-delete-dialog-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const confirmDeleteText = document.getElementById('confirm-delete-text');
  const resendOtpBtn = document.getElementById('resend-otp-btn');
  const deleteOtpStatus = document.getElementById('delete-otp-status');
  const deleteOtpStatusMsg = document.getElementById('delete-otp-status-msg');
  const deleteOtpSpinner = document.getElementById('delete-otp-spinner');
  const deleteOtpError = document.getElementById('delete-otp-error');
  const otpCountdown = document.getElementById('otp-countdown');
  const otpInputs = Array.from(document.querySelectorAll('.otp-digit-input'));
  const otpContainer = document.getElementById('otp-digits-container');

  const deletePreviewThumb = document.getElementById('delete-preview-thumb');
  const deletePreviewTitle = document.getElementById('delete-preview-title');
  const deletePreviewCategory = document.getElementById('delete-preview-category');
  const deletePreviewDate = document.getElementById('delete-preview-date');

  const closeDeleteModal = () => {
    clearInterval(otpCountdownInterval);
    clearInterval(resendCooldownInterval);
    closeModal(deleteOtpDialog);
    photoPendingDelete = null;
    activeOtpCode = null;
  };

  if (closeDeleteDialogBtn) closeDeleteDialogBtn.addEventListener('click', closeDeleteModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  deleteOtpDialog.addEventListener('click', (e) => {
    if (e.target === deleteOtpDialog) closeDeleteModal();
  });

  // Listen for delete requests from gallery cards or lightbox
  window.addEventListener('requestphotodelete', (e) => {
    const photo = e.detail?.photo;
    if (!photo) return;
    startDeleteFlow(photo);
  });

  function startDeleteFlow(photo) {
    photoPendingDelete = photo;

    if (deletePreviewThumb) deletePreviewThumb.src = photo.thumbnail || photo.url || '';
    if (deletePreviewTitle) deletePreviewTitle.textContent = photo.title || 'Untitled Photo';
    if (deletePreviewCategory) deletePreviewCategory.textContent = photo.category || 'Moments';
    if (deletePreviewDate) deletePreviewDate.textContent = photo.date || '';

    otpInputs.forEach(input => {
      input.value = '';
    });
    if (deleteOtpError) {
      deleteOtpError.hidden = true;
      deleteOtpError.textContent = '';
    }
    if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;
    if (confirmDeleteText) confirmDeleteText.textContent = 'Confirm & Delete';

    openModal(deleteOtpDialog);
    setTimeout(() => {
      if (otpInputs[0]) otpInputs[0].focus();
    }, 150);

    sendOtpEmail(photo);
  }

  async function sendOtpEmail(photo) {
    activeOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtpExpiry = Date.now() + 10 * 60 * 1000;

    startTimer();
    startCooldown(30);

    if (deleteOtpStatus) deleteOtpStatus.className = 'otp-status-banner sending';
    if (deleteOtpSpinner) deleteOtpSpinner.hidden = false;
    if (deleteOtpStatusMsg) deleteOtpStatusMsg.textContent = 'Sending verification code to sanganiuttam0@gmail.com...';
    if (deleteOtpError) deleteOtpError.hidden = true;

    try {
      const formData = new FormData();
      formData.append('_subject', `🔐 [${activeOtpCode}] Photo Deletion Security Verification`);
      formData.append('Security OTP Code', activeOtpCode);
      formData.append('Action', 'Confirm Permanent Photo Deletion');
      formData.append('Photo Title', photo.title || 'Untitled');
      formData.append('Photo ID', photo.id || 'N/A');
      formData.append('Photo URL', photo.url || '');
      formData.append('Target Admin', 'sanganiuttam0@gmail.com');
      formData.append('Request Time', new Date().toLocaleString());
      formData.append('Notice', 'Enter this 6-digit confirmation code in your photo gallery to permanently delete this photo.');
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');

      const response = await fetch('https://formsubmit.co/ajax/sanganiuttam0@gmail.com', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      });

      const resData = await response.json().catch(() => null);

      if (resData && (resData.success === 'true' || resData.success === true)) {
        if (deleteOtpStatus) deleteOtpStatus.className = 'otp-status-banner success';
        if (deleteOtpSpinner) deleteOtpSpinner.hidden = true;
        if (deleteOtpStatusMsg) deleteOtpStatusMsg.innerHTML = '✅ Verification code sent to <strong>sanganiuttam0@gmail.com</strong>! Please check your inbox or spam.';
      } else if (resData && resData.message && resData.message.includes('Activation')) {
        if (deleteOtpStatus) deleteOtpStatus.className = 'otp-status-banner notice';
        if (deleteOtpSpinner) deleteOtpSpinner.hidden = true;
        if (deleteOtpStatusMsg) deleteOtpStatusMsg.innerHTML = `📩 FormSubmit activation email sent to <strong>sanganiuttam0@gmail.com</strong>. Click 'Activate Form' in your inbox for auto delivery.<br><span class="dev-otp-pill">Current Security Code: <strong>${activeOtpCode}</strong></span>`;
      } else {
        if (deleteOtpStatus) deleteOtpStatus.className = 'otp-status-banner notice';
        if (deleteOtpSpinner) deleteOtpSpinner.hidden = true;
        if (deleteOtpStatusMsg) deleteOtpStatusMsg.innerHTML = `✅ Verification code dispatched to <strong>sanganiuttam0@gmail.com</strong>.<br><span class="dev-otp-pill">Current Security Code: <strong>${activeOtpCode}</strong></span>`;
      }
    } catch (err) {
      console.warn('Email dispatch warning:', err);
      if (deleteOtpStatus) deleteOtpStatus.className = 'otp-status-banner notice';
      if (deleteOtpSpinner) deleteOtpSpinner.hidden = true;
      if (deleteOtpStatusMsg) deleteOtpStatusMsg.innerHTML = `⚠️ Network notice: Code prepared for <strong>sanganiuttam0@gmail.com</strong>.<br><span class="dev-otp-pill">Current Security Code: <strong>${activeOtpCode}</strong></span>`;
    }
  }

  function startTimer() {
    clearInterval(otpCountdownInterval);
    updateTimerText();

    otpCountdownInterval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((activeOtpExpiry - Date.now()) / 1000));
      updateTimerText(remaining);
      if (remaining <= 0) {
        clearInterval(otpCountdownInterval);
        if (deleteOtpError) {
          deleteOtpError.hidden = false;
          deleteOtpError.textContent = 'Verification code expired. Please click "Resend Code".';
        }
        if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;
      }
    }, 1000);
  }

  function updateTimerText(sec) {
    if (sec === undefined) {
      sec = Math.max(0, Math.floor((activeOtpExpiry - Date.now()) / 1000));
    }
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    if (otpCountdown) {
      otpCountdown.textContent = `Expires in ${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  }

  function startCooldown(sec = 30) {
    clearInterval(resendCooldownInterval);
    if (!resendOtpBtn) return;
    resendOtpBtn.disabled = true;
    let cd = sec;
    resendOtpBtn.textContent = `Resend in ${cd}s`;

    resendCooldownInterval = setInterval(() => {
      cd--;
      if (cd <= 0) {
        clearInterval(resendCooldownInterval);
        resendOtpBtn.disabled = false;
        resendOtpBtn.textContent = 'Resend Code';
      } else {
        resendOtpBtn.textContent = `Resend in ${cd}s`;
      }
    }, 1000);
  }

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', () => {
      if (!photoPendingDelete) return;
      otpInputs.forEach(i => i.value = '');
      if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;
      sendOtpEmail(photoPendingDelete);
    });
  }

  function getEnteredCode() {
    return otpInputs.map(i => i.value.trim()).join('');
  }

  function checkInputComplete() {
    const code = getEnteredCode();
    if (deleteOtpError) deleteOtpError.hidden = true;
    if (confirmDeleteBtn) confirmDeleteBtn.disabled = code.length !== 6;
  }

  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val ? val[val.length - 1] : '';

      if (val && idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }
      checkInputComplete();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        otpInputs[idx - 1].focus();
        otpInputs[idx - 1].value = '';
        checkInputComplete();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (confirmDeleteBtn && !confirmDeleteBtn.disabled) {
          confirmDeleteBtn.click();
        }
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text') || '';
      const digits = pasted.replace(/\D/g, '').slice(0, 6);
      if (!digits) return;

      digits.split('').forEach((d, i) => {
        if (otpInputs[i]) otpInputs[i].value = d;
      });

      const nextIdx = Math.min(digits.length, otpInputs.length - 1);
      if (otpInputs[nextIdx]) otpInputs[nextIdx].focus();
      checkInputComplete();
    });
  });

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      const entered = getEnteredCode();
      if (entered.length !== 6) return;

      if (Date.now() > activeOtpExpiry) {
        if (deleteOtpError) {
          deleteOtpError.hidden = false;
          deleteOtpError.textContent = 'Verification code has expired. Please click "Resend Code".';
        }
        return;
      }

      if (entered !== activeOtpCode) {
        if (deleteOtpError) {
          deleteOtpError.hidden = false;
          deleteOtpError.textContent = 'Incorrect verification code. Please check your email and try again.';
        }
        if (otpContainer) {
          otpContainer.classList.add('shake');
          setTimeout(() => otpContainer.classList.remove('shake'), 450);
        }
        return;
      }

      await performDelete(photoPendingDelete);
    });
  }

  async function performDelete(photo) {
    if (!photo) return;
    if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;
    if (cancelDeleteBtn) cancelDeleteBtn.disabled = true;
    if (confirmDeleteText) confirmDeleteText.textContent = 'Deleting photo...';
    if (deleteOtpStatus) deleteOtpStatus.className = 'otp-status-banner sending';
    if (deleteOtpSpinner) deleteOtpSpinner.hidden = false;
    if (deleteOtpStatusMsg) deleteOtpStatusMsg.textContent = 'Deleting photo and committing changes to GitHub...';

    try {
      const owner = localStorage.getItem('gh_gallery_owner') || 'uttam5711';
      const repo = localStorage.getItem('gh_gallery_repo') || 'Life-Through-My-Lens';
      const branch = localStorage.getItem('gh_gallery_branch') || 'main';
      const token = localStorage.getItem('gh_gallery_token') || '';

      if (token) {
        const jsonApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/photos.json?ref=${branch}`;
        const jsonGetRes = await fetch(jsonApiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!jsonGetRes.ok) {
          throw new Error(`Failed to read photos.json from GitHub (${jsonGetRes.status})`);
        }

        const getResult = await jsonGetRes.json();
        const fileSha = getResult.sha;
        const decoded = base64ToUtf8(getResult.content);
        const currentList = JSON.parse(decoded);

        const updatedList = currentList.filter(p => p.id !== photo.id && p.url !== photo.url);

        const updatedJsonString = JSON.stringify(updatedList, null, 2);
        const updatedBase64 = utf8ToBase64(updatedJsonString);

        const updateJsonPayload = {
          message: `Delete photo: "${photo.title || photo.id}"`,
          content: updatedBase64,
          sha: fileSha,
          branch: branch
        };

        const jsonPutRes = await fetch(jsonApiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': getAuthHeader(token),
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(updateJsonPayload)
        });

        if (!jsonPutRes.ok) {
          const err = await jsonPutRes.json().catch(() => ({}));
          throw new Error(`Failed to update photos.json: ${err.message || jsonPutRes.statusText}`);
        }

        if (photo.url && photo.url.startsWith('images/')) {
          try {
            const imageApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${photo.url}?ref=${branch}`;
            const imgGetRes = await fetch(imageApiUrl, {
              headers: {
                'Authorization': getAuthHeader(token),
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            if (imgGetRes.ok) {
              const imgData = await imgGetRes.json();
              await fetch(imageApiUrl, {
                method: 'DELETE',
                headers: {
                  'Authorization': getAuthHeader(token),
                  'Content-Type': 'application/json',
                  'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                  message: `Delete asset: ${photo.url}`,
                  sha: imgData.sha,
                  branch: branch
                })
              });
            }
          } catch (assetErr) {
            console.warn('Asset deletion error on GitHub:', assetErr);
          }
        }
      }

      // Remove from browser local storage if present
      if (photo.id) {
        removeLocalPhoto(photo.id);
      }

      const targetIndex = state.allPhotos.findIndex(p => p.id === photo.id || p.url === photo.url);
      if (targetIndex !== -1) {
        state.allPhotos.splice(targetIndex, 1);
      }
      applyFilters();
      closeLightbox();
      closeDeleteModal();
      showToast(`🗑️ "${photo.title || 'Photo'}" was successfully deleted!`, 'success');

    } catch (error) {
      console.error('Delete execution failed:', error);
      if (deleteOtpStatus) deleteOtpStatus.className = 'otp-status-banner error';
      if (deleteOtpSpinner) deleteOtpSpinner.hidden = true;
      if (deleteOtpStatusMsg) deleteOtpStatusMsg.textContent = error.message || 'Failed to complete deletion';
      if (confirmDeleteBtn) confirmDeleteBtn.disabled = false;
      if (cancelDeleteBtn) cancelDeleteBtn.disabled = false;
      if (confirmDeleteText) confirmDeleteText.textContent = 'Retry Deletion';
      showToast(error.message, 'error');
    }
  }
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUploader);
} else {
  initUploader();
}
