// scripts.js — polished modal + mobile nav behavior
document.addEventListener('DOMContentLoaded', () => {
  // ELEMENTS
  const overlay = document.getElementById('carModalOverlay');
  const modal = overlay?.querySelector('.car-modal');
  const mainImg = document.getElementById('carModalMainImg');
  const thumbs = document.getElementById('carModalThumbs');
  const btnClose = document.getElementById('carModalClose') || overlay?.querySelector('.car-modal-close');
  const buyBtn = document.getElementById('carModalBuy');
  let lastActiveTrigger = null;

  if (!overlay || !modal) return;

  // OPEN / CLOSE
  function openModal() {
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    overlay.setAttribute('aria-hidden','false');
    // focus first focusable element in modal
    setTimeout(() => {
      (btnClose || overlay.querySelector('button, [tabindex]'))?.focus();
    }, 120);
    trapFocus(modal);
  }
  function closeModal() {
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
    overlay.setAttribute('aria-hidden','true');
    releaseFocus();
    // restore focus to trigger
    if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') lastActiveTrigger.focus();
  }

  // focus trap (simple)
  let previousActive = null;
  function trapFocus(container) {
    previousActive = document.activeElement;
    const focusables = container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    container.addEventListener('keydown', trapHandler);
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
    container._trapHandler = trapHandler;
  }
  function releaseFocus() {
    if (modal && modal._trapHandler) {
      modal.removeEventListener('keydown', modal._trapHandler);
      modal._trapHandler = null;
    }
    if (previousActive && typeof previousActive.focus === 'function') previousActive.focus();
  }

  // Data-driven open: car buttons
  document.querySelectorAll('.car-button, [data-open-car-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      lastActiveTrigger = btn;
      // extract basic data from card
      const card = btn.closest('.car-card') || btn.closest('article');
      if (!card) return openModal();
      const title = (card.querySelector('h3')?.textContent || '').trim();
      const badge = card.querySelector('.car-badge')?.textContent?.trim() || '';
      const price = (card.querySelector('.price')?.textContent || '').trim();

      // images: dataset.images (csv) or first img in card
      const imgs = (card.dataset.images ? card.dataset.images.split(',').map(s => s.trim()) : []);
      if (!imgs.length) {
        const img = card.querySelector('.car-image img');
        if (img?.src) imgs.push(img.src);
      }

      // fill modal
      overlay.querySelector('#carModalTitle').textContent = title;
      overlay.querySelector('#carModalBadge').textContent = badge;
      overlay.querySelector('#carModalPrice').textContent = price || '';
      // specs
      const specList = overlay.querySelector('#carModalSpecs');
      specList.innerHTML = '';
      Array.from(card.querySelectorAll('.spec-item')).slice(0,8).forEach(si => {
        const label = si.textContent.trim();
        const el = document.createElement('div');
        el.className = 'spec-item';
        el.innerHTML = `<div class="icon" aria-hidden="true">${si.querySelector('svg')?.outerHTML || ''}</div><div style="flex:1"><span class="label">Деталь</span><span class="value">${label}</span></div>`;
        specList.appendChild(el);
      });

      // thumbs
      thumbs.innerHTML = '';
      imgs.forEach((s,i) => {
        const t = document.createElement('img');
        t.src = s;
        t.alt = title + ' ' + (i+1);
        if (i===0) t.classList.add('active');
        t.addEventListener('click', () => {
          mainImg.src = s;
          thumbs.querySelectorAll('img').forEach(x => x.classList.remove('active'));
          t.classList.add('active');
        });
        thumbs.appendChild(t);
      });
      mainImg.src = imgs[0] || '';
      openModal();
    });
  });

  // Close handlers
  if (btnClose) btnClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  // Swipe-to-close (mobile)
  (function addSwipeClose() {
    let startY=0, curY=0, touching=false;
    modal.addEventListener('touchstart', (ev) => {
      if (ev.touches.length !== 1) return;
      startY = ev.touches[0].clientY;
      curY = startY;
      touching = true;
      modal.style.transition = 'none';
    }, {passive:true});
    modal.addEventListener('touchmove', (ev) => {
      if (!touching) return;
      curY = ev.touches[0].clientY;
      const dy = Math.max(0, curY - startY);
      // only drag if details scroll is at top to avoid stealing scroll
      const details = modal.querySelector('.details');
      if (details && details.scrollTop > 6) return;
      modal.style.transform = `translateY(${dy}px)`;
    }, {passive:true});
    modal.addEventListener('touchend', () => {
      if (!touching) return;
      touching = false;
      const dy = curY - startY;
      modal.style.transition = '';
      modal.style.transform = '';
      if (dy > 120) {
        // animate out
        modal.style.transition = 'transform 160ms ease-out, opacity 160ms';
        modal.style.transform = 'translateY(100vh)';
        setTimeout(closeModal, 160);
      } else {
        modal.style.transform = '';
      }
    }, {passive:true});
  })();

  // Thumbs: horizontal drag for desktop/touch
  (function addThumbDrag() {
    if (!thumbs) return;
    let isDown=false, startX=0, scrollLeft=0;
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
    ['pointerup','pointercancel','pointerleave'].forEach(ev => thumbs.addEventListener(ev, (e) => {
      isDown = false;
      thumbs.classList.remove('dragging-thumb');
    }));
  })();

  // small keyboard arrows to navigate thumbs/main image
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const imgs = Array.from(thumbs.querySelectorAll('img'));
      if (!imgs.length) return;
      const active = thumbs.querySelector('img.active') || imgs[0];
      const idx = imgs.indexOf(active);
      const next = imgs[e.key==='ArrowLeft' ? (idx-1+imgs.length)%imgs.length : (idx+1)%imgs.length];
      if (next) next.click();
    }
  });

  // Smooth fallback for links that open modal directly (data attributes)
  document.querySelectorAll('[data-open-car-modal]').forEach(el => el.addEventListener('click', (e)=>{ e.preventDefault(); lastActiveTrigger = el; openModal(); }));

  // Optional: buy button scrolls to contact
  if (buyBtn) buyBtn.addEventListener('click', () => {
    closeModal();
    document.querySelector('#contact')?.scrollIntoView({behavior:'smooth', block:'center'});
  });

  // Mobile nav drawer controls (if present)
  const hh = document.querySelector('.header-hamburger');
  const drawer = document.querySelector('.nav-drawer');
  const dback = document.querySelector('.nav-drawer-backdrop');
  if (hh && drawer) {
    hh.addEventListener('click', () => {
      drawer.classList.toggle('closed');
      dback?.classList.toggle('open');
      if (!drawer.classList.contains('closed')) {
        document.body.classList.add('modal-open'); // reuse to block scroll
      } else {
        document.body.classList.remove('modal-open');
      }
    });
    dback?.addEventListener('click', () => { drawer.classList.add('closed'); dback.classList.remove('open'); document.body.classList.remove('modal-open'); });
  }
});


// ---- Smooth scroll for internal anchors ----
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return; // not an anchor

  const targetId = link.getAttribute('href').substring(1);
  if (!targetId) return;

  const targetEl = document.getElementById(targetId);
  if (!targetEl) return;

  // prevent jump
  e.preventDefault();

  // Close nav-drawer if open (for mobile)
  const drawer = document.querySelector('.nav-drawer');
  const backdrop = document.querySelector('.nav-drawer-backdrop');
  if (drawer && !drawer.classList.contains('closed')) {
    drawer.classList.add('closed');
    backdrop?.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  // Smooth scroll (centered or start)
  const offsetTop = targetEl.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({
    top: offsetTop,
    behavior: 'smooth'
  });
});
