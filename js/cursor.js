/**
 * CUSTOM INTERACTIVE CURSOR CONTROLLER
 * Features:
 * - Fluid Linear Interpolation (LERP) trailing ring with instant center dot
 * - Context-aware morphing (photo cards "VIEW/ZOOM", buttons magnetic bloom, inputs delicate text caret state)
 * - Seamless modal & upload studio support: dynamically promotes cursor elements to top-layer dialogs
 * - Tactile mousedown click squeeze effect everywhere across page and dialogs
 * - Strict touch/mobile & reduced-motion safeguards
 */

export function initCustomCursor() {
  // Safe guard: only enable on devices with fine pointer (mouse/trackpad)
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!hasFinePointer || prefersReduced) {
    // Keep native pointer for touch/mobile devices
    return;
  }

  // Create cursor elements if not already present
  let cursorDot = document.getElementById('cursor-dot');
  let cursorRing = document.getElementById('cursor-ring');

  if (!cursorDot || !cursorRing) {
    cursorDot = document.createElement('div');
    cursorDot.id = 'cursor-dot';
    cursorDot.className = 'cursor-dot cursor-hidden';
    cursorDot.setAttribute('aria-hidden', 'true');

    cursorRing = document.createElement('div');
    cursorRing.id = 'cursor-ring';
    cursorRing.className = 'cursor-ring cursor-hidden';
    cursorRing.setAttribute('aria-hidden', 'true');
    cursorRing.innerHTML = '<span class="cursor-text">VIEW</span>';

    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorRing);
  }

  const cursorText = cursorRing.querySelector('.cursor-text');
  document.body.classList.add('has-custom-cursor');

  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  let isVisible = false;
  let isHoveringCard = false;
  let isHoveringInteractive = false;
  let isHoveringInput = false;
  let isClicking = false;

  /**
   * Keep cursor elements attached to the currently active top-layer modal
   * or document.body so they render smoothly on top of all dialogs and backdrops.
   */
  function syncCursorContainer() {
    const openDialogs = Array.from(document.querySelectorAll('dialog[open]'));
    const activeDialog = openDialogs.length > 0 ? openDialogs[openDialogs.length - 1] : null;
    const targetParent = activeDialog || document.body;

    if (cursorDot.parentElement !== targetParent) {
      targetParent.appendChild(cursorDot);
      targetParent.appendChild(cursorRing);
    }
  }

  function hideCustomCursor() {
    cursorDot.classList.add('cursor-hidden');
    cursorRing.classList.add('cursor-hidden');
  }

  function showCustomCursor() {
    cursorDot.classList.remove('cursor-hidden');
    cursorRing.classList.remove('cursor-hidden');
  }

  function resetHoverStates() {
    isHoveringCard = false;
    isHoveringInteractive = false;
    isHoveringInput = false;
    cursorRing.classList.remove('cursor-hover-card', 'cursor-hover-interactive', 'cursor-hover-input');
    cursorDot.classList.remove('cursor-hover-card', 'cursor-hover-interactive', 'cursor-hover-input');
  }

  // Track mouse coordinates
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      showCustomCursor();
      ringX = mouseX;
      ringY = mouseY;
    }

    syncCursorContainer();
    showCustomCursor();

    // Direct dot positioning (zero latency)
    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
  }, { passive: true });

  // Handle window exit/enter
  document.addEventListener('mouseleave', () => {
    isVisible = false;
    hideCustomCursor();
  });

  document.addEventListener('mouseenter', () => {
    isVisible = true;
    syncCursorContainer();
    showCustomCursor();
  });

  // Click squeeze animation
  window.addEventListener('mousedown', () => {
    isClicking = true;
    cursorRing.classList.add('cursor-clicking');
    cursorDot.classList.add('cursor-clicking');
  });

  window.addEventListener('mouseup', () => {
    isClicking = false;
    cursorRing.classList.remove('cursor-clicking');
    cursorDot.classList.remove('cursor-clicking');
  });

  // Context-aware dynamic delegation for interactive targets
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (!target || !target.closest) return;

    // 1. Photo card or Lightbox image
    const card = target.closest('.photo-card, .photo-thumb-container, .lightbox-image');
    if (card) {
      resetHoverStates();
      isHoveringCard = true;
      if (cursorText) {
        cursorText.textContent = target.closest('.lightbox-image') ? 'ZOOM' : 'VIEW';
      }
      cursorRing.classList.add('cursor-hover-card');
      cursorDot.classList.add('cursor-hover-card');
      return;
    }

    // 2. Text input or textarea (contract ring and display native text caret)
    const textInput = target.closest('input:not([type="file"]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea');
    if (textInput) {
      resetHoverStates();
      isHoveringInput = true;
      cursorRing.classList.add('cursor-hover-input');
      cursorDot.classList.add('cursor-hover-input');
      return;
    }

    // 3. Dropzone / file upload area
    const dropzone = target.closest('.dropzone, .dropzone-empty, .dropzone-preview');
    if (dropzone) {
      resetHoverStates();
      isHoveringInteractive = true;
      cursorRing.classList.add('cursor-hover-interactive');
      cursorDot.classList.add('cursor-hover-interactive');
      return;
    }

    // 4. Buttons, links, pills, tabs, layout switches, close buttons
    const interactive = target.closest('button, a, select, .pill, .icon-btn, .layout-btn, .close-btn, .tab-btn, .primary-btn, .secondary-btn, .quick-search-pill');
    if (interactive) {
      resetHoverStates();
      isHoveringInteractive = true;
      cursorRing.classList.add('cursor-hover-interactive');
      cursorDot.classList.add('cursor-hover-interactive');
      return;
    }

    resetHoverStates();
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target;
    if (!target || !target.closest) return;

    const interactiveTarget = target.closest('.photo-card, .photo-thumb-container, .lightbox-image, input, textarea, button, a, select, .pill, .icon-btn, .layout-btn, .close-btn, .tab-btn, .dropzone, .primary-btn, .secondary-btn');
    if (interactiveTarget) {
      resetHoverStates();
    }
  });

  // Keep cursor visible during drag and drop
  window.addEventListener('dragenter', () => {
    syncCursorContainer();
    showCustomCursor();
  });

  window.addEventListener('dragover', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
  });

  // Watch for any modal dialog opening/closing to sync parent container
  const dialogObserver = new MutationObserver(() => {
    syncCursorContainer();
    const hasOpenDialog = document.querySelector('dialog[open]') !== null;
    document.body.classList.toggle('modal-open', hasOpenDialog);
  });

  document.querySelectorAll('dialog').forEach(dialog => {
    dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    dialog.addEventListener('close', () => {
      setTimeout(syncCursorContainer, 20);
    });
  });

  // Listen to custom modal state change events
  window.addEventListener('modalstatechange', () => {
    syncCursorContainer();
  });

  // Physics animation loop using Linear Interpolation (LERP)
  const LERP_FACTOR = 0.16;

  function renderCursor() {
    if (isVisible) {
      ringX += (mouseX - ringX) * LERP_FACTOR;
      ringY += (mouseY - ringY) * LERP_FACTOR;

      const scale = isClicking ? 0.85 : 1;
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(${scale})`;
    } else {
      ringX = mouseX;
      ringY = mouseY;
    }

    requestAnimationFrame(renderCursor);
  }

  requestAnimationFrame(renderCursor);
}

// Auto init on DOMContentLoaded if loaded as script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomCursor);
} else {
  initCustomCursor();
}
