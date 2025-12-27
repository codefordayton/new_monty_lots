/**
 * PrecinctFilter.js
 * Component for filtering and searching precincts
 */

import { getLayerGroup } from '../state/LayerState.js';

export class PrecinctFilter {
  constructor() {
    this.currentPrecinctLayer = null;
    this.currentYear = null;
    this.currentRaceData = null;
    this.filteredPrecincts = new Set();
    this.isActive = false;
  }

  /**
   * Initialize the filter component
   */
  initialize() {
    // Set up event listeners
    document.getElementById('apply-filters')?.addEventListener('click', () => {
      this.applyFilters();
    });

    document.getElementById('clear-filters')?.addEventListener('click', () => {
      this.clearFilters();
    });

    // Real-time search
    document.getElementById('precinct-search')?.addEventListener('input', (e) => {
      if (e.target.value.length >= 2 || e.target.value.length === 0) {
        this.applyFilters();
      }
    });
  }

  /**
   * Set the current precinct layer
   */
  setPrecinctLayer(layer) {
    this.currentPrecinctLayer = layer;
  }

  /**
   * Set current election year and race data
   */
  setElectionData(year, raceData) {
    this.currentYear = year;
    this.currentRaceData = raceData;
    this.updateWinnerFilter();
  }

  /**
   * Show the filter section
   */
  show() {
    const filterSection = document.getElementById('filter-section');
    if (filterSection) {
      filterSection.style.display = 'block';
    }
  }

  /**
   * Hide the filter section
   */
  hide() {
    const filterSection = document.getElementById('filter-section');
    if (filterSection) {
      filterSection.style.display = 'none';
    }
    this.clearFilters();
  }

  /**
   * Update the winner filter dropdown with candidates
   */
  updateWinnerFilter() {
    const winnerFilter = document.getElementById('winner-filter');
    if (!winnerFilter || !this.currentRaceData) return;

    // Clear existing options
    winnerFilter.innerHTML = '<option value="">-- All Winners --</option>';

    // Get unique candidates from race data
    const candidates = this.getCandidates();
    candidates.forEach(candidate => {
      const option = document.createElement('option');
      option.value = candidate;
      option.textContent = candidate;
      winnerFilter.appendChild(option);
    });
  }

  /**
   * Get list of candidates from race data
   */
  getCandidates() {
    if (!this.currentRaceData || !this.currentRaceData.results) return [];

    const excludeFields = ['Precinct', 'Total Votes Cast', 'Overvotes', 'Undervotes', 'Contest Total'];
    const candidateSet = new Set();

    this.currentRaceData.results.forEach(result => {
      Object.keys(result).forEach(key => {
        if (!excludeFields.includes(key) &&
            !key.startsWith('Write-in') &&
            !key.startsWith('_') &&
            typeof result[key] === 'number') {
          candidateSet.add(key);
        }
      });
    });

    return Array.from(candidateSet).sort();
  }

  /**
   * Apply all active filters
   */
  applyFilters() {
    if (!this.currentPrecinctLayer) {
      console.warn('No precinct layer available for filtering');
      return;
    }

    this.filteredPrecincts.clear();
    this.isActive = false;

    // Get filter values
    const searchTerm = document.getElementById('precinct-search')?.value.toLowerCase().trim() || '';
    const minTurnout = parseFloat(document.getElementById('turnout-min')?.value) || null;
    const maxTurnout = parseFloat(document.getElementById('turnout-max')?.value) || null;
    const winnerName = document.getElementById('winner-filter')?.value || '';

    // Check if any filters are active
    const hasActiveFilters = searchTerm || minTurnout !== null || maxTurnout !== null || winnerName;

    if (!hasActiveFilters) {
      this.clearFilters();
      return;
    }

    this.isActive = true;
    let matchedCount = 0;

    // Apply filters to each precinct
    this.currentPrecinctLayer.eachLayer(layer => {
      if (!layer.feature || !layer.feature.properties) return;

      const properties = layer.feature.properties;
      const precinctCode = this.normalizePrecinctCode(properties.VLABEL || properties.Precinct);
      let matches = true;

      // Search filter
      if (searchTerm && !precinctCode.toLowerCase().includes(searchTerm)) {
        matches = false;
      }

      // Turnout filter
      if (matches && (minTurnout !== null || maxTurnout !== null)) {
        const turnout = this.getPrecinctTurnout(properties);
        if (turnout !== null) {
          if (minTurnout !== null && turnout < minTurnout) matches = false;
          if (maxTurnout !== null && turnout > maxTurnout) matches = false;
        } else {
          matches = false;
        }
      }

      // Winner filter
      if (matches && winnerName) {
        const winner = this.getPrecinctWinner(properties);
        if (winner !== winnerName) {
          matches = false;
        }
      }

      if (matches) {
        this.filteredPrecincts.add(precinctCode);
        matchedCount++;
      }
    });

    // Apply visual highlighting
    this.applyVisualFiltering();

    // Show results summary
    this.showFilterResults(matchedCount);
  }

  /**
   * Get turnout percentage for a precinct
   */
  getPrecinctTurnout(properties) {
    // Check if we have comparison data
    if (properties._comparisonData) {
      return properties._comparisonData.turnout2025 * 100;
    }

    // Check if we have current race data with turnout
    if (properties._currentRace && properties._currentRace['Total Votes Cast']) {
      const totalVotes = properties._currentRace['Total Votes Cast'];
      // We don't have registered voters in race data, so we can't calculate turnout
      // This would need to be enhanced with statistics data
      return null;
    }

    return null;
  }

  /**
   * Get winner for a precinct
   */
  getPrecinctWinner(properties) {
    if (!properties._currentRace) return null;

    const raceData = properties._currentRace;
    const excludeFields = ['Precinct', 'Total Votes Cast', 'Overvotes', 'Undervotes', 'Contest Total'];

    let maxVotes = -1;
    let winner = null;

    Object.keys(raceData).forEach(key => {
      if (!excludeFields.includes(key) &&
          !key.startsWith('Write-in') &&
          !key.startsWith('_') &&
          typeof raceData[key] === 'number') {
        if (raceData[key] > maxVotes) {
          maxVotes = raceData[key];
          winner = key;
        }
      }
    });

    return winner;
  }

  /**
   * Apply visual filtering to the map
   */
  applyVisualFiltering() {
    if (!this.currentPrecinctLayer) return;

    this.currentPrecinctLayer.eachLayer(layer => {
      if (!layer.feature || !layer.feature.properties) return;

      const precinctCode = this.normalizePrecinctCode(
        layer.feature.properties.VLABEL || layer.feature.properties.Precinct
      );

      const pathElement = layer.getElement?.();
      if (!pathElement) return;

      if (this.filteredPrecincts.has(precinctCode)) {
        // Highlight matching precincts
        pathElement.classList.remove('filter-dimmed');
        pathElement.classList.add('filter-highlight');
      } else {
        // Dim non-matching precincts
        pathElement.classList.remove('filter-highlight');
        pathElement.classList.add('filter-dimmed');
      }
    });
  }

  /**
   * Show filter results summary
   */
  showFilterResults(matchedCount) {
    const resultsDiv = document.getElementById('filter-results');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = `
      <strong>Results:</strong> ${matchedCount} precinct${matchedCount !== 1 ? 's' : ''} matched your filters
    `;
    resultsDiv.style.display = 'block';
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    // Clear filter inputs
    const searchInput = document.getElementById('precinct-search');
    const minInput = document.getElementById('turnout-min');
    const maxInput = document.getElementById('turnout-max');
    const winnerSelect = document.getElementById('winner-filter');

    if (searchInput) searchInput.value = '';
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    if (winnerSelect) winnerSelect.value = '';

    // Clear visual filtering
    if (this.currentPrecinctLayer) {
      this.currentPrecinctLayer.eachLayer(layer => {
        const pathElement = layer.getElement?.();
        if (pathElement) {
          pathElement.classList.remove('filter-highlight');
          pathElement.classList.remove('filter-dimmed');
        }
      });
    }

    // Hide results
    const resultsDiv = document.getElementById('filter-results');
    if (resultsDiv) {
      resultsDiv.style.display = 'none';
    }

    this.filteredPrecincts.clear();
    this.isActive = false;
  }

  /**
   * Normalize precinct code
   */
  normalizePrecinctCode(code) {
    if (!code) return '';
    return code.trim().replace(/\b0(\d+)/g, '$1');
  }
}

// Export singleton instance
export const precinctFilter = new PrecinctFilter();
