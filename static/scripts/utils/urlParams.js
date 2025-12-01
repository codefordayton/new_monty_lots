/**
 * urlParams.js
 * Utilities for managing URL parameters for shareable links
 */

/**
 * Update URL with search parameters
 * @param {string} searchTerm - The search term to add to URL
 */
export function updateURL(searchTerm) {
  const params = new URLSearchParams();
  if (searchTerm) params.set('search', searchTerm);

  const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
  window.history.pushState({}, '', newURL);
}

/**
 * Get search term from URL parameters
 * @returns {string} The search term from URL or empty string
 */
export function getSearchFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('search') || '';
}

/**
 * Clear all URL parameters
 */
export function clearURLParams() {
  window.history.pushState({}, '', window.location.pathname);
}
