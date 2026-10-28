/**
 * Shams Website - High-Performance Card Entrance & Scroll Animations
 * Cards appear alternately: first card from left to right, next card from right to left, and so on.
 */
document.addEventListener('DOMContentLoaded', () => {
  const animatedElements = document.querySelectorAll(
    '.product-card, .consultation-title-box, .contact-social-bar, .featured-item'
  );

  if (!animatedElements.length) return;

  const isMobile = window.innerWidth <= 768;

  animatedElements.forEach((el, index) => {
    el.classList.add('animate-on-scroll');
    
    // First card (even index: 0, 2, 4...) appears from Left to Right
    // Second card (odd index: 1, 3, 5...) appears from Right to Left
    if (index % 2 === 0) {
      el.classList.add('animate-from-left');
    } else {
      el.classList.add('animate-from-right');
    }

    // Stagger delay for fluid waterfall reveal
    const staggerDelay = isMobile ? (index % 2) * 0.08 : (index % 3) * 0.12;
    el.style.transitionDelay = `${staggerDelay}s`;
  });

  const revealElement = (el) => {
    el.classList.add('is-visible');
  };

  // Immediate visibility check for elements near or in the viewport
  const checkInitialVisibility = () => {
    const triggerBottom = window.innerHeight + 120;
    animatedElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < triggerBottom && rect.bottom > -50) {
        revealElement(el);
      }
    });
  };

  // IntersectionObserver for smooth scroll detection
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealElement(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.02,
      rootMargin: '100px 0px 50px 0px'
    });

    animatedElements.forEach((el) => {
      if (!el.classList.contains('is-visible')) {
        observer.observe(el);
      }
    });
  }

  // Trigger checks immediately on load so top cards animate right away
  checkInitialVisibility();
  requestAnimationFrame(checkInitialVisibility);
  setTimeout(checkInitialVisibility, 150);

  // Smooth scroll listener as reliable backup
  window.addEventListener('scroll', checkInitialVisibility, { passive: true });

  // Initialize Shopping Cart System
  initCart();

  // Hydrate Dynamic Cards from data/cards.json
  loadDynamicCards();
});

/* ==========================================================================
   Shopping Cart Engine (سلة الطلبات)
   ========================================================================== */

const CART_KEY = 'shams_store_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {}
  renderCartUI();
}

function addToCart(title, image, id, price = '---') {
  const cart = getCart();
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({
      id: id || title,
      title,
      image,
      price,
      quantity: 1
    });
  }
  saveCart(cart);
  showCartToast(`تمت إضافة "${title}" إلى السلة ✓`);
  openCart();
}

function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== id);
  saveCart(cart);
}

function updateCartQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity = (item.quantity || 1) + delta;
    if (item.quantity <= 0) {
      removeFromCart(id);
      return;
    }
    saveCart(cart);
  }
}

function clearCart() {
  if (!confirm('هل أنت متأكد من رغبتك في تفريغ سلة الطلبات؟')) return;
  saveCart([]);
}

function openCart() {
  const drawer = document.getElementById('shams-cart-drawer');
  const overlay = document.getElementById('shams-cart-overlay');
  if (drawer && overlay) {
    drawer.classList.add('is-open');
    overlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }
}

function closeCart() {
  const drawer = document.getElementById('shams-cart-drawer');
  const overlay = document.getElementById('shams-cart-overlay');
  if (drawer && overlay) {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
  }
}

function sendWhatsAppOrder() {
  const cart = getCart();
  if (!cart.length) return;

  let message = 'السلام عليكم شركة الشمس للدهانات والديكور، أود الاستفسار وطلب المنتجات التالية من الموقع:\n\n';
  cart.forEach((item, index) => {
    message += `${index + 1}. *${item.title}* (الكمية: ${item.quantity})\n`;
  });
  message += '\nيرجى التواصل معي لتأكيد الأسعار وتفاصيل الاستلام. شكراً لكم!';

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/201017088288?text=${encoded}`, '_blank');
}

let toastTimer = null;
function showCartToast(text) {
  let toast = document.getElementById('shams-cart-toast');
  if (!toast) return;
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${text}</span>`;
  toast.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-shown');
  }, 2800);
}

function renderCartUI() {
  const cart = getCart();
  const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Update Badges
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(b => {
    b.textContent = totalCount;
    b.classList.remove('bump');
    void b.offsetWidth; // trigger reflow
    b.classList.add('bump');
  });

  // Update Drawer Title Count
  const countTag = document.getElementById('cart-items-count-tag');
  if (countTag) {
    countTag.textContent = `${totalCount} منتج`;
  }

  // Render Items List
  const listEl = document.getElementById('cart-items-container');
  const footerEl = document.getElementById('cart-drawer-footer');
  if (!listEl) return;

  if (cart.length === 0) {
    listEl.innerHTML = `
      <div class="cart-empty-state">
        <div class="cart-empty-icon"><i class="fa-solid fa-cart-shopping"></i></div>
        <h4 class="cart-empty-title">سلة الطلبات فارغة</h4>
        <p class="cart-empty-desc">تصفح منتجاتنا وأضف ما يناسبك إلى سلة الطلبات للاستفسار عنها مباشرة عبر الواتساب.</p>
      </div>
    `;
    if (footerEl) footerEl.style.display = 'none';
  } else {
    if (footerEl) footerEl.style.display = 'block';
    listEl.innerHTML = cart.map(item => `
      <div class="cart-item-card" data-id="${item.id}">
        <img src="${item.image}" alt="${item.title}" class="cart-item-img" onerror="this.src='assets/shams-header-logo.png'">
        <div class="cart-item-info">
          <div class="cart-item-title" title="${item.title}">${item.title}</div>
          <div class="cart-item-price-row">
            <span>السعر:</span>
            <span class="product-price-box" style="min-width: 50px; padding: 0.15rem 0.6rem; font-size: 0.8rem;">${item.price || '---'}</span>
          </div>
          <div class="cart-item-qty-row">
            <button type="button" class="qty-btn" onclick="updateCartQty('${item.id}', 1)" aria-label="زيادة الكمية">+</button>
            <span class="qty-val">${item.quantity}</span>
            <button type="button" class="qty-btn" onclick="updateCartQty('${item.id}', -1)" aria-label="تقليل الكمية">−</button>
          </div>
        </div>
        <button type="button" class="cart-item-remove-btn" onclick="removeFromCart('${item.id}')" title="حذف من السلة" aria-label="حذف">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `).join('');
  }
}

function initCart() {
  // Inject Header Cart Button if not present
  const headerActions = document.querySelector('.header-actions');
  if (headerActions && !document.getElementById('header-cart-btn')) {
    const btn = document.createElement('button');
    btn.id = 'header-cart-btn';
    btn.type = 'button';
    btn.className = 'cart-trigger-btn';
    btn.setAttribute('aria-label', 'سلة الطلبات');
    btn.setAttribute('title', 'عرض سلة الطلبات');
    btn.innerHTML = `<i class="fa-solid fa-cart-shopping"></i><span class="cart-badge">0</span>`;
    btn.onclick = openCart;
    headerActions.prepend(btn);
  }

  // Inject Floating Cart Button
  if (!document.getElementById('floating-cart-btn')) {
    const floatBtn = document.createElement('button');
    floatBtn.id = 'floating-cart-btn';
    floatBtn.type = 'button';
    floatBtn.className = 'floating-cart-btn';
    floatBtn.setAttribute('aria-label', 'سلة الطلبات');
    floatBtn.setAttribute('title', 'عرض سلة الطلبات');
    floatBtn.innerHTML = `<i class="fa-solid fa-cart-shopping"></i><span class="cart-badge">0</span>`;
    floatBtn.onclick = openCart;
    document.body.appendChild(floatBtn);
  }

  // Inject Overlay & Drawer Markup
  if (!document.getElementById('shams-cart-drawer')) {
    const cartWrapper = document.createElement('div');
    cartWrapper.innerHTML = `
      <div id="shams-cart-overlay" class="shams-cart-overlay" onclick="closeCart()"></div>
      <aside id="shams-cart-drawer" class="shams-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div class="cart-drawer-header">
          <div class="cart-drawer-title" id="cart-title">
            <i class="fa-solid fa-cart-shopping"></i>
            <span>سلة الطلبات</span>
            <span class="cart-items-count-tag" id="cart-items-count-tag">0 منتج</span>
          </div>
          <button type="button" class="cart-drawer-close" onclick="closeCart()" aria-label="إغلاق السلة">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="cart-drawer-body" id="cart-items-container"></div>
        <div class="cart-drawer-footer" id="cart-drawer-footer">
          <div class="cart-summary-note">
            <i class="fa-solid fa-circle-info" style="color: #eca908; margin-left: 4px;"></i>
            تأكيد التكلفة والكميات بدقة يتم مباشرة من خلال الاستفسار مع خدمة العملاء.
          </div>
          <div class="cart-footer-actions">
            <button type="button" class="btn-whatsapp-order" onclick="sendWhatsAppOrder()">
              <i class="fa-brands fa-whatsapp" style="font-size: 1.25rem;"></i>
              <span>إرسال الطلب عبر واتساب</span>
            </button>
            <button type="button" class="btn-clear-cart" onclick="clearCart()">تفريغ السلة</button>
          </div>
        </div>
      </aside>
      <div id="shams-cart-toast" class="shams-cart-toast" role="status" aria-live="polite"></div>
    `;
    document.body.appendChild(cartWrapper);
  }

  // Close on Escape Key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });

  // Render on load
  renderCartUI();
}

/* ==========================================================================
   Dynamic Card Hydration Engine (from data/cards.json)
   ========================================================================== */

function getCurrentPageKey() {
  const pathname = window.location.pathname;
  let filename = pathname.split('/').pop().replace('.html', '');
  if (!filename || filename === '') filename = 'index';
  return filename;
}

async function loadDynamicCards() {
  const pageKey = getCurrentPageKey();

  try {
    const res = await fetch(`data/cards.json?t=${Date.now()}`);
    if (!res.ok) return;

    const cards = await res.json();
    if (!Array.isArray(cards)) return;

    const pageCards = cards.filter(c => c.page === pageKey);
    if (!pageCards.length) return;

    renderPageDynamicCards(pageKey, pageCards);
  } catch (err) {
    // Graceful offline fallback: static HTML cards remain untouched
    console.debug('Dynamic cards offline or local fallback:', err);
  }
}

function renderPageDynamicCards(pageKey, cards) {
  // Sort cards by order if specified
  cards.sort((a, b) => (a.order || 0) - (b.order || 0));

  if (pageKey === 'decorations') {
    const topGrid = document.querySelector('[data-testid="decorations-grid-top"]');
    const bottomGrid = document.querySelector('[data-testid="decorations-grid-bottom"]');
    
    if (topGrid && bottomGrid) {
      const topCards = cards.filter(c => c.grid === 'top');
      const bottomCards = cards.filter(c => c.grid !== 'top');
      
      if (topCards.length) topGrid.innerHTML = topCards.map((c, i) => buildCardHTML(c, i)).join('');
      if (bottomCards.length) bottomGrid.innerHTML = bottomCards.map((c, i) => buildCardHTML(c, i + topCards.length)).join('');
      setupCardAnimations();
      return;
    }
  }

  // General pages with a single product-grid
  const grid = document.querySelector('.product-grid');
  if (grid) {
    grid.innerHTML = cards.map((c, i) => buildCardHTML(c, i)).join('');
    setupCardAnimations();
  }
}

function buildCardHTML(card, index) {
  const hasLink = !!card.link && card.link !== '#';
  const clickAttr = hasLink ? `onclick="window.location.href='${card.link}'"` : '';
  const cursorStyle = hasLink ? '' : 'style="cursor: default;"';
  const isJotunHome = card.id === 'home-jotun';

  let imageMarkup = '';
  if (isJotunHome) {
    imageMarkup = `
      <div class="product-image-container" data-testid="product-image-container-jotun">
        <a href="${card.link || '#'}" class="product-image-placeholder color-featured jotun-featured-placeholder" data-testid="product-image-placeholder-jotun">
          <div class="jotun-logo-wrapper">
            <img src="${card.image}" id="img-jotun-logo" alt="${card.title}" class="jotun-image-logo jotun-logo-desktop" data-testid="jotun-image-logo">
            <img src="assets/jotun-card-mobile.png" id="img-jotun-logo-mobile" alt="${card.title}" class="jotun-image-logo jotun-logo-mobile" data-testid="jotun-image-logo-mobile">
          </div>
        </a>
      </div>
    `;
  } else {
    imageMarkup = `
      <div class="product-image-container">
        ${hasLink ? `<a href="${card.link}">` : ''}
          <img src="${card.image || 'assets/placeholder.png'}" alt="${card.title}" class="product-card-image" onerror="this.src='assets/placeholder.png'">
        ${hasLink ? `</a>` : ''}
      </div>
    `;
  }

  const safeTitle = (card.title || '').replace(/'/g, "\\'");
  const safeImg = (card.image || '').replace(/'/g, "\\'");
  const safeId = (card.id || '').replace(/'/g, "\\'");
  const safePrice = (card.price || '---').replace(/'/g, "\\'");

  const cartBtn = card.canAddToCart
    ? `<button type="button" class="btn btn-add-to-cart" onclick="event.stopPropagation(); addToCart('${safeTitle}', '${safeImg}', '${safeId}', '${safePrice}')">
        <i class="fa-solid fa-cart-plus"></i> أضف للسلة
       </button>`
    : '';

  const priceBox = card.hasPrice
    ? `<span class="product-price-box" ${card.canAddToCart ? `onclick="event.stopPropagation(); addToCart('${safeTitle}', '${safeImg}', '${safeId}', '${safePrice}')" style="cursor: pointer;" title="أضف للسلة"` : ''}>${card.price || '---'}</span>`
    : '';

  const linkBtn = hasLink
    ? `<a href="${card.link}" class="btn btn-text">${card.linkText || 'عرض التفاصيل ←'}</a>`
    : '';

  let footerMarkup = '';
  if (card.hasPrice || card.canAddToCart || hasLink) {
    footerMarkup = `
      <div class="product-footer">
        ${priceBox}
        <div class="product-footer-actions">
          ${cartBtn}
          ${linkBtn}
        </div>
      </div>
    `;
  }

  const articleId = isJotunHome ? 'id="jotun-card"' : (card.id === 'home-decorations' ? 'id="other-companies"' : `id="${card.id}"`);

  return `
    <article class="product-card" ${articleId} ${clickAttr} ${cursorStyle}>
      ${imageMarkup}
      <div class="product-info ${isJotunHome ? 'jotun-product-info' : ''}">
        ${isJotunHome ? '<div class="jotun-card-details">' : ''}
          <h3 class="product-title ${isJotunHome ? 'jotun-title' : ''}">
            ${hasLink ? `<a href="${card.link}" style="color: inherit; text-decoration: none;">` : ''}
              ${card.title}
            ${hasLink ? `</a>` : ''}
          </h3>
          <p class="product-desc ${isJotunHome ? 'jotun-desc' : ''}">
            ${card.desc || ''}
          </p>
        ${isJotunHome ? '</div>' : ''}
        ${footerMarkup}
      </div>
    </article>
  `;
}

function setupCardAnimations() {
  const cards = document.querySelectorAll('.product-card');
  const isMobile = window.innerWidth <= 768;

  cards.forEach((el, index) => {
    el.classList.add('animate-on-scroll');
    if (index % 2 === 0) {
      el.classList.add('animate-from-left');
    } else {
      el.classList.add('animate-from-right');
    }
    const delay = isMobile ? (index % 2) * 0.08 : (index % 3) * 0.12;
    el.style.transitionDelay = `${delay}s`;
    // Animate into view
    requestAnimationFrame(() => el.classList.add('is-visible'));
  });
}

