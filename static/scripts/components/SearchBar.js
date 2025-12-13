/**
 * SearchBar.js
 * Handles search functionality for filtering features
 * Now works with any GeoJSON dataset through field analysis
 */

import { getAllLayerData, getLayerGroup } from '../state/LayerState.js';
import { getAllOriginalLayerGroups } from '../state/LayerState.js';
import { getMap } from '../state/MapState.js';
import { getStyleForLayer } from '../services/StyleService.js';
import { createPopupContent } from '../utils/popupBuilder.js';
import { updateURL, clearURLParams, getSearchFromURL } from '../utils/urlParams.js';
import {
  analyzeFields,
  getSearchableFields,
  searchFeaturesInFields,
} from '../utils/fieldAnalyzer.js';

// Store field metadata for each layer
const layerFieldMetadata = {};

/**
 * Analyze fields for a layer (done once when layer is loaded)
 * @param {string} layerId - The layer ID
 * @param {Object} geojsonData - The GeoJSON data
 */
export function analyzeLayerFields(layerId, geojsonData) {
  const fieldMetadata = analyzeFields(geojsonData);
  layerFieldMetadata[layerId] = fieldMetadata;

  console.log(`📊 Analyzed ${Object.keys(fieldMetadata).length} fields for layer: ${layerId}`);

  // Log searchable fields for debugging
  const searchableFields = getSearchableFields(fieldMetadata);
  if (searchableFields.length > 0) {
    console.log(
      `  🔍 Searchable fields (${searchableFields.length}):`,
      searchableFields.map(f => `${f.displayName} (${f.type})`).join(', ')
    );
  }

  return fieldMetadata;
}

/**
 * Get field metadata for a layer
 */
export function getLayerFieldMetadata(layerId) {
  return layerFieldMetadata[layerId] || {};
}

/**
 * Search features across all loaded layers
 * Now works with ANY GeoJSON fields automatically
 * @param {string} searchTerm - The search term
 */
export function searchFeatures(searchTerm) {
  let totalResults = 0;

  // If no search term, show all features
  if (!searchTerm) {
    clearAllFilters();
    return;
  }

  const allLayerData = getAllLayerData();

  Object.keys(allLayerData).forEach(layerId => {
    const data = allLayerData[layerId];

    // Analyze fields if not already done
    if (!layerFieldMetadata[layerId]) {
      analyzeLayerFields(layerId, data);
    }

    const fieldMetadata = layerFieldMetadata[layerId];
    const searchableFields = getSearchableFields(fieldMetadata);

    // Use generic search that works with any fields
    const filteredFeatures = searchFeaturesInFields(
      data.features,
      searchTerm,
      searchableFields.map(f => f.name),
      fieldMetadata
    );

    totalResults += filteredFeatures.length;

    // Update the layer on the map
    updateLayerWithFilteredFeatures(layerId, filteredFeatures);
  });

  // Update search count
  updateSearchCount(totalResults, searchTerm);

  // Update URL for shareability
  updateURL(searchTerm);
}

/**
 * Update a layer with filtered features
 * @param {string} layerId - The layer ID
 * @param {Array} filteredFeatures - The filtered features
 */
function updateLayerWithFilteredFeatures(layerId, filteredFeatures) {
  const map = getMap();

  // Get current layer group from state
  const currentLayerGroup = getLayerGroup(layerId);

  // Remove existing layer
  if (currentLayerGroup) {
    map.removeLayer(currentLayerGroup);
  }

  // Create new layer with filtered features
  const filteredData = {
    type: 'FeatureCollection',
    features: filteredFeatures,
  };

  const style = getStyleForLayer(layerId);
  const featureCount = filteredFeatures.length;
  const useClustering = featureCount > 1000;

  if (useClustering) {
    // Create new cluster group for filtered data
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      disableClusteringAtZoom: 18,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
    });

    L.geoJSON(filteredData, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng);
      },
      style: style,
      onEachFeature: function (feature, layer) {
        const props = feature.properties;

        // Bind popup with async content loading
        layer.bindPopup(() => {
          const popup = layer.getPopup();
          popup.setContent('Loading...');
          createPopupContent(layerId, props, feature.geometry).then(content => {
            popup.setContent(content);
          });
          return 'Loading...';
        });
        layer.feature = feature;

        if (feature.geometry.type === 'Point') {
          clusterGroup.addLayer(layer);
        } else {
          layer.addTo(map);
        }
      },
    });

    // Update state with new layer group
    import('../state/LayerState.js').then(module => {
      module.state.layerGroups[layerId] = clusterGroup;
    });

    map.addLayer(clusterGroup);
  } else {
    // Create regular layer for smaller filtered datasets
    const geoJsonLayer = L.geoJSON(filteredData, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng);
      },
      style: style,
      onEachFeature: function (feature, layer) {
        const props = feature.properties;

        // Bind popup with async content loading
        layer.bindPopup(() => {
          const popup = layer.getPopup();
          popup.setContent('Loading...');
          createPopupContent(layerId, props, feature.geometry).then(content => {
            popup.setContent(content);
          });
          return 'Loading...';
        });
        layer.feature = feature;
      },
    }).addTo(map);

    // Update state with new layer group
    import('../state/LayerState.js').then(module => {
      module.state.layerGroups[layerId] = geoJsonLayer;
    });
  }
}

/**
 * Update search count display
 * @param {number} count - The number of results
 * @param {string} searchTerm - The search term
 */
function updateSearchCount(count, searchTerm) {
  const searchCountElement = document.getElementById('search-count');
  const allLayerData = getAllLayerData();

  if (count === 0 && searchTerm) {
    searchCountElement.textContent = 'No results found';
    searchCountElement.style.color = '#dc3545';
  } else if (searchTerm) {
    const total = Object.values(allLayerData).reduce((sum, data) => sum + data.features.length, 0);
    searchCountElement.textContent = `Found ${count.toLocaleString()} of ${total.toLocaleString()} properties`;
    searchCountElement.style.color = '#28a745';
  } else {
    const total = Object.values(allLayerData).reduce((sum, data) => sum + data.features.length, 0);
    searchCountElement.textContent =
      total > 0 ? `Search ${total.toLocaleString()} properties` : 'Search all properties';
    searchCountElement.style.color = '#6c757d';
  }
}

/**
 * Apply advanced filters to features
 * @param {Object} filters - Advanced filters object
 * @param {string} basicSearchTerm - Basic search term (optional)
 */
export function applyAdvancedFilters(filters, basicSearchTerm = '') {
  let totalResults = 0;
  const allLayerData = getAllLayerData();

  Object.keys(allLayerData).forEach(layerId => {
    const data = allLayerData[layerId];

    // Analyze fields if not already done
    if (!layerFieldMetadata[layerId]) {
      analyzeLayerFields(layerId, data);
    }

    const fieldMetadata = layerFieldMetadata[layerId];
    const searchableFields = getSearchableFields(fieldMetadata);

    // Apply filters
    let filteredFeatures = data.features;

    // Apply basic search first if provided
    if (basicSearchTerm) {
      filteredFeatures = searchFeaturesInFields(
        filteredFeatures,
        basicSearchTerm,
        searchableFields.map(f => f.name),
        fieldMetadata
      );
    }

    // Apply advanced filters
    filteredFeatures = filteredFeatures.filter(feature => {
      const props = feature.properties || {};

      return Object.keys(filters).every(fieldName => {
        const filter = filters[fieldName];
        const value = props[fieldName];

        switch (filter.type) {
          case 'categorical':
            return filter.values.includes(String(value));

          case 'numeric': {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return false;
            return numValue >= filter.min && numValue <= filter.max;
          }

          case 'boolean':
            return value === filter.value;

          case 'text':
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(filter.value.toLowerCase());

          default:
            return true;
        }
      });
    });

    totalResults += filteredFeatures.length;

    // Update the layer on the map
    updateLayerWithFilteredFeatures(layerId, filteredFeatures);
  });

  // Update search count
  const searchTerm = basicSearchTerm || 'Filtered';
  updateSearchCount(totalResults, searchTerm);

  // Update URL for shareability (basic search term only for now)
  if (basicSearchTerm) {
    updateURL(basicSearchTerm);
  }
}

/**
 * Clear all search filters
 */
export function clearAllFilters() {
  const map = getMap();

  // Reset search field
  document.getElementById('search-input').value = '';

  // Clear advanced filters
  import('./AdvancedSearch.js')
    .then(module => {
      module.clearAdvancedFilters();
    })
    .catch(() => {
      // Advanced search not loaded yet
    });

  // Restore original layers
  const originalLayerGroups = getAllOriginalLayerGroups();

  import('../state/LayerState.js').then(module => {
    Object.keys(originalLayerGroups).forEach(layerId => {
      if (module.state.layerGroups[layerId]) {
        map.removeLayer(module.state.layerGroups[layerId]);
      }
      module.state.layerGroups[layerId] = originalLayerGroups[layerId];
      map.addLayer(originalLayerGroups[layerId]);
    });
  });

  // Update search count
  const allLayerData = getAllLayerData();
  const total = Object.values(allLayerData).reduce((sum, data) => sum + data.features.length, 0);
  const searchCountElement = document.getElementById('search-count');
  searchCountElement.textContent =
    total > 0 ? `Search ${total.toLocaleString()} properties` : 'Search all properties';
  searchCountElement.style.color = '#6c757d';

  // Clear URL parameters
  clearURLParams();
}

/**
 * Load search from URL parameters
 */
export function loadFromURL() {
  const searchTerm = getSearchFromURL();

  // Update search field
  document.getElementById('search-input').value = searchTerm;

  // Apply search if term is set
  if (searchTerm) {
    searchFeatures(searchTerm);
  }
}

/**
 * Initialize search bar event listeners
 */
export function initializeSearchBar() {
  const searchInput = document.getElementById('search-input');
  const clearButton = document.getElementById('clear-search');

  // Debounced search function
  let searchTimeout;
  function debouncedSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const searchTerm = searchInput.value.trim();
      searchFeatures(searchTerm);
    }, 300); // 300ms delay
  }

  // Add event listeners
  searchInput.addEventListener('input', debouncedSearch);
  clearButton.addEventListener('click', clearAllFilters);

  // Enter key support for search input
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      clearTimeout(searchTimeout);
      const searchTerm = searchInput.value.trim();
      searchFeatures(searchTerm);
    }
  });
}
