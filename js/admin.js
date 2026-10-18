const { getContent, saveContent, resetContent, DEFAULT_CONTENT } = window.WeddingContent;
let state = getContent();

const tabs = [
  { id: 'couple', label: 'Couple' },
  { id: 'media', label: 'Media' },
  { id: 'story', label: 'Story' },
  { id: 'details', label: 'Details' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'party', label: 'Party' },
  { id: 'faq', label: 'FAQ' },
  { id: 'rsvps', label: 'RSVPs' },
  { id: 'guestbook', label: 'Guestbook' },
];
const tabsEl = document.getElementById('tabs');
const panelsEl = document.getElementById('panels');
tabs.forEach(t => {
  const b = document.createElement('button'); b.className='admin-tab'; b.textContent=t.label; b.dataset.tab=t.id;
  b.addEventListener('click', () => activate(t.id));
  tabsEl.appendChild(b);
  const p = document.createElement('div'); p.className='admin-panel'; p.id='panel-'+t.id;
  panelsEl.appendChild(p);
});
function activate(id){
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  document.querySelectorAll('.admin-panel').forEach(p=>p.classList.toggle('active', p.id==='panel-'+id));
}
activate('couple');

function field(label, name, value, type='text') {
  return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${escapeAttr(value)}"></div>`;
}
function escapeAttr(s){return String(s??'').replace(/"/g,'&quot;');}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// Couple panel
function renderCouple() {
  const c = state.couple;
  document.getElementById('panel-couple').innerHTML = `
    <div class="row"><div class="field"><label>Groom</label><input id="c_groom" value="${escapeAttr(c.groom)}"></div><div class="field"><label>Bride</label><input id="c_bride" value="${escapeAttr(c.bride)}"></div></div>
    <div class="row"><div class="field"><label>Date (ISO)</label><input id="c_dateISO" value="${escapeAttr(c.dateISO)}" placeholder="2026-12-06T14:00:00"></div><div class="field"><label>Date display</label><input id="c_dateDisplay" value="${escapeAttr(c.dateDisplay)}"></div></div>
    <div class="row"><div class="field"><label>Location</label><input id="c_location" value="${escapeAttr(c.location)}"></div><div class="field"><label>Venue</label><input id="c_venue" value="${escapeAttr(c.venue)}"></div></div>
    <div class="row"><div class="field"><label>RSVP deadline</label><input id="c_rsvpDeadline" value="${escapeAttr(c.rsvpDeadline)}"></div><div class="field"><label>Hashtag</label><input id="c_hashtag" value="${escapeAttr(c.hashtag)}"></div></div>
    <div class="field"><label>Generate invitation link for a guest</label><div style="display:flex;gap:8px"><input id="invGuest" placeholder="Guest name"><button class="btn-sm" id="genInv" type="button">Generate</button></div><div id="invResult" style="margin-top:8px;font-size:13px;word-break:break-all"></div></div>`;
  const genBtn = document.getElementById('genInv');
  if (genBtn) genBtn.addEventListener('click', () => {
    const name = document.getElementById('invGuest').value.trim();
    const url = `${location.origin}${location.pathname.replace('admin.html','invitation.html')}?to=${encodeURIComponent(name)}`;
    const res = document.getElementById('invResult');
    res.innerHTML = name ? `<a href="${url}" target="_blank">${url}</a> <button class="btn-sm btn-outline" id="copyInv">Copy</button>` : 'Enter a guest name';
    const cb = document.getElementById('copyInv');
    if (cb) cb.addEventListener('click', () => { navigator.clipboard.writeText(url); toast('Copied'); });
  });
}
renderCouple();

// Media panel
function renderMedia() {
  const m = state.media || {};
  document.getElementById('panel-media').innerHTML = `
    <div class="field"><label>Hero background image URL</label><input id="m_hero" value="${escapeAttr(m.heroImage||'')}"></div>
    <div class="field"><label>Cover image URL</label><input id="m_cover" value="${escapeAttr(m.coverImage||'')}"></div>
    <div class="field"><label>Background music URL</label><input id="m_music" value="${escapeAttr(m.musicUrl||'')}"></div>
    <div class="field"><label>Upload image to gallery (local)</label><input type="file" id="m_upload" accept="image/*" multiple></div>
    <p class="muted" style="font-size:12px">Uploaded images are stored as data URLs in this browser (size limits apply). For production, host media externally and paste URLs.</p>`;
  document.getElementById('m_upload').addEventListener('change', e => {
    [...e.target.files].forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => { state.gallery.unshift(ev.target.result); renderGallery(); toast('Image added'); };
      reader.readAsDataURL(file);
    });
  });
}
renderMedia();

// Story panel
function renderStory() {
  const el = document.getElementById('panel-story');
  el.innerHTML = `<div class="list-editor" id="storyList"></div><button class="btn-sm" id="addStory">+ Add milestone</button>`;
  const list = el.querySelector('#storyList');
  state.story.forEach((s, idx) => {
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<button class="remove" data-idx="${idx}">&times;</button>
      <div class="row"><div class="field"><label>Year</label><input class="s-year" value="${escapeAttr(s.year)}"></div><div class="field"><label>Title</label><input class="s-title" value="${escapeAttr(s.title)}"></div></div>
      <div class="field"><label>Text</label><textarea class="s-text" rows="2">${escapeHtml(s.text)}</textarea></div>`;
    list.appendChild(div);
  });
  el.querySelector('#addStory').addEventListener('click', () => {
    state.story.push({year:'2026',title:'New milestone',text:'Description'});
    renderStory();
  });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => {
    state.story.splice(+e.target.dataset.idx,1); renderStory();
  }));
}
renderStory();

// Details panel
function renderDetails() {
  const el = document.getElementById('panel-details');
  el.innerHTML = `<div class="list-editor" id="detailsList"></div><button class="btn-sm" id="addDetail">+ Add event</button>`;
  const list = el.querySelector('#detailsList');
  state.details.forEach((d, idx) => {
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<button class="remove" data-idx="${idx}">&times;</button>
      <div class="row"><div class="field"><label>Title</label><input class="d-title" value="${escapeAttr(d.title)}"></div><div class="field"><label>Time</label><input class="d-time" value="${escapeAttr(d.time)}"></div></div>
      <div class="row"><div class="field"><label>Place</label><input class="d-place" value="${escapeAttr(d.place)}"></div><div class="field"><label>Address</label><input class="d-address" value="${escapeAttr(d.address)}"></div></div>
      <div class="field"><label>Map URL</label><input class="d-map" value="${escapeAttr(d.mapUrl)}"></div>`;
    list.appendChild(div);
  });
  el.querySelector('#addDetail').addEventListener('click', () => {
    state.details.push({title:'Event',time:'12:00 PM',place:'Venue',address:'City',mapUrl:'#'});
    renderDetails();
  });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => {
    state.details.splice(+e.target.dataset.idx,1); renderDetails();
  }));
}
renderDetails();

// Gallery panel
function renderGallery() {
  const el = document.getElementById('panel-gallery');
  el.innerHTML = `<div class="list-editor" id="galleryList"></div><button class="btn-sm" id="addImg">+ Add image URL</button>
    <div class="field" style="margin-top:12px"><label>Or paste comma-separated URLs</label><textarea id="galleryBulk" rows="3">${escapeHtml(state.gallery.join(', '))}</textarea></div>`;
  const list = el.querySelector('#galleryList');
  state.gallery.forEach((u, idx) => {
    const div = document.createElement('div'); div.className='list-item';
    div.style.display='flex'; div.style.gap='8px'; div.style.alignItems='center';
    div.innerHTML = `<img src="${escapeAttr(u)}" style="width:60px;height:60px;object-fit:cover;border-radius:8px" onerror="this.style.display='none'"><input class="g-url" value="${escapeAttr(u)}" style="flex:1;padding:10px;border:1px solid var(--champagne);border-radius:8px"><button class="remove" data-idx="${idx}">&times;</button>`;
    list.appendChild(div);
  });
  el.querySelector('#addImg').addEventListener('click', () => { state.gallery.push('https://picsum.photos/seed/new/600/600'); renderGallery(); });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => { state.gallery.splice(+e.target.dataset.idx,1); renderGallery(); }));
}
renderGallery();

// Party panel
function renderParty() {
  const el = document.getElementById('panel-party');
  el.innerHTML = `<div class="list-editor" id="partyList"></div><button class="btn-sm" id="addParty">+ Add member</button>`;
  const list = el.querySelector('#partyList');
  state.party.forEach((p, idx) => {
    const div = document.createElement('div'); div.className='list-item';
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
  el.querySelector('#addParty').addEventListener('click', () => { state.party.push({initial:'X',name:'Name',role:'Role',note:'Note'}); renderParty(); });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => { state.party.splice(+e.target.dataset.idx,1); renderParty(); }));
}
renderParty();

// FAQ panel
function renderFaq() {
  const el = document.getElementById('panel-faq');
  el.innerHTML = `<div class="list-editor" id="faqList"></div><button class="btn-sm" id="addFaq">+ Add FAQ</button>`;
  const list = el.querySelector('#faqList');
  state.faq.forEach((f, idx) => {
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<button class="remove" data-idx="${idx}">&times;</button>
      <div class="field"><label>Question</label><input class="f-q" value="${escapeAttr(f.q)}"></div>
      <div class="field"><label>Answer</label><textarea class="f-a" rows="2">${escapeHtml(f.a)}</textarea></div>`;
    list.appendChild(div);
  });
  el.querySelector('#addFaq').addEventListener('click', () => { state.faq.push({q:'Question?',a:'Answer.'}); renderFaq(); });
  list.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => { state.faq.splice(+e.target.dataset.idx,1); renderFaq(); }));
}
renderFaq();

// RSVPs panel
function renderRsvps() {
  const list = JSON.parse(localStorage.getItem('rsvp')||'[]');
  const el = document.getElementById('panel-rsvps');
  if (!list.length) { el.innerHTML = '<p class="muted">No RSVPs yet.</p>'; return; }
  el.innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Attend</th><th>Guests</th><th>Diet</th><th>Message</th><th>Date</th></tr></thead><tbody></tbody></table>
    <div style="margin-top:12px"><button class="btn-sm btn-outline" id="clearRsvp">Clear all RSVPs</button></div>`;
  const tbody = el.querySelector('tbody');
  list.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(r.first||'')} ${escapeHtml(r.last||'')}</td><td>${escapeHtml(r.email||'')}</td><td>${escapeHtml(r.phone||'')}</td><td>${escapeHtml(r.attend||'')}</td><td>${escapeHtml(r.guests||'')}</td><td>${escapeHtml(r.diet||'')}</td><td>${escapeHtml(r.msg||'')}</td><td>${new Date(r.ts).toLocaleString()}</td>`;
    tbody.appendChild(tr);
  });
  el.querySelector('#clearRsvp').addEventListener('click', () => { if(confirm('Clear all RSVPs?')){ localStorage.removeItem('rsvp'); renderRsvps(); } });
}
renderRsvps();

// Guestbook panel
function renderGuestbook() {
  const list = JSON.parse(localStorage.getItem('gb')||'[]');
  const el = document.getElementById('panel-guestbook');
  if (!list.length) { el.innerHTML = '<p class="muted">No messages yet.</p>'; return; }
  el.innerHTML = `<div class="list-editor"></div><button class="btn-sm btn-outline" id="clearGb" style="margin-top:12px">Clear all messages</button>`;
  const listEl = el.querySelector('.list-editor');
  list.forEach((m, idx) => {
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div class="name" style="font-family:var(--font-display);color:var(--burgundy)">${escapeHtml(m.name)}</div><div>${escapeHtml(m.note)}</div><div class="muted" style="font-size:11px">${new Date(m.ts).toLocaleString()}</div><button class="remove" data-idx="${idx}">&times;</button>`;
    listEl.appendChild(div);
  });
  listEl.querySelectorAll('.remove').forEach(b => b.addEventListener('click', e => {
    const arr = JSON.parse(localStorage.getItem('gb')||'[]');
    arr.splice(+e.target.dataset.idx,1);
    localStorage.setItem('gb', JSON.stringify(arr));
    renderGuestbook();
  }));
  el.querySelector('#clearGb').addEventListener('click', () => { if(confirm('Clear all messages?')){ localStorage.removeItem('gb'); renderGuestbook(); } });
}
renderGuestbook();

// Save logic: gather from DOM into state
function gather() {
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
  // gallery: from bulk textarea
  const bulk = document.getElementById('galleryBulk').value;
  state.gallery = bulk.split(',').map(s=>s.trim()).filter(Boolean);
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

document.getElementById('saveBtn').addEventListener('click', () => {
  gather();
  saveContent(state);
  toast('Saved');
});
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }

document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset all content to defaults?')) {
    resetContent();
    state = getContent();
    renderCouple(); renderMedia(); renderStory(); renderDetails(); renderGallery(); renderParty(); renderFaq(); renderRsvps(); renderGuestbook();
    toast('Reset to defaults');
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  gather();
  const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='wedding-content.json'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      state = JSON.parse(ev.target.result);
      saveContent(state);
      renderCouple(); renderMedia(); renderStory(); renderDetails(); renderGallery(); renderParty(); renderFaq(); renderRsvps(); renderGuestbook();
      toast('Imported');
    } catch(err){ alert('Invalid JSON'); }
  };
  reader.readAsText(file);
});
