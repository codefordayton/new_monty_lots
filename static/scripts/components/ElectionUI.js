/**
 * ElectionUI
 * Handles the election data UI controls and interactions
 */

import { RaceDataManager } from '../race-data-manager.js';
import { getLayerGroup } from '../state/LayerState.js';

let raceManager = null;
let currentPrecinctLayer = null;

/**
 * Initialize election UI
 */
export async function initializeElectionUI() {
  raceManager = new RaceDataManager();

  // Load available election years
  const years = await raceManager.init();

  if (years.length === 0) {
    console.log('No election data available');
    return;
  }

  // Show election section
  const electionSection = document.getElementById('election-section');
  if (electionSection) {
    electionSection.style.display = 'block';
  }

  // Populate year dropdown
  const yearSelect = document.getElementById('election-year');
  if (yearSelect) {
    years.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });

    // Add event listener
    yearSelect.addEventListener('change', handleYearChange);
  }

  // Add race selector event listener
  const raceSelect = document.getElementById('race-selector');
  if (raceSelect) {
    raceSelect.addEventListener('change', handleRaceChange);
  }

  // Detect when precinct layers are loaded
  detectPrecinctLayer();
}

/**
 * Detect and set the precinct layer
 */
function detectPrecinctLayer() {
  // Check periodically for precinct layers
  const checkInterval = setInterval(() => {
    // Try to get precinct layers by ID
    const layerIds = ['precincts_2025', 'precincts_2024', 'precincts'];

    for (const layerId of layerIds) {
      const layerGroup = getLayerGroup(layerId);
      if (layerGroup) {
        currentPrecinctLayer = layerGroup;
        raceManager.setPrecinctLayer(currentPrecinctLayer);
        console.log('Precinct layer detected:', layerId);
        clearInterval(checkInterval);
        return;
      }
    }
  }, 1000);

  // Stop checking after 30 seconds
  setTimeout(() => clearInterval(checkInterval), 30000);
}

/**
 * Handle year selection change
 */
async function handleYearChange(event) {
  const year = event.target.value;

  if (!year) {
    // Clear race selector
    hideRaceSelector();
    clearRaceData();
    return;
  }

  // Load metadata for selected year
  const metadata = await raceManager.loadYearMetadata(year);

  if (!metadata || !metadata.races) {
    console.error('Failed to load race metadata for', year);
    return;
  }

  // Populate race selector
  populateRaceSelector(metadata.races);
}

/**
 * Populate race selector with available races
 */
function populateRaceSelector(races) {
  const raceSelect = document.getElementById('race-selector');
  const container = document.getElementById('race-selector-container');

  if (!raceSelect || !container) return;

  // Clear existing options (except first)
  raceSelect.innerHTML = '<option value="">-- Select Race --</option>';

  // Add race options
  races.forEach(race => {
    const option = document.createElement('option');
    option.value = race.id;
    option.textContent = race.name;
    raceSelect.appendChild(option);
  });

  // Show race selector
  container.style.display = 'block';
}

/**
 * Hide race selector
 */
function hideRaceSelector() {
  const container = document.getElementById('race-selector-container');
  if (container) {
    container.style.display = 'none';
  }

  const summaryDiv = document.getElementById('race-summary');
  if (summaryDiv) {
    summaryDiv.style.display = 'none';
  }
}

/**
 * Handle race selection change
 */
async function handleRaceChange(event) {
  const raceId = event.target.value;

  if (!raceId) {
    clearRaceData();
    return;
  }

  if (!raceManager.currentYear) {
    console.error('No year selected');
    return;
  }

  // Load race data
  const raceData = await raceManager.loadRaceData(raceManager.currentYear, raceId);

  if (!raceData) {
    console.error('Failed to load race data');
    return;
  }

  // Inject data into precinct layer
  const result = raceManager.injectRaceData();

  if (result) {
    console.log(`Injected race data: ${result.matched}/${result.total} matched`);

    // Update race summary
    displayRaceSummary();

    // Re-style the layer based on race data
    if (currentPrecinctLayer) {
      restylePrecinctLayer();
      rebindPopups();
    }
  }
}

/**
 * Display race summary in sidebar
 */
function displayRaceSummary() {
  const summaryDiv = document.getElementById('race-summary');
  if (!summaryDiv) return;

  const totals = raceManager.getCountyTotals();
  if (!totals) return;

  let html = `<h4>${raceManager.raceData.race}</h4>`;
  html += `<div class="summary-stat"><strong>Total Votes:</strong> <span>${totals.totalVotes.toLocaleString()}</span></div>`;
  html += `<div class="summary-stat"><strong>Precincts Reporting:</strong> <span>${totals.totalPrecincts}</span></div>`;
  html += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #dee2e6;">';

  // Display top candidates
  totals.candidates.slice(0, 5).forEach((candidate, index) => {
    const barWidth = totals.totalVotes > 0 ? (candidate.votes / totals.totalVotes) * 100 : 0;

    html += `
      <div class="candidate-result">
        <div class="candidate-name">${index + 1}. ${candidate.name}</div>
        <div class="candidate-votes">
          <span>${candidate.votes.toLocaleString()} votes</span>
          <span>${candidate.percentage}%</span>
        </div>
        <div class="vote-bar" style="width: ${barWidth}%"></div>
      </div>
    `;
  });

  summaryDiv.innerHTML = html;
  summaryDiv.style.display = 'block';
}

/**
 * Clear race data and reset UI
 */
function clearRaceData() {
  if (raceManager) {
    raceManager.clearRaceData();
  }

  const summaryDiv = document.getElementById('race-summary');
  if (summaryDiv) {
    summaryDiv.style.display = 'none';
  }

  // Reset precinct layer styling
  if (currentPrecinctLayer) {
    restylePrecinctLayer();
    rebindPopups();
  }
}

/**
 * Re-style precinct layer based on current race data
 */
function restylePrecinctLayer() {
  if (!currentPrecinctLayer) return;

  currentPrecinctLayer.eachLayer(layer => {
    if (!layer.feature) return;

    const style = getFeatureStyle(layer.feature);
    layer.setStyle(style);
  });
}

/**
 * Rebind popups to reflect current race data
 */
function rebindPopups() {
  if (!currentPrecinctLayer) return;

  // Import popup builder
  import('../utils/popupBuilder.js').then(module => {
    const { createPopupContent } = module;

    currentPrecinctLayer.eachLayer(layer => {
      if (!layer.feature) return;

      // Get layer ID from the feature or use a default
      const layerId = raceManager.currentYear ? `precincts_${raceManager.currentYear}` : 'precincts_2025';

      // Rebind popup with current data
      layer.unbindPopup();
      layer.bindPopup(() => {
        const popup = layer.getPopup();
        popup.setContent('Loading...');
        createPopupContent(layerId, layer.feature.properties, layer.feature.geometry).then(content => {
          popup.setContent(content);
        });
        return 'Loading...';
      });
    });
  });
}

/**
 * Get style for a feature (race-aware or turnout-based)
 */
function getFeatureStyle(feature) {
  const raceData = feature.properties._currentRace;

  if (raceData) {
    // Style based on race results (winner)
    return getRaceStyle(feature);
  } else {
    // Default style (turnout if available)
    return getTurnoutStyle(feature);
  }
}

/**
 * Get style based on race results
 */
function getRaceStyle(feature) {
  const precinctCode = feature.properties.VLABEL;
  const winner = raceManager.getWinningCandidate(precinctCode);

  if (!winner) {
    return getTurnoutStyle(feature);
  }

  // Color by margin of victory
  const percentage = parseFloat(winner.percentage) || 0;

  let fillColor = '#cccccc';
  if (percentage >= 70) {
    fillColor = '#08519c'; // Dark blue - landslide
  } else if (percentage >= 60) {
    fillColor = '#3182bd'; // Medium blue - strong win
  } else if (percentage >= 55) {
    fillColor = '#6baed6'; // Light blue - moderate win
  } else if (percentage >= 50) {
    fillColor = '#bdd7e7'; // Very light blue - narrow win
  } else {
    fillColor = '#eff3ff'; // Almost white - very close
  }

  return {
    fillColor: fillColor,
    weight: 1,
    opacity: 1,
    color: '#666',
    fillOpacity: 0.7
  };
}

/**
 * Get style based on voter turnout
 */
function getTurnoutStyle(feature) {
  const year = raceManager.currentYear || '2025';
  const turnoutKey = `${year}_Voter_Turnout_Total`;
  const turnout = feature.properties[turnoutKey];

  if (turnout == null) {
    return {
      fillColor: '#cccccc',
      weight: 1,
      opacity: 1,
      color: '#666',
      fillOpacity: 0.5
    };
  }

  // Color by turnout percentage
  const percentage = turnout * 100;

  let fillColor = '#f7f7f7';
  if (percentage >= 70) {
    fillColor = '#006d2c'; // Dark green - very high turnout
  } else if (percentage >= 60) {
    fillColor = '#31a354'; // Medium green - high turnout
  } else if (percentage >= 50) {
    fillColor = '#74c476'; // Light green - moderate turnout
  } else if (percentage >= 40) {
    fillColor = '#bae4b3'; // Very light green - low-moderate turnout
  } else {
    fillColor = '#edf8e9'; // Almost white - low turnout
  }

  return {
    fillColor: fillColor,
    weight: 1,
    opacity: 1,
    color: '#666',
    fillOpacity: 0.7
  };
}

/**
 * Update popup content to include race results
 */
export function enhancePopupContent(feature) {
  if (!feature.properties._currentRace) {
    return null; // No race data, use default popup
  }

  const raceData = feature.properties._currentRace;
  const candidates = raceManager.getCandidates();

  let html = '<div class="race-popup">';
  html += `<h4>${raceManager.raceData.race}</h4>`;

  candidates.forEach(candidate => {
    const votes = raceData[candidate];
    if (typeof votes === 'number') {
      const percentage =
        raceData['Total Votes Cast'] > 0 ? ((votes / raceData['Total Votes Cast']) * 100).toFixed(1) : 0;

      html += `
        <div style="margin: 5px 0;">
          <strong>${candidate}:</strong> ${votes.toLocaleString()} (${percentage}%)
        </div>
      `;
    }
  });

  html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">`;
  html += `<strong>Total Votes:</strong> ${raceData['Total Votes Cast']?.toLocaleString() || 'N/A'}`;
  html += `</div></div>`;

  return html;
}
