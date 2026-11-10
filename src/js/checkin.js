const states = ['ciLoading', 'ciValid', 'ciInvalid', 'ciOffline', 'ciIdle'];
const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
let currentCode = (params.get('code') || params.get('pass') || '').trim();

function showState(id) {
  states.forEach((s) => {
    const el = $(s);
    if (el) el.hidden = s !== id;
  });
}

function formatCode(code) {
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('AW') && clean.length > 4) return 'AW-' + clean.slice(2);
  return 'AW-' + clean;
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

function resetToIdle() {
  currentCode = '';
  history.replaceState({}, '', location.pathname);
  $('ciCodeInput').value = '';
  $('ciIdleError').hidden = true;
  document.title = 'Entrance Check-In — Astonie & Wanangwa';
  showState('ciIdle');
  setTimeout(() => $('ciCodeInput').focus(), 60);
}

async function verify(code) {
  currentCode = String(code || '').trim();
  if (!currentCode) {
    resetToIdle();
    $('ciIdleError').textContent = 'Please enter the invitation code.';
    $('ciIdleError').hidden = false;
    return;
  }

  document.title = 'Verifying invitation — Entrance';
  showState('ciLoading');

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
}

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

if (currentCode) {
  verify(currentCode);
} else {
  showState('ciIdle');
  setTimeout(() => $('ciCodeInput').focus(), 80);
}
