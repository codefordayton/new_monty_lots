/**
 * Statistics.js
 * Manages the global statistics display in the sidebar
 */

import { getLoadedLayers, getFeatureCount } from '../state/LayerState.js';

/**
 * Update global statistics in the sidebar
 */
export function updateGlobalStatistics() {
  // Count total loaded layers
  const loadedLayers = getLoadedLayers();

  // Calculate total features across all loaded layers
  let totalFeatures = 0;
  loadedLayers.forEach(layerId => {
    totalFeatures += getFeatureCount(layerId);
  });

  // Update the statistics section
  const statsContent = document.getElementById('stats-content');
  if (statsContent) {
    statsContent.innerHTML = `
      <p><strong>Total Layers:</strong> <span id="layer-count">${
        document.querySelectorAll('.layer-item').length
      }</span></p>
      <p><strong>Loaded Layers:</strong> <span id="loaded-count">${loadedLayers.length}</span></p>
      <p><strong>Total Features:</strong> <span id="total-features">${totalFeatures.toLocaleString()}</span></p>
    `;
  }
}
