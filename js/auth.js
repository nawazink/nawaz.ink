const STORAGE_KEY = 'nawaz_pw_hash';

export async function hashPassword(raw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getStoredHash() {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredHash(hash) {
  localStorage.setItem(STORAGE_KEY, hash);
}

export async function checkPassword(input) {
  const inputHash = await hashPassword(input);
  const stored = getStoredHash();
  return inputHash === stored;
}

export function isLocked() {
  const lockScreen = document.getElementById('lock-screen');
  return lockScreen && lockScreen.style.display !== 'none';
}

export function unlockApp() {
  const lockScreen = document.getElementById('lock-screen');
  const app = document.getElementById('app');
  lockScreen.classList.add('lock-exit');
  lockScreen.addEventListener('animationend', () => {
    lockScreen.style.display = 'none';
    lockScreen.classList.remove('lock-exit');
  }, { once: true });
  app.style.display = '';
}

export function lockApp() {
  const lockScreen = document.getElementById('lock-screen');
  const app = document.getElementById('app');
  const pwInput = document.getElementById('pw-input');
  const pwError = document.getElementById('pw-error');
  lockScreen.style.display = '';
  lockScreen.classList.remove('lock-exit');
  app.style.display = 'none';
  if (pwInput) pwInput.value = '';
  if (pwError) pwError.classList.remove('show');
}

export async function changePassword(oldRaw, newRaw) {
  const valid = await checkPassword(oldRaw);
  if (!valid) return false;
  const newHash = await hashPassword(newRaw);
  setStoredHash(newHash);
  return true;
}
