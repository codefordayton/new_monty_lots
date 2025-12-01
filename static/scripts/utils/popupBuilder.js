/**
 * popupBuilder.js
 * Utility for creating popup content for map features
 */

/**
 * Create HTML content for a feature popup
 * @param {string} layerId - The layer ID
 * @param {Object} properties - Feature properties
 * @param {Object} geometry - Feature geometry
 * @returns {string} HTML content for popup
 */
export function createPopupContent(layerId, properties, geometry) {
  let content = `<b>${layerId.charAt(0).toUpperCase() + layerId.slice(1)}</b><br/>`;

  // Add properties if they exist
  if (properties && Object.keys(properties).length > 0) {
    for (const [key, value] of Object.entries(properties)) {
      if (value !== null && value !== undefined) {
        content += `${key}: ${value}<br/>`;
      }
    }
  }

  // Add geometry info
  if (geometry.type === 'Point') {
    content += `Coordinates: ${geometry.coordinates.join(', ')}`;
  }

  return content;
}
