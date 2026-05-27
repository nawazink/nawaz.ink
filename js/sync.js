import { state, saveState } from './state.js';

export const SUPABASE_URL = 'https://ebbzrctuxheedazybjwy.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_MiOKWXteifsXEc4yHhgT2w_AFFMRae1';

export const SUPABASE_EMAIL = 'nawaz.documation@gmail.com';

let supabase = null;
let autoSyncTimer = null;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (supabase) return supabase;

  // Supabase v2 UMD may expose as window.supabase or window.Supabase
  const lib = window.supabase || window.Supabase;
  if (lib && lib.createClient) {
    supabase = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  }

  console.warn('[sync] Supabase library not loaded. window.supabase:', typeof window.supabase);
  return null;
}

export function updateSyncStatus(text) {
  state.cloud.status = text;
  const el = document.getElementById('topbar-sync-status');
  if (el) el.textContent = text;
}

export async function cloudSignIn(email, password) {
  const client = getClient();
  if (!client) { updateSyncStatus('Local only'); return { error: 'No config' }; }
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) { updateSyncStatus('Sign in failed'); return { error: error.message }; }
    updateSyncStatus('Connected');
    state.cloud.lastError = '';
    saveState();
    return { data };
  } catch (e) {
    updateSyncStatus('Error');
    return { error: e.message };
  }
}

export async function cloudSignOut() {
  const client = getClient();
  if (!client) return;
  await client.auth.signOut();
  updateSyncStatus('Local only');
  saveState();
}

export async function syncNow() {
  const client = getClient();
  if (!client) return;
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { updateSyncStatus('Not signed in'); return; }
    const payload = JSON.stringify(state);
    await client.from('user_state').upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() });
    state.cloud.lastSyncedAt = Date.now();
    updateSyncStatus('Synced');
    saveState();
  } catch (e) {
    state.cloud.lastError = e.message;
    updateSyncStatus('Sync failed');
    saveState();
  }
}

export async function restoreFromCloud() {
  const client = getClient();
  if (!client) return;
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    const { data, error } = await client.from('user_state').select('data').eq('user_id', user.id).single();
    if (error || !data) return;
    const parsed = JSON.parse(data.data);
    Object.assign(state, parsed);
    saveState();
    updateSyncStatus('Restored');
    window.location.reload();
  } catch (e) {
    updateSyncStatus('Restore failed');
  }
}

export function startAutoSync() {
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => {
    if (state.settings.cloudEnabled === '1') syncNow();
  }, 30000);
}

export async function autoSignIn(password) {
  const client = getClient();
  if (!client) return false;
  try {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      updateSyncStatus('Connected');
      syncNow();
      return true;
    }
    const { error } = await client.auth.signInWithPassword({ email: SUPABASE_EMAIL, password });
    if (error) {
      console.warn('[sync] Sign-in failed:', error.message);
      updateSyncStatus('Sign in failed');
      return false;
    }
    updateSyncStatus('Connected');
    syncNow();
    return true;
  } catch (e) {
    console.warn('[sync] Sign-in error:', e);
    updateSyncStatus('Error');
    return false;
  }
}
