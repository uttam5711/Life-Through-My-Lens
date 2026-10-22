/**
 * MOMENTS & CLICKS • UPLOADER STUDIO CONTROLLER
 * Handles client-side compression, direct GitHub API commits, and local export.
 */

import { state, applyFilters, showToast, loadPhotos, closeLightbox } from './gallery.js?v=20261021b';

// DOM Elements
const openUploadBtn = document.getElementById('open-upload-btn');
const footerUploadBtn = document.getElementById('footer-upload-btn');
const uploadDialog = document.getElementById('upload-dialog');
const closeUploadBtn = document.getElementById('close-upload-btn');
const cancelUploadBtn = document.getElementById('cancel-upload-btn');
const closeLocalBtn = document.getElementById('close-local-btn');

// Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const githubTabContent = document.getElementById('github-tab-content');
const localTabContent = document.getElementById('local-tab-content');

// Dropzone
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const dropzoneEmpty = document.getElementById('dropzone-empty');
const dropzonePreview = document.getElementById('dropzone-preview');
const previewImg = document.getElementById('preview-img');
const previewInfo = document.getElementById('preview-info');
const removeFileBtn = document.getElementById('remove-file-btn');

// Form inputs
const uploadForm = document.getElementById('upload-form');
const photoTitleInput = document.getElementById('photo-title');
const photoCategorySelect = document.getElementById('photo-category');
const customCategoryGroup = document.getElementById('custom-category-group');
const customCategoryInput = document.getElementById('custom-category-input');
const photoDateInput = document.getElementById('photo-date');
const photoLocationInput = document.getElementById('photo-location');
const photoCameraInput = document.getElementById('photo-camera');
const photoDescInput = document.getElementById('photo-desc');
const photoTagsInput = document.getElementById('photo-tags');

// GitHub inputs
const ghOwnerInput = document.getElementById('gh-owner');
const ghRepoInput = document.getElementById('gh-repo');
const ghBranchInput = document.getElementById('gh-branch');
const ghTokenInput = document.getElementById('gh-token');
const ghSheetUrlInput = document.getElementById('google-sheet-url');
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

// In-memory processed image state
let currentProcessedImage = null; // { file, base64, blob, filename, width, height, sizeKb }

/**
 * Admin / Owner access control
 * Visitors see only photos. Upload controls are hidden unless ?admin is accessed.
 */
function checkAdminAccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.has('admin') && urlParams.get('admin') !== 'false' && urlParams.get('admin') !== 'logout';

  // Clear any legacy persistent admin mode from localStorage
  try {
    localStorage.removeItem('gallery_admin_mode');
    localStorage.removeItem('gallery_admin_disabled');
  } catch {}

  if (isAdmin) {
    document.documentElement.classList.add('admin-mode');
    document.body.classList.add('admin-mode');
    if (openUploadBtn) openUploadBtn.hidden = false;
    if (footerUploadBtn) footerUploadBtn.hidden = false;
    const lbDeleteBtn = document.getElementById('lb-delete-btn');
    if (lbDeleteBtn) lbDeleteBtn.hidden = false;

    // Remove ?admin from URL bar so that a subsequent page refresh removes the upload option
    urlParams.delete('admin');
    const remainingQuery = urlParams.toString();
    const cleanUrl = window.location.pathname + (remainingQuery ? '?' + remainingQuery : '') + window.location.hash;
    window.history.replaceState(null, '', cleanUrl);
  } else {
    document.documentElement.classList.remove('admin-mode');
    document.body.classList.remove('admin-mode');
    if (openUploadBtn) openUploadBtn.hidden = true;
    if (footerUploadBtn) footerUploadBtn.hidden = true;
    const lbDeleteBtn = document.getElementById('lb-delete-btn');
    if (lbDeleteBtn) lbDeleteBtn.hidden = true;
  }

  return isAdmin;
}

/**
 * Initialize Uploader
 */
export function initUploader() {
  checkAdminAccess();
  loadSavedGithubSettings();
  setupUploaderEvents();
  setupDeletePhotoFlow();
  setDefaultDate();
}

/**
 * Load saved GitHub configurations from localStorage
 */
function loadSavedGithubSettings() {
  if (ghOwnerInput) ghOwnerInput.value = localStorage.getItem('gh_gallery_owner') || 'uttam5711';
  if (ghRepoInput) ghRepoInput.value = localStorage.getItem('gh_gallery_repo') || 'Life-Through-My-Lens';
  if (ghBranchInput) ghBranchInput.value = localStorage.getItem('gh_gallery_branch') || 'main';
  if (ghTokenInput) ghTokenInput.value = localStorage.getItem('gh_gallery_token') || '';
  if (ghSheetUrlInput) ghSheetUrlInput.value = localStorage.getItem('gh_gallery_sheet_url') || '';
}

function saveGithubSettings() {
  if (ghOwnerInput) localStorage.setItem('gh_gallery_owner', ghOwnerInput.value.trim());
  if (ghRepoInput) localStorage.setItem('gh_gallery_repo', ghRepoInput.value.trim());
  if (ghBranchInput) localStorage.setItem('gh_gallery_branch', ghBranchInput.value.trim() || 'main');
  if (ghTokenInput) localStorage.setItem('gh_gallery_token', ghTokenInput.value.trim());
  if (ghSheetUrlInput) localStorage.setItem('gh_gallery_sheet_url', ghSheetUrlInput.value.trim());
}

function setDefaultDate() {
  if (photoDateInput) {
    const today = new Date().toISOString().split('T')[0];
    photoDateInput.value = today;
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

  // Backdrop click to close modals
  if (uploadDialog) {
    uploadDialog.addEventListener('click', (e) => {
      if (e.target === uploadDialog) closeModal(uploadDialog);
    });
  }
  if (tokenGuideDialog) {
    tokenGuideDialog.addEventListener('click', (e) => {
      if (e.target === tokenGuideDialog) closeModal(tokenGuideDialog);
    });
  }

  // Token guide dialog
  if (tokenHelpLink) tokenHelpLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(tokenGuideDialog);
  });
  if (closeTokenGuideBtn) closeTokenGuideBtn.addEventListener('click', () => closeModal(tokenGuideDialog));
  if (guideUnderstoodBtn) guideUnderstoodBtn.addEventListener('click', () => closeModal(tokenGuideDialog));

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.tab;
      if (target === 'github-tab') {
        githubTabContent.hidden = false;
        localTabContent.hidden = true;
      } else {
        githubTabContent.hidden = true;
        localTabContent.hidden = false;
        updateJsonSnippetPreview();
      }
    });
  });

  // Custom Category Toggle
  photoCategorySelect.addEventListener('change', () => {
    if (photoCategorySelect.value === '__custom__') {
      customCategoryGroup.hidden = false;
      customCategoryInput.focus();
    } else {
      customCategoryGroup.hidden = true;
    }
    updateJsonSnippetPreview();
  });

  // File Drop & Select
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetDropzone();
  });

  // Token visibility toggle
  toggleTokenBtn.addEventListener('click', () => {
    if (ghTokenInput.type === 'password') {
      ghTokenInput.type = 'text';
      toggleTokenBtn.textContent = 'Hide';
    } else {
      ghTokenInput.type = 'password';
      toggleTokenBtn.textContent = 'Show';
    }
  });

  // Form input changes update JSON preview
  [photoTitleInput, photoCategorySelect, customCategoryInput, photoDateInput, photoLocationInput, photoCameraInput, photoDescInput, photoTagsInput].forEach(el => {
    el.addEventListener('input', updateJsonSnippetPreview);
  });

  // Local export actions
  downloadPhotoFileBtn.addEventListener('click', () => {
    if (!currentProcessedImage) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(currentProcessedImage.blob);
    a.download = currentProcessedImage.filename;
    a.click();
    showToast(`Downloaded ${currentProcessedImage.filename}`, 'success');
  });

  downloadJsonFileBtn.addEventListener('click', () => {
    const newEntry = buildPhotoObject();
    const updatedCatalog = [newEntry, ...state.allPhotos];
    const blob = new Blob([JSON.stringify(updatedCatalog, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'photos.json';
    a.click();
    showToast('Downloaded updated photos.json', 'success');
  });

  copyJsonBtn.addEventListener('click', () => {
    const code = jsonSnippetPreview.textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast('JSON entry copied to clipboard!', 'success');
    }
  });

  // Form submission (Direct GitHub Upload)
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentProcessedImage) {
      showToast('Please select or drop a photo first!', 'error');
      return;
    }

    saveGithubSettings();

    const owner = ghOwnerInput.value.trim();
    const repo = ghRepoInput.value.trim();
    const branch = ghBranchInput.value.trim() || 'main';
    const token = ghTokenInput.value.trim();

    if (!owner || !repo || !token) {
      showToast('Please enter your GitHub Username, Repo, and Token', 'error');
      return;
    }

    await performGitHubUpload(owner, repo, branch, token);
  });
}

/**
 * Handle chosen image file & run in-browser compression
 */
async function handleFileSelected(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
    return;
  }

  showToast('Optimizing photo...', 'success');

  try {
    const compressed = await compressImage(file, 1920, 0.85);
    currentProcessedImage = compressed;

    // Show preview
    previewImg.src = compressed.previewUrl;
    previewInfo.textContent = `${compressed.width} × ${compressed.height} • ${compressed.sizeKb} KB (optimized)`;
    dropzoneEmpty.hidden = true;
    dropzonePreview.hidden = false;

    // Default title if empty
    if (!photoTitleInput.value) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      photoTitleInput.value = capitalizeWords(cleanName);
    }

    downloadPhotoFileBtn.disabled = false;
    downloadJsonFileBtn.disabled = false;
    updateJsonSnippetPreview();
  } catch (error) {
    console.error('Image compression failed:', error);
    showToast('Could not process this image file', 'error');
  }
}

function resetDropzone() {
  currentProcessedImage = null;
  fileInput.value = '';
  dropzoneEmpty.hidden = false;
  dropzonePreview.hidden = true;
  previewImg.src = '';
  downloadPhotoFileBtn.disabled = true;
  downloadJsonFileBtn.disabled = true;
  updateJsonSnippetPreview();
}

/**
 * Compress an image file using an HTML5 Canvas
 */
function compressImage(file, maxDimension = 1920, quality = 0.85) {
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
          const cleanBase = file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
          const filename = `photo-${cleanBase}-${timestamp}.jpg`;

          resolve({
            file,
            blob,
            base64: base64Data,
            previewUrl: dataUrl,
            filename,
            width,
            height,
            sizeKb
          });
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Build a structured photo object based on form values
 */
function buildPhotoObject() {
  let category = photoCategorySelect.value;
  if (category === '__custom__') {
    category = customCategoryInput.value.trim() || 'Random Clicks';
  }

  const tags = (photoTagsInput.value || '')
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  const filename = currentProcessedImage ? currentProcessedImage.filename : 'photo-sample.jpg';

  return {
    id: `photo-${Date.now()}`,
    title: photoTitleInput.value.trim() || 'Untitled Click',
    category: category,
    url: `images/${filename}`,
    thumbnail: `images/${filename}`,
    date: photoDateInput.value || new Date().toISOString().split('T')[0],
    description: photoDescInput.value.trim(),
    location: photoLocationInput.value.trim(),
    camera: photoCameraInput.value.trim(),
    tags: tags.length ? tags : ['photo']
  };
}

/**
 * Update the live code preview in the Local Export tab
 */
function updateJsonSnippetPreview() {
  if (!jsonSnippetPreview) return;
  const obj = buildPhotoObject();
  jsonSnippetPreview.textContent = JSON.stringify(obj, null, 2);
}

/**
 * Perform Direct GitHub Upload via GitHub REST API
 */
async function performGitHubUpload(owner, repo, branch, token) {
  setUploadLoading(true, '1/2 Uploading image to GitHub repository...');

  try {
    const filename = currentProcessedImage.filename;
    const imagePath = `images/${filename}`;

    // 1. Upload the image file to images/<filename>
    const imageApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${imagePath}`;
    const imageRes = await fetch(imageApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
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
      const errData = await imageRes.json();
      throw new Error(`Image upload failed (${imageRes.status}): ${errData.message || 'Check your token and repo name'}`);
    }

    setUploadLoading(true, '2/2 Updating data/photos.json on GitHub...');

    // 2. Fetch existing data/photos.json to get sha & current content
    const jsonApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/photos.json?ref=${branch}`;
    const jsonGetRes = await fetch(jsonApiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let currentJsonData = [];
    let fileSha = null;

    if (jsonGetRes.ok) {
      const getResult = await jsonGetRes.json();
      fileSha = getResult.sha;
      try {
        // Decode base64 utf-8
        const decoded = decodeURIComponent(escape(atob(getResult.content.replace(/\s/g, ''))));
        currentJsonData = JSON.parse(decoded);
      } catch (e) {
        console.warn('Could not parse existing remote photos.json, using local state as fallback', e);
        currentJsonData = [...state.allPhotos];
      }
    } else {
      currentJsonData = [...state.allPhotos];
    }

    // 3. Prepend newly uploaded photo
    const newPhoto = buildPhotoObject();
    const updatedList = [newPhoto, ...currentJsonData];

    // Encode to base64 utf-8
    const updatedJsonString = JSON.stringify(updatedList, null, 2);
    const updatedBase64 = btoa(unescape(encodeURIComponent(updatedJsonString)));

    const updateJsonPayload = {
      message: `Update photos.json: Added "${newPhoto.title}"`,
      content: updatedBase64,
      branch: branch
    };
    if (fileSha) {
      updateJsonPayload.sha = fileSha;
    }

    const jsonPutRes = await fetch(imageApiUrl.replace(imagePath, 'data/photos.json'), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(updateJsonPayload)
    });

    if (!jsonPutRes.ok) {
      const err = await jsonPutRes.json();
      throw new Error(`Failed to update photos.json (${jsonPutRes.status}): ${err.message}`);
    }

    // 4. Update in-memory local gallery immediately
    // Use previewUrl for instant local viewing
    const livePhoto = { ...newPhoto, url: currentProcessedImage.previewUrl, thumbnail: currentProcessedImage.previewUrl };
    state.allPhotos.unshift(livePhoto);
    applyFilters();

    setUploadLoading(false);
    closeModal(uploadDialog);
    resetDropzone();
    showToast(`🎉 "${newPhoto.title}" uploaded & committed to GitHub!`, 'success');

  } catch (error) {
    console.error('GitHub direct upload failed:', error);
    setUploadLoading(false);
    showToast(error.message, 'error');
  }
}

function setUploadLoading(isLoading, message = '') {
  if (isLoading) {
    uploadStatus.hidden = false;
    uploadStatusMsg.textContent = message;
    githubSubmitBtn.disabled = true;
  } else {
    uploadStatus.hidden = true;
    githubSubmitBtn.disabled = false;
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

/* ==========================================================
   PHOTO DELETION & OTP VERIFICATION FLOW
   ========================================================== */
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

  // Close handlers
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

    // Populate preview info
    if (deletePreviewThumb) deletePreviewThumb.src = photo.thumbnail || photo.url || '';
    if (deletePreviewTitle) deletePreviewTitle.textContent = photo.title || 'Untitled Photo';
    if (deletePreviewCategory) deletePreviewCategory.textContent = photo.category || 'Moments';
    if (deletePreviewDate) deletePreviewDate.textContent = photo.date || '';

    // Reset OTP inputs
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

  // Send OTP to sanganiuttam0@gmail.com
  async function sendOtpEmail(photo) {
    activeOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

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

  // Timer countdown
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

  // Resend cooldown
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

  // Handle OTP digit inputs
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

  // Confirm & Delete execution
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

      // OTP verified successfully!
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
        // 1. Fetch data/photos.json from GitHub
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
        const decoded = decodeURIComponent(escape(atob(getResult.content.replace(/\s/g, ''))));
        const currentList = JSON.parse(decoded);

        // Filter out the photo
        const updatedList = currentList.filter(p => p.id !== photo.id && p.url !== photo.url);

        // Commit updated data/photos.json to GitHub
        const updatedJsonString = JSON.stringify(updatedList, null, 2);
        const updatedBase64 = btoa(unescape(encodeURIComponent(updatedJsonString)));

        const updateJsonPayload = {
          message: `Delete photo: "${photo.title || photo.id}"`,
          content: updatedBase64,
          sha: fileSha,
          branch: branch
        };

        const jsonPutRes = await fetch(jsonApiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(updateJsonPayload)
        });

        if (!jsonPutRes.ok) {
          const err = await jsonPutRes.json().catch(() => ({}));
          throw new Error(`Failed to update photos.json: ${err.message || jsonPutRes.statusText}`);
        }

        // 2. Also attempt to delete the image asset file from GitHub if in images/
        if (photo.url && photo.url.startsWith('images/')) {
          try {
            const imageApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${photo.url}?ref=${branch}`;
            const imgGetRes = await fetch(imageApiUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            if (imgGetRes.ok) {
              const imgData = await imgGetRes.json();
              await fetch(imageApiUrl, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
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

      // 3. Remove photo from in-memory state
      const targetIndex = state.allPhotos.findIndex(p => p.id === photo.id || p.url === photo.url);
      if (targetIndex !== -1) {
        state.allPhotos.splice(targetIndex, 1);
      }
      applyFilters();

      // 4. Close Lightbox if currently open
      closeLightbox();

      // 5. Clean up & close OTP modal
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

