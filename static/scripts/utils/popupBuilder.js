/**
 * popupBuilder.js
 * Utility for creating popup content for map features
 */

// Field label configuration - will be loaded from server
let fieldLabelsConfig = null;

/**
 * Load field labels configuration from server
 */
async function loadFieldLabelsConfig() {
  if (fieldLabelsConfig) return fieldLabelsConfig;

  try {
    const response = await fetch('/config/field-labels.json');
    fieldLabelsConfig = await response.json();
    return fieldLabelsConfig;
  } catch (error) {
    console.warn('Could not load field labels config:', error);
    return null;
  }
}

/**
 * Get human-readable label for a field
 * @param {string} fieldName - The field name
 * @param {string} layerId - The layer ID
 * @param {Object} config - Field labels configuration
 * @returns {string} Human-readable label
 */
function getFieldLabel(fieldName, layerId, config) {
  if (!config) return fieldName;

  // Check layer-specific labels first
  if (config.layerSpecific && config.layerSpecific[layerId]) {
    const layerConfig = config.layerSpecific[layerId];
    if (layerConfig[fieldName]) {
      return layerConfig[fieldName];
    }
  }

  // Fall back to global labels
  if (config.globalLabels && config.globalLabels[fieldName]) {
    return config.globalLabels[fieldName];
  }

  // Format field name as fallback (e.g., "field_name" -> "Field Name")
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get fields to display and their order
 * @param {Object} properties - Feature properties
 * @param {string} layerId - The layer ID
 * @param {Object} config - Field labels configuration
 * @returns {Array} Array of field names in display order
 */
function getFieldsToDisplay(properties, layerId, config) {
  const allFields = Object.keys(properties);

  if (!config || !config.layerSpecific || !config.layerSpecific[layerId]) {
    return allFields;
  }

  const layerConfig = config.layerSpecific[layerId];
  const hiddenFields = layerConfig.hiddenFields || [];
  const priorityFields = layerConfig.priorityFields || [];

  // Filter out hidden fields
  const visibleFields = allFields.filter((field) => !hiddenFields.includes(field));

  // Sort: priority fields first (in order), then remaining fields alphabetically
  const prioritySet = new Set(priorityFields);
  const remainingFields = visibleFields
    .filter((field) => !prioritySet.has(field))
    .sort();

  return [...priorityFields.filter((field) => visibleFields.includes(field)), ...remainingFields];
}

/**
 * Format a field value for display
 * @param {*} value - The value to format
 * @param {string} fieldName - The field name (for context)
 * @returns {string} Formatted value
 */
function formatFieldValue(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return '<em>N/A</em>';
  }

  // URL detection
  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    return `<a href="${value}" target="_blank" rel="noopener noreferrer">View</a>`;
  }

  // Number formatting
  if (typeof value === 'number') {
    if (fieldName.toLowerCase().includes('area')) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return value.toLocaleString();
  }

  return String(value);
}

/**
 * Create HTML content for a feature popup
 * @param {string} layerId - The layer ID
 * @param {Object} properties - Feature properties
 * @param {Object} geometry - Feature geometry
 * @returns {string} HTML content for popup
 */
export async function createPopupContent(layerId, properties, geometry) {
  const config = await loadFieldLabelsConfig();

  // Layer title
  const layerTitle = layerId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  let content = `<div style="max-width: 300px;"><h3 style="margin: 0 0 10px 0; padding-bottom: 8px; border-bottom: 2px solid #007bff;">${layerTitle}</h3>`;

  // Add properties if they exist
  if (properties && Object.keys(properties).length > 0) {
    const fieldsToDisplay = getFieldsToDisplay(properties, layerId, config);

    content += '<table style="width: 100%; border-collapse: collapse;">';

    for (const fieldName of fieldsToDisplay) {
      const value = properties[fieldName];

      if (value !== null && value !== undefined && value !== '') {
        const label = getFieldLabel(fieldName, layerId, config);
        const formattedValue = formatFieldValue(value, fieldName);

        content += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 2px 8px 2px 0; font-weight: 600; vertical-align: top; width: 40%; font-size: 13px;">${label}:</td>
            <td style="padding: 2px 0; vertical-align: top; font-size: 13px;">${formattedValue}</td>
          </tr>
        `;
      }
    }

    content += '</table>';
  }

  content += '</div>';

  return content;
}
