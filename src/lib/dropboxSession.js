import { completeAuthorizeIfRedirected, refreshAccessToken } from './dropboxAuth';

const APP_KEY_STORAGE = 'dropbox.appKey';
const TOKENS_STORAGE = 'dropbox.tokens'; // { refreshToken, accessToken, expiresAt }

export function getStoredAppKey() {
  return localStorage.getItem(APP_KEY_STORAGE) || '';
}

export function setStoredAppKey(appKey) {
  localStorage.setItem(APP_KEY_STORAGE, appKey.trim());
}

function readTokens() {
  try {
    const raw = localStorage.getItem(TOKENS_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens) {
  localStorage.setItem(TOKENS_STORAGE, JSON.stringify(tokens));
}

export function isConnected() {
  return Boolean(readTokens()?.refreshToken);
}

export function saveTokensFromAuthResponse(payload) {
  writeTokens({
    refreshToken: payload.refresh_token,
    accessToken: payload.access_token,
    // 60s safety margin before the token's real expiry.
    expiresAt: Date.now() + (payload.expires_in - 60) * 1000,
  });
}

export function disconnect() {
  localStorage.removeItem(TOKENS_STORAGE);
}

// Redeeming an OAuth code must happen exactly once per page load: the code is
// single-use and the URL is cleaned as soon as it is read. Memoising the
// promise at module scope keeps that true no matter how many times (or how
// concurrently) a component effect asks for it.
let authBootstrap = null;

export function bootstrapAuth() {
  if (!authBootstrap) {
    authBootstrap = (async () => {
      const appKey = getStoredAppKey();
      if (!appKey) return { connected: isConnected(), justConnected: false, error: '' };
      try {
        const payload = await completeAuthorizeIfRedirected(appKey);
        if (payload) {
          saveTokensFromAuthResponse(payload);
          return { connected: true, justConnected: true, error: '' };
        }
      } catch (err) {
        return { connected: isConnected(), justConnected: false, error: err.message };
      }
      return { connected: isConnected(), justConnected: false, error: '' };
    })();
  }
  return authBootstrap;
}

// Returns a currently-valid access token, refreshing it first if needed.
export async function getValidAccessToken() {
  const tokens = readTokens();
  if (!tokens?.refreshToken) return null;

  if (tokens.accessToken && Date.now() < tokens.expiresAt) {
    return tokens.accessToken;
  }

  const appKey = getStoredAppKey();
  const refreshed = await refreshAccessToken(appKey, tokens.refreshToken);
  const nextTokens = {
    refreshToken: tokens.refreshToken,
    accessToken: refreshed.access_token,
    expiresAt: Date.now() + (refreshed.expires_in - 60) * 1000,
  };
  writeTokens(nextTokens);
  return nextTokens.accessToken;
}
