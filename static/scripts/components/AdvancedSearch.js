/**
 * AdvancedSearch.js
 * Advanced search panel with field-specific filtering
 * Dynamically adapts to any GeoJSON dataset
 */

import { getLayerFieldMetadata } from './SearchBar.js';
import { getAllLayerData } from '../state/LayerState.js';
import { getFilterableFields, FieldType } from '../utils/fieldAnalyzer.js';

let isAdvancedPanelOpen = false;
let activeFilters = {};

/**
 * Toggle advanced search panel
 */
export function toggleAdvancedSearch() {
  const panel = document.getElementById('advanced-search-panel');
  const button = document.getElementById('toggle-advanced-search');

  isAdvancedPanelOpen = !isAdvancedPanelOpen;

  if (isAdvancedPanelOpen) {
    panel.style.display = 'block';
    button.textContent = '▲ Hide Advanced Search';
    renderAdvancedFilters();
  } else {
    panel.style.display = 'none';
    button.textContent = '▼ Show Advanced Search';
  }
}

/**
 * Render advanced filter controls based on loaded layers
 */
function renderAdvancedFilters() {
  const container = document.getElementById('advanced-filters-container');
  const allLayerData = getAllLayerData();

  if (Object.keys(allLayerData).length === 0) {
    container.innerHTML = '<p class="info-text">Load a layer to see available filters</p>';
    return;
  }

  // Collect all unique fields from all loaded layers
  const allFields = {};

  Object.keys(allLayerData).forEach(layerId => {
    const fieldMetadata = getLayerFieldMetadata(layerId);
    const filterableFields = getFilterableFields(fieldMetadata);

    // Merge fields from this layer
    Object.values(filterableFields).flat().forEach(field => {
      if (!allFields[field.name]) {
        allFields[field.name] = {
          ...field,
          layers: [layerId]
        };
      } else if (!allFields[field.name].layers.includes(layerId)) {
        allFields[field.name].layers.push(layerId);
      }
    });
  });

  // Group fields by type
  const groupedFields = {
    categorical: [],
    numeric: [],
    boolean: [],
    date: [],
    text: []
  };

  Object.values(allFields).forEach(field => {
    switch (field.type) {
      case FieldType.CATEGORICAL:
        groupedFields.categorical.push(field);
        break;
      case FieldType.NUMBER:
        groupedFields.numeric.push(field);
        break;
      case FieldType.BOOLEAN:
        groupedFields.boolean.push(field);
        break;
      case FieldType.DATE:
        groupedFields.date.push(field);
        break;
      case FieldType.TEXT:
        if (!field.isIdentifier) {
          groupedFields.text.push(field);
        }
        break;
    }
  });

  // Render filter sections
  let html = '';

  // Categorical filters (dropdowns/multi-select)
  if (groupedFields.categorical.length > 0) {
    html += '<div class="filter-section">';
    html += '<h4>📊 Categorical Filters</h4>';
    groupedFields.categorical.forEach(field => {
      html += renderCategoricalFilter(field);
    });
    html += '</div>';
  }

  // Numeric filters (range sliders)
  if (groupedFields.numeric.length > 0) {
    html += '<div class="filter-section">';
    html += '<h4>🔢 Numeric Filters</h4>';
    groupedFields.numeric.forEach(field => {
      html += renderNumericFilter(field);
    });
    html += '</div>';
  }

  // Boolean filters (checkboxes)
  if (groupedFields.boolean.length > 0) {
    html += '<div class="filter-section">';
    html += '<h4>☑️  Boolean Filters</h4>';
    groupedFields.boolean.forEach(field => {
      html += renderBooleanFilter(field);
    });
    html += '</div>';
  }

  // Text filters (additional text search)
  if (groupedFields.text.length > 0 && groupedFields.text.length <= 5) {
    html += '<div class="filter-section">';
    html += '<h4>📝 Text Filters</h4>';
    groupedFields.text.forEach(field => {
      html += renderTextFilter(field);
    });
    html += '</div>';
  }

  // Field info
  const totalFields = Object.keys(allFields).length;
  html += `<div class="filter-info">`;
  html += `<small>Found ${totalFields} filterable field${totalFields !== 1 ? 's' : ''} across ${Object.keys(allLayerData).length} loaded layer${Object.keys(allLayerData).length !== 1 ? 's' : ''}</small>`;
  html += `</div>`;

  container.innerHTML = html;

  // Attach event listeners
  attachFilterEventListeners();
}

/**
 * Render categorical filter (dropdown/multi-select)
 */
function renderCategoricalFilter(field) {
  const filterId = `filter-${field.name}`;
  let html = '<div class="filter-item">';
  html += `<label for="${filterId}">${field.displayName}</label>`;
  html += `<select id="${filterId}" class="categorical-filter" data-field="${field.name}" multiple>`;

  field.categories.forEach(category => {
    const value = String(category);
    html += `<option value="${value}">${value}</option>`;
  });

  html += '</select>';
  html += `<small>${field.uniqueCount} unique value${field.uniqueCount !== 1 ? 's' : ''}</small>`;
  html += '</div>';
  return html;
}

/**
 * Render numeric filter (range slider)
 */
function renderNumericFilter(field) {
  const filterId = `filter-${field.name}`;
  const min = Math.floor(field.min);
  const max = Math.ceil(field.max);

  let html = '<div class="filter-item">';
  html += `<label for="${filterId}">${field.displayName}</label>`;
  html += '<div class="range-filter">';
  html += `<input type="number" id="${filterId}-min" class="numeric-filter-min" data-field="${field.name}" placeholder="Min" min="${min}" max="${max}" value="${min}">`;
  html += `<span>to</span>`;
  html += `<input type="number" id="${filterId}-max" class="numeric-filter-max" data-field="${field.name}" placeholder="Max" min="${min}" max="${max}" value="${max}">`;
  html += '</div>';
  html += `<small>Range: ${min.toLocaleString()} - ${max.toLocaleString()}</small>`;
  html += '</div>';
  return html;
}

/**
 * Render boolean filter (checkbox)
 */
function renderBooleanFilter(field) {
  const filterId = `filter-${field.name}`;
  let html = '<div class="filter-item filter-item-boolean">';
  html += `<label>`;
  html += `<input type="checkbox" id="${filterId}" class="boolean-filter" data-field="${field.name}">`;
  html += `${field.displayName}`;
  html += `</label>`;
  html += '</div>';
  return html;
}

/**
 * Render text filter (additional search box)
 */
function renderTextFilter(field) {
  const filterId = `filter-${field.name}`;
  let html = '<div class="filter-item">';
  html += `<label for="${filterId}">${field.displayName}</label>`;
  html += `<input type="text" id="${filterId}" class="text-filter" data-field="${field.name}" placeholder="Search ${field.displayName.toLowerCase()}...">`;
  html += `<small>${field.sampleValues.slice(0, 3).join(', ')}...</small>`;
  html += '</div>';
  return html;
}

/**
 * Attach event listeners to filter controls
 */
function attachFilterEventListeners() {
  // Categorical filters
  document.querySelectorAll('.categorical-filter').forEach(select => {
    select.addEventListener('change', handleFilterChange);
  });

  // Numeric filters
  document.querySelectorAll('.numeric-filter-min, .numeric-filter-max').forEach(input => {
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleFilterChange, 500);
    });
  });

  // Boolean filters
  document.querySelectorAll('.boolean-filter').forEach(checkbox => {
    checkbox.addEventListener('change', handleFilterChange);
  });

  // Text filters
  document.querySelectorAll('.text-filter').forEach(input => {
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleFilterChange, 500);
    });
  });
}

/**
 * Handle filter change
 */
function handleFilterChange() {
  // Collect all active filters
  activeFilters = {};

  // Categorical filters
  document.querySelectorAll('.categorical-filter').forEach(select => {
    const fieldName = select.dataset.field;
    const selectedValues = Array.from(select.selectedOptions).map(opt => opt.value);
    if (selectedValues.length > 0) {
      activeFilters[fieldName] = {
        type: 'categorical',
        values: selectedValues
      };
    }
  });

  // Numeric filters
  const numericFields = new Set();
  document.querySelectorAll('.numeric-filter-min, .numeric-filter-max').forEach(input => {
    numericFields.add(input.dataset.field);
  });

  numericFields.forEach(fieldName => {
    const minInput = document.querySelector(`.numeric-filter-min[data-field="${fieldName}"]`);
    const maxInput = document.querySelector(`.numeric-filter-max[data-field="${fieldName}"]`);

    if (minInput && maxInput) {
      const min = parseFloat(minInput.value);
      const max = parseFloat(maxInput.value);

      if (!isNaN(min) || !isNaN(max)) {
        activeFilters[fieldName] = {
          type: 'numeric',
          min: isNaN(min) ? -Infinity : min,
          max: isNaN(max) ? Infinity : max
        };
      }
    }
  });

  // Boolean filters
  document.querySelectorAll('.boolean-filter:checked').forEach(checkbox => {
    const fieldName = checkbox.dataset.field;
    activeFilters[fieldName] = {
      type: 'boolean',
      value: true
    };
  });

  // Text filters
  document.querySelectorAll('.text-filter').forEach(input => {
    const fieldName = input.dataset.field;
    const value = input.value.trim();
    if (value) {
      activeFilters[fieldName] = {
        type: 'text',
        value: value
      };
    }
  });

  // Trigger filter application
  applyAdvancedFilters();
}

/**
 * Apply advanced filters to features
 */
function applyAdvancedFilters() {
  // Import searchFeatures from SearchBar to trigger the filtering
  import('./SearchBar.js').then(module => {
    const searchInput = document.getElementById('search-input');
    const basicSearchTerm = searchInput.value.trim();

    // If we have active filters, apply them
    if (Object.keys(activeFilters).length > 0) {
      console.log('🔍 Applying advanced filters:', activeFilters);
      module.applyAdvancedFilters(activeFilters, basicSearchTerm);
    } else if (basicSearchTerm) {
      // Just basic search
      module.searchFeatures(basicSearchTerm);
    } else {
      // No filters at all
      module.clearAllFilters();
    }
  });
}

/**
 * Get active filters (for use in SearchBar)
 */
export function getActiveFilters() {
  return activeFilters;
}

/**
 * Clear all advanced filters
 */
export function clearAdvancedFilters() {
  activeFilters = {};

  // Reset all filter controls
  document.querySelectorAll('.categorical-filter').forEach(select => {
    select.selectedIndex = -1;
  });

  document.querySelectorAll('.numeric-filter-min, .numeric-filter-max').forEach(input => {
    input.value = input.getAttribute(input.classList.contains('numeric-filter-min') ? 'min' : 'max');
  });

  document.querySelectorAll('.boolean-filter').forEach(checkbox => {
    checkbox.checked = false;
  });

  document.querySelectorAll('.text-filter').forEach(input => {
    input.value = '';
  });
}

/**
 * Initialize advanced search panel
 */
export function initializeAdvancedSearch() {
  const toggleButton = document.getElementById('toggle-advanced-search');

  if (toggleButton) {
    toggleButton.addEventListener('click', toggleAdvancedSearch);
  }

  // Re-render filters when new layers are loaded
  window.addEventListener('layerLoaded', () => {
    if (isAdvancedPanelOpen) {
      renderAdvancedFilters();
    }
  });
}
