import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { initMonitoring } from '../lib/monitoring.js';
initMonitoring('invitation');
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
  if (!base) base = JSON.parse(JSON.stringify(WC.DEFAULT_CONTENT));
  // Always fill any missing sections from defaults so the page can't break
  base = WC.mergeDefaults ? WC.mergeDefaults(base) : base;
  const preview = new URLSearchParams(location.search).get('preview') === '1' || sessionStorage.getItem('adminPreview') === '1';
  if (preview) {
    try {
      const raw = localStorage.getItem('weddingContent');
      if (raw) {
        const saved = JSON.parse(raw);
        base = WC.mergeDefaults ? WC.mergeDefaults(Object.assign(JSON.parse(JSON.stringify(base)), saved)) : Object.assign(JSON.parse(JSON.stringify(base)), saved);
        if (saved.site) base.site = Object.assign({}, base.site, saved.site);
        if (saved.couple) base.couple = Object.assign({}, base.couple, saved.couple);
        if (saved.media) base.media = Object.assign({}, base.media, saved.media);
        if (saved.invitation) base.invitation = Object.assign({}, base.invitation, saved.invitation);
      }
    } catch (e) {}
  }
  return base;
}

loadContent().then(C => {
  try { init(C); }
  catch (e) {
    console.error('Invitation init failed', e);
    // Fail-safe: reveal the card even if content is incomplete
    const es = document.getElementById('envelopeStage');
    const cs = document.getElementById('cardStage');
    if (es) es.style.display = 'none';
    if (cs) cs.style.display = 'block';
  }
});

function init(C) {
const couple = C.couple;
const params = new URLSearchParams(location.search);
const inviteCode = (params.get('code') || params.get('pass') || '').trim();
const guestLine = document.getElementById('guestLine');
const gate = document.getElementById('inviteCodeGate');
const gateMsg = document.getElementById('inviteGateMsg');
const gateError = document.getElementById('inviteCodeError');
const gateForm = document.getElementById('inviteCodeForm');
const gateInput = document.getElementById('inviteCodeInput');
const envelopeHint = document.getElementById('envelopeHint');
const guestPassMeta = document.getElementById('guestPassMeta');
let verifiedGuest = null;

const invNamesEl = document.getElementById('invNames');
if (invNamesEl) invNamesEl.textContent = `${couple.groom} & ${couple.bride}`;
const invDateEl = document.getElementById('invDate');
if (invDateEl) invDateEl.textContent = couple.dateDisplay;
const inv = C.invitation || {};
const invEyebrowEl = document.getElementById('invEyebrow');
if (inv.eyebrow && invEyebrowEl) invEyebrowEl.textContent = inv.eyebrow;
const invRsvpBtnEl = document.getElementById('invRsvpBtn');
if (inv.rsvpText && invRsvpBtnEl) invRsvpBtnEl.textContent = inv.rsvpText;
document.title = `You're Invited — ${couple.groom} & ${couple.bride}`;
const d0 = C.details?.[0], d1 = C.details?.[1] || d0;
const invVenueEl = document.getElementById('invVenue');
if (d1 && invVenueEl) invVenueEl.innerHTML = `${d1.title} ${d1.time} · ${d1.place}`;

const envelope = document.getElementById('envelope');
const envWrap = document.getElementById('envWrap');
const cardStage = document.getElementById('cardStage');
const envelopeStage = document.getElementById('envelopeStage');

function showGate(message) {
  if (!gate) return;
  gate.style.display = 'block';
  if (message && gateMsg) gateMsg.textContent = message;
  if (envelopeHint) envelopeHint.textContent = 'Enter your personal code to unlock your invitation';
}

function setGateError(message) {
  if (!gateError) return;
  gateError.textContent = message || '';
  gateError.style.display = message ? 'block' : 'none';
}

async function verifyInviteCode(code) {
  try {
    const r = await fetch('api/guests.php?code=' + encodeURIComponent(code), { cache: 'no-store', credentials: 'same-origin' });
    let j = null;
    try { j = await r.json(); } catch (e) {}
    if (r.ok && j && j.ok && j.guest) return { guest: j.guest };
    // A JSON error means the API is reachable but the code is not valid.
    if (j && typeof j === 'object' && j.error) return { error: j.error };
    // 404/500 with an HTML body usually means PHP is not deployed (static hosting).
    return { unreachable: true };
  } catch (e) {
    return { unreachable: true };
  }
}

function applyVerifiedGuest(g) {
  verifiedGuest = g;
  if (guestLine) guestLine.textContent = `Dear ${g.name || 'Honored Guest'},`;
  if (guestPassMeta) {
    const seats = Number(g.max_guests) || 1;
    const parts = [`Reserved for ${seats} guest${seats === 1 ? '' : 's'}`];
    if (g.table_no) parts.push(`Table ${g.table_no}`);
    guestPassMeta.textContent = parts.join(' · ');
    guestPassMeta.style.display = 'block';
  }
  if (gate) gate.style.display = 'none';
  if (envelopeHint) envelopeHint.textContent = 'Tap the envelope to open';
  setGateError('');
}

function renderVerificationQr() {
  const qr = document.getElementById('qrImg');
  const caption = document.getElementById('qrCaption');
  if (!qr) return;
  if (verifiedGuest?.code) {
    const verifyUrl = `${location.origin}/checkin?code=${encodeURIComponent(verifiedGuest.code)}`;
    QRCode.toDataURL(verifyUrl, { width: 180, margin: 1, color: { dark: '#6b2737', light: '#ffffff' } })
      .then(url => { qr.src = url; qr.alt = 'Entrance check-in QR code'; })
      .catch(e => { console.error('QR gen failed', e); });
    if (caption) caption.textContent = `Scan at entrance · ${verifiedGuest.code}`;
  } else {
    const mapUrl = 'https://www.google.com/maps/search/?api=1&query=Golden+Peacock+Hotel+Blantyre+Malawi';
    QRCode.toDataURL(mapUrl, { width: 160, margin: 1, color: { dark: '#6b2737', light: '#ffffff' } })
      .then(url => { qr.src = url; })
      .catch(e => { console.error('QR gen failed', e); });
    if (caption) caption.textContent = 'Scan for venue & map';
  }
}

let opened = false;
function openEnvelope() {
  if (opened) return;
  if (!verifiedGuest) {
    showGate('This invitation is personal. Enter the code from your invitation link to open your card.');
    setGateError('A valid personal invitation code is required.');
    gateInput?.focus();
    return;
  }
  opened = true;
  envelope.classList.add('open');
  setTimeout(() => {
    envelopeStage.style.display = 'none';
    cardStage.style.display = 'block';
    launchConfetti();
    renderVerificationQr();
  }, 900);
}

async function unlockWithCode(rawCode, { autoOpen = false } = {}) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) {
    setGateError('Please enter the invitation code from your personal link.');
    return;
  }
  setGateError('');
  if (gateMsg) gateMsg.textContent = 'Verifying your personal invitation…';
  const result = await verifyInviteCode(code);
  if (result.guest) {
    applyVerifiedGuest(result.guest);
    if (autoOpen) openEnvelope();
    return;
  }
  if (result.unreachable) {
    showGate('We could not verify your invitation right now. Please reopen your personal invitation link, or try again when you are online.');
    setGateError('Verification service unavailable.');
  } else {
    showGate('Enter the personal invitation code from your WhatsApp or printed invite to unlock your personalized card.');
    setGateError(result.error || 'That invitation code was not recognised.');
  }
}

gateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = gateForm.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  await unlockWithCode(gateInput?.value, { autoOpen: true });
  if (btn) btn.disabled = false;
});

// Gate the invitation: only a verified code can personalise and open the card.
if (inviteCode) {
  showGate('Verifying your personal invitation…');
  unlockWithCode(inviteCode);
} else {
  showGate();
}
envWrap.addEventListener('click', openEnvelope);
envWrap.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openEnvelope();
  }
});

const inviteUrl = location.href;

document.getElementById('shareBtn')?.addEventListener('click', async () => {
  const data = { title: `${couple.groom} & ${couple.bride} Wedding`, text: 'You are invited!', url: inviteUrl };
  if (navigator.share) { try { await navigator.share(data); } catch(e){} }
  else { await navigator.clipboard.writeText(inviteUrl); alert('Invitation link copied!'); }
});

document.getElementById('calBtn')?.addEventListener('click', () => {
  const dt = couple.dateISO.replace(/[-:]/g,'').slice(0,15);
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AstonieWanangwa//EN\nBEGIN:VEVENT\nUID:astonie-wanangwa-wedding\nDTSTAMP:${dt}Z\nDTSTART:${dt}\nDTEND:${dt}\nSUMMARY:${couple.groom} & ${couple.bride} Wedding\nLOCATION:${couple.venue}, ${couple.location}\nDESCRIPTION:Ceremony and reception\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics],{type:'text/calendar'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='wedding.ics'; a.click();
  URL.revokeObjectURL(url);
});

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
window.addEventListener('resize', () => { const c=document.getElementById('confetti'); if(c){c.width=innerWidth; c.height=innerHeight;} });
}

// UX helpers
function toast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200); }
const sp = document.getElementById('scrollProgress');
const btt = document.getElementById('backToTop');
function onScroll() { const h = document.documentElement; const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100; if (sp) sp.style.width = pct + '%'; if (btt) btt.classList.toggle('show', h.scrollTop > 400); }
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
if (btt) btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const saveImgBtn = document.getElementById('saveImgBtn');
if (saveImgBtn) saveImgBtn.addEventListener('click', async () => {
  const card = document.querySelector('.invite-card');
  if (!card) return;
  try {
    const canvas = await html2canvas(card, { scale: 2, backgroundColor: '#ffffff' });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'invitation.png'; a.click();
    toast && toast('Saved as image');
  } catch (e) { console.error(e); alert('Could not save image'); }
});
