import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase.js';
import { initMonitoring } from '../lib/monitoring.js';

initMonitoring('album');

const LOCAL_STORAGE_KEY = 'weddingSharedAlbum';
const LIKED_STORAGE_KEY = 'weddingLikedPhotos';

let allPhotos = [];
let filteredPhotos = [];
let selectedFiles = [];
let activeCategory = 'All';
let searchQuery = '';
let sortMode = 'newest';
let currentLightboxIdx = -1;
let slideshowTimer = null;

async function loadContent() {
  const WC = window.WeddingContent;
  let base = null;
  try {
    const r = await fetch('api/content.php', { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      if (data && !data.error) base = data;
    }
  } catch (e) {}
  if (!base) {
    try {
      const r2 = await fetch('content.json', { cache: 'no-store' });
      if (r2.ok) base = await r2.json();
    } catch (e) {}
  }
  if (!base && WC) base = JSON.parse(JSON.stringify(WC.DEFAULT_CONTENT));
  return WC && WC.mergeDefaults ? WC.mergeDefaults(base) : (base || {});
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2600);
}

function getCanonicalAlbumUrl() {
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  if (!u.pathname.endsWith('/album') && !u.pathname.endsWith('/album.html')) {
    u.pathname = u.pathname.replace(/\/[^/]*$/, '') + '/album';
  }
  return u.toString();
}

function getLikedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveLikedSet(set) {
  try {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

// Client-side image compression so phone camera photos (5–12 MB) upload quickly even on venue Wi-Fi/4G
function compressImageFile(file, maxDim = 1800, quality = 0.84) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve({ file, dataUrl: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const outMime = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg');
        const dataUrl = canvas.toDataURL(outMime, quality);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve({ file, dataUrl });
            return;
          }
          const cleanName = (file.name || 'moment.jpg').replace(/\.[^.]+$/, '') + '.jpg';
          const compressedFile = new File([blob], cleanName, { type: outMime, lastModified: Date.now() });
          resolve({ file: compressedFile, dataUrl });
        }, outMime, quality);
      };
      img.onerror = () => resolve({ file, dataUrl: ev.target.result });
      img.src = ev.target.result;
    };
    reader.onerror = () => resolve({ file, dataUrl: null });
    reader.readAsDataURL(file);
  });
}

async function fetchAlbumPhotos() {
  const merged = [];
  const seenUrls = new Set();

  // 1. Primary: PHP API (`api/album.php`) on Hostinger / PHP server
  try {
    const r = await fetch('api/album.php', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      if (j && j.ok && Array.isArray(j.photos)) {
        for (const p of j.photos) {
          if (p && p.url && !seenUrls.has(p.url)) {
            seenUrls.add(p.url);
            merged.push(p);
          }
        }
      }
    }
  } catch (e) {}

  // 2. Optional: Supabase fallback if configured
  if (supabase) {
    try {
      const { data } = await supabase
        .from('album_photos')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(200);
      if (Array.isArray(data)) {
        for (const p of data) {
          if (p && p.url && !seenUrls.has(p.url)) {
            seenUrls.add(p.url);
            merged.push(p);
          }
        }
      }
    } catch (e) {}
  }

  // 3. Browser local fallback (so static preview / offline demo still works seamlessly)
  try {
    const localList = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    if (Array.isArray(localList)) {
      for (const p of localList) {
        if (p && p.url && !seenUrls.has(p.url)) {
          seenUrls.add(p.url);
          merged.push(p);
        }
      }
    }
  } catch (e) {}

  allPhotos = merged;
  updateStats();
  applyFiltersAndRender();
}

function updateStats() {
  const statPhotos = document.getElementById('statPhotos');
  const statGuests = document.getElementById('statGuests');
  const statLikes = document.getElementById('statLikes');
  if (statPhotos) statPhotos.textContent = String(allPhotos.length);
  if (statGuests) {
    const guests = new Set(allPhotos.map(p => (p.guest_name || 'Guest').trim().toLowerCase()).filter(Boolean));
    statGuests.textContent = String(guests.size);
  }
  if (statLikes) {
    const totalLikes = allPhotos.reduce((acc, p) => acc + (Number(p.likes) || 0), 0);
    statLikes.textContent = String(totalLikes);
  }
}

function applyFiltersAndRender() {
  const q = searchQuery.trim().toLowerCase();
  filteredPhotos = allPhotos.filter(p => {
    if (activeCategory !== 'All' && (p.category || 'Reception') !== activeCategory) {
      return false;
    }
    if (q) {
      const hay = `${p.guest_name || ''} ${p.caption || ''} ${p.category || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  filteredPhotos.sort((a, b) => {
    if (sortMode === 'popular') {
      return (Number(b.likes) || 0) - (Number(a.likes) || 0);
    }
    const ta = new Date(a.created_at || 0).getTime() || Number(a.id) || 0;
    const tb = new Date(b.created_at || 0).getTime() || Number(b.id) || 0;
    return sortMode === 'oldest' ? ta - tb : tb - ta;
  });

  renderGrid();
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return dateStr;
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderGrid() {
  const grid = document.getElementById('albumGrid');
  const empty = document.getElementById('albumEmptyState');
  if (!grid || !empty) return;

  if (!filteredPhotos.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  const likedSet = getLikedSet();

  grid.innerHTML = filteredPhotos.map((p, idx) => {
    const pid = p.id || idx;
    const isLiked = likedSet.has(String(pid));
    const likes = Number(p.likes) || 0;
    return `
      <article class="album-card" data-idx="${idx}">
        <div class="album-card-img-wrap" data-open-idx="${idx}">
          <img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.caption || 'Wedding moment by ' + (p.guest_name || 'Guest'))}" loading="lazy" />
          <span class="album-card-cat">${escapeHtml(p.category || 'Reception')}</span>
        </div>
        <div class="album-card-body">
          <div class="album-card-top">
            <div class="album-card-guest">${escapeHtml(p.guest_name || 'Wedding Guest')}</div>
            <div class="album-card-time">${escapeHtml(formatTimeAgo(p.created_at))}</div>
          </div>
          ${p.caption ? `<p class="album-card-caption">${escapeHtml(p.caption)}</p>` : ''}
          <div class="album-card-footer">
            <button type="button" class="album-like-btn ${isLiked ? 'liked' : ''}" data-like-idx="${idx}" aria-label="Like photo">
              ♥ <span>${likes}</span>
            </button>
            <a class="album-dl-link" href="${escapeHtml(p.url)}" download="wedding-moment-${pid}.jpg" title="Download photo">⬇ Save</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('[data-open-idx]').forEach(el => {
    el.addEventListener('click', () => openLightbox(+el.dataset.openIdx));
  });
  grid.querySelectorAll('[data-like-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLike(+btn.dataset.likeIdx);
    });
  });
}

async function handleLike(idx) {
  const photo = filteredPhotos[idx];
  if (!photo) return;
  const key = String(photo.id ?? photo.url);
  const likedSet = getLikedSet();
  if (likedSet.has(key)) {
    toast('You already loved this moment ♥');
    return;
  }
  likedSet.add(key);
  saveLikedSet(likedSet);
  photo.likes = (Number(photo.likes) || 0) + 1;
  updateStats();
  renderGrid();
  if (currentLightboxIdx === idx) {
    const lbLikes = document.getElementById('albLbLikes');
    if (lbLikes) lbLikes.textContent = String(photo.likes);
  }

  if (photo.id && !String(photo.id).startsWith('local-')) {
    try {
      await fetch('api/album.php?action=like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', id: photo.id })
      });
    } catch (e) {}
  }
  // Update local storage copy if present
  try {
    const localList = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const found = localList.find(x => String(x.id) === String(photo.id) || x.url === photo.url);
    if (found) {
      found.likes = photo.likes;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
    }
  } catch (e) {}
}

function openLightbox(idx) {
  if (idx < 0 || idx >= filteredPhotos.length) return;
  currentLightboxIdx = idx;
  const p = filteredPhotos[idx];
  const lb = document.getElementById('albumLightbox');
  const img = document.getElementById('albLbImg');
  const cat = document.getElementById('albLbCat');
  const guest = document.getElementById('albLbGuest');
  const cap = document.getElementById('albLbCaption');
  const likes = document.getElementById('albLbLikes');
  const dl = document.getElementById('albLbDownloadBtn');

  if (img) img.src = p.url;
  if (cat) cat.textContent = p.category || 'Reception';
  if (guest) guest.textContent = `Captured by ${p.guest_name || 'Wedding Guest'}`;
  if (cap) cap.textContent = p.caption || '';
  if (likes) likes.textContent = String(Number(p.likes) || 0);
  if (dl) {
    dl.href = p.url;
    dl.setAttribute('download', `wedding-moment-${p.id || idx + 1}.jpg`);
  }
  if (lb) lb.classList.add('open');
}

function closeLightbox() {
  const lb = document.getElementById('albumLightbox');
  if (lb) lb.classList.remove('open');
  stopSlideshow();
}

function stepLightbox(delta) {
  if (!filteredPhotos.length) return;
  const next = (currentLightboxIdx + delta + filteredPhotos.length) % filteredPhotos.length;
  openLightbox(next);
}

function startSlideshow() {
  if (!filteredPhotos.length) {
    toast('Upload a photo first to start the slideshow!');
    return;
  }
  openLightbox(0);
  toast('Slideshow started');
  clearInterval(slideshowTimer);
  slideshowTimer = setInterval(() => {
    stepLightbox(1);
  }, 3800);
}

function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
}

function renderSelectedPreviews() {
  const emptyEl = document.getElementById('dropzoneEmpty');
  const prevEl = document.getElementById('dropzonePreviews');
  if (!emptyEl || !prevEl) return;

  if (!selectedFiles.length) {
    emptyEl.style.display = 'block';
    prevEl.style.display = 'none';
    prevEl.innerHTML = '';
    return;
  }

  emptyEl.style.display = 'none';
  prevEl.style.display = 'grid';
  prevEl.innerHTML = selectedFiles.map((item, idx) => `
    <div class="dz-preview-item">
      <img src="${item.previewUrl}" alt="Selected photo ${idx + 1}" />
      <button type="button" class="dz-remove-btn" data-rm-idx="${idx}" aria-label="Remove photo">&times;</button>
    </div>
  `).join('') + `
    <button type="button" class="dz-add-more" id="dzAddMoreBtn">+ Add More</button>
  `;

  prevEl.querySelectorAll('[data-rm-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = +btn.dataset.rmIdx;
      if (selectedFiles[i]?.previewUrl) URL.revokeObjectURL(selectedFiles[i].previewUrl);
      selectedFiles.splice(i, 1);
      renderSelectedPreviews();
    });
  });

  document.getElementById('dzAddMoreBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('galleryInput')?.click();
  });
}

function addFilesToSelection(fileList) {
  const incoming = Array.from(fileList || []).filter(f => f.type && f.type.startsWith('image/'));
  if (!incoming.length) {
    toast('Please select image files (JPEG, PNG, WebP)');
    return;
  }
  for (const file of incoming) {
    if (selectedFiles.length >= 10) {
      toast('Maximum 10 photos per upload batch');
      break;
    }
    selectedFiles.push({
      file,
      previewUrl: URL.createObjectURL(file)
    });
  }
  renderSelectedPreviews();
  const uploadBox = document.getElementById('uploadBox');
  if (uploadBox) uploadBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function generateQrCodes(albumUrl) {
  const qrTargets = ['albumQrImg', 'modalQrImg', 'tvWallQrImg'];
  const displayUrl = albumUrl.replace(/^https?:\/\//, '');
  const u1 = document.getElementById('qrCardUrl');
  const u2 = document.getElementById('modalQrUrl');
  const u3 = document.getElementById('tvWallUrl');
  if (u1) u1.textContent = displayUrl;
  if (u2) u2.textContent = displayUrl;
  if (u3) u3.textContent = displayUrl;

  for (const id of qrTargets) {
    const el = document.getElementById(id);
    if (!el) continue;
    try {
      const dataUrl = await QRCode.toDataURL(albumUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#6b2737', light: '#ffffff' }
      });
      el.src = dataUrl;
    } catch (e) {
      el.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(albumUrl)}`;
    }
  }
}

function launchConfetti() {
  const c = document.getElementById('confetti');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = innerWidth;
  c.height = innerHeight;
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * c.width,
    y: -20,
    r: Math.random() * 6 + 3,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    color: ['#c9a961', '#b87a7a', '#9caf88', '#6b2737', '#d4a5a5'][Math.floor(Math.random() * 5)],
    rot: Math.random() * 360,
    vr: (Math.random() - 0.5) * 8
  }));
  let t = 0;
  function frame() {
    ctx.clearRect(0, 0, c.width, c.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vy += 0.05;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
    });
    t++;
    if (t < 180) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, c.width, c.height);
  }
  requestAnimationFrame(frame);
}

async function init() {
  const C = await loadContent();
  const couple = C.couple || { groom: 'Astonie', bride: 'Wanangwa', dateDisplay: 'December 6, 2026', location: 'Blantyre, Malawi', hashtag: '#AstonieAndWanangwa' };

  document.getElementById('navLogo').textContent = `${couple.groom[0]} & ${couple.bride[0]}`;
  document.getElementById('albumNames').innerHTML = `${escapeHtml(couple.groom)} <span class="hero-amp">&amp;</span> ${escapeHtml(couple.bride)}`;
  document.getElementById('qrCardCouple').textContent = `${couple.groom} & ${couple.bride}`;
  document.getElementById('qrCardHashtag').textContent = couple.hashtag || '#AstonieAndWanangwa';
  document.getElementById('footerNames').textContent = `${couple.groom} & ${couple.bride}`;
  document.getElementById('footerDate').textContent = `${couple.dateDisplay} · ${couple.location}`;
  document.title = `Shared Wedding Album — ${couple.groom} & ${couple.bride}`;

  // Pre-fill saved guest name if they uploaded before
  const savedGuestName = localStorage.getItem('weddingGuestName') || new URLSearchParams(location.search).get('guest') || '';
  const nameInput = document.getElementById('guestNameInput');
  if (nameInput && savedGuestName) nameInput.value = savedGuestName;

  const albumUrl = getCanonicalAlbumUrl();
  await generateQrCodes(albumUrl);

  // Camera & Gallery triggers
  const cameraInput = document.getElementById('cameraInput');
  const galleryInput = document.getElementById('galleryInput');

  const triggerCamera = () => cameraInput?.click();
  const triggerGallery = () => galleryInput?.click();

  document.getElementById('quickCameraBtn')?.addEventListener('click', triggerCamera);
  document.getElementById('quickUploadBtn')?.addEventListener('click', triggerGallery);
  document.getElementById('dzCameraBtn')?.addEventListener('click', (e) => { e.stopPropagation(); triggerCamera(); });
  document.getElementById('dzGalleryBtn')?.addEventListener('click', (e) => { e.stopPropagation(); triggerGallery(); });

  const dropzone = document.getElementById('uploadDropzone');
  dropzone?.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    triggerGallery();
  });
  dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer?.files?.length) addFilesToSelection(e.dataTransfer.files);
  });

  cameraInput?.addEventListener('change', (e) => {
    if (e.target.files?.length) addFilesToSelection(e.target.files);
    e.target.value = '';
  });
  galleryInput?.addEventListener('change', (e) => {
    if (e.target.files?.length) addFilesToSelection(e.target.files);
    e.target.value = '';
  });

  // Upload form submission
  const form = document.getElementById('albumUploadForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) {
      toast('Please take a photo or choose at least one picture first');
      triggerGallery();
      return;
    }
    const guestName = (document.getElementById('guestNameInput')?.value || '').trim() || 'Wedding Guest';
    const category = document.getElementById('photoCategorySelect')?.value || 'Reception';
    const caption = (document.getElementById('photoCaptionInput')?.value || '').trim();
    localStorage.setItem('weddingGuestName', guestName);

    const submitBtn = document.getElementById('uploadSubmitBtn');
    const progWrap = document.getElementById('uploadProgressWrap');
    const progFill = document.getElementById('uploadProgressFill');
    const progText = document.getElementById('uploadProgressText');

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading…'; }
    if (progWrap) progWrap.style.display = 'block';

    const uploadedPhotos = [];
    const total = selectedFiles.length;

    try {
      for (let i = 0; i < total; i++) {
        const pct = Math.round(((i) / total) * 100);
        if (progFill) progFill.style.width = `${ Math.max(10, pct) }%`;
        if (progText) progText.textContent = `Optimizing & uploading photo ${i + 1} of ${total}…`;

        const { file: compressedFile, dataUrl } = await compressImageFile(selectedFiles[i].file, 1800, 0.84);
        let savedItem = null;

        // 1. Try PHP backend (Hostinger / local PHP)
        try {
          const fd = new FormData();
          fd.append('file', compressedFile);
          fd.append('guest_name', guestName);
          fd.append('category', category);
          fd.append('caption', caption);
          const r = await fetch('api/album.php', { method: 'POST', body: fd });
          if (r.ok) {
            const j = await r.json();
            if (j && j.ok && j.photo) savedItem = j.photo;
          }
        } catch (err) {}

        // 2. Fallback to Supabase if configured and PHP didn't save
        if (!savedItem && supabase && dataUrl) {
          try {
            const row = { guest_name: guestName, caption, category, url: dataUrl, likes: 0, approved: true };
            const { data, error } = await supabase.from('album_photos').insert(row).select().single();
            if (!error && data) savedItem = data;
          } catch (err) {}
        }

        // 3. Fallback to localStorage (static preview mode)
        if (!savedItem && dataUrl) {
          savedItem = {
            id: 'local-' + Date.now() + '-' + i,
            guest_name: guestName,
            caption,
            category,
            url: dataUrl,
            likes: 0,
            approved: 1,
            created_at: new Date().toISOString()
          };
          try {
            const localList = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
            localList.unshift(savedItem);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList.slice(0, 40)));
          } catch (err) {}
        }

        if (savedItem) uploadedPhotos.push(savedItem);
      }

      if (progFill) progFill.style.width = '100%';
      if (progText) progText.textContent = `Uploaded ${uploadedPhotos.length} photo${uploadedPhotos.length === 1 ? '' : 's'}!`;

      // Cleanup previews
      selectedFiles.forEach(it => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
      selectedFiles = [];
      renderSelectedPreviews();
      const capEl = document.getElementById('photoCaptionInput');
      if (capEl) capEl.value = '';

      await fetchAlbumPhotos();
      launchConfetti();
      toast(`Thank you, ${guestName}! Your photo${uploadedPhotos.length > 1 ? 's are' : ' is'} now in the album.`);
      document.getElementById('albumFeed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setTimeout(() => {
        if (progWrap) progWrap.style.display = 'none';
        if (progFill) progFill.style.width = '0%';
      }, 1200);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload to Wedding Album';
      }
    }
  });

  // Filters, search, sort
  document.querySelectorAll('#albumCategoryTabs .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#albumCategoryTabs .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat || 'All';
      applyFiltersAndRender();
    });
  });

  document.getElementById('albumSearchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value || '';
    applyFiltersAndRender();
  });

  document.getElementById('albumSortSelect')?.addEventListener('change', (e) => {
    sortMode = e.target.value || 'newest';
    applyFiltersAndRender();
  });

  document.getElementById('slideshowBtn')?.addEventListener('click', startSlideshow);

  // Feature 6: Live TV Wall / Projector Mode
  let tvWallTimer = null;
  let tvWallPollTimer = null;
  let tvWallIdx = 0;
  const tvWallOverlay = document.getElementById('tvWallOverlay');
  const tvWallCouple = document.getElementById('tvWallCouple');
  if (tvWallCouple) tvWallCouple.textContent = `${couple.groom} & ${couple.bride}`;

  const renderTvWallSlide = () => {
    const countEl = document.getElementById('tvWallCount');
    if (countEl) countEl.textContent = String(allPhotos.length);
    const imgEl = document.getElementById('tvWallImg');
    const guestEl = document.getElementById('tvWallGuest');
    const capEl = document.getElementById('tvWallCaption');
    if (!allPhotos.length) {
      if (imgEl) imgEl.src = 'uploads/hero-1.jpg';
      if (guestEl) guestEl.textContent = 'Waiting for the first guest photo…';
      if (capEl) capEl.textContent = 'Scan the QR code on the right with your phone camera to snap & upload!';
      return;
    }
    tvWallIdx = tvWallIdx % allPhotos.length;
    const p = allPhotos[tvWallIdx];
    if (imgEl) imgEl.src = p.url;
    if (guestEl) guestEl.textContent = `Captured by ${p.guest_name || 'Wedding Guest'} · ${p.category || 'Reception'}`;
    if (capEl) capEl.textContent = p.caption || '';
  };

  const openTvWall = () => {
    if (!tvWallOverlay) return;
    tvWallOverlay.classList.add('open');
    document.documentElement.requestFullscreen?.().catch(() => {});
    tvWallIdx = 0;
    renderTvWallSlide();
    clearInterval(tvWallTimer);
    clearInterval(tvWallPollTimer);
    tvWallTimer = setInterval(() => {
      tvWallIdx = (tvWallIdx + 1) % Math.max(1, allPhotos.length);
      renderTvWallSlide();
    }, 5000);
    // Poll for newly uploaded guest photos every 12 seconds so the big screen updates live
    tvWallPollTimer = setInterval(() => {
      fetchAlbumPhotos();
    }, 12000);
  };

  const closeTvWall = () => {
    tvWallOverlay?.classList.remove('open');
    clearInterval(tvWallTimer);
    clearInterval(tvWallPollTimer);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  document.getElementById('tvWallBtn')?.addEventListener('click', openTvWall);
  document.getElementById('tvWallCloseBtn')?.addEventListener('click', closeTvWall);

  // Lightbox controls
  document.getElementById('albLbClose')?.addEventListener('click', closeLightbox);
  document.getElementById('albLbPrev')?.addEventListener('click', () => stepLightbox(-1));
  document.getElementById('albLbNext')?.addEventListener('click', () => stepLightbox(1));
  document.getElementById('albLbLikeBtn')?.addEventListener('click', () => {
    if (currentLightboxIdx >= 0) handleLike(currentLightboxIdx);
  });
  document.getElementById('albumLightbox')?.addEventListener('click', (e) => {
    if (e.target.id === 'albumLightbox') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('albumLightbox');
    if (lb && lb.classList.contains('open')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    }
    const qm = document.getElementById('qrModal');
    if (qm && qm.classList.contains('open') && e.key === 'Escape') {
      qm.classList.remove('open');
    }
    if (tvWallOverlay && tvWallOverlay.classList.contains('open') && e.key === 'Escape') {
      closeTvWall();
    }
  });

  // QR Modal & Table QR Card actions
  const qrModal = document.getElementById('qrModal');
  const openQrModal = () => qrModal?.classList.add('open');
  document.getElementById('openQrModalBtn')?.addEventListener('click', openQrModal);
  document.getElementById('heroQrBtn')?.addEventListener('click', openQrModal);
  document.getElementById('qrModalClose')?.addEventListener('click', () => qrModal?.classList.remove('open'));
  qrModal?.addEventListener('click', (e) => { if (e.target.id === 'qrModal') qrModal.classList.remove('open'); });

  const downloadQrCardImage = async () => {
    const card = document.getElementById('printableQrCard');
    if (!card) return;
    try {
      const canvas = await html2canvas(card, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wedding-album-qr-card.png';
      a.click();
      toast('Table QR Card downloaded!');
    } catch (e) {
      toast('Could not download QR card');
    }
  };

  document.getElementById('downloadQrCardBtn')?.addEventListener('click', downloadQrCardImage);
  document.getElementById('modalDownloadQrBtn')?.addEventListener('click', downloadQrCardImage);
  document.getElementById('printQrCardBtn')?.addEventListener('click', () => window.print());

  const shareOrCopyLink = async () => {
    const url = getCanonicalAlbumUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${couple.groom} & ${couple.bride} — Shared Wedding Album`,
          text: 'Snap & upload your wedding photos to our shared album!',
          url
        });
        return;
      } catch (e) {}
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Album link copied to clipboard!');
    } catch (e) {
      prompt('Copy album link:', url);
    }
  };

  document.getElementById('copyAlbumLinkBtn')?.addEventListener('click', shareOrCopyLink);
  document.getElementById('modalShareBtn')?.addEventListener('click', shareOrCopyLink);

  // Auto-open camera if guest scanned QR with `?snap=1`
  if (new URLSearchParams(location.search).get('snap') === '1') {
    setTimeout(() => {
      document.getElementById('uploadBox')?.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  }

  await fetchAlbumPhotos();
}

// Scroll progress & Back to top
const sp = document.getElementById('scrollProgress');
const btt = document.getElementById('backToTop');
function onScroll() {
  const h = document.documentElement;
  const pct = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100;
  if (sp) sp.style.width = pct + '%';
  if (btt) btt.classList.toggle('show', h.scrollTop > 400);
}
window.addEventListener('scroll', onScroll, { passive: true });
if (btt) btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

init();
