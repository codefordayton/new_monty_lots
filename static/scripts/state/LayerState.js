/**
 * LayerState.js
 * Centralized state management for all layer-related data
 */

// Global state for layers
export const state = {
  allLayerData: {}, // Store all loaded layer data
  layerGroups: {}, // Store layer groups for filtering
  originalLayerGroups: {}, // Store original layer groups for reset
  layerStates: {}, // Track loading state of each layer
  layerFeatureCounts: {}, // Store feature counts for each layer
  layerGeometryTypes: {}, // Store geometry types for each layer
  layerBounds: {}, // Store geographic bounds for each layer
};

/**
 * Get all layer data
 * @returns {Object} All layer data
 */
export function getAllLayerData() {
  return state.allLayerData;
}

/**
 * Set layer data
 * @param {string} layerId - The layer ID
 * @param {Object} data - The GeoJSON data
 */
export function setLayerData(layerId, data) {
  state.allLayerData[layerId] = data;
}

/**
 * Get layer group
 * @param {string} layerId - The layer ID
 * @returns {L.LayerGroup} The layer group
 */
export function getLayerGroup(layerId) {
  return state.layerGroups[layerId];
}

/**
 * Set layer group
 * @param {string} layerId - The layer ID
 * @param {L.LayerGroup} group - The layer group
 */
export function setLayerGroup(layerId, group) {
  state.layerGroups[layerId] = group;
  state.originalLayerGroups[layerId] = group;
}

/**
 * Remove layer group
 * @param {string} layerId - The layer ID
 */
export function removeLayerGroup(layerId) {
  delete state.layerGroups[layerId];
  delete state.originalLayerGroups[layerId];
  delete state.allLayerData[layerId];
}

/**
 * Get original layer group (for search reset)
 * @param {string} layerId - The layer ID
 * @returns {L.LayerGroup} The original layer group
 */
export function getOriginalLayerGroup(layerId) {
  return state.originalLayerGroups[layerId];
}

/**
 * Get all original layer groups
 * @returns {Object} All original layer groups
 */
export function getAllOriginalLayerGroups() {
  return state.originalLayerGroups;
}

/**
 * Get layer state
 * @param {string} layerId - The layer ID
 * @returns {string} The layer state (loading, loaded, error, unloaded)
 */
export function getLayerState(layerId) {
  return state.layerStates[layerId] || 'unloaded';
}

/**
 * Set layer state
 * @param {string} layerId - The layer ID
 * @param {string} newState - The new state
 */
export function setLayerState(layerId, newState) {
  state.layerStates[layerId] = newState;
}

/**
 * Get feature count for a layer
 * @param {string} layerId - The layer ID
 * @returns {number} The feature count
 */
export function getFeatureCount(layerId) {
  return state.layerFeatureCounts[layerId] || 0;
}

/**
 * Set feature count for a layer
 * @param {string} layerId - The layer ID
 * @param {number} count - The feature count
 */
export function setFeatureCount(layerId, count) {
  state.layerFeatureCounts[layerId] = count;
}

/**
 * Get geometry type for a layer
 * @param {string} layerId - The layer ID
 * @returns {string} The geometry type
 */
export function getGeometryType(layerId) {
  return state.layerGeometryTypes[layerId] || 'Unknown';
}

/**
 * Set geometry type for a layer
 * @param {string} layerId - The layer ID
 * @param {string} type - The geometry type
 */
export function setGeometryType(layerId, type) {
  state.layerGeometryTypes[layerId] = type;
}

/**
 * Get bounds for a layer
 * @param {string} layerId - The layer ID
 * @returns {L.LatLngBounds} The layer bounds
 */
export function getLayerBounds(layerId) {
  return state.layerBounds[layerId];
}

/**
 * Set bounds for a layer
 * @param {string} layerId - The layer ID
 * @param {L.LatLngBounds} bounds - The layer bounds
 */
export function setLayerBounds(layerId, bounds) {
  state.layerBounds[layerId] = bounds;
}

/**
 * Get all loaded layers
 * @returns {string[]} Array of loaded layer IDs
 */
export function getLoadedLayers() {
  return Object.keys(state.layerStates).filter(layerId => state.layerStates[layerId] === 'loaded');
}

/**
 * Get all layer states
 * @returns {Object} All layer states
 */
export function getAllLayerStates() {
  return state.layerStates;
}
