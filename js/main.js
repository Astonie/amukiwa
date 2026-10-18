const C = window.WeddingContent.getContent();
const couple = C.couple;
const WEDDING_DATE = new Date(couple.dateISO);

// Hamburger
const ham = document.getElementById('hamburger');
const mm = document.getElementById('mobileMenu');
ham?.addEventListener('click', () => mm.classList.toggle('open'));
mm?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mm.classList.remove('open')));

// Apply couple info
document.getElementById('navLogo').textContent = couple.groom[0] + ' & ' + couple.bride[0];
document.getElementById('heroNames').innerHTML = `${couple.groom} <span class="hero-amp">&</span> ${couple.bride}`;
document.getElementById('heroDate').textContent = couple.dateDisplay;
document.getElementById('heroLoc').textContent = couple.location;
const site = C.site || {};
if (site.eyebrow) document.getElementById('heroEyebrow').textContent = site.eyebrow;
if (site.storyTitle) document.getElementById('storyTitle').textContent = site.storyTitle;
if (site.storySub) document.getElementById('storySub').textContent = site.storySub;
if (site.detailsTitle) document.getElementById('detailsTitle').textContent = site.detailsTitle;
if (site.detailsSub) document.getElementById('detailsSub').textContent = site.detailsSub;
if (site.galleryTitle) document.getElementById('galleryTitle').textContent = site.galleryTitle;
if (site.gallerySub) document.getElementById('gallerySub').textContent = site.gallerySub;
if (site.partyTitle) document.getElementById('partyTitle').textContent = site.partyTitle;
if (site.partySub) document.getElementById('partySub').textContent = site.partySub;
if (site.rsvpTitle) document.getElementById('rsvpTitle').textContent = site.rsvpTitle;
if (site.rsvpSub) document.getElementById('rsvpSub').textContent = site.rsvpSub;
if (site.faqTitle) document.getElementById('faqTitle').textContent = site.faqTitle;
if (site.faqSub) document.getElementById('faqSub').textContent = site.faqSub;
if (site.guestbookTitle) document.getElementById('guestbookTitle').textContent = site.guestbookTitle;
if (site.guestbookSub) document.getElementById('guestbookSub').textContent = site.guestbookSub;
if (site.footerMessage) document.getElementById('footerMsg').textContent = site.footerMessage;
if (C.media?.heroImage) {
  document.querySelector('.hero').style.backgroundImage = `url(${C.media.heroImage})`;
  document.querySelector('.hero').style.backgroundSize = 'cover';
  document.querySelector('.hero').style.backgroundPosition = 'center';
}
if (C.media?.musicUrl) document.getElementById('bgMusic').src = C.media.musicUrl;
document.getElementById('rsvpSub').textContent = `Kindly respond by ${couple.rsvpDeadline}`;
document.getElementById('footerNames').textContent = `${couple.groom} & ${couple.bride}`;
document.getElementById('footerDate').textContent = `${couple.dateDisplay} · ${couple.location}`;
document.title = `${couple.groom} & ${couple.bride} — Wedding`;

// Countdown
function updateCountdown() {
  const now = new Date();
  const diff = WEDDING_DATE - now;
  if (diff <= 0) { ['cdDays','cdHours','cdMins','cdSecs'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='00';}); return; }
  const d = Math.floor(diff/86400000);
  const h = Math.floor((diff%86400000)/3600000);
  const m = Math.floor((diff%3600000)/60000);
  const s = Math.floor((diff%60000)/1000);
  document.getElementById('cdDays').textContent = String(d).padStart(2,'0');
  document.getElementById('cdHours').textContent = String(h).padStart(2,'0');
  document.getElementById('cdMins').textContent = String(m).padStart(2,'0');
  document.getElementById('cdSecs').textContent = String(s).padStart(2,'0');
}
setInterval(updateCountdown, 1000); updateCountdown();

// Story timeline
const timeline = document.getElementById('timeline');
C.story.forEach((s, i) => {
  const item = document.createElement('div'); item.className='tl-item reveal';
  const left = document.createElement('div'); left.className='content';
  const right = document.createElement('div'); right.className='content';
  const html = `<div class="tl-date">${s.year}</div><div class="tl-title">${escapeHtml(s.title)}</div><p class="muted">${escapeHtml(s.text)}</p>`;
  if (i % 2 === 0) left.innerHTML = html; else right.innerHTML = html;
  item.appendChild(left);
  const dot = document.createElement('div'); dot.className='tl-dot'; item.appendChild(dot);
  item.appendChild(right);
  timeline.appendChild(item);
});

// Details
const detailsGrid = document.getElementById('detailsGrid');
C.details.forEach(d => {
  const card = document.createElement('div'); card.className='detail-card reveal';
  card.innerHTML = `<div class="detail-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></div>
    <h3>${escapeHtml(d.title)}</h3>
    <div class="time">${escapeHtml(d.time)}</div>
    <p>${escapeHtml(d.place)}<br/>${escapeHtml(d.address)}</p>
    <a class="map-link" target="_blank" href="${d.mapUrl}">View on map →</a>`;
  detailsGrid.appendChild(card);
});

// Gallery
const gg = document.getElementById('galleryGrid');
C.gallery.forEach(src => {
  const d = document.createElement('div'); d.className='g';
  const img = document.createElement('img'); img.src=src; img.loading='lazy';
  d.appendChild(img); gg.appendChild(d);
  d.addEventListener('click', () => { document.getElementById('lbImg').src=src; document.getElementById('lightbox').classList.add('open'); });
});
document.getElementById('lbClose').addEventListener('click', () => document.getElementById('lightbox').classList.remove('open'));
document.getElementById('lightbox').addEventListener('click', e => { if(e.target.id==='lightbox') e.currentTarget.classList.remove('open'); });

// Party
const partyGrid = document.getElementById('partyGrid');
C.party.forEach(p => {
  const div = document.createElement('div'); div.className='person reveal';
  div.innerHTML = `<div class="avatar">${escapeHtml(p.initial)}</div><h4>${escapeHtml(p.name)}</h4><div class="role">${escapeHtml(p.role)}</div><p class="muted" style="font-size:13px">${escapeHtml(p.note)}</p>`;
  partyGrid.appendChild(div);
});

// FAQ
const faqList = document.getElementById('faqList');
C.faq.forEach(f => {
  const item = document.createElement('div'); item.className='faq-item';
  item.innerHTML = `<div class="faq-q">${escapeHtml(f.q)} <span>+</span></div><div class="faq-a">${escapeHtml(f.a)}</div>`;
  item.querySelector('.faq-q').addEventListener('click', () => item.classList.toggle('open'));
  faqList.appendChild(item);
});

// RSVP form
document.getElementById('rsvpForm').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  const list = JSON.parse(localStorage.getItem('rsvp')||'[]');
  list.push({...data, ts: Date.now()});
  localStorage.setItem('rsvp', JSON.stringify(list));
  launchConfetti();
  e.target.reset();
  alert('Thank you! Your RSVP has been received. We can\'t wait to celebrate with you.');
});

// Guestbook
const gbMsgs = document.getElementById('gbMessages');
function renderGb() {
  const list = JSON.parse(localStorage.getItem('gb')||'[]');
  gbMsgs.innerHTML = list.map(m => `<div class="gb-msg"><div class="name">${escapeHtml(m.name)}</div><div>${escapeHtml(m.note)}</div><div class="time">${new Date(m.ts).toLocaleString()}</div></div>`).join('');
}
document.getElementById('gbForm').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const list = JSON.parse(localStorage.getItem('gb')||'[]');
  list.unshift({name:fd.get('name'), note:fd.get('note'), ts:Date.now()});
  localStorage.setItem('gb', JSON.stringify(list));
  e.target.reset(); renderGb();
});
renderGb();

// Reveal on scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target);} });
}, {threshold:.15});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Add to calendar (use couple details)
document.getElementById('addCal').addEventListener('click', e => {
  e.preventDefault();
  const dt = couple.dateISO.replace(/[-:]/g,'').replace('T','T').slice(0,15);
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AstonieWanangwa//EN\nBEGIN:VEVENT\nUID:astonie-wanangwa-wedding\nDTSTAMP:${dt}Z\nDTSTART:${dt}\nDTEND:${dt}\nSUMMARY:${couple.groom} & ${couple.bride} Wedding\nLOCATION:${couple.venue}, ${couple.location}\nDESCRIPTION:Ceremony and reception\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics],{type:'text/calendar'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='wedding.ics'; a.click();
  URL.revokeObjectURL(url);
});

// Music
const music = document.getElementById('bgMusic');
const musicBtn = document.getElementById('musicBtn');
let playing = false;
musicBtn.addEventListener('click', () => {
  if(playing){ music.pause(); musicBtn.textContent='♪'; }
  else { music.play().catch(()=>{}); musicBtn.textContent='⏸'; }
  playing = !playing;
});

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function launchConfetti() {
  const c = document.getElementById('confetti');
  const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const pieces = Array.from({length:150}, () => ({
    x: Math.random()*c.width, y: -20, r: Math.random()*6+3,
    vx: (Math.random()-.5)*4, vy: Math.random()*3+2,
    color: ['#c9a961','#b87a7a','#9caf88','#6b2737','#d4a5a5'][Math.floor(Math.random()*5)],
    rot: Math.random()*360, vr: (Math.random()-.5)*8
  }));
  let t=0;
  function frame(){
    ctx.clearRect(0,0,c.width,c.height);
    pieces.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr; p.vy+=.05;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color; ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r);
      ctx.restore();
    });
    t++;
    if(t<220) requestAnimationFrame(frame); else ctx.clearRect(0,0,c.width,c.height);
  }
  requestAnimationFrame(frame);
}
window.addEventListener('resize', () => { const c=document.getElementById('confetti'); c.width=innerWidth; c.height=innerHeight; });
window.launchConfetti = launchConfetti;
