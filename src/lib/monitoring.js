const endpoint = import.meta.env.VITE_ERROR_ENDPOINT;

function report(payload) {
  try {
    if (endpoint) {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
    }
  } catch (e) { /* ignore */ }
  if (import.meta.env.DEV) console.error('[monitor]', payload);
}

export function initMonitoring(scope = 'app') {
  window.addEventListener('error', e => {
    report({ scope, type: 'error', message: e.message, source: e.filename, line: e.lineno, col: e.colno, stack: e.error?.stack });
  });
  window.addEventListener('unhandledrejection', e => {
    report({ scope, type: 'unhandledrejection', message: String(e.reason?.message || e.reason), stack: e.reason?.stack });
  });
}