// Minimal PKCE helpers for Dropbox's OAuth2 authorization-code flow.
// No client secret is used or needed - PKCE is the documented flow for
// browser-only apps (https://developers.dropbox.com/oauth-guide).

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return base64UrlEncode(new Uint8Array(digest));
}

export function currentRedirectUri() {
  return window.location.origin + window.location.pathname;
}

const VERIFIER_KEY = 'dropbox.pkceVerifier';
const STATE_KEY = 'dropbox.pkceState';

export async function beginAuthorize(appKey) {
  const verifier = randomString(64);
  const state = randomString(16);
  const challenge = await sha256Base64Url(verifier);

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.searchParams.set('client_id', appKey);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('token_access_type', 'offline');
  url.searchParams.set('redirect_uri', currentRedirectUri());
  url.searchParams.set('state', state);

  window.location.assign(url.toString());
}

// Reads ?code=&state= from the current URL (the Dropbox redirect back to
// this app), exchanges the code for tokens, and cleans the URL. Returns the
// token payload, or null if there was nothing to exchange.
export async function completeAuthorizeIfRedirected(appKey) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return null;

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const state = params.get('state');

  // Always strip the OAuth params from the URL, success or not, so a
  // refresh doesn't try to redeem the same code twice.
  window.history.replaceState({}, '', currentRedirectUri());

  if (!verifier || !expectedState || state !== expectedState) {
    throw new Error('Dropbox sign-in could not be verified. Please try connecting again.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: appKey,
    redirect_uri: currentRedirectUri(),
    code_verifier: verifier,
  });

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);

  if (!res.ok) {
    throw new Error('Dropbox sign-in failed. Please try connecting again.');
  }
  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

export async function refreshAccessToken(appKey, refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: appKey,
  });

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error('Could not refresh the Dropbox connection. Please reconnect.');
  }
  return res.json(); // { access_token, expires_in, ... }
}
