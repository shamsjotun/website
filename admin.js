/**
 * Admin Dashboard Logic - Shams Design Studio (شركة الشمس للدهانات والديكور)
 * Direct GitHub Repository Integration (shamsjotun/website)
 */

const GITHUB_CONFIG = {
  owner: 'shamsjotun',
  repo: 'website',
  branch: 'main',
  cardsPath: 'data/cards.json',
  assetsDir: 'assets'
};

const PAGES_META = {
  'all': 'جميع الصفحات',
  'index': 'الصفحة الرئيسية',
  'decorations': 'الديكورات',
  'plastics': 'البلاستيكات',
  'lacquers': 'اللاكيهات',
  'primers': 'التأسيسات',
  'wood-alternatives': 'بدائل الخشب',
  'marble-alternatives': 'بدائل الرخام',
  'foutec': 'الفيوتيك',
  'chipboard': 'الشيبورد',
  'wallpaper-3d': 'ورق ثري دي',
  'malaysian-gypsum': 'جبس ماليزي',
  'jotun': 'يوتن الرئيسية',
  'jotun-interior': 'يوتن - دهانات داخلية'
};

// Application State
let currentCards = [];
let cardsFileSha = null;
let activePageFilter = 'all';
let editingCardId = null;
let currentPatToken = localStorage.getItem('shams_admin_pat') || '';
let selectedImageFile = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initFilters();
  initModalEvents();
  initImageDropzone();
});

/* ==========================================================================
   1. Authentication & GitHub API
   ========================================================================== */

function initAuth() {
  const authOverlay = document.getElementById('admin-auth-overlay');
  const authForm = document.getElementById('admin-auth-form');
  const patInput = document.getElementById('admin-pat-input');
  const logoutBtn = document.getElementById('admin-btn-logout');

  if (currentPatToken) {
    verifyAndConnect(currentPatToken);
  } else {
    authOverlay.style.display = 'flex';
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = patInput.value.trim();
    if (!token) {
      showToast('يرجى إدخال رمز الوصول (GitHub Token)', 'error');
      return;
    }

    const submitBtn = document.getElementById('admin-btn-auth-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="admin-spinner"></span> جاري التحقق...';

    const isValid = await verifyAndConnect(token);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> دخول لوحة التحكم';

    if (isValid) {
      localStorage.setItem('shams_admin_pat', token);
      currentPatToken = token;
      authOverlay.style.display = 'none';
      showToast('تم الاتصال بمستودع GitHub بنجاح', 'success');
    } else {
      showToast('رمز الوصول غير صالح أو ليس لديه صلاحية التعديل (repo access)', 'error');
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('shams_admin_pat');
      currentPatToken = '';
      window.location.reload();
    });
  }
}

async function verifyAndConnect(token) {
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userRes.ok) return false;
    const userData = await userRes.json();

    // Update UI Header with user info
    const userSpan = document.getElementById('admin-user-name');
    if (userSpan) userSpan.textContent = userData.name || userData.login;

    const authOverlay = document.getElementById('admin-auth-overlay');
    if (authOverlay) authOverlay.style.display = 'none';

    // Fetch live cards
    await loadCardsFromGitHub();
    return true;
  } catch (err) {
    console.error('Authentication Error:', err);
    return false;
  }
}

/* ==========================================================================
   2. Fetching & Saving Cards
   ========================================================================== */

async function loadCardsFromGitHub() {
  const loadingIndicator = document.getElementById('admin-cards-loading');
  if (loadingIndicator) loadingIndicator.style.display = 'block';

  try {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.cardsPath}?ref=${GITHUB_CONFIG.branch}&t=${Date.now()}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${currentPatToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      cardsFileSha = data.sha;
      // Decode UTF-8 base64 properly
      const decodedJson = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
      currentCards = JSON.parse(decodedJson);
    } else {
      // Fallback to local data file
      const localRes = await fetch('data/cards.json');
      currentCards = await localRes.json();
    }
  } catch (err) {
    console.warn('Falling back to local cards.json:', err);
    const localRes = await fetch('data/cards.json');
    currentCards = await localRes.json();
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    renderFilterCounts();
    renderCards();
  }
}

async function saveCardsToGitHub(commitMessage = 'Update cards via Admin Dashboard') {
  if (!currentPatToken) {
    showToast('يجب تسجيل الدخول برمز GitHub أولاً', 'error');
    return false;
  }

  try {
    // If we don't have sha, fetch it first
    if (!cardsFileSha) {
      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.cardsPath}?ref=${GITHUB_CONFIG.branch}`, {
        headers: {
          'Authorization': `token ${currentPatToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        cardsFileSha = getData.sha;
      }
    }

    const jsonString = JSON.stringify(currentCards, null, 2);
    // Properly encode UTF-8 to Base64
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.cardsPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${currentPatToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        sha: cardsFileSha,
        branch: GITHUB_CONFIG.branch
      })
    });

    if (putRes.ok) {
      const resData = await putRes.json();
      cardsFileSha = resData.content.sha;
      return true;
    } else {
      const errData = await putRes.json();
      console.error('Failed to commit to GitHub:', errData);
      showToast(`فشل الحفظ في GitHub: ${errData.message}`, 'error');
      return false;
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast('حدث خطأ أثناء الاتصال بـ GitHub', 'error');
    return false;
  }
}

async function uploadImageToGitHub(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawBase64 = reader.result.split(',')[1];
        // Clean filename: remove special characters, append timestamp
        const cleanExt = file.name.split('.').pop().toLowerCase() || 'png';
        const sanitizedBase = file.name.substring(0, file.name.lastIndexOf('.'))
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-');
        const filename = `${sanitizedBase}-${Date.now()}.${cleanExt}`;
        const targetPath = `${GITHUB_CONFIG.assetsDir}/${filename}`;

        const uploadRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${targetPath}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${currentPatToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: `Upload image ${filename} via Admin Dashboard`,
            content: rawBase64,
            branch: GITHUB_CONFIG.branch
          })
        });

        if (uploadRes.ok) {
          resolve(targetPath);
        } else {
          const errData = await uploadRes.json();
          reject(new Error(errData.message || 'Image upload failed'));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/* ==========================================================================
   3. Card Filtering & Rendering
   ========================================================================== */

function initFilters() {
  const pillsContainer = document.getElementById('admin-filter-pills');
  if (!pillsContainer) return;

  pillsContainer.innerHTML = '';
  Object.keys(PAGES_META).forEach(pageKey => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `admin-filter-pill ${pageKey === activePageFilter ? 'active' : ''}`;
    btn.dataset.page = pageKey;
    btn.innerHTML = `${PAGES_META[pageKey]} <span class="pill-count" id="count-${pageKey}">0</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-filter-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      activePageFilter = pageKey;
      renderCards();
    });
    pillsContainer.appendChild(btn);
  });
}

function renderFilterCounts() {
  Object.keys(PAGES_META).forEach(pageKey => {
    const countEl = document.getElementById(`count-${pageKey}`);
    if (!countEl) return;
    if (pageKey === 'all') {
      countEl.textContent = currentCards.length;
    } else {
      const match = currentCards.filter(c => c.page === pageKey);
      countEl.textContent = match.length;
    }
  });

  const totalCountBadge = document.getElementById('admin-total-cards-count');
  if (totalCountBadge) totalCountBadge.textContent = currentCards.length;
}

function renderCards() {
  const container = document.getElementById('admin-cards-grid');
  if (!container) return;

  const filteredCards = activePageFilter === 'all' 
    ? currentCards 
    : currentCards.filter(c => c.page === activePageFilter);

  if (filteredCards.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <div class="admin-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
        <h3 class="admin-empty-title">لا توجد بطاقات في هذا القسم</h3>
        <p class="admin-empty-desc">يمكنك إضافة بطاقة جديدة لهذا القسم بالضغط على زر "إضافة بطاقة جديدة" بالأعلى.</p>
        <button type="button" class="admin-btn admin-btn-primary" onclick="openAddCardModal('${activePageFilter === 'all' ? 'index' : activePageFilter}')">
          <i class="fa-solid fa-plus"></i> إضافة بطاقة الآن
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filteredCards.forEach(card => {
    const pageName = PAGES_META[card.page] || card.page;
    const isProduct = card.type === 'product';
    const hasCart = card.canAddToCart;
    const hasPrice = card.hasPrice;

    const cardEl = document.createElement('article');
    cardEl.className = 'admin-card';
    cardEl.innerHTML = `
      <div class="admin-card-image-wrapper">
        <span class="admin-card-page-tag">${pageName}</span>
        <span class="admin-card-type-tag ${isProduct ? 'type-product' : 'type-navigation'}">
          ${isProduct ? '<i class="fa-solid fa-box"></i> بطاقة منتج' : '<i class="fa-solid fa-arrow-up-right-from-square"></i> بطاقة توجيه'}
        </span>
        <img src="${card.image || 'assets/placeholder.png'}" alt="${card.title}" class="admin-card-image" onerror="this.src='assets/placeholder.png'">
      </div>
      <div class="admin-card-body">
        <h3 class="admin-card-title">${card.title}</h3>
        <p class="admin-card-desc">${card.desc || 'لا يوجد وصف'}</p>
        
        <div class="admin-card-meta">
          <span class="admin-meta-price">
            <i class="fa-solid fa-tag"></i> السعر: <strong>${hasPrice ? card.price : 'بدون'}</strong>
          </span>
          <span class="admin-meta-cart ${hasCart ? '' : 'disabled'}">
            <i class="fa-solid ${hasCart ? 'fa-cart-shopping' : 'fa-ban'}"></i> ${hasCart ? 'متاح بالسلة' : 'غير متاح'}
          </span>
        </div>

        <div class="admin-card-actions">
          <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" onclick="openEditCardModal('${card.id}')">
            <i class="fa-solid fa-pen-to-square"></i> تعديل
          </button>
          <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" onclick="confirmDeleteCard('${card.id}')">
            <i class="fa-solid fa-trash-can"></i> حذف
          </button>
        </div>
      </div>
    `;
    container.appendChild(cardEl);
  });
}

/* ==========================================================================
   4. Add / Edit Card Modal
   ========================================================================== */

function initModalEvents() {
  const cardModal = document.getElementById('admin-card-modal');
  const cardForm = document.getElementById('admin-card-form');
  const closeBtn = document.getElementById('admin-modal-close');
  const cancelBtn = document.getElementById('admin-btn-cancel-modal');
  const addBtn = document.getElementById('admin-btn-add-card');

  // Toggle controls inside modal
  const typeSelect = document.getElementById('card-type-select');
  const priceToggle = document.getElementById('card-price-toggle');
  const priceInputGroup = document.getElementById('card-price-group');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openAddCardModal(activePageFilter === 'all' ? 'index' : activePageFilter);
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeCardModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeCardModal);

  // Close when clicking outside modal box
  if (cardModal) {
    cardModal.addEventListener('click', (e) => {
      if (e.target === cardModal) closeCardModal();
    });
  }

  // Type change handler
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      const isProduct = typeSelect.value === 'product';
      const cartToggle = document.getElementById('card-cart-toggle');
      if (isProduct) {
        document.getElementById('card-link-text').value = 'عرض الكتالوج (PDF) ←';
      } else {
        document.getElementById('card-link-text').value = 'عرض التفاصيل ←';
        if (cartToggle) cartToggle.checked = false;
      }
    });
  }

  // Price toggle handler
  if (priceToggle && priceInputGroup) {
    priceToggle.addEventListener('change', () => {
      priceInputGroup.style.display = priceToggle.checked ? 'flex' : 'none';
    });
  }

  // Form submit handler
  if (cardForm) {
    cardForm.addEventListener('submit', handleCardFormSubmit);
  }
}

function openAddCardModal(defaultPage = 'index') {
  editingCardId = null;
  selectedImageFile = null;

  document.getElementById('admin-modal-title-text').textContent = 'إضافة بطاقة جديدة';
  document.getElementById('admin-card-form').reset();

  const pageSelect = document.getElementById('card-page-select');
  if (pageSelect) pageSelect.value = defaultPage;

  document.getElementById('card-type-select').value = 'navigation';
  document.getElementById('card-price-toggle').checked = false;
  document.getElementById('card-price-group').style.display = 'none';
  document.getElementById('card-price').value = '---';
  document.getElementById('card-cart-toggle').checked = false;
  document.getElementById('card-link-text').value = 'عرض التفاصيل ←';

  // Reset image preview
  const previewBox = document.getElementById('card-image-preview-box');
  if (previewBox) previewBox.classList.remove('active');
  document.getElementById('card-image-url').value = '';

  const modal = document.getElementById('admin-card-modal');
  if (modal) modal.classList.add('active');
}

function openEditCardModal(cardId) {
  const card = currentCards.find(c => c.id === cardId);
  if (!card) return;

  editingCardId = cardId;
  selectedImageFile = null;

  document.getElementById('admin-modal-title-text').textContent = `تعديل بطاقة: ${card.title}`;
  document.getElementById('card-page-select').value = card.page || 'index';
  document.getElementById('card-title').value = card.title || '';
  document.getElementById('card-desc').value = card.desc || '';
  document.getElementById('card-type-select').value = card.type || 'navigation';
  document.getElementById('card-link').value = card.link || '';
  document.getElementById('card-link-text').value = card.linkText || 'عرض التفاصيل ←';
  
  const priceToggle = document.getElementById('card-price-toggle');
  priceToggle.checked = !!card.hasPrice;
  document.getElementById('card-price-group').style.display = card.hasPrice ? 'flex' : 'none';
  document.getElementById('card-price').value = card.price || '---';

  document.getElementById('card-cart-toggle').checked = !!card.canAddToCart;
  document.getElementById('card-image-url').value = card.image || '';

  // Setup preview
  const previewBox = document.getElementById('card-image-preview-box');
  const previewImg = document.getElementById('card-image-preview');
  if (card.image) {
    previewImg.src = card.image;
    previewBox.classList.add('active');
  } else {
    previewBox.classList.remove('active');
  }

  const modal = document.getElementById('admin-card-modal');
  if (modal) modal.classList.add('active');
}

function closeCardModal() {
  const modal = document.getElementById('admin-card-modal');
  if (modal) modal.classList.remove('active');
  editingCardId = null;
  selectedImageFile = null;
}

async function handleCardFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('card-title').value.trim();
  const page = document.getElementById('card-page-select').value;
  const desc = document.getElementById('card-desc').value.trim();
  const type = document.getElementById('card-type-select').value;
  const link = document.getElementById('card-link').value.trim();
  const linkText = document.getElementById('card-link-text').value.trim() || 'عرض التفاصيل ←';
  const hasPrice = document.getElementById('card-price-toggle').checked;
  const price = hasPrice ? (document.getElementById('card-price').value.trim() || '---') : '---';
  const canAddToCart = document.getElementById('card-cart-toggle').checked;
  let imageUrl = document.getElementById('card-image-url').value.trim();

  if (!title) {
    showToast('يرجى إدخال عنوان البطاقة', 'error');
    return;
  }

  const saveBtn = document.getElementById('admin-btn-save-card');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="admin-spinner"></span> جاري الحفظ في GitHub...';

  try {
    // 1. If an image file was selected from computer/phone, upload it first
    if (selectedImageFile) {
      showToast('جاري رفع الصورة إلى مجلد assets في GitHub...', 'info');
      imageUrl = await uploadImageToGitHub(selectedImageFile);
    }

    if (!imageUrl) {
      imageUrl = 'assets/placeholder.png';
    }

    if (editingCardId) {
      // Update existing card
      const idx = currentCards.findIndex(c => c.id === editingCardId);
      if (idx !== -1) {
        currentCards[idx] = {
          ...currentCards[idx],
          page,
          title,
          desc,
          type,
          link,
          linkText,
          hasPrice,
          price,
          canAddToCart,
          image: imageUrl
        };
      }
    } else {
      // Add new card
      const newId = `${page}-${Date.now().toString(36)}`;
      const newCard = {
        id: newId,
        page,
        grid: 'main',
        order: currentCards.filter(c => c.page === page).length + 1,
        title,
        desc,
        image: imageUrl,
        type,
        link,
        linkText,
        hasPrice,
        price,
        canAddToCart
      };
      currentCards.push(newCard);
    }

    const actionText = editingCardId ? `Update card "${title}"` : `Add new card "${title}"`;
    const success = await saveCardsToGitHub(actionText);

    if (success) {
      closeCardModal();
      renderFilterCounts();
      renderCards();
      showToast('تم حفظ التعديلات بنجاح ونشرها إلى GitHub!', 'success');
    }
  } catch (err) {
    console.error('Error saving card:', err);
    showToast(`حدث خطأ أثناء الحفظ: ${err.message}`, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ ونشر التغييرات';
  }
}

/* ==========================================================================
   5. Delete Card Confirmation
   ========================================================================== */

async function confirmDeleteCard(cardId) {
  const card = currentCards.find(c => c.id === cardId);
  if (!card) return;

  const confirmed = confirm(`هل أنت متأكد من رغبتك في حذف البطاقة "${card.title}" بشكل نهائي؟`);
  if (!confirmed) return;

  const cardTitle = card.title;
  currentCards = currentCards.filter(c => c.id !== cardId);

  showToast(`جاري حذف البطاقة "${cardTitle}" من GitHub...`, 'info');
  const success = await saveCardsToGitHub(`Delete card "${cardTitle}" via Admin Dashboard`);

  if (success) {
    renderFilterCounts();
    renderCards();
    showToast(`تم حذف البطاقة "${cardTitle}" بنجاح`, 'success');
  }
}

/* ==========================================================================
   6. Image Dropzone & Preview
   ========================================================================== */

function initImageDropzone() {
  const dropzone = document.getElementById('card-image-dropzone');
  const fileInput = document.getElementById('card-image-file-input');
  const previewBox = document.getElementById('card-image-preview-box');
  const previewImg = document.getElementById('card-image-preview');
  const manualUrlInput = document.getElementById('card-image-url');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

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
      handleImageSelection(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleImageSelection(fileInput.files[0]);
    }
  });

  if (manualUrlInput) {
    manualUrlInput.addEventListener('input', () => {
      const val = manualUrlInput.value.trim();
      if (val) {
        previewImg.src = val;
        previewBox.classList.add('active');
        selectedImageFile = null;
      }
    });
  }

  function handleImageSelection(file) {
    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)', 'error');
      return;
    }
    selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewBox.classList.add('active');
      manualUrlInput.value = `assets/${file.name}`;
    };
    reader.readAsDataURL(file);
  }
}

/* ==========================================================================
   7. Toast Notifications
   ========================================================================== */

function showToast(message, type = 'success') {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';
  if (type === 'info') icon = 'fa-circle-info';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  // Remove after 3.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
