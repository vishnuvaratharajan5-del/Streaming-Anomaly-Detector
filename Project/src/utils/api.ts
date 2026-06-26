/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Retrieves the currently active backend URL.
 * Falls back to empty string (which uses relative path) if none is configured.
 */
export function getBackendUrl(): string {
  const customUrl = localStorage.getItem('anomaly_backend_url');
  if (customUrl) {
    const trimmed = customUrl.trim();
    // Automatically filter out truncated URLs (often from copypasting play UI previews)
    if (trimmed.includes('...') || trimmed.includes('…')) {
      return '';
    }
    // Remove any trailing slash to ensure clean joining
    return trimmed.replace(/\/$/, '');
  }
  return '';
}

/**
 * Saves a custom backend URL to localStorage so all future API routes route through it.
 */
export function setBackendUrl(url: string | null) {
  if (!url) {
    localStorage.removeItem('anomaly_backend_url');
  } else {
    localStorage.setItem('anomaly_backend_url', url.trim());
  }
}

/**
 * Secure wrapper around window.fetch that handles cross-origin backend endpoints
 * and detects static server errors (like Vercel 404 pages instead of API responses).
 */
export async function secureFetch(input: string, init?: RequestInit): Promise<Response> {
  const backend = getBackendUrl();
  let finalUrl = input;

  if (backend && input.startsWith('/api')) {
    finalUrl = `${backend}${input}`;
  }

  const response = await fetch(finalUrl, init);

  // Check if response might be an HTML error page (causes JSON parsing errors downstream)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    // Read start of response to describe the page
    const textBuffer = await response.text();
    const isVercel404 = textBuffer.includes('Vercel') || textBuffer.includes('not found') || textBuffer.includes('The page c');
    const displayMessage = isVercel404 ? 'The static server returned a 404 HTML document.' : 'The endpoint returned an HTML document instead of JSON data.';
    
    throw new Error(
      `TUNNEL_HTML_ERROR: ${displayMessage} This indicates that the backend Express server is not running on this domain, or the router is offline. Please configure your active Cloud Run/AI Studio backend bridge URL.`
    );
  }

  return response;
}
