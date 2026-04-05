/**
 * Runs on GolemGuard web app origins. Syncs localStorage `token` / `user` from the
 * site into the extension when the user is already signed in in the browser.
 */

import type { MsgImportWebSession } from '../types';

function readWebSession(): { token: string | null; email?: string } {
  const raw = localStorage.getItem('token');
  const token = raw && raw.trim().length > 0 ? raw.trim() : null;
  const userRaw = localStorage.getItem('user');
  let email: string | undefined;
  if (userRaw) {
    try {
      const u = JSON.parse(userRaw) as { email?: string };
      if (typeof u.email === 'string' && u.email) email = u.email;
    } catch {
      /* ignore */
    }
  }
  return { token, email };
}

function push(): void {
  const { token, email } = readWebSession();
  const msg: MsgImportWebSession = {
    type: 'IMPORT_WEB_SESSION',
    token,
    ...(email ? { email } : {}),
  };
  try {
    chrome.runtime.sendMessage(msg);
  } catch {
    /* Extension updated or invalidated */
  }
}

push();

window.addEventListener('storage', (e) => {
  if (e.key === 'token' || e.key === 'user' || e.key === null) push();
});
