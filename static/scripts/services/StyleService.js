/**
 * StyleService.js
 * Handles dynamic feature styling based on configuration
 */

export class StyleResolver {
  constructor(layerConfig) {
    this.layerConfig = layerConfig;
    this.defaultStyle = layerConfig.defaultStyle || {
      color: '#666666',
      fillColor: '#cccccc',
      fillOpacity: 0.7,
      radius: 6,
      weight: 2,
    };
    this.styleCache = new Map();
  }

  // Get style for a feature based on its properties
  getStyle(properties) {
    if (!this.layerConfig.styleRules) {
      return this.defaultStyle;
    }

    // Find the first enabled rule that can be applied
    for (const rule of this.layerConfig.styleRules) {
      if (!rule.enabled) continue;

      if (rule.type === 'categorical') {
        const value = properties[rule.property];
        if (value !== undefined && rule.mappings && rule.mappings[value]) {
          return { ...this.defaultStyle, ...rule.mappings[value] };
        }
      } else if (rule.type === 'numeric') {
        const value = parseFloat(properties[rule.property]);
        if (!isNaN(value) && rule.ranges) {
          for (const range of rule.ranges) {
            const minCheck = range.min === undefined || value >= range.min;
            const maxCheck = range.max === undefined || value <= range.max;
            if (minCheck && maxCheck) {
              return { ...this.defaultStyle, ...range.style };
            }
          }
        }
      }
    }

    return this.defaultStyle;
  }

  // Create appropriate marker type (awesome-marker or circle marker)
  createMarker(properties, latlng) {
    const style = this.getStyle(properties);

    // Check if we should use awesome-markers
    if (style.awesomeMarker && window.L && L.AwesomeMarkers) {
      const awesomeOptions = {
        icon: style.awesomeMarker.icon,
        markerColor: style.awesomeMarker.markerColor,
        iconColor: style.awesomeMarker.iconColor || 'white',
        spin: style.awesomeMarker.spin || false,
        extraClasses: style.awesomeMarker.extraClasses || '',
      };

      const awesomeIcon = L.AwesomeMarkers.icon(awesomeOptions);
      return L.marker(latlng, { icon: awesomeIcon });
    }

    // Fallback to circle marker with regular styling
    return L.circleMarker(latlng, style);
  }

  // Get legend data for enabled rules
  getLegendData() {
    if (!this.layerConfig.styleRules) return null;

    const legends = [];
    for (const rule of this.layerConfig.styleRules) {
      if (!rule.enabled || !rule.showInLegend) continue;

      const legendRule = {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        items: [],
      };

      if (rule.type === 'categorical' && rule.mappings) {
        for (const [value, style] of Object.entries(rule.mappings)) {
          legendRule.items.push({
            value,
            style: { ...this.defaultStyle, ...style },
            description: style.description || value,
          });
        }
      } else if (rule.type === 'numeric' && rule.ranges) {
        for (const range of rule.ranges) {
          legendRule.items.push({
            range: { min: range.min, max: range.max },
            style: { ...this.defaultStyle, ...range.style },
            description: range.description,
          });
        }
      }

      if (legendRule.items.length > 0) {
        legends.push(legendRule);
      }
    }

    return legends;
  }
}

// Cache for style configurations
const styleConfigs = {};

/**
 * Load style configuration for a layer
 * @param {string} layerId - The layer ID
 * @returns {Promise<Object>} The style configuration
 */
export async function loadStyleConfig(layerId) {
  if (styleConfigs[layerId]) {
    return styleConfigs[layerId];
  }

  try {
    const response = await fetch(`/api/styles/config/${layerId}`);
    const config = await response.json();
    styleConfigs[layerId] = config;
    console.log(`✓ Loaded style config for ${layerId}`);
    return config;
  } catch (error) {
    console.warn(`Failed to load style config for ${layerId}:`, error);
    // Return fallback configuration
    return {
      name: layerId,
      defaultStyle: {
        color: '#666666',
        fillColor: '#cccccc',
        fillOpacity: 0.7,
        radius: 6,
        weight: 2,
      },
      styleRules: [],
    };
  }
}

/**
 * Create a style function for Leaflet GeoJSON layer
 * @param {StyleResolver} styleResolver - The style resolver instance
 * @returns {Function} Style function
 */
export function createStyleFunction(styleResolver) {
  return function (feature) {
    return styleResolver.getStyle(feature.properties);
  };
}

/**
 * Legacy style function for layers without configuration
 * @param {string} layerId - The layer ID
 * @returns {Object} Leaflet style object
 */
export function getStyleForLayer(layerId) {
  const styles = {
    polygon: { color: 'blue', fillColor: '#30f', fillOpacity: 0.3, weight: 2 },
    line: { color: 'red', weight: 3 },
    square: { color: 'green', fillColor: '#0f0', fillOpacity: 0.4, weight: 2 },
  };
  return styles[layerId] || { color: 'purple', weight: 2 };
}
