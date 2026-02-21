/**
 * PrecinctSummary.js
 * Component for displaying comprehensive precinct election history
 */

export class PrecinctSummary {
  constructor() {
    this.currentPrecinct = null;
    this.electionData = {};
    this.summaryPanel = null;
    this.metadata = {}; // Store metadata for race name lookups
  }

  /**
   * Initialize the precinct summary panel
   */
  initialize() {
    // Create summary panel if it doesn't exist
    if (!this.summaryPanel) {
      this.createSummaryPanel();
    }
  }

  /**
   * Create the summary panel DOM element
   */
  createSummaryPanel() {
    const panel = document.createElement('div');
    panel.id = 'precinct-summary-panel';
    panel.className = 'precinct-summary-panel';
    panel.innerHTML = `
      <div class="precinct-summary-header">
        <h2 id="precinct-summary-title">Precinct Summary</h2>
        <button id="close-precinct-summary" class="close-button">&times;</button>
      </div>
      <div class="precinct-summary-content" id="precinct-summary-content">
        <p>Loading...</p>
      </div>
    `;

    document.body.appendChild(panel);
    this.summaryPanel = panel;

    // Add event listener for close button
    document.getElementById('close-precinct-summary').addEventListener('click', () => {
      this.hide();
    });
  }

  /**
   * Show summary for a specific precinct
   */
  async showPrecinct(precinctCode) {
    this.currentPrecinct = precinctCode;

    if (!this.summaryPanel) {
      this.initialize();
    }

    // Show panel
    this.summaryPanel.classList.add('active');

    // Update title
    document.getElementById('precinct-summary-title').textContent = `Precinct ${precinctCode}`;

    // Load and display data
    await this.loadPrecinctData(precinctCode);
    this.renderSummary();
  }

  /**
   * Hide the summary panel
   */
  hide() {
    if (this.summaryPanel) {
      this.summaryPanel.classList.remove('active');
    }
  }

  /**
   * Load all election data for a precinct
   */
  async loadPrecinctData(precinctCode) {
    const normalizedCode = this.normalizePrecinctCode(precinctCode);
    this.electionData = {
      2023: { statistics: null, races: [] },
      2024: { statistics: null, races: [] },
      2025: { statistics: null, races: [] }
    };

    try {
      await Promise.all([
        this.loadYearMetadata(2023),
        this.loadYearMetadata(2024),
        this.loadYearMetadata(2025),
        this.loadYearStatistics(2023, normalizedCode),
        this.loadYearStatistics(2024, normalizedCode),
        this.loadYearStatistics(2025, normalizedCode),
        this.loadYearRaces(2023, normalizedCode),
        this.loadYearRaces(2024, normalizedCode),
        this.loadYearRaces(2025, normalizedCode)
      ]);
    } catch (error) {
      console.error('Error loading precinct data:', error);
    }
  }

  /**
   * Load metadata for a specific year
   */
  async loadYearMetadata(year) {
    try {
      const response = await fetch(`/api/elections/${year}`);
      const metadata = await response.json();
      this.metadata[year] = metadata;
    } catch (error) {
      console.error(`Error loading ${year} metadata:`, error);
    }
  }

  /**
   * Load statistics for a specific year
   */
  async loadYearStatistics(year, precinctCode) {
    try {
      const response = await fetch(`/data/elections/${year}/statistics.json`);
      const data = await response.json();

      // Find exact match or aggregate sub-precincts
      let stats = data.results?.find(r =>
        this.normalizePrecinctCode(r.Precinct) === precinctCode
      );

      if (!stats) {
        const subPrecincts = data.results?.filter(r => {
          const rCode = this.normalizePrecinctCode(r.Precinct);
          return rCode.startsWith(precinctCode) && rCode.length > precinctCode.length;
        });
        if (subPrecincts && subPrecincts.length > 0) {
          stats = this.aggregateStatistics(subPrecincts);
        }
      }

      // Parent → child fallback: data has original unsplit code (e.g. BRK-A), map uses BRK-A1
      if (!stats) {
        stats = data.results?.find(r => {
          const rCode = this.normalizePrecinctCode(r.Precinct);
          return precinctCode.startsWith(rCode) && precinctCode.length > rCode.length;
        });
      }

      this.electionData[year].statistics = stats;
    } catch (error) {
      console.error(`Error loading ${year} statistics:`, error);
    }
  }

  /**
   * Load all races for a specific year
   */
  async loadYearRaces(year, precinctCode) {
    try {
      // Get list of race files from manifest
      const manifestResponse = await fetch(`/data/elections/${year}/races.json`);
      const raceFiles = await manifestResponse.json();

      // Load each race
      const racePromises = raceFiles.map(async (filename) => {
        try {
          const raceResponse = await fetch(`/data/elections/${year}/${filename}`);
          const raceData = await raceResponse.json();

          // Find this precinct's data
          let precinctResult = raceData.results?.find(r =>
            this.normalizePrecinctCode(r.Precinct) === precinctCode
          );

          if (!precinctResult) {
            const subPrecincts = raceData.results?.filter(r => {
              const rCode = this.normalizePrecinctCode(r.Precinct);
              return rCode.startsWith(precinctCode) && rCode.length > precinctCode.length;
            });
            if (subPrecincts && subPrecincts.length > 0) {
              precinctResult = this.aggregateRaceResults(subPrecincts, raceData);
            }
          }

          // Parent → child fallback for older data on newer precinct boundaries
          if (!precinctResult) {
            const parentResult = raceData.results?.find(r => {
              const rCode = this.normalizePrecinctCode(r.Precinct);
              return precinctCode.startsWith(rCode) && precinctCode.length > rCode.length;
            });
            if (parentResult) precinctResult = parentResult;
          }

          if (precinctResult) {
            return {
              race: raceData.race,
              filename,
              result: precinctResult
            };
          }
        } catch (error) {
          console.warn(`Error loading race ${filename}:`, error);
        }
        return null;
      });

      const races = await Promise.all(racePromises);
      this.electionData[year].races = races.filter(r => r !== null);

    } catch (error) {
      console.error(`Error loading ${year} races:`, error);
    }
  }

  /**
   * Render the complete precinct summary
   */
  renderSummary() {
    const content = document.getElementById('precinct-summary-content');

    let html = '';

    // Overview section
    html += this.renderOverview();

    // Year-by-year sections
    html += this.renderYearSection(2023);
    html += this.renderYearSection(2024);
    html += this.renderYearSection(2025);

    // Comparison section
    html += this.renderComparison();

    content.innerHTML = html;
  }

  /**
   * Render overview section
   */
  renderOverview() {
    let html = '<div class="summary-section">';
    html += '<h3>Overview</h3>';

    html += '<table class="summary-table">';
    html += '<tr><th>Year</th><th>Turnout</th><th>Ballots Cast</th><th>Registered Voters</th></tr>';

    for (const year of [2023, 2024, 2025]) {
      const stats = this.electionData[year]?.statistics;
      if (stats) {
        const turnout = this.parseTurnoutValue(stats['Voter Turnout - Total']);
        html += `<tr>
          <td><strong>${year}</strong></td>
          <td>${(turnout * 100).toFixed(2)}%</td>
          <td>${this.formatNumber(stats['Ballots Cast - Total'])}</td>
          <td>${this.formatNumber(stats['Registered Voters - Total'])}</td>
        </tr>`;
      }
    }

    html += '</table>';
    html += '</div>';

    return html;
  }

  /**
   * Render section for a specific year
   */
  renderYearSection(year) {
    const yearData = this.electionData[year];

    let html = `<div class="summary-section">`;
    html += `<h3>${year} Election</h3>`;

    if (yearData.races.length === 0) {
      html += '<p>No race data available for this precinct.</p>';
    } else {
      html += `<p class="race-count">${yearData.races.length} races on ballot</p>`;

      yearData.races.forEach(race => {
        html += this.renderRaceCard(race, year);
      });
    }

    html += '</div>';
    return html;
  }

  /**
   * Get display name for a race from metadata
   */
  getRaceDisplayName(year, raceId) {
    const metadata = this.metadata[year];
    if (!metadata || !metadata.races) {
      return raceId; // Fallback to race ID if no metadata
    }

    const raceInfo = metadata.races.find(r => r.id === raceId);
    return raceInfo ? raceInfo.name : raceId;
  }

  /**
   * Render a single race card
   */
  renderRaceCard(race, year) {
    const displayName = this.getRaceDisplayName(year, race.race);

    let html = `<div class="race-card">`;
    html += `<h4>${displayName}</h4>`;

    const result = race.result;
    const excludeFields = ['Precinct', 'Total Votes Cast', 'Overvotes', 'Undervotes', 'Contest Total'];

    // Get candidates
    const candidates = Object.keys(result).filter(
      key => !excludeFields.includes(key) &&
             !key.startsWith('Write-in') &&
             !key.startsWith('_') &&
             typeof result[key] === 'number'
    );

    if (candidates.length > 0) {
      // Sort by votes
      candidates.sort((a, b) => result[b] - result[a]);

      html += '<table class="race-results">';
      candidates.forEach(candidate => {
        const votes = result[candidate];
        const totalVotes = result['Total Votes Cast'] || 0;
        const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;

        html += `<tr>
          <td class="candidate-name">${candidate}</td>
          <td class="candidate-votes">${votes.toLocaleString()}</td>
          <td class="candidate-percent">${percentage}%</td>
        </tr>`;
      });
      html += '</table>';

      html += `<div class="race-total">Total Votes: ${result['Total Votes Cast']?.toLocaleString() || 0}</div>`;
    }

    html += '</div>';
    return html;
  }

  /**
   * Render comparison section
   */
  renderComparison() {
    const stats2023 = this.electionData[2023]?.statistics;
    const stats2024 = this.electionData[2024]?.statistics;
    const stats2025 = this.electionData[2025]?.statistics;

    const pairs = [];
    if (stats2023 && stats2025) pairs.push([2023, stats2023, 2025, stats2025]);
    if (stats2024 && stats2025) pairs.push([2024, stats2024, 2025, stats2025]);

    if (pairs.length === 0) return '';

    let html = '<div class="summary-section comparison-section">';
    html += '<h3>Turnout Comparisons</h3>';

    pairs.forEach(([yearA, statsA, yearB, statsB]) => {
      const turnoutA = this.parseTurnoutValue(statsA['Voter Turnout - Total']);
      const turnoutB = this.parseTurnoutValue(statsB['Voter Turnout - Total']);
      const change = turnoutB - turnoutA;
      const changePercent = (change * 100).toFixed(2);

      html += '<div class="comparison-stat-large">';
      html += `<span class="stat-label">${yearA} → ${yearB}:</span>`;
      html += `<span class="stat-value ${change >= 0 ? 'increase' : 'decrease'}">`;
      html += `${change >= 0 ? '+' : ''}${changePercent} pts`;
      html += '</span>';
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  /**
   * Helper: Parse turnout value
   */
  parseTurnoutValue(value) {
    if (typeof value === 'number') return value > 1 ? value / 100 : value;
    if (typeof value === 'string') {
      return parseFloat(value.replace('%', '')) / 100;
    }
    return 0;
  }

  /**
   * Helper: Format number with commas
   */
  formatNumber(value) {
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string') {
      return value; // Already formatted
    }
    return '0';
  }

  /**
   * Helper: Normalize precinct code
   */
  normalizePrecinctCode(code) {
    if (!code) return '';
    return code.trim().replace(/\b0(\d+)/g, '$1');
  }

  /**
   * Helper: Aggregate statistics from sub-precincts
   */
  aggregateStatistics(subPrecincts) {
    let totalRegistered = 0;
    let totalBallots = 0;

    subPrecincts.forEach(precinct => {
      totalRegistered += this.parseNumericValue(precinct['Registered Voters - Total']);
      totalBallots += this.parseNumericValue(precinct['Ballots Cast - Total']);
    });

    const turnoutPercent = totalRegistered > 0 ? (totalBallots / totalRegistered) * 100 : 0;

    return {
      'Voter Turnout - Total': `${turnoutPercent.toFixed(2)}%`,
      'Registered Voters - Total': totalRegistered,
      'Ballots Cast - Total': totalBallots
    };
  }

  /**
   * Helper: Aggregate race results from sub-precincts
   */
  aggregateRaceResults(subPrecincts, raceData) {
    const aggregated = { Precinct: this.currentPrecinct };

    // Get all candidate fields from the race
    const excludeFields = ['Precinct', 'Total Votes Cast', 'Overvotes', 'Undervotes', 'Contest Total'];
    const allKeys = new Set();

    subPrecincts.forEach(precinct => {
      Object.keys(precinct).forEach(key => allKeys.add(key));
    });

    // Aggregate numeric fields
    allKeys.forEach(key => {
      if (!excludeFields.includes(key) && typeof subPrecincts[0][key] === 'number') {
        aggregated[key] = subPrecincts.reduce((sum, p) => sum + (p[key] || 0), 0);
      }
    });

    // Aggregate totals
    aggregated['Total Votes Cast'] = subPrecincts.reduce((sum, p) => sum + (p['Total Votes Cast'] || 0), 0);
    aggregated['Overvotes'] = subPrecincts.reduce((sum, p) => sum + (p['Overvotes'] || 0), 0);
    aggregated['Undervotes'] = subPrecincts.reduce((sum, p) => sum + (p['Undervotes'] || 0), 0);
    aggregated['Contest Total'] = subPrecincts.reduce((sum, p) => sum + (p['Contest Total'] || 0), 0);

    return aggregated;
  }

  /**
   * Helper: Parse numeric value
   */
  parseNumericValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      return parseFloat(value.replace(/,/g, '')) || 0;
    }
    return 0;
  }
}

// Export singleton instance
export const precinctSummary = new PrecinctSummary();
