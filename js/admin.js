const WC = window.WeddingContent;
let state = WC.getContent();

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'site', label: 'Site Text' },
  { id: 'couple', label: 'Couple' },
  { id: 'invitation', label: 'Invitation' },
  { id: 'media', label: 'Media & Gallery' },
  { id: 'story', label: 'Story' },
  { id: 'details', label: 'Details' },
  { id: 'party', label: 'Party' },
  { id: 'faq', label: 'FAQ' },
  { id: 'rsvps', label: 'RSVPs' },
  { id: 'guestbook', label: 'Guestbook' },
  { id: 'publish', label: 'Publish' },
  { id: 'settings', label: 'Settings' },
];

// Password gate
const loginScreen = document.getElementById('loginScreen');
const adminApp = document.getElementById('adminApp');
function checkAuth() {
  if (sessionStorage.getItem('adminAuth') === '1') {
    loginScreen.style.display = 'none';
    adminApp.style.display = 'block';
    initAdmin();
  }
}
document.getElementById('loginBtn').addEventListener('click', () => {
  const pass = document.getElementById('loginPass').value;
  const stored = localStorage.getItem('adminPassword') || 'admin';
  if (pass === stored) {
    sessionStorage.setItem('adminAuth', '1');
    loginScreen.style.display = 'none';
    adminApp.style.display = 'block';
    initAdmin();
  } else {
    alert('Wrong password');
  }
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('adminAuth');
  location.reload();
});

function initAdmin() {
  const sideNav = document.getElementById('sideNav');
  const panelsEl = document.getElementById('panels');
  tabs.forEach(t => {
    const b = document.createElement('div'); b.className = 'nav-item'; b.textContent = t.label; b.dataset.tab = t.id;
    b.addEventListener('click', () => activate(t.id));
    sideNav.appendChild(b);
    const p = document.createElement('div'); p.className = 'panel'; p.id = 'panel-' + t.id;
    panelsEl.appendChild(p);
  });
  activate('dashboard');
  renderAll();
}

function activate(id) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + id));
  const t = tabs.find(x => x.id === id);
  document.getElementById('panelTitle').textContent = t ? t.label : '';
}

function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

function renderAll() {
  renderDashboard();
  renderSite();
  renderCouple();
  renderInvitation();
  renderMedia();
  renderStory();
  renderDetails();
  renderParty();
  renderFaq();
  renderRsvps();
  renderGuestbook();
  renderPublish();
  renderSettings();
}

// Dashboard
function renderDashboard() {
  const rsvps = JSON.parse(localStorage.getItem('rsvp') || '[]');
  const gb = JSON.parse(localStorage.getItem('gb') || '[]');
  document.getElementById('panel-dashboard').innerHTML = `
    <h2>Dashboard</h2>
    <div class="row">
      <div class="field"><label>Wedding date</label><input value="${escapeAttr(state.couple.dateDisplay)}" readonly></div>
      <div class="field"><label>Venue</label><input value="${escapeAttr(state.couple.venue)}" readonly></div>
    </div>
    <div class="row">
      <div class="field"><label>Total RSVPs</label><input value="${rsvps.length}" readonly></div>
      <div class="field"><label>Guestbook messages</label><input value="${gb.length}" readonly></div>
    </div>
    <div class="row">
      <div class="field"><label>Gallery images</label><input value="${state.gallery.length}" readonly></div>
      <div class="field"><label>Wedding party members</label><input value="${state.party.length}" readonly></div>
    </div>
    <p class="muted" style="margin-top:14px;font-size:13px">Use the sidebar to edit content. Save changes, then Publish to make them live for all visitors.</p>`;
}

// Site text
function renderSite() {
  const s = state.site || {};
  const fields = [
    ['eyebrow', 'Hero eyebrow'], ['storyTitle', 'Story title'], ['storySub', 'Story subtitle'],
    ['detailsTitle', 'Details title'], ['detailsSub', 'Details subtitle'],
    ['galleryTitle', 'Gallery title'], ['gallerySub', 'Gallery subtitle'],
    ['partyTitle', 'Party title'], ['partySub', 'Party subtitle'],
    ['rsvpTitle', 'RSVP title'], ['rsvpSub', 'RSVP subtitle'],
    ['faqTitle', 'FAQ title'], ['faqSub', 'FAQ subtitle'],
    ['guestbookTitle', 'Guestbook title'], ['guestbookSub', 'Guestbook subtitle'],
    ['footerMessage', 'Footer message'],
  ];
  document.getElementById('panel-site').innerHTML = `<h2>Site Text</h2>` + fields.map(([k, l]) =>
    `<div class="field"><label>${l}</label><input id="site_${k}" value="${escapeAttr(s[k] || '')}"></div>`).join('');
}

// Couple
function renderCouple() {
  const c = state.couple;
  document.getElementById('panel-couple').innerHTML = `
    <h2>Couple Details</h2>
    <div class="row"><div class="field"><label>Groom</label><input id="c_groom" value="${escapeAttr(c.groom)}"></div><div class="field"><label>Bride</label><input id="c_bride" value="${escapeAttr(c.bride)}"></div></div>
    <div class="row"><div class="field"><label>Date (ISO)</label><input id="c_dateISO" value="${escapeAttr(c.dateISO)}" placeholder="2026-12-06T14:00:00"></div><div class="field"><label>Date display</label><input id="c_dateDisplay" value="${escapeAttr(c.dateDisplay)}"></div></div>
    <div class="row"><div class="field"><label>Location</label><input id="c_location" value="${escapeAttr(c.location)}"></div><div class="field"><label>Venue</label><input id="c_venue" value="${escapeAttr(c.venue)}"></div></div>
    <div class="row"><div class="field"><label>RSVP deadline</label><input id="c_rsvpDeadline" value="${escapeAttr(c.rsvpDeadline)}"></div><div class="field"><label>Hashtag</label><input id="c_hashtag" value="${escapeAttr(c.hashtag)}"></div></div>
    <div class="field"><label>Generate invitation link for a guest</label><div style="display:flex;gap:8px"><input id="invGuest" placeholder="Guest name"><button class="btn-sm" id="genInv" type="button">Generate</button></div><div id="invResult" style="margin-top:8px;font-size:13px;word-break:break-all"></div></div>`;
  document.getElementById('genInv').addEventListener('click', () => {
    const name = document.getElementById('invGuest').value.trim();
    const url = `${location.origin}${location.pathname.replace('admin.html', 'invitation.html')}?to=${encodeURIComponent(name)}`;
    const res = document.getElementById('invResult');
    res.innerHTML = name ? `<a href="${url}" target="_blank">${url}</a> <button class="btn-sm btn-outline" id="copyInv">Copy</button>` : 'Enter a guest name';
    const cb = document.getElementById('copyInv');
    if (cb) cb.addEventListener('click', () => { navigator.clipboard.writeText(url); toast('Copied'); });
  });
}

// Invitation
function renderInvitation() {
  const inv = state.invitation || {};
  document.getElementById('panel-invitation').innerHTML = `
    <h2>Invitation Page</h2>
    <div class="field"><label>Eyebrow</label><input id="inv_eyebrow" value="${escapeAttr(inv.eyebrow || 'You are cordially invited')}"></div>
    <div class="field"><label>Title line</label><input id="inv_title" value="${escapeAttr(inv.title || 'to the wedding of')}"></div>
    <div class="field"><label>Message</label><textarea id="inv_message" rows="3">${escapeHtml(inv.message || 'Together with our families, we invite you to share in our joy as we unite in marriage.')}</textarea></div>
    <div class="field"><label>RSVP button text</label><input id="inv_rsvp" value="${escapeAttr(inv.rsvpText || 'RSVP Now')}"></div>`;
}

// Media
function renderMedia() {
  const m = state.media || {};
  const el = document.getElementById('panel-media');
  el.innerHTML = `
    <h2>Media & Gallery</h2>
    <div class="row">
      <div class="field"><label>Hero background image URL</label><input id="m_hero" value="${escapeAttr(m.heroImage || '')}" placeholder="https://... or upload"></div>
      <div class="field"><label>Cover image URL</label><input id="m_cover" value="${escapeAttr(m.coverImage || '')}" placeholder="https://..."></div>
    </div>
    <div class="field"><label>Background music URL</label><input id="m_music" value="${escapeAttr(m.musicUrl || '')}" placeholder="https://...mp3"></div>
    <div class="field"><label>Upload images</label><input type="file" id="m_upload" accept="image/*" multiple></div>
    <p class="muted" style="font-size:12px">Uploaded images are stored in this browser. For production, host externally and paste URLs, or Publish to commit them.</p>
    <h3 style="margin:18px 0 10px;font-size:20px;color:var(--burgundy)">Media Library</h3>
    <div class="media-grid" id="mediaGrid"></div>`;
  const grid = el.querySelector('#mediaGrid');
  state.gallery.forEach((u, idx) => {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.innerHTML = `<img src="${escapeAttr(u)}" onerror="this.style.opacity=.3">
      <div class="actions">
        <button data-act="hero" data-idx="${idx}">Hero</button>
        <button data-act="cover" data-idx="${idx}">Cover</button>
        <button data-act="del" data-idx="${idx}">✕</button>
      </div>`;
    grid.appendChild(card);
  });
  grid.querySelectorAll('button').forEach(b => b.addEventListener('click', e => {
    const idx = +e.target.dataset.idx;
    const act = e.target.dataset.act;
    if (act === 'del') { state.gallery.splice(idx, 1); renderMedia(); toast('Removed'); }
    else if (act === 'hero') { document.getElementById('m_hero').value = state.gallery[idx]; toast('Set as hero'); }
    else if (act === 'cover') { document.getElementById('m_cover').value = state.gallery[idx]; toast('Set as cover'); }
  }));
  el.querySelector('#m_upload').addEventListener('change', e => {
    [...e.target.files].forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => { state.gallery.unshift(ev.target.result); renderMedia(); toast('Image added'); };
      reader.readAsDataURL(file);
    });
  });
}

// Story
function renderStory() {
  const el = document.getElementById('panel-story');
  el.innerHTML = `<h2>Our Story</h2><div class="list-editor" id="storyList"></div><button class="btn-sm" id="addStory">+ Add milestone</button>`;
  const list = el.querySelector('#storyList');
  state.story.forEach((s, idx) => {
    const div = document.createElement('div'); div.className = 'list-item';
    div.innerHTML = `<button class="remove" data-idx="${idx}">&times;</button>
      ${idx > 0 ? `<button class="move" data-idx="${idx}" data-dir="-1">↑</button>` : ''}
      ${idx < state.story.length - 1 ? `<button class="move" data-idx="${idx}" data-dir="1">↓</button>` : ''}
      <div class="row"><div class="field"><label>Year</label><input class="s-year" value="${escapeAttr(s.year)}"></div><div class="field"><label>Title</label><input class="s-title" value="${escapeAttr(s.title)}"></div></div>
      <div class="field"><label>Text</label><textarea class="s-text" rows="2">${escapeHtml(s.text)}</textarea></div>`;
    list.appendChild(div);
  });
  el.querySelector('#addStory').addEventListener('click', () => { state.story.push({ year: '2026', title: 'New milestone', text: 'Description' }); renderStory(); });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => { state.story.splice(+e.target.dataset.idx, 1); renderStory(); }));
  list.querySelectorAll('.move').forEach(b => b.addEventListener('click', e => {
    const i = +e.target.dataset.idx; const dir = +e.target.dataset.dir;
    const arr = state.story; const ni = i + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[i], arr[ni]] = [arr[ni], arr[i]]; renderStory();
  }));
}

// Details
function renderDetails() {
  const el = document.getElementById('panel-details');
  el.innerHTML = `<h2>Event Details</h2><div class="list-editor" id="detailsList"></div><button class="btn-sm" id="addDetail">+ Add event</button>`;
  const list = el.querySelector('#detailsList');
  state.details.forEach((d, idx) => {
    const div = document.createElement('div'); div.className = 'list-item';
    div.innerHTML = `<button class="remove" data-idx="${idx}">&times;</button>
      <div class="row"><div class="field"><label>Title</label><input class="d-title" value="${escapeAttr(d.title)}"></div><div class="field"><label>Time</label><input class="d-time" value="${escapeAttr(d.time)}"></div></div>
      <div class="row"><div class="field"><label>Place</label><input class="d-place" value="${escapeAttr(d.place)}"></div><div class="field"><label>Address</label><input class="d-address" value="${escapeAttr(d.address)}"></div></div>
      <div class="field"><label>Map URL</label><input class="d-map" value="${escapeAttr(d.mapUrl)}"></div>`;
    list.appendChild(div);
  });
  el.querySelector('#addDetail').addEventListener('click', () => { state.details.push({ title: 'Event', time: '12:00 PM', place: 'Venue', address: 'City', mapUrl: '#' }); renderDetails(); });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => { state.details.splice(+e.target.dataset.idx, 1); renderDetails(); }));
}

// Party
function renderParty() {
  const el = document.getElementById('panel-party');
  el.innerHTML = `<h2>Wedding Party</h2><div class="list-editor" id="partyList"></div><button class="btn-sm" id="addParty">+ Add member</button>`;
  const list = el.querySelector('#partyList');
  state.party.forEach((p, idx) => {
    const div = document.createElement('div'); div.className = 'list-item';
    div.innerHTML = `<button class="remove" data-idx="${idx}">&times;</button>
      <div class="row">
        <div class="field"><label>Initial</label><input class="p-initial" value="${escapeAttr(p.initial)}"></div>
        <div class="field"><label>Name</label><input class="p-name" value="${escapeAttr(p.name)}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Role</label><input class="p-role" value="${escapeAttr(p.role)}"></div>
        <div class="field"><label>Note</label><input class="p-note" value="${escapeAttr(p.note)}"></div>
      </div>`;
    list.appendChild(div);
  });
  el.querySelector('#addParty').addEventListener('click', () => { state.party.push({ initial: 'X', name: 'Name', role: 'Role', note: 'Note' }); renderParty(); });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => { state.party.splice(+e.target.dataset.idx, 1); renderParty(); }));
}

// FAQ
function renderFaq() {
  const el = document.getElementById('panel-faq');
  el.innerHTML = `<h2>FAQ</h2><div class="list-editor" id="faqList"></div><button class="btn-sm" id="addFaq">+ Add FAQ</button>`;
  const list = el.querySelector('#faqList');
  state.faq.forEach((f, idx) => {
    const div = document.createElement('div'); div.className = 'list-item';
    div.innerHTML = `<button class="remove" data-idx="${idx}">&times;</button>
      <div class="field"><label>Question</label><input class="f-q" value="${escapeAttr(f.q)}"></div>
      <div class="field"><label>Answer</label><textarea class="f-a" rows="2">${escapeHtml(f.a)}</textarea></div>`;
    list.appendChild(div);
  });
  el.querySelector('#addFaq').addEventListener('click', () => { state.faq.push({ q: 'Question?', a: 'Answer.' }); renderFaq(); });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => { state.faq.splice(+e.target.dataset.idx, 1); renderFaq(); }));
}

// RSVPs
function renderRsvps() {
  const list = JSON.parse(localStorage.getItem('rsvp') || '[]');
  const el = document.getElementById('panel-rsvps');
  if (!list.length) { el.innerHTML = '<h2>RSVPs</h2><p class="muted">No RSVPs yet.</p>'; return; }
  el.innerHTML = `<h2>RSVPs</h2><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Attend</th><th>Guests</th><th>Diet</th><th>Message</th><th>Date</th></tr></thead><tbody></tbody></table>
    <div style="margin-top:12px"><button class="btn-sm btn-outline" id="clearRsvp">Clear all RSVPs</button> <button class="btn-sm btn-outline" id="exportRsvp">Export CSV</button></div>`;
  const tbody = el.querySelector('tbody');
  list.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(r.first || '')} ${escapeHtml(r.last || '')}</td><td>${escapeHtml(r.email || '')}</td><td>${escapeHtml(r.phone || '')}</td><td>${escapeHtml(r.attend || '')}</td><td>${escapeHtml(r.guests || '')}</td><td>${escapeHtml(r.diet || '')}</td><td>${escapeHtml(r.msg || '')}</td><td>${new Date(r.ts).toLocaleString()}</td>`;
    tbody.appendChild(tr);
  });
  el.querySelector('#clearRsvp').addEventListener('click', () => { if (confirm('Clear all RSVPs?')) { localStorage.removeItem('rsvp'); renderRsvps(); toast('Cleared'); } });
  el.querySelector('#exportRsvp').addEventListener('click', () => {
    const csv = ['Name,Email,Phone,Attend,Guests,Diet,Message,Date'].concat(list.map(r => `"${r.first || ''} ${r.last || ''}","${r.email || ''}","${r.phone || ''}","${r.attend || ''}","${r.guests || ''}","${r.diet || ''}","${(r.msg || '').replace(/"/g, '""')}","${new Date(r.ts).toLocaleString()}"`)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rsvps.csv'; a.click();
    URL.revokeObjectURL(url);
  });
}

// Guestbook
function renderGuestbook() {
  const list = JSON.parse(localStorage.getItem('gb') || '[]');
  const el = document.getElementById('panel-guestbook');
  if (!list.length) { el.innerHTML = '<h2>Guestbook</h2><p class="muted">No messages yet.</p>'; return; }
  el.innerHTML = `<h2>Guestbook</h2><div class="list-editor"></div><button class="btn-sm btn-outline" id="clearGb" style="margin-top:12px">Clear all messages</button>`;
  const listEl = el.querySelector('.list-editor');
  list.forEach((m, idx) => {
    const div = document.createElement('div'); div.className = 'list-item';
    div.innerHTML = `<div style="font-family:var(--font-display);color:var(--burgundy);font-size:20px">${escapeHtml(m.name)}</div><div>${escapeHtml(m.note)}</div><div class="muted" style="font-size:11px">${new Date(m.ts).toLocaleString()}</div><button class="remove" data-idx="${idx}">&times;</button>`;
    listEl.appendChild(div);
  });
  listEl.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => {
    const arr = JSON.parse(localStorage.getItem('gb') || '[]');
    arr.splice(+e.target.dataset.idx, 1);
    localStorage.setItem('gb', JSON.stringify(arr));
    renderGuestbook();
    toast('Removed');
  }));
  el.querySelector('#clearGb').addEventListener('click', () => { if (confirm('Clear all messages?')) { localStorage.removeItem('gb'); renderGuestbook(); toast('Cleared'); } });
}

// Publish
function renderPublish() {
  const settings = JSON.parse(localStorage.getItem('ghSettings') || '{}');
  document.getElementById('panel-publish').innerHTML = `
    <h2>Publish to GitHub</h2>
    <p class="muted" style="margin-bottom:14px">Publish your content to GitHub so all visitors see it. Requires a GitHub Personal Access Token with repo write access.</p>
    <div class="field"><label>GitHub Token (PAT)</label><input id="gh_token" type="password" value="${escapeAttr(settings.token || '')}" placeholder="ghp_..."></div>
    <div class="row">
      <div class="field"><label>Repository</label><input id="gh_repo" value="${escapeAttr(settings.repo || 'Astonie/amukiwa')}"></div>
      <div class="field"><label>Branch</label><input id="gh_branch" value="${escapeAttr(settings.branch || 'main')}"></div>
    </div>
    <div class="field"><label>File path</label><input id="gh_path" value="${escapeAttr(settings.path || 'content.json')}"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
      <button class="btn-sm btn-outline" id="saveGh">Save Settings</button>
      <button class="btn-sm btn-outline" id="testGh">Test Connection</button>
      <button class="btn-sm" id="publishBtn">Publish content.json</button>
    </div>
    <div id="publishStatus" style="margin-top:12px;font-size:13px"></div>
    <p class="muted" style="font-size:12px;margin-top:14px">Create a token: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained or classic with repo write. Stored only in this browser.</p>`;
  document.getElementById('saveGh').addEventListener('click', () => {
    const s = { token: document.getElementById('gh_token').value.trim(), repo: document.getElementById('gh_repo').value.trim(), branch: document.getElementById('gh_branch').value.trim(), path: document.getElementById('gh_path').value.trim() };
    localStorage.setItem('ghSettings', JSON.stringify(s));
    toast('Settings saved');
  });
  document.getElementById('testGh').addEventListener('click', async () => {
    const status = document.getElementById('publishStatus');
    const s = { token: document.getElementById('gh_token').value.trim(), repo: document.getElementById('gh_repo').value.trim(), branch: document.getElementById('gh_branch').value.trim() };
    status.textContent = 'Testing...';
    try {
      const res = await fetch(`https://api.github.com/repos/${s.repo}`, { headers: { Authorization: `Bearer ${s.token}`, Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error((await res.json()).message || res.statusText);
      const data = await res.json();
      status.textContent = `Connected: ${data.full_name} (${data.permissions?.push ? 'push OK' : 'no push permission'})`;
    } catch (e) { status.textContent = 'Error: ' + e.message; }
  });
  document.getElementById('publishBtn').addEventListener('click', async () => {
    const status = document.getElementById('publishStatus');
    status.textContent = 'Publishing...';
    const s = { token: document.getElementById('gh_token').value.trim(), repo: document.getElementById('gh_repo').value.trim(), branch: document.getElementById('gh_branch').value.trim(), path: document.getElementById('gh_path').value.trim() };
    localStorage.setItem('ghSettings', JSON.stringify(s));
    gather();
    const json = JSON.stringify(state, null, 2);
    const content = btoa(unescape(encodeURIComponent(json)));
    const api = `https://api.github.com/repos/${s.repo}/contents/${s.path}`;
    try {
      let sha = null;
      const getRes = await fetch(`${api}?ref=${s.branch}`, { headers: { Authorization: `Bearer ${s.token}`, Accept: 'application/vnd.github+json' } });
      if (getRes.ok) { const data = await getRes.json(); sha = data.sha; }
      const body = { message: 'Update content.json via admin', content, branch: s.branch };
      if (sha) body.sha = sha;
      const putRes = await fetch(api, { method: 'PUT', headers: { Authorization: `Bearer ${s.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!putRes.ok) { const err = await putRes.json(); throw new Error(err.message || putRes.statusText); }
      status.textContent = 'Published! Site will redeploy shortly.';
      toast('Published');
    } catch (e) { status.textContent = 'Error: ' + e.message; }
  });
}

// Settings
function renderSettings() {
  const pass = localStorage.getItem('adminPassword') || 'admin';
  document.getElementById('panel-settings').innerHTML = `
    <h2>Settings</h2>
    <div class="field"><label>Admin password</label><input id="set_pass" type="text" value="${escapeAttr(pass)}"></div>
    <button class="btn-sm" id="savePass">Save Password</button>
    <p class="muted" style="font-size:12px;margin-top:12px">Password stored in this browser only.</p>`;
  document.getElementById('savePass').addEventListener('click', () => {
    localStorage.setItem('adminPassword', document.getElementById('set_pass').value);
    toast('Password saved');
  });
}

// Gather
function gather() {
  // site
  state.site = state.site || {};
  ['eyebrow', 'storyTitle', 'storySub', 'detailsTitle', 'detailsSub', 'galleryTitle', 'gallerySub', 'partyTitle', 'partySub', 'rsvpTitle', 'rsvpSub', 'faqTitle', 'faqSub', 'guestbookTitle', 'guestbookSub', 'footerMessage'].forEach(k => {
    const el = document.getElementById('site_' + k); if (el) state.site[k] = el.value;
  });
  // couple
  state.couple = {
    groom: document.getElementById('c_groom').value,
    bride: document.getElementById('c_bride').value,
    dateISO: document.getElementById('c_dateISO').value,
    dateDisplay: document.getElementById('c_dateDisplay').value,
    location: document.getElementById('c_location').value,
    venue: document.getElementById('c_venue').value,
    rsvpDeadline: document.getElementById('c_rsvpDeadline').value,
    hashtag: document.getElementById('c_hashtag').value,
  };
  // invitation
  state.invitation = {
    eyebrow: document.getElementById('inv_eyebrow').value,
    title: document.getElementById('inv_title').value,
    message: document.getElementById('inv_message').value,
    rsvpText: document.getElementById('inv_rsvp').value,
  };
  // media
  state.media = {
    heroImage: document.getElementById('m_hero').value,
    coverImage: document.getElementById('m_cover').value,
    musicUrl: document.getElementById('m_music').value,
  };
  // story
  const storyItems = document.querySelectorAll('#panel-story .list-item');
  state.story = [...storyItems].map(it => ({
    year: it.querySelector('.s-year').value,
    title: it.querySelector('.s-title').value,
    text: it.querySelector('.s-text').value,
  }));
  // details
  const detailItems = document.querySelectorAll('#panel-details .list-item');
  state.details = [...detailItems].map(it => ({
    title: it.querySelector('.d-title').value,
    time: it.querySelector('.d-time').value,
    place: it.querySelector('.d-place').value,
    address: it.querySelector('.d-address').value,
    mapUrl: it.querySelector('.d-map').value,
  }));
  // party
  const partyItems = document.querySelectorAll('#panel-party .list-item');
  state.party = [...partyItems].map(it => ({
    initial: it.querySelector('.p-initial').value,
    name: it.querySelector('.p-name').value,
    role: it.querySelector('.p-role').value,
    note: it.querySelector('.p-note').value,
  }));
  // faq
  const faqItems = document.querySelectorAll('#panel-faq .list-item');
  state.faq = [...faqItems].map(it => ({
    q: it.querySelector('.f-q').value,
    a: it.querySelector('.f-a').value,
  }));
}

// Save
document.getElementById('saveBtn').addEventListener('click', () => {
  gather();
  WC.saveContent(state);
  toast('Saved');
  renderDashboard();
});

// Reset
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset all content to defaults?')) {
    WC.resetContent();
    state = WC.getContent();
    renderAll();
    toast('Reset to defaults');
  }
});

// Export
document.getElementById('exportBtn').addEventListener('click', () => {
  gather();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'content.json'; a.click();
  URL.revokeObjectURL(url);
});

// Import
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      state = JSON.parse(ev.target.result);
      WC.saveContent(state);
      renderAll();
      toast('Imported');
    } catch (err) { alert('Invalid JSON'); }
  };
  reader.readAsText(file);
});

// Ensure invitation in content defaults
if (!state.invitation) state.invitation = { eyebrow: 'You are cordially invited', title: 'to the wedding of', message: 'Together with our families, we invite you to share in our joy as we unite in marriage.', rsvpText: 'RSVP Now' };

checkAuth();
