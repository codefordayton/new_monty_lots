/**
 * CatalogService.js
 * Handles fetching the service catalog and layer metadata
 */

import { setFeatureCount } from '../state/LayerState.js';

/**
 * Fetch the service catalog
 * @returns {Promise<Object>} The catalog data
 */
export async function fetchCatalog() {
  const response = await fetch('/catalog');
  const catalog = await response.json();
  return catalog;
}

/**
 * Get feature count for a layer without loading it
 * @param {string} layerId - The layer ID
 * @returns {Promise<number>} The feature count
 */
export async function getLayerFeatureCount(layerId) {
  try {
    const response = await fetch(
      `/file-geojson/rest/services/${layerId}/FeatureServer/0/query?f=json&where=1=1&returnCountOnly=true`
    );
    const data = await response.json();
    const count = data.count || 0;
    setFeatureCount(layerId, count);
    return count;
  } catch (error) {
    console.error(`Error getting feature count for ${layerId}:`, error);
    return 0;
  }
}

/**
 * Detect geometry type from GeoJSON data
 * @param {Object} data - GeoJSON FeatureCollection
 * @returns {string} The geometry type
 */
export function detectGeometryType(data) {
  if (!data || !data.features || data.features.length === 0) {
    return 'Unknown';
  }

  // Get geometry type from first feature
  const firstFeature = data.features[0];
  if (firstFeature && firstFeature.geometry && firstFeature.geometry.type) {
    return firstFeature.geometry.type;
  }

  return 'Unknown';
}
