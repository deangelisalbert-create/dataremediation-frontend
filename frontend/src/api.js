// frontend/src/api.js
const BASE_URL = import.meta.env.VITE_API_URL || 'https://dataremediation-backend-production.up.railway.app';

let _accessToken  = null;
let _refreshToken = null;

function getAccessToken()  { return _accessToken; }
function getRefreshToken() { return localStorage.getItem('dr_refresh') || _refreshToken; }

function setTokens(access, refresh) {
  _accessToken  = access;
  _refreshToken = refresh;
  if (refresh) localStorage.setItem('dr_refresh', refresh);
}

function clearTokens() {
  _accessToken  = null;
  _refreshToken = null;
  localStorage.removeItem('dr_refresh');
  localStorage.removeItem('dr_user');
}

async function request(method, path, body = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (getAccessToken()) headers['Authorization'] = `Bearer ${getAccessToken()}`;

  const config = {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };

  let response = await fetch(`${BASE_URL}${path}`, config);

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED') {
      const refreshed = await tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getAccessToken()}`;
        response = await fetch(`${BASE_URL}${path}`, { ...config, headers });
      } else {
        clearTokens();
        window.dispatchEvent(new Event('auth:logout'));
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(err.error || `Erreur ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ── Auth ──────────────────────────────────────────────────
export async function register(company, email, password) {
  const data = await request('POST', '/api/auth/register', { company, email, password });
  setTokens(data.accessToken, data.refreshToken);
  localStorage.setItem('dr_user', JSON.stringify(data.user));
  return data.user;
}

export async function login(email, password) {
  const data = await request('POST', '/api/auth/login', { email, password });
  setTokens(data.accessToken, data.refreshToken);
  localStorage.setItem('dr_user', JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  try {
    await request('POST', '/api/auth/logout', { refreshToken: getRefreshToken() });
  } finally {
    clearTokens();
  }
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('dr_user')); } catch { return null; }
}

export async function restoreSession() {
  const user = getStoredUser();
  if (!user) return null;
  const refreshed = await tryRefresh();
  if (!refreshed) { clearTokens(); return null; }
  return user;
}

// ── Fichiers ──────────────────────────────────────────────
export async function listFiles() {
  const data = await request('GET', '/api/audit/files');
  return data.files;
}

// ── Upload avec header X-Nb-Fournisseurs ──────────────────
export async function uploadFile(file, onProgress, nbFournisseurs = 0) {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/api/audit/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAccessToken()}`);

    // Envoyer le nombre de fournisseurs détectés
    if (nbFournisseurs > 0) {
      xhr.setRequestHeader('X-Nb-Fournisseurs', String(nbFournisseurs));
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        const err = JSON.parse(xhr.responseText || '{}');
        reject(new Error(err.error || `Erreur ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Erreur réseau lors de l\'upload'));
    xhr.send(formData);
  });
}

export async function getFileStatus(fileId) {
  return request('GET', `/api/audit/status/${fileId}`);
}

export async function deleteFile(fileId) {
  return request('DELETE', `/api/audit/files/${fileId}`);
}

// ── Crédits et abonnement ─────────────────────────────────
export async function getCredits() {
  return request('GET', '/api/audit/credits');
}

// ── Rapports ──────────────────────────────────────────────
export async function getDownloadLink(fileId, type) {
  return request('POST', `/api/reports/${fileId}/link`, { type });
}

export function buildDownloadUrl(downloadUrl) {
  return `${BASE_URL}${downloadUrl}`;
}
