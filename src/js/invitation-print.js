import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { initMonitoring } from '../lib/monitoring.js';
initMonitoring('invitation-print');
async function loadContent() {
  const WC = window.WeddingContent;
  let base = null;
  try {
    const r = await fetch('api/content.php', { cache: 'no-store' });
    if (r.ok) { const data = await r.json(); if (data && !data.error) base = data; }
  } catch (e) {}
  if (!base) {
    try { const r2 = await fetch('content.json', { cache: 'no-store' }); if (r2.ok) base = await r2.json(); } catch (e) {}
  }
  if (!base) base = JSON.parse(JSON.stringify(WC.DEFAULT_CONTENT));
  base = WC.mergeDefaults ? WC.mergeDefaults(base) : base;
  return base;
}
loadContent().then(C => {
  try {
    const couple = C.couple;
    const guest = new URLSearchParams(location.search).get('to') || '';
    const guestLine = document.getElementById('guestLine');
    if (guest) guestLine.textContent = `Dear ${decodeURIComponent(guest)},`;
    document.getElementById('invNames').textContent = `${couple.groom} & ${couple.bride}`;
    document.getElementById('invDate').textContent = couple.dateDisplay;
    const inv = C.invitation || {};
    if (inv.eyebrow) document.getElementById('invEyebrow').textContent = inv.eyebrow;
    document.title = `Invitation — ${couple.groom} & ${couple.bride}`;
    const d0 = C.details[0], d1 = C.details[1] || C.details[0];
    if (d0) document.getElementById('invVenue').innerHTML = `${d1.title} ${d1.time} · ${d1.place}`;
    const qr = document.getElementById('qrImg');
    if (qr) {
      const mapUrl = 'https://www.google.com/maps/search/?api=1&query=Golden+Peacock+Hotel+Blantyre+Malawi';
      QRCode.toDataURL(mapUrl, { width: 130, margin: 1, color: { dark: '#6b2737', light: '#ffffff' } })
        .then(url => { qr.src = url; })
        .catch(e => { console.error('QR gen failed', e); });
    }

  } catch (e) { console.error(e); }
});

const saveImgBtn = document.getElementById('saveImgBtn');
if (saveImgBtn) saveImgBtn.addEventListener('click', async () => {
  const card = document.querySelector('.invite-card');
  if (!card) return;
  try {
    const canvas = await html2canvas(card, { scale: 2, backgroundColor: '#ffffff' });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'invitation.png'; a.click();
  } catch (e) { console.error(e); alert('Could not save image'); }
});
