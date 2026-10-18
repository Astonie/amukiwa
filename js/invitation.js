const C = window.WeddingContent.getContent();
const couple = C.couple;
const params = new URLSearchParams(location.search);
const guest = params.get('to') || params.get('guest') || '';
const guestLine = document.getElementById('guestLine');
if (guest) guestLine.textContent = `Dear ${decodeURIComponent(guest)},`;

document.getElementById('invNames').textContent = `${couple.groom} & ${couple.bride}`;
document.getElementById('invDate').textContent = couple.dateDisplay;
document.title = `You're Invited — ${couple.groom} & ${couple.bride}`;
// venue details from content details
const d0 = C.details[0], d1 = C.details[1] || C.details[0];
document.getElementById('invVenue').innerHTML = `${d0.title} · ${d0.time} · ${d0.place}, ${d0.address.split(',')[0]}<br/>${d1.title} · ${d1.time} · ${d1.place}, ${d1.address.split(',')[0]}`;

const envelope = document.getElementById('envelope');
const envWrap = document.getElementById('envWrap');
const cardStage = document.getElementById('cardStage');
const envelopeStage = document.getElementById('envelopeStage');

let opened = false;
function openEnvelope() {
  if (opened) return; opened = true;
  envelope.classList.add('open');
  setTimeout(() => {
    envelopeStage.style.display = 'none';
    cardStage.style.display = 'block';
    launchConfetti();
  }, 900);
}
envWrap.addEventListener('click', openEnvelope);
setTimeout(openEnvelope, 1200);

const inviteUrl = location.href;
const qr = document.getElementById('qrImg');
qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteUrl)}`;

document.getElementById('shareBtn').addEventListener('click', async () => {
  const data = { title: `${couple.groom} & ${couple.bride} Wedding`, text: 'You are invited!', url: inviteUrl };
  if (navigator.share) { try { await navigator.share(data); } catch(e){} }
  else { await navigator.clipboard.writeText(inviteUrl); alert('Invitation link copied!'); }
});

document.getElementById('calBtn').addEventListener('click', () => {
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
window.addEventListener('resize', () => { const c=document.getElementById('confetti'); c.width=innerWidth; c.height=innerHeight; });
