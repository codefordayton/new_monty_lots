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

  // Check if this is a precinct layer
  const isPrecinctLayer = layerId.includes('precinct');
  let precinctCode = null;

  if (isPrecinctLayer && properties) {
    precinctCode = properties.VLABEL || properties.Precinct || properties.NAME;
  }

  // Check if this feature has race data
  if (properties && properties._currentRace) {
    content += buildRacePopupContent(properties._currentRace);
  } else if (properties && properties._turnoutData) {
    // Show turnout data if available
    content += buildTurnoutPopupContent(properties._turnoutData);
  } else {
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
  }

  // Add "View Full Summary" button for precinct layers
  if (isPrecinctLayer && precinctCode) {
    content += `
      <button class="view-precinct-details" onclick="window.openPrecinctSummary('${precinctCode}')">
        View Full Election History
      </button>
    `;
  }

  content += '</div>';

  return content;
}

/**
 * Build popup content for race data
 * @param {Object} raceData - Race result data for this precinct
 * @returns {string} HTML content for race results
 */
function buildRacePopupContent(raceData) {
  if (!raceData || typeof raceData !== 'object') {
    return '<p>No race data available</p>';
  }

  let content = '<div style="margin-top: 10px;">';

  // Get all candidate fields (exclude metadata fields)
  const excludeFields = ['Precinct', 'Total Votes Cast', 'Overvotes', 'Undervotes', 'Contest Total'];
  const candidates = Object.keys(raceData).filter(
    key => !excludeFields.includes(key) &&
           !key.startsWith('Write-in') &&
           !key.startsWith('_') &&
           typeof raceData[key] === 'number'
  );

  // Display precinct name
  if (raceData.Precinct) {
    content += `<p style="margin: 0 0 10px 0; font-weight: 600;">Precinct: ${raceData.Precinct}</p>`;
  }

  // Display candidates
  content += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">';

  candidates.forEach(candidate => {
    const votes = raceData[candidate];
    const totalVotes = raceData['Total Votes Cast'] || 0;
    const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;

    content += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 4px 8px 4px 0; font-weight: 500; font-size: 13px;">${candidate}</td>
        <td style="padding: 4px 0; text-align: right; font-size: 13px;">${votes.toLocaleString()}</td>
        <td style="padding: 4px 0 4px 8px; text-align: right; font-size: 13px; color: #666;">${percentage}%</td>
      </tr>
    `;
  });

  content += '</table>';

  // Display totals
  content += `<div style="padding-top: 8px; border-top: 2px solid #ddd; font-size: 13px;">`;
  content += `<strong>Total Votes:</strong> ${(raceData['Total Votes Cast'] || 0).toLocaleString()}`;
  content += `</div>`;

  content += '</div>';

  return content;
}

/**
 * Build popup content for comparison mode
 * @param {string} precinctCode - Precinct code
 * @param {Object} compData - Comparison data with 2024/2025 turnout
 * @returns {string} HTML content for comparison popup
 */
export function buildComparisonPopupContent(precinctCode, compData) {
  if (!compData) {
    return '<p>No comparison data available</p>';
  }

  const turnout2024Percent = (compData.turnout2024 * 100).toFixed(2);
  const turnout2025Percent = (compData.turnout2025 * 100).toFixed(2);
  const changePercent = (compData.change * 100).toFixed(2);
  const changeClass = compData.change >= 0 ? 'increase' : 'decrease';
  const changeSymbol = compData.change >= 0 ? '+' : '';

  let content = '<div style="max-width: 300px;">';
  content += `<h3 style="margin: 0 0 10px 0; padding-bottom: 8px; border-bottom: 2px solid #007bff;">Precinct ${precinctCode}</h3>`;

  content += '<h4 style="margin: 10px 0 5px 0; font-size: 14px;">Voter Turnout Comparison</h4>';

  content += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">';

  // 2024 turnout
  content += `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 4px 8px 4px 0; font-weight: 600; font-size: 13px;">2024:</td>
      <td style="padding: 4px 0; text-align: right; font-size: 13px;">${turnout2024Percent}%</td>
    </tr>
  `;

  // 2025 turnout
  content += `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 4px 8px 4px 0; font-weight: 600; font-size: 13px;">2025:</td>
      <td style="padding: 4px 0; text-align: right; font-size: 13px;">${turnout2025Percent}%</td>
    </tr>
  `;

  // Change
  content += `
    <tr style="border-bottom: 2px solid #ddd;">
      <td style="padding: 8px 8px 8px 0; font-weight: 600; font-size: 14px;">Change:</td>
      <td style="padding: 8px 0; text-align: right; font-size: 14px; color: ${changeClass === 'increase' ? '#28a745' : '#dc3545'};">
        <strong>${changeSymbol}${changePercent}%</strong>
      </td>
    </tr>
  `;

  content += '</table>';

  // Interpretation
  if (Math.abs(compData.change * 100) > 5) {
    const direction = compData.change > 0 ? 'increase' : 'decrease';
    content += `<p style="margin: 10px 0 0 0; padding: 8px; background: ${changeClass === 'increase' ? '#d4edda' : '#f8d7da'}; border-radius: 4px; font-size: 12px; color: ${changeClass === 'increase' ? '#155724' : '#721c24'};">`;
    content += `<strong>Significant ${direction}</strong> in voter turnout between 2024 and 2025 elections.`;
    content += '</p>';
  } else if (Math.abs(compData.change * 100) < 0.5) {
    content += `<p style="margin: 10px 0 0 0; padding: 8px; background: #e2e3e5; border-radius: 4px; font-size: 12px; color: #383d41;">`;
    content += 'Voter turnout remained relatively stable between 2024 and 2025.';
    content += '</p>';
  }

  content += '</div>';

  return content;
}

/**
 * Build popup content for turnout data
 * @param {Object} turnoutData - Turnout statistics data
 * @returns {string} HTML content for turnout display
 */
function buildTurnoutPopupContent(turnoutData) {
  if (!turnoutData || typeof turnoutData !== 'object') {
    return '<p>No turnout data available</p>';
  }

  let content = '<div style="margin-top: 10px;">';

  // Display precinct name if available
  if (turnoutData.Precinct) {
    content += `<p style="margin: 0 0 10px 0; font-weight: 600;">Precinct: ${turnoutData.Precinct}</p>`;
  }

  // Parse turnout value
  const turnoutValue = turnoutData['Voter Turnout - Total'];
  let turnoutPercent;

  if (typeof turnoutValue === 'number') {
    turnoutPercent = turnoutValue > 1 ? turnoutValue : turnoutValue * 100;
  } else if (typeof turnoutValue === 'string') {
    turnoutPercent = parseFloat(turnoutValue.replace('%', ''));
  } else {
    turnoutPercent = 0;
  }

  // Display turnout information
  content += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">';

  content += `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 6px 8px 6px 0; font-weight: 600; font-size: 14px;">Voter Turnout:</td>
      <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #007bff;">
        <strong>${turnoutPercent.toFixed(2)}%</strong>
      </td>
    </tr>
  `;

  // Add registered voters if available
  if (turnoutData['Registered Voters - Total']) {
    const registered = typeof turnoutData['Registered Voters - Total'] === 'string'
      ? turnoutData['Registered Voters - Total']
      : turnoutData['Registered Voters - Total'].toLocaleString();

    content += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 6px 8px 6px 0; font-weight: 500; font-size: 13px;">Registered Voters:</td>
        <td style="padding: 6px 0; text-align: right; font-size: 13px;">${registered}</td>
      </tr>
    `;
  }

  // Add ballots cast if available
  if (turnoutData['Ballots Cast - Total']) {
    const ballotsCast = typeof turnoutData['Ballots Cast - Total'] === 'string'
      ? turnoutData['Ballots Cast - Total']
      : turnoutData['Ballots Cast - Total'].toLocaleString();

    content += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 6px 8px 6px 0; font-weight: 500; font-size: 13px;">Ballots Cast:</td>
        <td style="padding: 6px 0; text-align: right; font-size: 13px;">${ballotsCast}</td>
      </tr>
    `;
  }

  content += '</table>';

  // Add context message based on turnout level
  if (turnoutPercent >= 70) {
    content += '<p style="margin: 10px 0 0 0; padding: 8px; background: #d4edda; border-radius: 4px; font-size: 12px; color: #155724;">';
    content += '<strong>High turnout</strong> for this precinct.';
    content += '</p>';
  } else if (turnoutPercent < 40) {
    content += '<p style="margin: 10px 0 0 0; padding: 8px; background: #f8d7da; border-radius: 4px; font-size: 12px; color: #721c24;">';
    content += '<strong>Low turnout</strong> for this precinct.';
    content += '</p>';
  }

  content += '</div>';

  return content;
}
