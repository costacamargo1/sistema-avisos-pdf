import { BlobNotFoundError, head, put } from '@vercel/blob';

const ACTIVE_PDF_STATE_PATH = 'sistema-avisos-pdf/state/active-pdf.json';

function parseState(content) {
  if (!content || typeof content !== 'object') {
    return { exists: true, url: null };
  }

  const url = typeof content.url === 'string' ? content.url.trim() : null;
  return { exists: true, url: url || null };
}

export async function getActivePdfState(token) {
  try {
    const stateBlob = await head(ACTIVE_PDF_STATE_PATH, { token });
    const stateUrl = `${stateBlob.url}?t=${Date.now()}`;
    const res = await fetch(stateUrl, { cache: 'no-store' });

    if (!res.ok) {
      return { exists: true, url: null };
    }

    const json = await res.json().catch(() => ({}));
    return parseState(json);
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return { exists: false, url: null };
    }
    throw error;
  }
}

export async function setActivePdfState(url, token) {
  const payload = JSON.stringify({
    url: typeof url === 'string' && url.trim() ? url.trim() : null,
    updatedAt: new Date().toISOString(),
  });

  await put(ACTIVE_PDF_STATE_PATH, payload, {
    access: 'public',
    token,
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}
