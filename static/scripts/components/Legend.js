/**
 * Legend.js
 * Manages the dynamic legend display
 */

// Active legends for loaded layers
const activeLegends = {};

/**
 * Toggle legend collapsed/expanded
 */
export function toggleLegend() {
  const legend = document.getElementById('legend');
  legend.classList.toggle('collapsed');
}

/**
 * Update the legend display
 */
export function updateLegend() {
  const legendElement = document.getElementById('legend');
  const contentElement = document.getElementById('legend-content');

  // Clear existing content
  contentElement.innerHTML = '';

  // Check if we have any active legends
  const legendKeys = Object.keys(activeLegends);
  if (legendKeys.length === 0) {
    legendElement.style.display = 'none';
    return;
  }

  // Show legend
  legendElement.style.display = 'block';

  // Generate legend content for each loaded layer
  legendKeys.forEach(layerId => {
    const legends = activeLegends[layerId];
    if (!legends || legends.length === 0) return;

    legends.forEach(legend => {
      const ruleDiv = document.createElement('div');
      ruleDiv.className = 'legend-rule';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'legend-rule-title';
      titleDiv.textContent = legend.name;
      ruleDiv.appendChild(titleDiv);

      legend.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'legend-item';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'legend-color';

        // Check if we should display an awesome-marker icon
        if (item.style.awesomeMarker && item.style.awesomeMarker.icon) {
          iconDiv.innerHTML = `<i class="fas fa-${item.style.awesomeMarker.icon}" style="color: ${
            item.style.awesomeMarker.iconColor || 'white'
          }; background-color: ${getAwesomeMarkerColor(
            item.style.awesomeMarker.markerColor
          )}; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border-radius: 3px; font-size: 10px;"></i>`;
        } else {
          // Fallback to colored circle
          iconDiv.style.backgroundColor = item.style.fillColor || item.style.color;
          iconDiv.style.borderColor = item.style.color;
        }

        const textDiv = document.createElement('div');
        textDiv.className = 'legend-text';
        textDiv.textContent = item.description;

        itemDiv.appendChild(iconDiv);
        itemDiv.appendChild(textDiv);
        ruleDiv.appendChild(itemDiv);
      });

      contentElement.appendChild(ruleDiv);
    });
  });
}

/**
 * Add a layer to the legend
 * @param {string} layerId - The layer ID
 * @param {StyleResolver} styleResolver - The style resolver instance
 */
export function addLayerToLegend(layerId, styleResolver) {
  const legendData = styleResolver.getLegendData();
  if (legendData && legendData.length > 0) {
    activeLegends[layerId] = legendData;
  }
  updateLegend();
}

/**
 * Remove a layer from the legend
 * @param {string} layerId - The layer ID
 */
export function removeLayerFromLegend(layerId) {
  delete activeLegends[layerId];
  updateLegend();
}

/**
 * Helper function to convert awesome-markers color names to hex colors
 * @param {string} colorName - The color name
 * @returns {string} Hex color code
 */
function getAwesomeMarkerColor(colorName) {
  const colorMap = {
    red: '#d63031',
    darkred: '#74b9ff',
    lightred: '#ff7675',
    orange: '#e17055',
    beige: '#f39c12',
    green: '#00b894',
    darkgreen: '#00a085',
    lightgreen: '#55efc4',
    blue: '#0984e3',
    darkblue: '#2d3436',
    lightblue: '#74b9ff',
    purple: '#a29bfe',
    darkpurple: '#6c5ce7',
    pink: '#fd79a8',
    cadetblue: '#81ecec',
    white: '#ddd',
    gray: '#636e72',
    lightgray: '#b2bec3',
    black: '#2d3436',
  };
  return colorMap[colorName] || '#666';
}
