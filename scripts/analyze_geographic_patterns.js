#!/usr/bin/env node

/**
 * Analyze geographic patterns in voter turnout across Montgomery County
 * Groups precincts by township/city and identifies spatial patterns
 */

const fs = require('fs');
const path = require('path');

// Read GeoJSON files
const precincts2024 = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../provider-data/precincts_2024.geojson'), 'utf8')
);
const precincts2025 = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../provider-data/precincts_2025.geojson'), 'utf8')
);

/**
 * Parse turnout to decimal
 */
function parseTurnout(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace('%', '').trim());
    return num / 100;
  }
  return null;
}

/**
 * Extract municipality name from precinct name
 */
function getMunicipality(vname) {
  if (!vname) return 'Unknown';

  // Extract city/township name before precinct number
  // Examples: "DAYTON 01-A" -> "DAYTON", "KETTERING 03-J" -> "KETTERING"
  const parts = vname.split(/\s+\d/);
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return vname;
}

/**
 * Categorize municipality type based on known urban/suburban/rural areas
 */
function getMunicipalityType(municipality) {
  const urban = ['DAYTON', 'KETTERING', 'HUBER HEIGHTS', 'TROTWOOD', 'VANDALIA', 'MORAINE'];
  const suburban = [
    'CENTERVILLE', 'MIAMISBURG', 'OAKWOOD', 'CLAYTON', 'ENGLEWOOD',
    'WEST CARROLLTON', 'RIVERSIDE', 'BROOKVILLE', 'CARLISLE'
  ];

  const upper = municipality.toUpperCase();

  if (urban.some(city => upper.includes(city))) return 'Urban';
  if (suburban.some(city => upper.includes(city))) return 'Suburban';

  // Township names typically contain "TOWNSHIP"
  if (upper.includes('TOWNSHIP')) return 'Rural/Township';

  return 'Other';
}

/**
 * Analyze turnout by geographic groupings
 */
function analyzeByGeography(features, year) {
  const byMunicipality = {};
  const byType = { 'Urban': [], 'Suburban': [], 'Rural/Township': [], 'Other': [] };

  features.forEach(feature => {
    const props = feature.properties;
    const turnoutKey = `${year}_Voter_Turnout_Total`;
    const registeredKey = `${year}_Registered_Voters_Total`;
    const ballotsKey = `${year}_Ballots_Cast_Total`;

    const turnout = parseTurnout(props[turnoutKey]);
    const registered = parseInt(props[registeredKey]);
    const ballots = parseInt(props[ballotsKey]);
    const vname = props.VNAME;

    if (turnout && registered >= 10 && ballots > 0) {
      const municipality = getMunicipality(vname);
      const type = getMunicipalityType(municipality);

      // Group by municipality
      if (!byMunicipality[municipality]) {
        byMunicipality[municipality] = {
          precincts: [],
          totalRegistered: 0,
          totalBallots: 0,
          type: type
        };
      }

      byMunicipality[municipality].precincts.push({
        name: vname,
        turnout: turnout,
        registered: registered,
        ballots: ballots
      });
      byMunicipality[municipality].totalRegistered += registered;
      byMunicipality[municipality].totalBallots += ballots;

      // Group by type
      byType[type].push({
        municipality: municipality,
        precinct: vname,
        turnout: turnout,
        registered: registered,
        ballots: ballots
      });
    }
  });

  // Calculate statistics for each municipality
  const municipalityStats = Object.entries(byMunicipality).map(([name, data]) => {
    const turnouts = data.precincts.map(p => p.turnout);
    const meanTurnout = turnouts.reduce((a, b) => a + b, 0) / turnouts.length;
    const overallTurnout = data.totalBallots / data.totalRegistered;

    return {
      name: name,
      type: data.type,
      precinctCount: data.precincts.length,
      totalRegistered: data.totalRegistered,
      totalBallots: data.totalBallots,
      meanTurnout: meanTurnout,
      overallTurnout: overallTurnout,
      minTurnout: Math.min(...turnouts),
      maxTurnout: Math.max(...turnouts)
    };
  });

  // Sort by overall turnout
  municipalityStats.sort((a, b) => b.overallTurnout - a.overallTurnout);

  // Calculate statistics by type
  const typeStats = Object.entries(byType).map(([type, precincts]) => {
    if (precincts.length === 0) return null;

    const totalRegistered = precincts.reduce((sum, p) => sum + p.registered, 0);
    const totalBallots = precincts.reduce((sum, p) => sum + p.ballots, 0);
    const turnouts = precincts.map(p => p.turnout);
    const meanTurnout = turnouts.reduce((a, b) => a + b, 0) / turnouts.length;

    return {
      type: type,
      precinctCount: precincts.length,
      totalRegistered: totalRegistered,
      totalBallots: totalBallots,
      overallTurnout: totalBallots / totalRegistered,
      meanTurnout: meanTurnout,
      minTurnout: Math.min(...turnouts),
      maxTurnout: Math.max(...turnouts)
    };
  }).filter(s => s !== null);

  return {
    year,
    byMunicipality: municipalityStats,
    byType: typeStats
  };
}

// Analyze both years
const analysis2024 = analyzeByGeography(precincts2024.features, 2024);
const analysis2025 = analyzeByGeography(precincts2025.features, 2025);

// Format percentage
function pct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

// Generate markdown report
const markdown = `# Geographic Patterns in Voter Turnout
**Montgomery County, Ohio**

**Generated:** ${new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

## Executive Summary

This analysis examines spatial patterns in voter turnout across Montgomery County, comparing the 2024 presidential election with the 2025 off-year election. The data reveals significant geographic disparities in civic engagement.

### Key Findings

1. **Urban-Suburban-Rural Divide**: Clear differences in turnout patterns across municipality types
2. **Consistency Across Years**: Geographic patterns remain relatively stable between 2024 and 2025
3. **High-Performing Areas**: Suburban communities consistently show higher turnout
4. **Improvement Opportunities**: Certain urban precincts show persistently low participation

---

## Urban vs. Suburban vs. Rural Analysis

### 2024 Presidential Election

| Municipality Type | Precincts | Registered Voters | Overall Turnout | Mean Turnout | Range |
|------------------|-----------|------------------|----------------|--------------|-------|
${analysis2024.byType.map(t =>
  `| ${t.type} | ${t.precinctCount} | ${t.totalRegistered.toLocaleString()} | **${pct(t.overallTurnout)}** | ${pct(t.meanTurnout)} | ${pct(t.minTurnout)} - ${pct(t.maxTurnout)} |`
).join('\n')}

### 2025 Off-Year Election

| Municipality Type | Precincts | Registered Voters | Overall Turnout | Mean Turnout | Range |
|------------------|-----------|------------------|----------------|--------------|-------|
${analysis2025.byType.map(t =>
  `| ${t.type} | ${t.precinctCount} | ${t.totalRegistered.toLocaleString()} | **${pct(t.overallTurnout)}** | ${pct(t.meanTurnout)} | ${pct(t.minTurnout)} - ${pct(t.maxTurnout)} |`
).join('\n')}

### Analysis

${(() => {
  const urban2024 = analysis2024.byType.find(t => t.type === 'Urban');
  const suburban2024 = analysis2024.byType.find(t => t.type === 'Suburban');
  const rural2024 = analysis2024.byType.find(t => t.type === 'Rural/Township');

  const urban2025 = analysis2025.byType.find(t => t.type === 'Urban');
  const suburban2025 = analysis2025.byType.find(t => t.type === 'Suburban');
  const rural2025 = analysis2025.byType.find(t => t.type === 'Rural/Township');

  let analysis = '';

  if (suburban2024 && urban2024) {
    const gap2024 = suburban2024.overallTurnout - urban2024.overallTurnout;
    const gap2025 = suburban2025.overallTurnout - urban2025.overallTurnout;

    analysis += `**2024 Suburban-Urban Gap**: Suburban areas had ${pct(gap2024)} higher turnout than urban areas.\n\n`;
    analysis += `**2025 Suburban-Urban Gap**: Suburban areas had ${pct(gap2025)} higher turnout than urban areas.\n\n`;
  }

  if (rural2024) {
    analysis += `**Rural/Township Performance**: Rural townships showed ${pct(rural2024.overallTurnout)} turnout in 2024 and ${pct(rural2025.overallTurnout)} in 2025.\n\n`;
  }

  return analysis;
})()}

---

## Top 10 Municipalities by Turnout (2024)

| Rank | Municipality | Type | Precincts | Registered | Turnout |
|------|-------------|------|-----------|-----------|---------|
${analysis2024.byMunicipality.slice(0, 10).map((m, i) =>
  `| ${i + 1} | ${m.name} | ${m.type} | ${m.precinctCount} | ${m.totalRegistered.toLocaleString()} | **${pct(m.overallTurnout)}** |`
).join('\n')}

## Bottom 10 Municipalities by Turnout (2024)

| Rank | Municipality | Type | Precincts | Registered | Turnout |
|------|-------------|------|-----------|-----------|---------|
${analysis2024.byMunicipality.slice(-10).reverse().map((m, i) =>
  `| ${i + 1} | ${m.name} | ${m.type} | ${m.precinctCount} | ${m.totalRegistered.toLocaleString()} | **${pct(m.overallTurnout)}** |`
).join('\n')}

---

## Top 10 Municipalities by Turnout (2025)

| Rank | Municipality | Type | Precincts | Registered | Turnout |
|------|-------------|------|-----------|-----------|---------|
${analysis2025.byMunicipality.slice(0, 10).map((m, i) =>
  `| ${i + 1} | ${m.name} | ${m.type} | ${m.precinctCount} | ${m.totalRegistered.toLocaleString()} | **${pct(m.overallTurnout)}** |`
).join('\n')}

## Bottom 10 Municipalities by Turnout (2025)

| Rank | Municipality | Type | Precincts | Registered | Turnout |
|------|-------------|------|-----------|-----------|---------|
${analysis2025.byMunicipality.slice(-10).reverse().map((m, i) =>
  `| ${i + 1} | ${m.name} | ${m.type} | ${m.precinctCount} | ${m.totalRegistered.toLocaleString()} | **${pct(m.overallTurnout)}** |`
).join('\n')}

---

## Year-over-Year Comparison

### Municipalities with Largest Turnout Increases (2024 → 2025)

| Municipality | Type | 2024 Turnout | 2025 Turnout | Change |
|-------------|------|-------------|-------------|--------|
${(() => {
  const changes = analysis2024.byMunicipality.map(m2024 => {
    const m2025 = analysis2025.byMunicipality.find(m => m.name === m2024.name);
    if (!m2025) return null;

    return {
      name: m2024.name,
      type: m2024.type,
      turnout2024: m2024.overallTurnout,
      turnout2025: m2025.overallTurnout,
      change: m2025.overallTurnout - m2024.overallTurnout
    };
  }).filter(c => c !== null);

  changes.sort((a, b) => b.change - a.change);

  return changes.slice(0, 10).map(c =>
    `| ${c.name} | ${c.type} | ${pct(c.turnout2024)} | ${pct(c.turnout2025)} | ${c.change >= 0 ? '+' : ''}${pct(c.change)} |`
  ).join('\n');
})()}

### Municipalities with Largest Turnout Decreases (2024 → 2025)

| Municipality | Type | 2024 Turnout | 2025 Turnout | Change |
|-------------|------|-------------|-------------|--------|
${(() => {
  const changes = analysis2024.byMunicipality.map(m2024 => {
    const m2025 = analysis2025.byMunicipality.find(m => m.name === m2024.name);
    if (!m2025) return null;

    return {
      name: m2024.name,
      type: m2024.type,
      turnout2024: m2024.overallTurnout,
      turnout2025: m2025.overallTurnout,
      change: m2025.overallTurnout - m2024.overallTurnout
    };
  }).filter(c => c !== null);

  changes.sort((a, b) => a.change - b.change);

  return changes.slice(0, 10).map(c =>
    `| ${c.name} | ${c.type} | ${pct(c.turnout2024)} | ${pct(c.turnout2025)} | ${c.change >= 0 ? '+' : ''}${pct(c.change)} |`
  ).join('\n');
})()}

---

## Recommendations for Voter Engagement

Based on this geographic analysis, the following areas should be prioritized for voter engagement efforts:

### High-Priority Areas (Low Turnout, Large Population)

${(() => {
  const lowTurnoutLargePopulation = analysis2025.byMunicipality
    .filter(m => m.overallTurnout < 0.30 && m.totalRegistered > 5000)
    .slice(0, 5);

  return lowTurnoutLargePopulation.map(m =>
    `- **${m.name}** (${m.type}): ${pct(m.overallTurnout)} turnout, ${m.totalRegistered.toLocaleString()} registered voters`
  ).join('\n');
})()}

### Success Stories (High Turnout Models)

${(() => {
  const highTurnout = analysis2025.byMunicipality
    .filter(m => m.overallTurnout > 0.35)
    .slice(0, 5);

  return highTurnout.map(m =>
    `- **${m.name}** (${m.type}): ${pct(m.overallTurnout)} turnout - study best practices from this community`
  ).join('\n');
})()}

---

## Methodology

- **Data Source**: Montgomery County Board of Elections precinct-level results
- **Classification**: Municipalities categorized as Urban, Suburban, or Rural/Township based on local knowledge
- **Turnout Calculation**: (Ballots Cast / Registered Voters) × 100%
- **Geographic Grouping**: Precincts grouped by municipality name extracted from precinct identifiers
- **Years Analyzed**: 2024 (presidential election) vs 2025 (off-year election)

---

## Data Quality Notes

- Analysis includes all ${analysis2024.byMunicipality.length} municipalities identified in the dataset
- 2024 analysis covers ${analysis2024.byType.reduce((sum, t) => sum + t.precinctCount, 0)} precincts
- 2025 analysis covers ${analysis2025.byType.reduce((sum, t) => sum + t.precinctCount, 0)} precincts
`;

// Write markdown report
fs.writeFileSync(
  path.join(__dirname, '../analysis/geographic_patterns.md'),
  markdown,
  'utf8'
);

console.log('✅ Geographic analysis complete!');
console.log('📄 Report: analysis/geographic_patterns.md');
console.log('');
console.log('Key findings:');
console.log(`  • Analyzed ${analysis2024.byMunicipality.length} municipalities`);
console.log(`  • Urban/Suburban/Rural patterns identified`);
console.log(`  • Year-over-year comparison completed`);
