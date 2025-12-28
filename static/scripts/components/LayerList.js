/**
 * LayerList.js
 * Manages the sidebar layer list and layer controls
 */

import { getLayerFeatureCount } from '../services/CatalogService.js';
import { loadLayer, unloadLayer, toggleLayerVisibility } from '../services/LayerService.js';
import {
  getLayerState,
  setLayerState,
  getFeatureCount,
  getGeometryType,
  getLayerBounds,
} from '../state/LayerState.js';
import { updateGlobalStatistics } from './Statistics.js';
import { getMap } from '../state/MapState.js';

/**
 * Update layer state and UI
 * @param {string} layerId - The layer ID
 * @param {string} state - The layer state (loading, loaded, error, unloaded)
 */
export function updateLayerState(layerId, state) {
  const layerItem = document.querySelector(`[data-layer-id="${layerId}"]`);
  if (!layerItem) return;

  const statusElement = layerItem.querySelector('.layer-status');
  const loadButton = layerItem.querySelector('.load-button');
  const featureCountElement = layerItem.querySelector('.feature-count');

  // Update the actual state
  setLayerState(layerId, state);

  // Remove all state classes
  layerItem.classList.remove('loaded', 'loading', 'error');

  switch (state) {
    case 'loading':
      layerItem.classList.add('loading');
      statusElement.innerHTML = '<span class="loading-spinner"></span>Loading...';
      statusElement.style.color = '#007bff';
      loadButton.textContent = 'Loading...';
      loadButton.disabled = true;
      break;
    case 'loaded': {
      layerItem.classList.add('loaded');
      const count = getFeatureCount(layerId) || 0;
      const geometryType = getGeometryType(layerId) || 'Unknown';
      statusElement.textContent = `✓ Loaded (${count.toLocaleString()} features)`;
      statusElement.style.color = '#28a745';
      loadButton.textContent = 'Unload';
      loadButton.className = 'load-button unload-button';
      loadButton.disabled = false;
      if (featureCountElement) {
        featureCountElement.textContent = `${count.toLocaleString()} features • ${geometryType}`;
      }
      break;
    }
    case 'error':
      layerItem.classList.add('error');
      statusElement.textContent = '✗ Error loading';
      statusElement.style.color = '#dc3545';
      loadButton.textContent = 'Retry';
      loadButton.className = 'load-button';
      loadButton.disabled = false;
      break;
    case 'unloaded':
    default:
      statusElement.textContent = 'Not loaded';
      statusElement.style.color = '#6c757d';
      loadButton.textContent = 'Load';
      loadButton.className = 'load-button';
      loadButton.disabled = false;
      break;
  }
}

/**
 * Update sidebar with layer information and manual loading controls
 * @param {Object} catalog - The service catalog
 */
export function updateSidebar(catalog) {
  const layerList = document.getElementById('layer-list');

  // Update global statistics initially
  updateGlobalStatistics();

  // Clear loading message
  layerList.innerHTML = '';

  // Separate precinct layers from other layers
  const precinctLayers = [];
  const propertyLayers = [];

  catalog.services.forEach(service => {
    if (service.id.startsWith('precincts')) {
      precinctLayers.push(service);
    } else {
      propertyLayers.push(service);
    }
  });

  // Add property/parcel layers (not election-specific)
  propertyLayers.forEach(service => {
    addLayerToList(layerList, service);
  });

  // Add a collapsible section for election data layers (advanced users only)
  if (precinctLayers.length > 0) {
    addAdvancedSection(layerList, precinctLayers);
  }

  // Set up event listeners once after all layers are added
  setupLayerListEventListeners();
}

/**
 * Add a layer item to the list
 */
function addLayerToList(layerList, service) {
  const listItem = document.createElement('li');
  listItem.className = 'layer-item';
  listItem.setAttribute('data-layer-id', service.id);

  listItem.innerHTML = `
    <div class="layer-header">
      <input type="checkbox" id="visibility-${service.id}" class="layer-toggle" style="display:none;">
      <div class="layer-name">${service.name}</div>
    </div>
    <div class="layer-id">${service.id}</div>
    <div class="layer-info">
      <span class="feature-count">Getting count...</span>
    </div>
    <div class="layer-controls">
      <button class="load-button" data-layer-id="${service.id}">Load</button>
      <input type="checkbox" id="toggle-${service.id}" class="layer-toggle" style="display:none;" title="Show/Hide layer">
    </div>
    <div class="layer-status" style="font-size: 0.8em; color: #6c757d; margin-top: 4px;">Not loaded</div>
  `;

  layerList.appendChild(listItem);

  // Get feature count for this layer
  getLayerFeatureCount(service.id).then(count => {
    const featureCountElement = listItem.querySelector('.feature-count');
    const warningContainer = listItem.querySelector('.layer-info');

    if (count > 0) {
      featureCountElement.textContent = `${count.toLocaleString()} features`;
      featureCountElement.style.color = '#28a745';

      // Add warning for large datasets
      if (count > 5000) {
        const warning = document.createElement('div');
        warning.className = 'warning';
        warning.textContent = '⚠️ Large dataset - may take time to load';
        warningContainer.appendChild(warning);
      }
    } else {
      featureCountElement.textContent = 'No features found';
      featureCountElement.style.color = '#6c757d';
    }
  });
}

/**
 * Add a collapsible advanced section for precinct layers
 */
function addAdvancedSection(layerList, precinctLayers) {
  const advancedSection = document.createElement('li');
  advancedSection.style.marginTop = '15px';
  advancedSection.innerHTML = `
    <details>
      <summary style="cursor: pointer; font-weight: bold; color: #6c757d; padding: 8px 0;">
        ⚙️ Advanced: Election Layers (Auto-loaded)
      </summary>
      <div id="advanced-layers" style="margin-top: 10px;"></div>
    </details>
  `;

  layerList.appendChild(advancedSection);

  const advancedContainer = advancedSection.querySelector('#advanced-layers');
  precinctLayers.forEach(service => {
    addLayerToList(advancedContainer, service);
  });
}

/**
 * Set up event listeners for the layer list
 * Note: Now called once after sidebar is fully built
 */
function setupLayerListEventListeners() {
  const layerList = document.getElementById('layer-list');
  if (!layerList) return;

  layerList.addEventListener('click', function (e) {
    if (e.target.classList.contains('load-button')) {
      const layerId = e.target.getAttribute('data-layer-id');
      const currentState = getLayerState(layerId);

      if (currentState === 'loaded') {
        unloadLayer(layerId);
      } else if (currentState === 'unloaded' || currentState === 'error') {
        loadLayer(layerId)
          .then(() => {
            // Show visibility toggle after loading
            const visibilityToggle = document.querySelector(`#toggle-${layerId}`);
            if (visibilityToggle) {
              visibilityToggle.style.display = 'inline';
              visibilityToggle.checked = true;

              // Add visibility toggle event listener
              visibilityToggle.addEventListener('change', function () {
                toggleLayerVisibility(layerId, this.checked);
              });
            }
          })
          .catch(error => {
            console.error(`Failed to load layer ${layerId}:`, error);
          });
      }
    } else if (
      e.target.closest('.layer-item.loaded') &&
      !e.target.classList.contains('load-button') &&
      !e.target.classList.contains('layer-toggle')
    ) {
      // Handle click-to-center for loaded layers
      const layerItem = e.target.closest('.layer-item');
      const layerId = layerItem.getAttribute('data-layer-id');

      // Center map on this layer if bounds are available
      const bounds = getLayerBounds(layerId);
      if (bounds) {
        const map = getMap();
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
          duration: 0.5,
        });
      }
    }
  });
}

