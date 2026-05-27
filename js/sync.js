import { state, saveState } from './state.js';

export const SUPABASE_URL = 'https://ebbzrctuxheedazybjwy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViYnpyY3R1eGhlZWRhenliand5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDQ5NTMsImV4cCI6MjA5MjQyMDk1M30.ME7_bz3WZlFP2gYvQYPpURZBU3koKN-ZjtPQcyjkx_w';

export const SUPABASE_EMAIL = 'nawaz.documation@gmail.com';

let supabase = null;
let autoSyncTimer = null;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error('[sync] No URL or key'); return null; }
  if (supabase) return supabase;

  const lib = window.supabase || window.Supabase;
  console.log('[sync] window.supabase:', typeof window.supabase, 'window.Supabase:', typeof window.Supabase);
  
  if (lib && lib.createClient) {
    supabase = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[sync] Client created successfully');
    return supabase;
  }

  console.error('[sync] Supabase library NOT loaded');
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
  if (!client) { console.error('[sync] syncNow: no client'); return; }
  try {
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr) { console.error('[sync] getUser error:', userErr.message); updateSyncStatus('Not signed in'); return; }
    if (!user) { console.error('[sync] No user session'); updateSyncStatus('Not signed in'); return; }
    console.log('[sync] Syncing for user:', user.id);
    const payload = JSON.stringify(state);
    const { error } = await client.from('user_state').upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() });
    if (error) { console.error('[sync] Upsert error:', error.message); updateSyncStatus('Sync failed: ' + error.message); return; }
    state.cloud.lastSyncedAt = Date.now();
    updateSyncStatus('Synced');
    saveState();
    console.log('[sync] Synced successfully');
  } catch (e) {
    console.error('[sync] syncNow exception:', e);
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
    if (state.settings.cloudEnabled === '1') {
      syncNow();
    }
    startAutoSync(); // Re-arm for next cycle
  }, 30000);
}

export async function autoSignIn(password) {
  const client = getClient();
  if (!client) { console.error('[sync] autoSignIn: no client'); return false; }
  try {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      console.log('[sync] Existing session found');
      updateSyncStatus('Connected');
      syncNow();
      return true;
    }
    console.log('[sync] Signing in as:', SUPABASE_EMAIL);
    const { error } = await client.auth.signInWithPassword({ email: SUPABASE_EMAIL, password });
    if (error) {
      console.error('[sync] Sign-in failed:', error.message);
      updateSyncStatus('Sign in failed');
      return false;
    }
    console.log('[sync] Sign-in successful');
    updateSyncStatus('Connected');
    // Auto-restore if local state is empty (fresh browser)
    if (state.pages.length === 0 && state.tasks.length === 0) {
      console.log('[sync] Local state empty, restoring from cloud...');
      await restoreFromCloud();
    } else {
      syncNow();
    }
    return true;
  } catch (e) {
    console.error('[sync] Sign-in exception:', e);
    updateSyncStatus('Error');
    return false;
  }
}
