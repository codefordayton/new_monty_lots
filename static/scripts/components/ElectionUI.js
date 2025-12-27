/**
 * ElectionUI
 * Handles the election data UI controls and interactions
 */

import { RaceDataManager } from '../race-data-manager.js';
import { getLayerGroup } from '../state/LayerState.js';
import { precinctFilter } from './PrecinctFilter.js';

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

  // Add comparison mode toggle event listener
  const comparisonToggle = document.getElementById('comparison-mode-toggle');
  if (comparisonToggle) {
    comparisonToggle.addEventListener('change', handleComparisonToggle);
  }

  // Initialize precinct filter
  precinctFilter.initialize();

  // Detect when precinct layers are loaded
  detectPrecinctLayer();
}

/**
 * Handle comparison mode toggle
 */
function handleComparisonToggle(event) {
  const isComparisonMode = event.target.checked;

  const singleYearControls = document.getElementById('single-year-controls');
  const comparisonSummary = document.getElementById('comparison-summary');

  if (isComparisonMode) {
    // Hide single year controls
    if (singleYearControls) {
      singleYearControls.style.display = 'none';
    }

    // Clear any selected race
    clearRaceData();

    // Enable and display comparison mode
    displayComparisonMode();
  } else {
    // Show single year controls
    if (singleYearControls) {
      singleYearControls.style.display = 'block';
    }

    // Hide comparison summary
    if (comparisonSummary) {
      comparisonSummary.style.display = 'none';
    }

    // Reset to turnout view
    if (currentPrecinctLayer) {
      restylePrecinctLayer();
      rebindPopups();
    }
  }
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
        precinctFilter.setPrecinctLayer(currentPrecinctLayer);
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

  // Add turnout visualization option
  const turnoutOption = document.createElement('option');
  turnoutOption.value = '__TURNOUT__';
  turnoutOption.textContent = '📊 View Voter Turnout';
  raceSelect.appendChild(turnoutOption);

  // Add separator
  const separator = document.createElement('option');
  separator.disabled = true;
  separator.textContent = '─────────────────────';
  raceSelect.appendChild(separator);

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

  // Check if this is the turnout visualization
  if (raceId === '__TURNOUT__') {
    await displayTurnoutVisualization();
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

    // Update filter with new race data
    precinctFilter.setElectionData(raceManager.currentYear, raceData);
    precinctFilter.show();

    // Re-style the layer based on race data
    if (currentPrecinctLayer) {
      restylePrecinctLayer();
      rebindPopups();
    }
  }
}

/**
 * Display comparison mode statistics and styling
 */
async function displayComparisonMode() {
  if (!currentPrecinctLayer) {
    console.warn('Cannot display comparison mode: no precinct layer loaded');
    return;
  }

  const summaryDiv = document.getElementById('comparison-summary');
  if (!summaryDiv) return;

  // Load statistics for both years
  const stats2024Path = '/data/elections/2024/statistics.json';
  const stats2025Path = '/data/elections/2025/statistics.json';

  try {
    const [response2024, response2025] = await Promise.all([
      fetch(stats2024Path),
      fetch(stats2025Path)
    ]);

    const stats2024 = await response2024.json();
    const stats2025 = await response2025.json();

    // Calculate comparison statistics
    const comparison = calculateComparisonStats(stats2024, stats2025);

    // Display comparison summary
    displayComparisonSummary(comparison, summaryDiv);

    // Apply comparison styling to map
    applyComparisonStyling(comparison);

    // Update popups for comparison mode
    rebindComparisonPopups(comparison);

  } catch (error) {
    console.error('Failed to load comparison data:', error);
    summaryDiv.innerHTML = '<p style="color: #dc3545;">Failed to load comparison data</p>';
  }

  summaryDiv.style.display = 'block';
}

/**
 * Calculate comparison statistics between two years
 */
function calculateComparisonStats(stats2024, stats2025) {
  const comparison = {
    precincts: {},
    increases: [],
    decreases: [],
    totalChange: 0,
    precinctCount: 0
  };

  // Create lookup for 2024 stats
  const stats2024Lookup = {};
  stats2024.results?.forEach(result => {
    const code = normalizePrecinctCode(result.Precinct);
    stats2024Lookup[code] = result;
  });

  // Create lookup for 2025 stats
  const stats2025Lookup = {};
  stats2025.results?.forEach(result => {
    const code = normalizePrecinctCode(result.Precinct);
    stats2025Lookup[code] = result;
  });

  // Get all unique precinct codes from the map layer
  const mapPrecinctCodes = new Set();
  if (currentPrecinctLayer) {
    currentPrecinctLayer.eachLayer(layer => {
      if (layer.feature && layer.feature.properties) {
        const code = normalizePrecinctCode(
          layer.feature.properties.VLABEL || layer.feature.properties.Precinct
        );
        if (code) mapPrecinctCodes.add(code);
      }
    });
  }

  // Calculate changes for each precinct in the map
  mapPrecinctCodes.forEach(precinctCode => {
    // Try exact match first
    let result2024 = stats2024Lookup[precinctCode];
    let result2025 = stats2025Lookup[precinctCode];

    // If no exact match, aggregate sub-precincts
    if (!result2024) {
      const subPrecincts2024 = stats2024.results?.filter(r => {
        const rCode = normalizePrecinctCode(r.Precinct);
        return rCode.startsWith(precinctCode) && rCode.length > precinctCode.length;
      });
      if (subPrecincts2024 && subPrecincts2024.length > 0) {
        result2024 = aggregateStatistics(subPrecincts2024);
      }
    }

    if (!result2025) {
      const subPrecincts2025 = stats2025.results?.filter(r => {
        const rCode = normalizePrecinctCode(r.Precinct);
        return rCode.startsWith(precinctCode) && rCode.length > precinctCode.length;
      });
      if (subPrecincts2025 && subPrecincts2025.length > 0) {
        result2025 = aggregateStatistics(subPrecincts2025);
      }
    }

    // Calculate comparison if we have data for both years
    if (result2024 && result2025) {
      // Parse turnout values (they may be strings with % sign like "78.35%")
      const turnout2024 = parseTurnoutValue(result2024['Voter Turnout - Total']);
      const turnout2025 = parseTurnoutValue(result2025['Voter Turnout - Total']);
      const change = turnout2025 - turnout2024;

      comparison.precincts[precinctCode] = {
        code: precinctCode,
        turnout2024,
        turnout2025,
        change,
        changePercent: turnout2024 > 0 ? (change / turnout2024) * 100 : 0
      };

      comparison.totalChange += change;
      comparison.precinctCount++;

      if (change > 0) {
        comparison.increases.push({ code: precinctCode, change, changePercent: (change / turnout2024) * 100 });
      } else if (change < 0) {
        comparison.decreases.push({ code: precinctCode, change, changePercent: (change / turnout2024) * 100 });
      }
    }
  });

  // Sort increases and decreases
  comparison.increases.sort((a, b) => b.change - a.change);
  comparison.decreases.sort((a, b) => a.change - b.change);

  comparison.avgChange = comparison.precinctCount > 0
    ? comparison.totalChange / comparison.precinctCount
    : 0;

  return comparison;
}

/**
 * Parse turnout value from string or number
 */
function parseTurnoutValue(value) {
  if (typeof value === 'number') {
    // If number is greater than 1, it's a percentage (e.g., 78.35)
    // If less than or equal to 1, it's already a decimal (e.g., 0.7835)
    return value > 1 ? value / 100 : value;
  }
  if (typeof value === 'string') {
    // Remove % sign and convert to decimal (e.g., "78.35%" -> 0.7835)
    return parseFloat(value.replace('%', '')) / 100;
  }
  return 0;
}

/**
 * Parse numeric value that may have commas
 */
function parseNumericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    return parseFloat(value.replace(/,/g, ''));
  }
  return 0;
}

/**
 * Aggregate statistics from sub-precincts
 */
function aggregateStatistics(subPrecincts) {
  if (!subPrecincts || subPrecincts.length === 0) return null;

  let totalRegistered = 0;
  let totalBallots = 0;

  subPrecincts.forEach(precinct => {
    totalRegistered += parseNumericValue(precinct['Registered Voters - Total']);
    totalBallots += parseNumericValue(precinct['Ballots Cast - Total']);
  });

  // Calculate turnout percentage
  const turnoutPercent = totalRegistered > 0 ? (totalBallots / totalRegistered) * 100 : 0;

  return {
    'Voter Turnout - Total': `${turnoutPercent.toFixed(2)}%`,
    'Registered Voters - Total': totalRegistered,
    'Ballots Cast - Total': totalBallots
  };
}

/**
 * Display comparison summary in sidebar
 */
function displayComparisonSummary(comparison, summaryDiv) {
  const avgChangePercent = (comparison.avgChange * 100).toFixed(2);
  const avgChangeClass = comparison.avgChange >= 0 ? 'increase' : 'decrease';

  let html = '<h4>2024 vs 2025 Turnout Comparison</h4>';

  html += '<div class="comparison-stat">';
  html += '<strong>Average Turnout Change:</strong> ';
  html += `<span class="${avgChangeClass}">${avgChangePercent > 0 ? '+' : ''}${avgChangePercent}%</span>`;
  html += '</div>';

  html += '<div class="comparison-stat">';
  html += `<strong>Precincts Compared:</strong> <span>${comparison.precinctCount}</span>`;
  html += '</div>';

  html += '<div class="comparison-stat">';
  html += `<strong>Turnout Increased:</strong> <span class="increase">${comparison.increases.length} precincts</span>`;
  html += '</div>';

  html += '<div class="comparison-stat">';
  html += `<strong>Turnout Decreased:</strong> <span class="decrease">${comparison.decreases.length} precincts</span>`;
  html += '</div>';

  html += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #dee2e6;">';

  // Top 3 increases
  if (comparison.increases.length > 0) {
    html += '<h5 style="margin: 10px 0 5px 0; font-size: 14px;">Biggest Increases</h5>';
    comparison.increases.slice(0, 3).forEach((item, index) => {
      html += `<div class="comparison-stat" style="font-size: 13px; margin: 3px 0;">`;
      html += `${index + 1}. ${item.code}: <span class="increase">+${(item.change * 100).toFixed(2)}%</span>`;
      html += '</div>';
    });
  }

  // Top 3 decreases
  if (comparison.decreases.length > 0) {
    html += '<h5 style="margin: 10px 0 5px 0; font-size: 14px;">Biggest Decreases</h5>';
    comparison.decreases.slice(0, 3).forEach((item, index) => {
      html += `<div class="comparison-stat" style="font-size: 13px; margin: 3px 0;">`;
      html += `${index + 1}. ${item.code}: <span class="decrease">${(item.change * 100).toFixed(2)}%</span>`;
      html += '</div>';
    });
  }

  // Legend
  html += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #dee2e6;">';
  html += '<h5 style="margin: 10px 0 5px 0; font-size: 14px;">Turnout Change Legend</h5>';
  html += '<div class="comparison-legend">';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #006d2c;"></div>';
  html += '<span>Increase (>5 pts)</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #74c476;"></div>';
  html += '<span>Slight Increase (0-5 pts)</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #fee08b;"></div>';
  html += '<span>-35 to 0 pts</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #fdae61;"></div>';
  html += '<span>-45 to -35 pts</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #f46d43;"></div>';
  html += '<span>-55 to -45 pts</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #d73027;"></div>';
  html += '<span>-65 to -55 pts</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #a50026;"></div>';
  html += '<span>&lt; -65 pts</span>';
  html += '</div>';
  html += '</div>';

  summaryDiv.innerHTML = html;
}

/**
 * Apply comparison styling to precinct layer
 */
function applyComparisonStyling(comparison) {
  if (!currentPrecinctLayer) return;

  currentPrecinctLayer.eachLayer(layer => {
    if (!layer.feature) return;

    const precinctCode = normalizePrecinctCode(
      layer.feature.properties.VLABEL || layer.feature.properties.Precinct
    );

    const compData = comparison.precincts[precinctCode];
    const style = getComparisonStyle(compData);
    layer.setStyle(style);

    // Store comparison data on feature for popup
    layer.feature.properties._comparisonData = compData;
  });
}

/**
 * Get style for comparison mode based on turnout change
 */
function getComparisonStyle(compData) {
  if (!compData) {
    return {
      fillColor: '#cccccc',
      weight: 1,
      opacity: 1,
      color: '#666',
      fillOpacity: 0.5
    };
  }

  const changePercent = compData.change * 100;
  let fillColor;

  // Diverging color scale optimized for presidential vs local election comparison
  // Expected range: ~-60 to +10 percentage points
  if (changePercent > 5) {
    fillColor = '#006d2c'; // Dark green - unusual increase
  } else if (changePercent > 0) {
    fillColor = '#74c476'; // Light green - small increase
  } else if (changePercent > -35) {
    fillColor = '#fee08b'; // Light yellow - small decrease (typical for local vs presidential)
  } else if (changePercent > -45) {
    fillColor = '#fdae61'; // Light orange - moderate decrease
  } else if (changePercent > -55) {
    fillColor = '#f46d43'; // Orange-red - large decrease
  } else if (changePercent > -65) {
    fillColor = '#d73027'; // Red - very large decrease
  } else {
    fillColor = '#a50026'; // Dark red - extreme decrease
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
 * Rebind popups for comparison mode
 */
function rebindComparisonPopups(comparison) {
  if (!currentPrecinctLayer) return;

  import('../utils/popupBuilder.js').then(module => {
    const { buildComparisonPopupContent } = module;

    currentPrecinctLayer.eachLayer(layer => {
      if (!layer.feature) return;

      const precinctCode = normalizePrecinctCode(
        layer.feature.properties.VLABEL || layer.feature.properties.Precinct
      );

      const compData = comparison.precincts[precinctCode];

      layer.unbindPopup();
      layer.bindPopup(() => {
        if (!compData) {
          return '<p>No comparison data available for this precinct</p>';
        }

        return buildComparisonPopupContent(precinctCode, compData);
      });
    });
  });
}

/**
 * Normalize precinct code (helper function)
 */
function normalizePrecinctCode(code) {
  if (!code) return '';
  return code.trim().replace(/\b0(\d+)/g, '$1');
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
 * Display turnout visualization
 */
async function displayTurnoutVisualization() {
  if (!currentPrecinctLayer || !raceManager.currentYear) {
    console.error('Cannot display turnout: missing precinct layer or year');
    return;
  }

  // Clear any existing race data
  if (raceManager) {
    raceManager.clearRaceData();
  }

  // Hide race summary, show turnout summary
  const raceSummary = document.getElementById('race-summary');
  const turnoutSummary = document.getElementById('turnout-summary');
  if (raceSummary) raceSummary.style.display = 'none';
  if (turnoutSummary) turnoutSummary.style.display = 'block';

  // Load statistics data
  const statsPath = `/data/elections/${raceManager.currentYear}/statistics.json`;

  try {
    const response = await fetch(statsPath);
    const statsData = await response.json();

    // Inject turnout data into precincts
    injectTurnoutData(statsData);

    // Apply turnout styling
    applyTurnoutStyling();

    // Display turnout summary
    displayTurnoutSummary(statsData);

    // Update popups
    rebindPopups();

  } catch (error) {
    console.error('Failed to load statistics data:', error);
    if (turnoutSummary) {
      turnoutSummary.innerHTML = '<p style="color: #dc3545;">Failed to load turnout data</p>';
    }
  }
}

/**
 * Inject turnout data into precinct features
 */
function injectTurnoutData(statsData) {
  if (!currentPrecinctLayer || !statsData.results) return;

  let matchedCount = 0;

  currentPrecinctLayer.eachLayer(layer => {
    if (!layer.feature || !layer.feature.properties) return;

    const precinctCode = normalizePrecinctCode(
      layer.feature.properties.VLABEL || layer.feature.properties.Precinct
    );

    // Find exact match or aggregate sub-precincts
    let stats = statsData.results.find(r =>
      normalizePrecinctCode(r.Precinct) === precinctCode
    );

    if (!stats) {
      const subPrecincts = statsData.results.filter(r => {
        const rCode = normalizePrecinctCode(r.Precinct);
        return rCode.startsWith(precinctCode) && rCode.length > precinctCode.length;
      });

      if (subPrecincts && subPrecincts.length > 0) {
        stats = aggregateStatistics(subPrecincts);
      }
    }

    if (stats) {
      layer.feature.properties._turnoutData = stats;
      matchedCount++;
    } else {
      delete layer.feature.properties._turnoutData;
    }
  });

  console.log(`Injected turnout data: ${matchedCount} precincts`);
}

/**
 * Apply turnout-based styling to precincts
 */
function applyTurnoutStyling() {
  if (!currentPrecinctLayer) return;

  currentPrecinctLayer.eachLayer(layer => {
    if (!layer.feature) return;

    const style = getTurnoutStyle(layer.feature);
    layer.setStyle(style);
  });
}

/**
 * Get style for a feature based on turnout data
 */
function getTurnoutStyle(feature) {
  const turnoutData = feature.properties?._turnoutData;

  if (!turnoutData) {
    return {
      fillColor: '#cccccc',
      weight: 1,
      opacity: 1,
      color: '#666',
      fillOpacity: 0.5
    };
  }

  const turnout = parseTurnoutValue(turnoutData['Voter Turnout - Total']);
  const turnoutPercent = turnout * 100;

  let fillColor;

  // Color scale for turnout percentage
  if (turnoutPercent >= 80) {
    fillColor = '#006d2c'; // Dark green - very high turnout
  } else if (turnoutPercent >= 70) {
    fillColor = '#31a354'; // Medium green - high turnout
  } else if (turnoutPercent >= 60) {
    fillColor = '#74c476'; // Light green - good turnout
  } else if (turnoutPercent >= 50) {
    fillColor = '#bae4b3'; // Very light green - moderate turnout
  } else if (turnoutPercent >= 40) {
    fillColor = '#fee08b'; // Yellow - below average turnout
  } else if (turnoutPercent >= 30) {
    fillColor = '#fdae61'; // Orange - low turnout
  } else if (turnoutPercent >= 20) {
    fillColor = '#f46d43'; // Dark orange - very low turnout
  } else {
    fillColor = '#d73027'; // Red - extremely low turnout
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
 * Display turnout summary statistics
 */
function displayTurnoutSummary(statsData) {
  const summaryDiv = document.getElementById('turnout-summary');
  if (!summaryDiv || !statsData.results) return;

  // Calculate summary statistics
  const turnouts = statsData.results.map(r => parseTurnoutValue(r['Voter Turnout - Total']));
  const avgTurnout = turnouts.reduce((sum, t) => sum + t, 0) / turnouts.length;
  const maxTurnout = Math.max(...turnouts);
  const minTurnout = Math.min(...turnouts);

  let html = `<h4>${raceManager.currentYear} Voter Turnout</h4>`;

  html += '<div class="summary-stat"><strong>Average Turnout:</strong> <span>' + (avgTurnout * 100).toFixed(2) + '%</span></div>';
  html += '<div class="summary-stat"><strong>Highest:</strong> <span>' + (maxTurnout * 100).toFixed(2) + '%</span></div>';
  html += '<div class="summary-stat"><strong>Lowest:</strong> <span>' + (minTurnout * 100).toFixed(2) + '%</span></div>';
  html += '<div class="summary-stat"><strong>Precincts:</strong> <span>' + statsData.results.length + '</span></div>';

  // Legend
  html += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #dee2e6;">';
  html += '<h5 style="margin: 10px 0 5px 0; font-size: 14px;">Turnout Legend</h5>';
  html += '<div class="comparison-legend">';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #006d2c;"></div>';
  html += '<span>80%+</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #31a354;"></div>';
  html += '<span>70-80%</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #74c476;"></div>';
  html += '<span>60-70%</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #bae4b3;"></div>';
  html += '<span>50-60%</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #fee08b;"></div>';
  html += '<span>40-50%</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #fdae61;"></div>';
  html += '<span>30-40%</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #f46d43;"></div>';
  html += '<span>20-30%</span>';
  html += '</div>';
  html += '<div class="comparison-legend-item">';
  html += '<div class="comparison-legend-color" style="background: #d73027;"></div>';
  html += '<span>&lt;20%</span>';
  html += '</div>';
  html += '</div>';

  summaryDiv.innerHTML = html;
}

/**
 * Clear race data and reset UI
 */
function clearRaceData() {
  if (raceManager) {
    raceManager.clearRaceData();
  }

  const summaryDiv = document.getElementById('race-summary');
  const turnoutSummaryDiv = document.getElementById('turnout-summary');

  if (summaryDiv) {
    summaryDiv.style.display = 'none';
  }

  if (turnoutSummaryDiv) {
    turnoutSummaryDiv.style.display = 'none';
  }

  // Hide filter section
  precinctFilter.hide();

  // Clear turnout data from features
  if (currentPrecinctLayer) {
    currentPrecinctLayer.eachLayer(layer => {
      if (layer.feature && layer.feature.properties) {
        delete layer.feature.properties._turnoutData;
      }
    });
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
