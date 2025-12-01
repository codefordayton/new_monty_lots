/**
 * LayerService.js
 * Handles loading, unloading, and managing map layers
 */

import { StyleResolver, loadStyleConfig, createStyleFunction } from './StyleService.js';
import { detectGeometryType } from './CatalogService.js';
import { createPopupContent } from '../utils/popupBuilder.js';
import { getMap } from '../state/MapState.js';
import {
  setLayerData,
  setLayerGroup,
  removeLayerGroup,
  getLayerGroup,
  setGeometryType,
  setLayerBounds,
  setFeatureCount,
} from '../state/LayerState.js';
import { updateLayerState } from '../components/LayerList.js';
import { updateGlobalStatistics } from '../components/Statistics.js';
import { addLayerToLegend, removeLayerFromLegend } from '../components/Legend.js';
import { analyzeLayerFields } from '../components/SearchBar.js';

/**
 * Load a layer and add it to the map
 * @param {string} layerId - The layer ID
 * @returns {Promise<Object>} The GeoJSON data
 */
export async function loadLayer(layerId) {
  const map = getMap();

  // Update loading state
  updateLayerState(layerId, 'loading');

  try {
    // Load style configuration first
    const styleConfig = await loadStyleConfig(layerId);
    const styleResolver = new StyleResolver(styleConfig);

    // Load layer data
    const response = await fetch(
      `/file-geojson/rest/services/${layerId}/FeatureServer/0/query?f=geojson&where=1=1&outFields=*`
    );
    const data = await response.json();

    // Store the original data for searching
    setLayerData(layerId, data);

    // Analyze fields for generic search (works with any GeoJSON)
    analyzeLayerFields(layerId, data);

    // Detect and store geometry type
    const geometryType = detectGeometryType(data);
    setGeometryType(layerId, geometryType);

    // Calculate and store bounds for this layer
    if (data.features && data.features.length > 0) {
      const tempLayer = L.geoJSON(data);
      setLayerBounds(layerId, tempLayer.getBounds());
    }
    const featureCount = data.features.length;
    setFeatureCount(layerId, featureCount);

    // Use clustering for large datasets (>1000 features)
    const useClustering = featureCount > 1000;

    if (useClustering) {
      console.log(
        `Using clustering for ${layerId} (${featureCount} features) with dynamic styling`
      );

      // Create marker cluster group
      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        disableClusteringAtZoom: 18,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
      });

      // Add features to cluster group with dynamic styling
      L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
          return styleResolver.createMarker(feature.properties, latlng);
        },
        style: createStyleFunction(styleResolver),
        onEachFeature: function (feature, layer) {
          const props = feature.properties;
          const popupContent = createPopupContent(layerId, props, feature.geometry);
          layer.bindPopup(popupContent);

          // Store reference to feature for searching
          layer.feature = feature;

          // Add to cluster group for points, directly to map for polygons/lines
          if (feature.geometry.type === 'Point') {
            clusterGroup.addLayer(layer);
          } else {
            layer.addTo(map);
          }
        },
      });

      // Store layer groups for filtering
      setLayerGroup(layerId, clusterGroup);

      // Add cluster group to map
      map.addLayer(clusterGroup);

      // Update state to loaded
      updateLayerState(layerId, 'loaded');

      // Update global statistics
      updateGlobalStatistics();

      // Add to legend
      addLayerToLegend(layerId, styleResolver);
    } else {
      console.log(
        `Loading ${layerId} without clustering (${featureCount} features) with dynamic styling`
      );

      // Use regular loading for smaller datasets with dynamic styling
      const geoJsonLayer = L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
          return styleResolver.createMarker(feature.properties, latlng);
        },
        style: createStyleFunction(styleResolver),
        onEachFeature: function (feature, layer) {
          const props = feature.properties;
          const popupContent = createPopupContent(layerId, props, feature.geometry);
          layer.bindPopup(popupContent);

          // Store reference to feature for searching
          layer.feature = feature;
        },
      }).addTo(map);

      // Store layer groups for filtering
      setLayerGroup(layerId, geoJsonLayer);

      // Update state to loaded
      updateLayerState(layerId, 'loaded');

      // Update global statistics
      updateGlobalStatistics();

      // Add to legend
      addLayerToLegend(layerId, styleResolver);
    }

    return data;
  } catch (error) {
    console.error(`Error loading ${layerId} data:`, error);
    updateLayerState(layerId, 'error');
    throw error;
  }
}

/**
 * Unload a layer from the map
 * @param {string} layerId - The layer ID
 */
export function unloadLayer(layerId) {
  const map = getMap();
  const layerGroup = getLayerGroup(layerId);

  if (layerGroup) {
    map.removeLayer(layerGroup);
    removeLayerGroup(layerId);
  }

  // Remove from legend
  removeLayerFromLegend(layerId);

  updateLayerState(layerId, 'unloaded');

  // Update global statistics
  updateGlobalStatistics();
}

/**
 * Toggle layer visibility
 * @param {string} layerId - The layer ID
 * @param {boolean} isVisible - Whether the layer should be visible
 */
export function toggleLayerVisibility(layerId, isVisible) {
  const map = getMap();
  const layerGroup = getLayerGroup(layerId);
  const layerItem = document.querySelector(`#toggle-${layerId}`).closest('.layer-item');
  const statusElement = layerItem.querySelector('.layer-status');

  if (layerGroup) {
    if (isVisible) {
      // Show layer
      map.addLayer(layerGroup);
      layerItem.classList.remove('hidden');
      statusElement.textContent = '✓ Visible';
      statusElement.style.color = '#28a745';
    } else {
      // Hide layer
      map.removeLayer(layerGroup);
      layerItem.classList.add('hidden');
      statusElement.textContent = '✗ Hidden';
      statusElement.style.color = '#6c757d';
    }
  } else {
    // Layer not loaded yet, update UI to show loading
    if (isVisible) {
      statusElement.textContent = '⏳ Loading...';
      statusElement.style.color = '#007bff';
    } else {
      statusElement.textContent = '✗ Hidden (not loaded)';
      statusElement.style.color = '#6c757d';
    }
    console.warn(`Layer ${layerId} not found in layerGroups. It may not be loaded yet.`);
  }
}
