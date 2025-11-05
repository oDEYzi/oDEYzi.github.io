// scripts.js – polished modal + mobile nav behavior
document.addEventListener('DOMContentLoaded', () => {
  // ELEMENTS
  const overlay = document.getElementById('carModalOverlay');
  const modal = overlay?.querySelector('.car-modal');
  const mainImg = document.getElementById('carModalMainImg');
  const thumbs = document.getElementById('carModalThumbs');
  const btnClose = document.getElementById('carModalClose') || overlay?.querySelector('.car-modal-close');
  const buyBtn = document.getElementById('carModalBuy');
  let lastActiveTrigger = null;
  let lastScrollY = 0;

  if (!overlay || !modal) {
    console.warn('Modal elements not found');
    return;
  }

  // ===== SCROLL LOCK UTILITIES =====
  function lockBodyScroll() {
    lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.position = 'fixed';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.top = `-${lastScrollY}px`;
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    const top = document.body.style.top || '';
    document.body.style.top = '';
    document.documentElement.style.overflow = '';
    const restoreY = top ? -parseInt(top || '0', 10) : 0;
    window.scrollTo(0, restoreY || 0);
  }

  // ===== MODAL OPEN / CLOSE =====
  function openModal() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
    setTimeout(() => {
      (btnClose || overlay.querySelector('button, [tabindex]'))?.focus();
    }, 120);
    trapFocus(modal);
  }

  function closeModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    releaseFocus();
    if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
      lastActiveTrigger.focus();
    }
  }

  // ===== FOCUS TRAP =====
  let previousActive = null;
  function trapFocus(container) {
    previousActive = document.activeElement;
    const focusables = container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    
    function trapHandler(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    
    container.addEventListener('keydown', trapHandler);
    container._trapHandler = trapHandler;
  }

  function releaseFocus() {
    if (modal && modal._trapHandler) {
      modal.removeEventListener('keydown', modal._trapHandler);
      modal._trapHandler = null;
    }
    if (previousActive && typeof previousActive.focus === 'function') {
      previousActive.focus();
    }
  }

  // ===== CAR BUTTONS - OPEN MODAL =====
  document.querySelectorAll('.car-button, [data-open-car-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      lastActiveTrigger = btn;
      
      const card = btn.closest('.car-card') || btn.closest('article');
      if (!card) return openModal();

      // Extract data
      const title = (card.querySelector('h3')?.textContent || '').trim();
      const badge = card.querySelector('.car-badge')?.textContent?.trim() || '';
      const price = (card.querySelector('.price')?.textContent || '').trim();

      // Images: dataset.images (csv) or first img in card
      const imgs = (card.dataset.images ? card.dataset.images.split(',').map(s => s.trim()) : []);
      if (!imgs.length) {
        const img = card.querySelector('.car-image img');
        if (img?.src) imgs.push(img.src);
      }

      // Fill modal
      const modalTitle = overlay.querySelector('#carModalTitle');
      const modalBadge = overlay.querySelector('#carModalBadge');
      const modalPrice = overlay.querySelector('#carModalPrice');
      
      if (modalTitle) modalTitle.textContent = title;
      if (modalBadge) modalBadge.textContent = badge;
      if (modalPrice) modalPrice.textContent = price || '';

      // Specs
      const specList = overlay.querySelector('#carModalSpecs');
      if (specList) {
        specList.innerHTML = '';
        Array.from(card.querySelectorAll('.spec-item')).slice(0, 8).forEach(si => {
          const label = si.textContent.trim();
          const el = document.createElement('div');
          el.className = 'spec-item';
          el.innerHTML = `<div class="icon" aria-hidden="true">${si.querySelector('svg')?.outerHTML || ''}</div><div style="flex:1"><span class="label">Деталь</span><span class="value">${label}</span></div>`;
          specList.appendChild(el);
        });
      }

      // Thumbnails
      if (thumbs) {
        thumbs.innerHTML = '';
        imgs.forEach((s, i) => {
          const t = document.createElement('img');
          t.src = s;
          t.alt = title + ' ' + (i + 1);
          if (i === 0) t.classList.add('active');
          t.addEventListener('click', () => {
            if (mainImg) mainImg.src = s;
            thumbs.querySelectorAll('img').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
          });
          thumbs.appendChild(t);
        });
      }
      
      if (mainImg && imgs[0]) mainImg.src = imgs[0];
      
      openModal();
    });
  });

  // ===== CLOSE HANDLERS =====
  if (btnClose) btnClose.addEventListener('click', closeModal);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeModal();
    }
  });

  // ===== SWIPE-TO-CLOSE (MOBILE) =====
  (function addSwipeClose() {
    let startY = 0, curY = 0, touching = false;
    
    modal.addEventListener('touchstart', (ev) => {
      if (ev.touches.length !== 1) return;
      startY = ev.touches[0].clientY;
      curY = startY;
      touching = true;
      modal.style.transition = 'none';
    }, { passive: true });
    
    modal.addEventListener('touchmove', (ev) => {
      if (!touching) return;
      curY = ev.touches[0].clientY;
      const dy = Math.max(0, curY - startY);
      const details = modal.querySelector('.details');
      if (details && details.scrollTop > 6) return;
      modal.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    
    modal.addEventListener('touchend', () => {
      if (!touching) return;
      touching = false;
      const dy = curY - startY;
      modal.style.transition = '';
      modal.style.transform = '';
      if (dy > 120) {
        modal.style.transition = 'transform 160ms ease-out, opacity 160ms';
        modal.style.transform = 'translateY(100vh)';
        setTimeout(closeModal, 160);
      } else {
        modal.style.transform = '';
      }
    }, { passive: true });
  })();

  // ===== THUMBS: HORIZONTAL DRAG =====
  (function addThumbDrag() {
    if (!thumbs) return;
    let isDown = false, startX = 0, scrollLeft = 0;
    
    thumbs.addEventListener('pointerdown', (e) => {
      isDown = true;
      thumbs.setPointerCapture(e.pointerId);
      startX = e.clientX;
      scrollLeft = thumbs.scrollLeft;
      thumbs.classList.add('dragging-thumb');
    });
    
    thumbs.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      thumbs.scrollLeft = scrollLeft - dx;
    });
    
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => {
      thumbs.addEventListener(ev, () => {
        isDown = false;
        thumbs.classList.remove('dragging-thumb');
      });
    });
  })();

  // ===== KEYBOARD ARROWS TO NAVIGATE THUMBS =====
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!thumbs) return;
      const imgs = Array.from(thumbs.querySelectorAll('img'));
      if (!imgs.length) return;
      const active = thumbs.querySelector('img.active') || imgs[0];
      const idx = imgs.indexOf(active);
      const next = imgs[e.key === 'ArrowLeft' ? (idx - 1 + imgs.length) % imgs.length : (idx + 1) % imgs.length];
      if (next) next.click();
    }
  });

  // ===== BUY BUTTON - SCROLL TO CONTACT =====
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      closeModal();
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // ===== MOBILE NAV DRAWER =====
  const hh = document.querySelector('.header-hamburger');
  const drawer = document.querySelector('.nav-drawer');
  const dback = document.querySelector('.nav-drawer-backdrop');
  
  if (hh && drawer) {
    hh.addEventListener('click', () => {
      drawer.classList.toggle('closed');
      dback?.classList.toggle('open');
      if (!drawer.classList.contains('closed')) {
        lockBodyScroll();
      } else {
        unlockBodyScroll();
      }
    });
    
    if (dback) {
      dback.addEventListener('click', () => {
        drawer.classList.add('closed');
        dback.classList.remove('open');
        unlockBodyScroll();
      });
    }
  }

  // ===== MOBILE NAV TOGGLE (альтернативний варіант) =====
  const mobileBtn = document.querySelector('.mobile-nav-toggle');
  const mainNav = document.getElementById('mainNav');
  
  if (mobileBtn && mainNav) {
    mobileBtn.addEventListener('click', () => {
      const expanded = mobileBtn.getAttribute('aria-expanded') === 'true';
      mobileBtn.setAttribute('aria-expanded', String(!expanded));
      mainNav.classList.toggle('mobile-open');
      const icon = mobileBtn.querySelector('i');
      if (icon) icon.classList.toggle('bi-x-lg');
      
      if (!expanded) {
        lockBodyScroll();
      } else {
        unlockBodyScroll();
      }
    });
    
    // Close when clicking a link
    mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mainNav.classList.remove('mobile-open');
      mobileBtn.setAttribute('aria-expanded', 'false');
      unlockBodyScroll();
      const icon = mobileBtn.querySelector('i');
      if (icon) icon.classList.remove('bi-x-lg');
    }));
  }
});

// ===== SMOOTH SCROLL FOR INTERNAL ANCHORS =====
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;

  const targetId = link.getAttribute('href').substring(1);
  if (!targetId) return;

  const targetEl = document.getElementById(targetId);
  if (!targetEl) return;

  e.preventDefault();

  // Close nav-drawer if open (for mobile)
  const drawer = document.querySelector('.nav-drawer');
  const backdrop = document.querySelector('.nav-drawer-backdrop');
  if (drawer && !drawer.classList.contains('closed')) {
    drawer.classList.add('closed');
    if (backdrop) backdrop.classList.remove('open');
  }

  // Close mobile nav if open
  const mainNav = document.getElementById('mainNav');
  if (mainNav && mainNav.classList.contains('mobile-open')) {
    mainNav.classList.remove('mobile-open');
    const mobileBtn = document.querySelector('.mobile-nav-toggle');
    if (mobileBtn) {
      mobileBtn.setAttribute('aria-expanded', 'false');
      const icon = mobileBtn.querySelector('i');
      if (icon) icon.classList.remove('bi-x-lg');
    }
  }

  // Smooth scroll
  const offsetTop = targetEl.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({
    top: offsetTop,
    behavior: 'smooth'
  });
});

