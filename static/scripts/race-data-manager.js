/**
 * RaceDataManager
 * Handles loading election data and injecting it into precinct features
 */

export class RaceDataManager {
  constructor() {
    this.availableYears = [];
    this.currentYear = null;
    this.currentRace = null;
    this.raceMetadata = null;
    this.raceData = null;
    this.precinctLayer = null;
  }

  /**
   * Initialize the race data manager
   */
  async init() {
    try {
      const response = await fetch('/api/elections');
      const data = await response.json();
      this.availableYears = data.years || [];
      return this.availableYears;
    } catch (error) {
      console.error('Failed to load election years:', error);
      return [];
    }
  }

  /**
   * Set the precinct layer to inject data into
   */
  setPrecinctLayer(layer) {
    this.precinctLayer = layer;
  }

  /**
   * Load metadata for a specific year
   */
  async loadYearMetadata(year) {
    try {
      const response = await fetch(`/api/elections/${year}`);
      const metadata = await response.json();
      this.currentYear = year;
      this.raceMetadata = metadata;
      return metadata;
    } catch (error) {
      console.error(`Failed to load metadata for ${year}:`, error);
      return null;
    }
  }

  /**
   * Load race data for a specific race
   */
  async loadRaceData(year, raceId) {
    try {
      // Decode raceId in case it's already encoded (from select value)
      // Then re-encode it properly for the URL
      const decodedRaceId = decodeURIComponent(raceId);
      const encodedRaceId = encodeURIComponent(decodedRaceId);
      const response = await fetch(`/api/elections/${year}/races/${encodedRaceId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.currentRace = decodedRaceId;
      this.raceData = data;
      return data;
    } catch (error) {
      console.error(`Failed to load race ${raceId} for ${year}:`, error);
      return null;
    }
  }

  /**
   * Inject race data into precinct layer features
   */
  injectRaceData() {
    if (!this.precinctLayer || !this.raceData) {
      console.warn('Cannot inject race data: missing precinct layer or race data');
      return;
    }

    let matchedCount = 0;
    let totalFeatures = 0;

    this.precinctLayer.eachLayer(layer => {
      totalFeatures++;

      if (!layer.feature || !layer.feature.properties) {
        return;
      }

      const precinctCode = this.normalizePrecinctCode(
        layer.feature.properties.VLABEL || layer.feature.properties.Precinct
      );

      // First try exact match
      let raceResult = this.raceData.results.find(r => {
        const resultCode = this.normalizePrecinctCode(r.Precinct);
        return resultCode === precinctCode;
      });

      // If no exact match, look for and aggregate sub-precincts
      if (!raceResult) {
        const subPrecincts = this.raceData.results.filter(r => {
          const rCode = this.normalizePrecinctCode(r.Precinct);
          return rCode.startsWith(precinctCode) && rCode.length > precinctCode.length;
        });

        if (subPrecincts.length > 0) {
          raceResult = this.aggregateSubPrecinctResults(subPrecincts);
          // Add precinct code for display
          if (raceResult) {
            raceResult.Precinct = precinctCode;
          }
        }
      }

      if (raceResult) {
        // Inject race data as temporary property
        layer.feature.properties._currentRace = raceResult;
        matchedCount++;
      } else {
        // Clear any existing race data if no match
        delete layer.feature.properties._currentRace;
      }
    });

    console.log(`Injected race data: ${matchedCount}/${totalFeatures} features matched`);

    return { matched: matchedCount, total: totalFeatures };
  }

  /**
   * Clear race data from all features
   */
  clearRaceData() {
    if (!this.precinctLayer) {
      return;
    }

    this.precinctLayer.eachLayer(layer => {
      if (layer.feature && layer.feature.properties) {
        delete layer.feature.properties._currentRace;
      }
    });

    this.currentRace = null;
    this.raceData = null;
  }

  /**
   * Normalize precinct codes for matching (remove zero-padding)
   */
  normalizePrecinctCode(code) {
    if (!code) return '';

    // Remove leading/trailing whitespace
    code = code.trim();

    // Remove zero-padding from district numbers
    // e.g., "CTN 01-A" -> "CTN 1-A"
    code = code.replace(/\b0(\d+)/g, '$1');

    return code;
  }

  /**
   * Get candidate list from current race data
   */
  getCandidates() {
    if (!this.raceData || !this.raceData.results || this.raceData.results.length === 0) {
      return [];
    }

    // Get column names from first result, excluding metadata columns
    const firstResult = this.raceData.results[0];
    const excludeColumns = ['Precinct', 'Total Votes Cast', 'Overvotes', 'Undervotes', 'Contest Total'];

    const candidates = Object.keys(firstResult).filter(key =>
      !excludeColumns.includes(key) &&
      !key.startsWith('Write-in') &&
      !key.includes('Not Valid') &&
      !key.includes('Not Assigned')
    );

    return candidates;
  }

  /**
   * Calculate county-wide totals for current race
   */
  getCountyTotals() {
    if (!this.raceData || !this.raceData.results) {
      return null;
    }

    const candidates = this.getCandidates();
    const totals = {};
    let totalVotes = 0;

    // Sum up votes for each candidate
    candidates.forEach(candidate => {
      let candidateTotal = 0;
      this.raceData.results.forEach(result => {
        const votes = result[candidate];
        if (typeof votes === 'number') {
          candidateTotal += votes;
          totalVotes += votes;
        }
      });
      totals[candidate] = candidateTotal;
    });

    // Calculate percentages
    const results = candidates.map(candidate => ({
      name: candidate,
      votes: totals[candidate],
      percentage: totalVotes > 0 ? ((totals[candidate] / totalVotes) * 100).toFixed(2) : 0
    }));

    // Sort by votes descending
    results.sort((a, b) => b.votes - a.votes);

    return {
      totalVotes,
      totalPrecincts: this.raceData.results.length,
      candidates: results
    };
  }

  /**
   * Get winning candidate for a specific precinct
   * Handles both direct matches and aggregating sub-precincts
   */
  getWinningCandidate(precinctCode) {
    if (!this.raceData) return null;

    const normalizedCode = this.normalizePrecinctCode(precinctCode);

    // First try exact match
    let result = this.raceData.results.find(r =>
      this.normalizePrecinctCode(r.Precinct) === normalizedCode
    );

    // If no exact match, look for sub-precincts (e.g., DAY 1-C1, DAY 1-C2 for DAY 1-C)
    if (!result) {
      const subPrecincts = this.raceData.results.filter(r => {
        const rCode = this.normalizePrecinctCode(r.Precinct);
        // Check if this is a sub-precinct of the parent (e.g., "DAY 1-C1" starts with "DAY 1-C")
        return rCode.startsWith(normalizedCode) && rCode.length > normalizedCode.length;
      });

      if (subPrecincts.length > 0) {
        // Aggregate sub-precinct results
        result = this.aggregateSubPrecinctResults(subPrecincts);
      }
    }

    if (!result) return null;

    const candidates = this.getCandidates();
    let winner = null;
    let maxVotes = 0;

    candidates.forEach(candidate => {
      const votes = result[candidate];
      if (typeof votes === 'number' && votes > maxVotes) {
        maxVotes = votes;
        winner = {
          name: candidate,
          votes: votes,
          totalVotes: result['Total Votes Cast'] || 0
        };
      }
    });

    if (winner && winner.totalVotes > 0) {
      winner.percentage = ((winner.votes / winner.totalVotes) * 100).toFixed(1);
    }

    return winner;
  }

  /**
   * Aggregate results from multiple sub-precincts
   */
  aggregateSubPrecinctResults(subPrecincts) {
    if (!subPrecincts || subPrecincts.length === 0) return null;

    const aggregated = {};
    const candidates = this.getCandidates();

    // Sum votes for each candidate
    candidates.forEach(candidate => {
      aggregated[candidate] = subPrecincts.reduce((sum, precinct) => {
        return sum + (precinct[candidate] || 0);
      }, 0);
    });

    // Sum metadata fields
    aggregated['Total Votes Cast'] = subPrecincts.reduce((sum, p) => sum + (p['Total Votes Cast'] || 0), 0);
    aggregated['Overvotes'] = subPrecincts.reduce((sum, p) => sum + (p['Overvotes'] || 0), 0);
    aggregated['Undervotes'] = subPrecincts.reduce((sum, p) => sum + (p['Undervotes'] || 0), 0);
    aggregated['Contest Total'] = subPrecincts.reduce((sum, p) => sum + (p['Contest Total'] || 0), 0);

    return aggregated;
  }
}
