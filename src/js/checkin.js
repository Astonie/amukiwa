import jsQR from 'jsqr';

const states = ['ciLoading', 'ciValid', 'ciInvalid', 'ciOffline', 'ciIdle'];
const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
let currentCode = (params.get('code') || params.get('pass') || '').trim();

let stream = null;
let scanFrame = 0;
let scanning = false;
let starting = false;
let verifying = false;
let lastScanAt = 0;
let scannerUsed = false;

const scanCanvas = document.createElement('canvas');
const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

function showState(id) {
  states.forEach((s) => {
    const el = $(s);
    if (el) el.hidden = s !== id;
  });
  const active = $(id);
  if (active && id !== 'ciIdle') {
    active.setAttribute('tabindex', '-1');
    try { active.focus(); } catch (e) {}
  }
}

function formatCode(code) {
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('AW') && clean.length > 2) return 'AW-' + clean.slice(2);
  return 'AW-' + clean;
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function extractCode(payload) {
  const raw = String(payload || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const fromUrl = url.searchParams.get('code') || url.searchParams.get('pass');
    if (fromUrl) return fromUrl.trim();
  } catch (e) {}
  const match = raw.match(/(?:code|pass)=([A-Za-z0-9-]+)/i);
  if (match) return match[1];
  return raw;
}

function setCameraNote(message) {
  const note = $('ciCameraNote');
  if (!note) return;
  if (message) {
    note.textContent = message;
    note.hidden = false;
  } else {
    note.textContent = '';
    note.hidden = true;
  }
}

function cameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

async function startScanner() {
  if (!cameraSupported()) {
    $('ciScanBtn').hidden = true;
    setCameraNote('This device has no camera available. Enter the guest’s short code below.');
    return;
  }

  const video = $('ciVideo');
  const scanner = $('ciScanner');
  const btn = $('ciScanBtn');

  if (stream && stream.getVideoTracks().some((t) => t.readyState === 'live')) {
    scanner.hidden = false;
    btn.hidden = true;
    setCameraNote('');
    resumeLoop();
    return;
  }

  if (starting) return;
  starting = true;
  setCameraNote('');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    video.srcObject = stream;
    await video.play();
    scanner.hidden = false;
    btn.hidden = true;
    scannerUsed = true;
    setCameraNote('');
    resumeLoop();
  } catch (err) {
    stopStream();
    scanner.hidden = true;
    btn.hidden = false;
    const name = err && err.name ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      setCameraNote('Camera access was declined. Allow camera access, or enter the guest’s short code below.');
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      btn.hidden = true;
      setCameraNote('No camera was found. Enter the guest’s short code below.');
    } else if (name === 'NotReadableError') {
      setCameraNote('The camera is busy in another app. Close it and tap “Open camera to scan”, or enter the short code below.');
    } else {
      setCameraNote('Camera could not start. Enter the guest’s short code below.');
    }
  } finally {
    starting = false;
  }
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach((track) => {
      try { track.stop(); } catch (e) {}
    });
  }
  stream = null;
  const video = $('ciVideo');
  if (video) video.srcObject = null;
}

function resumeLoop() {
  if (!stream || scanning) return;
  scanning = true;
  lastScanAt = 0;
  scanFrame = requestAnimationFrame(tick);
}

function pauseLoop() {
  scanning = false;
  if (scanFrame) cancelAnimationFrame(scanFrame);
  scanFrame = 0;
}

function tick(timestamp) {
  if (!scanning) return;
  const video = $('ciVideo');

  if (video && video.readyState >= 2 && timestamp - lastScanAt > 90) {
    lastScanAt = timestamp;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width && height) {
      scanCanvas.width = width;
      scanCanvas.height = height;
      scanCtx.drawImage(video, 0, 0, width, height);
      const image = scanCtx.getImageData(0, 0, width, height);
      const found = jsQR(image.data, width, height, { inversionAttempts: 'dontInvert' });

      if (found && found.data) {
        const code = extractCode(found.data);
        if (code) {
          pauseLoop();
          handleScannedCode(code);
          return;
        }
      }
    }
  }

  scanFrame = requestAnimationFrame(tick);
}

async function handleScannedCode(code) {
  if (verifying) return;
  const clean = String(code || '').trim();
  if (!clean) {
    resumeLoop();
    return;
  }
  $('ciCodeInput').value = clean;
  history.replaceState({}, '', location.pathname + '?code=' + encodeURIComponent(clean));
  await verify(clean);
}

async function lookupInvitation(code) {
  try {
    const r = await fetch('api/guests.php?code=' + encodeURIComponent(code), {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    let data = null;
    try { data = await r.json(); } catch (e) {}
    if (r.ok && data && data.ok && data.guest) {
      return { guest: data.guest };
    }
    if (data && typeof data === 'object' && data.error) {
      return { error: data.error };
    }
    return { unreachable: true };
  } catch (e) {
    return { unreachable: true };
  }
}

async function recordArrival(code) {
  try {
    const r = await fetch('api/guests.php', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin', code }),
    });
    let data = null;
    try { data = await r.json(); } catch (e) {}
    if (r.ok && data && data.ok && data.guest) {
      return { ok: true, guest: data.guest, already: !!data.already_checked_in };
    }
    return { ok: false };
  } catch (e) {
    return { ok: false };
  }
}

function renderValid(guest, already, logged) {
  $('ciName').textContent = guest.name || 'Honored Guest';

  const meta = $('ciMeta');
  meta.innerHTML = '';
  const seats = Math.max(1, Number(guest.max_guests) || 1);
  const seatChip = document.createElement('span');
  seatChip.className = 'checkin-chip';
  seatChip.textContent = `Reserved for ${seats} guest${seats === 1 ? '' : 's'}`;
  meta.appendChild(seatChip);

  if (guest.table_no) {
    const tableChip = document.createElement('span');
    tableChip.className = 'checkin-chip checkin-chip-table';
    tableChip.textContent = `Table ${guest.table_no}`;
    meta.appendChild(tableChip);
  }

  const note = $('ciNote');
  if (guest.note) {
    note.textContent = guest.note;
    note.hidden = false;
  } else {
    note.hidden = true;
  }

  const arrival = $('ciArrival');
  const time = formatTime(guest.checked_in_at);
  if (!logged) {
    arrival.textContent = 'Valid invitation · arrival not recorded — please note with protocol.';
    arrival.hidden = false;
  } else if (already && time) {
    arrival.textContent = `Already checked in at ${time}`;
    arrival.hidden = false;
  } else if (time) {
    arrival.textContent = `Checked in at ${time}`;
    arrival.hidden = false;
  } else {
    arrival.hidden = true;
  }

  try { navigator.vibrate && navigator.vibrate([45, 35, 45]); } catch (e) {}
  document.title = `Entry granted — ${guest.name || 'Guest'}`;
  showState('ciValid');
}

function renderInvalid(code, message) {
  const ref = $('ciRef');
  const formatted = formatCode(code);
  if (formatted) {
    ref.textContent = `Code presented: ${formatted}`;
    ref.hidden = false;
  } else {
    ref.hidden = true;
  }
  if (message) {
    console.info('Invitation not verified:', message);
  }
  document.title = 'Please see the Chief Protocol — Entrance';
  showState('ciInvalid');
}

function renderOffline() {
  document.title = 'Verification unavailable — Entrance';
  showState('ciOffline');
}

function autoStartIfMobile() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarse && cameraSupported()) {
    setTimeout(() => {
      if (!$('ciIdle').hidden) startScanner();
    }, 250);
  }
}

function resetToIdle() {
  currentCode = '';
  verifying = false;
  history.replaceState({}, '', location.pathname);
  $('ciCodeInput').value = '';
  $('ciIdleError').hidden = true;
  document.title = 'Entrance Check-In — Astonie & Wanangwa';
  showState('ciIdle');

  if (stream || scannerUsed) {
    startScanner();
  } else {
    autoStartIfMobile();
    if (!$('ciScanBtn').hidden) setTimeout(() => $('ciCodeInput').focus(), 60);
  }
}

async function verify(code) {
  currentCode = String(code || '').trim();
  if (!currentCode) {
    resetToIdle();
    $('ciIdleError').textContent = 'Please enter the invitation code.';
    $('ciIdleError').hidden = false;
    return;
  }

  verifying = true;
  pauseLoop();
  setCameraNote('');
  document.title = 'Verifying invitation — Entrance';
  showState('ciLoading');

  try {
    const result = await lookupInvitation(currentCode);

    if (result.guest) {
      const guest = result.guest;
      const arrival = await recordArrival(guest.code || currentCode);
      renderValid(arrival.ok && arrival.guest ? arrival.guest : guest, arrival.ok ? arrival.already : false, arrival.ok);
      return;
    }

    if (result.unreachable) {
      renderOffline();
      return;
    }

    renderInvalid(currentCode, result.error);
  } finally {
    verifying = false;
  }
}

$('ciScanBtn').addEventListener('click', startScanner);
$('ciNext').addEventListener('click', resetToIdle);
$('ciRetry').addEventListener('click', resetToIdle);
$('ciRetryOffline').addEventListener('click', () => {
  if (currentCode) verify(currentCode);
  else resetToIdle();
});

$('ciCodeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = $('ciCodeInput').value.trim();
  if (!code) {
    $('ciIdleError').textContent = 'Please enter the invitation code.';
    $('ciIdleError').hidden = false;
    return;
  }
  $('ciIdleError').hidden = true;
  history.replaceState({}, '', location.pathname + '?code=' + encodeURIComponent(code));
  verify(code);
});

window.addEventListener('online', () => {
  if (currentCode && $('ciOffline') && !$('ciOffline').hidden) {
    verify(currentCode);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseLoop();
    return;
  }
  if (!$('ciIdle').hidden) {
    if (stream) resumeLoop();
    else autoStartIfMobile();
  }
});

window.addEventListener('pagehide', () => {
  pauseLoop();
  stopStream();
});

if (currentCode) {
  verify(currentCode);
} else {
  showState('ciIdle');
  autoStartIfMobile();
  if (!$('ciScanBtn').hidden) setTimeout(() => $('ciCodeInput').focus(), 80);
}
