/**
 * CUSTOM INTERACTIVE CURSOR CONTROLLER
 * Features:
 * - Fluid Linear Interpolation (LERP) trailing ring with instant center dot
 * - Context-aware hover states (photo cards "VIEW", buttons/pills magnetic glow)
 * - Tactile mousedown click squeeze effect
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

  document.body.classList.add('has-custom-cursor');

  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  let isVisible = false;
  let isHoveringCard = false;
  let isHoveringInteractive = false;
  let isClicking = false;

  // Track mouse coordinates
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      cursorDot.classList.remove('cursor-hidden');
      cursorRing.classList.remove('cursor-hidden');
    }

    // Direct dot positioning (0 latency)
    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
  }, { passive: true });

  // Handle window exit/enter
  document.addEventListener('mouseleave', () => {
    isVisible = false;
    cursorDot.classList.add('cursor-hidden');
    cursorRing.classList.add('cursor-hidden');
  });

  document.addEventListener('mouseenter', () => {
    isVisible = true;
    cursorDot.classList.remove('cursor-hidden');
    cursorRing.classList.remove('cursor-hidden');
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

  // Dynamic delegation for interactive hover targets
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (!target) return;

    // Check if hovering photo card or thumbnail
    const card = target.closest('.photo-card, .photo-thumb-container, .lightbox-image');
    if (card) {
      isHoveringCard = true;
      cursorRing.classList.add('cursor-hover-card');
      cursorDot.classList.add('cursor-hover-card');
      return;
    }

    // Check if hovering buttons, links, pills, inputs
    const interactive = target.closest('button, a, input, select, textarea, .pill, .icon-btn, .layout-btn, .close-btn');
    if (interactive) {
      isHoveringInteractive = true;
      cursorRing.classList.add('cursor-hover-interactive');
      cursorDot.classList.add('cursor-hover-interactive');
      return;
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target;
    if (!target) return;

    const card = target.closest('.photo-card, .photo-thumb-container, .lightbox-image');
    if (card) {
      isHoveringCard = false;
      cursorRing.classList.remove('cursor-hover-card');
      cursorDot.classList.remove('cursor-hover-card');
    }

    const interactive = target.closest('button, a, input, select, textarea, .pill, .icon-btn, .layout-btn, .close-btn');
    if (interactive) {
      isHoveringInteractive = false;
      cursorRing.classList.remove('cursor-hover-interactive');
      cursorDot.classList.remove('cursor-hover-interactive');
    }
  });

  // Physics animation loop using Linear Interpolation (LERP)
  const LERP_FACTOR = 0.16;

  function renderCursor() {
    if (isVisible) {
      ringX += (mouseX - ringX) * LERP_FACTOR;
      ringY += (mouseY - ringY) * LERP_FACTOR;

      const scale = isClicking ? 0.85 : 1;
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(${scale})`;
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

