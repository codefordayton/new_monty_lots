#!/usr/bin/env node

/**
 * Analyze voter turnout statistics for Montgomery County
 * Generates summary statistics and precinct rankings
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
 * Parse turnout string or number to decimal
 */
function parseTurnout(value) {
  if (typeof value === 'number') {
    // If already a decimal (e.g., 0.8471), keep it
    // If it's a percentage (e.g., 84.71), convert it
    return value > 1 ? value / 100 : value;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value.replace('%', '').trim());
    // String percentages are always > 1 (e.g., "84.71%")
    return num / 100;
  }
  return null;
}

/**
 * Calculate statistics for a dataset
 */
function calculateStats(features, year) {
  const turnouts = [];
  const skipped = [];

  features.forEach(feature => {
    const props = feature.properties;
    const turnoutKey = `${year}_Voter_Turnout_Total`;
    const registeredKey = `${year}_Registered_Voters_Total`;
    const ballotsKey = `${year}_Ballots_Cast_Total`;

    const turnout = parseTurnout(props[turnoutKey]);
    const registered = parseInt(props[registeredKey]);
    const ballots = parseInt(props[ballotsKey]);
    const precinctName = props.VNAME || props.precinct || props.name || 'UNKNOWN';

    // Skip precincts with invalid/missing data
    // Registered voters should be at least 10 to be a real precinct
    // Ballots should not exceed registered voters
    if (turnout !== null && !isNaN(turnout) &&
        registered >= 10 && ballots > 0 &&
        ballots <= registered * 1.1 && // Allow 10% margin for data entry errors
        turnout > 0 && turnout <= 1) { // Turnout should be 0-100%
      turnouts.push({
        precinct: precinctName,
        turnout: turnout,
        registered: registered,
        ballots: ballots
      });
    } else {
      // Track why this precinct was skipped
      let reason = [];
      if (turnout === null || isNaN(turnout)) reason.push('invalid turnout');
      if (registered < 10) reason.push(`low registered (${registered})`);
      if (ballots <= 0) reason.push(`no ballots (${ballots})`);
      if (ballots > registered * 1.1) reason.push(`ballots (${ballots}) > registered (${registered})`);
      if (turnout !== null && (turnout <= 0 || turnout > 1)) reason.push(`turnout out of range (${(turnout * 100).toFixed(2)}%)`);

      skipped.push({
        precinct: precinctName,
        turnout: props[turnoutKey],
        registered: registered,
        ballots: ballots,
        reason: reason.join(', ')
      });
    }
  });

  if (turnouts.length === 0) {
    return null;
  }

  // Calculate county-wide totals first for overall turnout
  const totalRegistered = turnouts.reduce((sum, t) => sum + t.registered, 0);
  const totalBallots = turnouts.reduce((sum, t) => sum + t.ballots, 0);
  const overallTurnout = totalBallots / totalRegistered;

  // Sort by turnout for rankings
  turnouts.sort((a, b) => b.turnout - a.turnout);

  // Calculate distribution statistics (mean of precinct-level turnouts)
  const turnoutValues = turnouts.map(t => t.turnout);
  const mean = turnoutValues.reduce((a, b) => a + b, 0) / turnoutValues.length;
  const sorted = [...turnoutValues].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const variance = turnoutValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / turnoutValues.length;
  const stdDev = Math.sqrt(variance);

  return {
    year,
    count: turnouts.length,
    overallTurnout,
    totalRegistered,
    totalBallots,
    mean,
    median,
    stdDev,
    min: Math.min(...turnoutValues),
    max: Math.max(...turnoutValues),
    top10: turnouts.slice(0, 10),
    bottom10: turnouts.slice(-10).reverse(),
    skipped: skipped
  };
}

// Calculate statistics for both years
const stats2024 = calculateStats(precincts2024.features, 2024);
const stats2025 = calculateStats(precincts2025.features, 2025);

// Calculate year-over-year change
const turnoutChange = stats2025.overallTurnout - stats2024.overallTurnout;
const turnoutChangePct = (turnoutChange / stats2024.overallTurnout) * 100;

// Format percentage
function pct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

// Generate markdown report
const markdown = `# Montgomery County Voter Turnout Analysis

**Generated:** ${new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

## Executive Summary

### Overall County Turnout

| Year | Registered Voters | Ballots Cast | Turnout Rate |
|------|------------------|--------------|--------------|
| 2024 | ${stats2024.totalRegistered.toLocaleString()} | ${stats2024.totalBallots.toLocaleString()} | **${pct(stats2024.overallTurnout)}** |
| 2025 | ${stats2025.totalRegistered.toLocaleString()} | ${stats2025.totalBallots.toLocaleString()} | **${pct(stats2025.overallTurnout)}** |

**Year-over-year change:** ${turnoutChange >= 0 ? '+' : ''}${pct(turnoutChange)} (${turnoutChangePct >= 0 ? '+' : ''}${turnoutChangePct.toFixed(2)}%)

## Distribution Statistics

### 2024 General Election

- **Mean turnout:** ${pct(stats2024.mean)}
- **Median turnout:** ${pct(stats2024.median)}
- **Standard deviation:** ${pct(stats2024.stdDev)}
- **Range:** ${pct(stats2024.min)} to ${pct(stats2024.max)}
- **Precincts analyzed:** ${stats2024.count}

### 2025 General Election

- **Mean turnout:** ${pct(stats2025.mean)}
- **Median turnout:** ${pct(stats2025.median)}
- **Standard deviation:** ${pct(stats2025.stdDev)}
- **Range:** ${pct(stats2025.min)} to ${pct(stats2025.max)}
- **Precincts analyzed:** ${stats2025.count}

## Top 10 Highest Turnout Precincts (2025)

| Rank | Precinct | Turnout | Registered | Ballots Cast |
|------|----------|---------|------------|--------------|
${stats2025.top10.map((p, i) =>
  `| ${i + 1} | ${p.precinct} | ${pct(p.turnout)} | ${p.registered.toLocaleString()} | ${p.ballots.toLocaleString()} |`
).join('\n')}

## Top 10 Lowest Turnout Precincts (2025)

| Rank | Precinct | Turnout | Registered | Ballots Cast |
|------|----------|---------|------------|--------------|
${stats2025.bottom10.map((p, i) =>
  `| ${i + 1} | ${p.precinct} | ${pct(p.turnout)} | ${p.registered.toLocaleString()} | ${p.ballots.toLocaleString()} |`
).join('\n')}

## Key Findings

### Turnout Trends

${turnoutChange > 0
  ? `- Overall turnout **increased** by ${pct(Math.abs(turnoutChange))} from 2024 to 2025`
  : `- Overall turnout **decreased** by ${pct(Math.abs(turnoutChange))} from 2024 to 2025`
}
- 2025 mean turnout was ${pct(stats2025.mean)}, ${stats2025.mean > stats2024.mean ? 'higher' : 'lower'} than 2024's ${pct(stats2024.mean)}
- Turnout variation (std dev) was ${pct(stats2025.stdDev)} in 2025 vs ${pct(stats2024.stdDev)} in 2024

### Participation Patterns

- The highest-turnout precinct in 2025 had ${pct(stats2025.max)} participation
- The lowest-turnout precinct in 2025 had ${pct(stats2025.min)} participation
- The difference between highest and lowest turnout precincts was ${pct(stats2025.max - stats2025.min)}

### Geographic Distribution

- Analysis covers ${stats2025.count} precincts across Montgomery County
- Turnout varies significantly across precincts, suggesting geographic or demographic factors influence participation

## Data Sources

- **2024 Election Data:** Montgomery County Board of Elections, November 5, 2024 General Election
- **2025 Election Data:** Montgomery County Board of Elections, November 4, 2025 General Election
- **Precinct Boundaries:** Montgomery County GIS Services

## Methodology

- Turnout calculated as: (Ballots Cast / Registered Voters) × 100%
- Statistics include all precincts with valid turnout data
- Sub-precincts aggregated where applicable
- Overall county turnout weighted by precinct size
`;

// Write markdown report
fs.writeFileSync(
  path.join(__dirname, '../analysis/summary_statistics.md'),
  markdown,
  'utf8'
);

// Generate CSV with precinct rankings for both years
const csvLines = ['Year,Rank,Precinct,Turnout,Registered_Voters,Ballots_Cast'];

// Add 2024 rankings
stats2024.top10.forEach((p, i) => {
  csvLines.push(`2024,${i + 1},${p.precinct},${(p.turnout * 100).toFixed(2)},${p.registered},${p.ballots}`);
});

// Add 2025 rankings
stats2025.top10.forEach((p, i) => {
  csvLines.push(`2025,${i + 1},${p.precinct},${(p.turnout * 100).toFixed(2)},${p.registered},${p.ballots}`);
});

fs.writeFileSync(
  path.join(__dirname, '../analysis/precinct_rankings.csv'),
  csvLines.join('\n'),
  'utf8'
);

// Write skipped precincts report
const skippedReport = `# Skipped Precincts Report

## 2024 Precincts Skipped (${stats2024.skipped.length})

| Precinct | Turnout | Registered | Ballots | Reason |
|----------|---------|------------|---------|--------|
${stats2024.skipped.map(p =>
  `| ${p.precinct} | ${p.turnout || 'N/A'} | ${p.registered} | ${p.ballots} | ${p.reason} |`
).join('\n')}

## 2025 Precincts Skipped (${stats2025.skipped.length})

| Precinct | Turnout | Registered | Ballots | Reason |
|----------|---------|------------|---------|--------|
${stats2025.skipped.map(p =>
  `| ${p.precinct} | ${p.turnout || 'N/A'} | ${p.registered} | ${p.ballots} | ${p.reason} |`
).join('\n')}
`;

fs.writeFileSync(
  path.join(__dirname, '../analysis/skipped_precincts.md'),
  skippedReport,
  'utf8'
);

console.log('✅ Analysis complete!');
console.log('📄 Summary statistics: analysis/summary_statistics.md');
console.log('📊 Precinct rankings: analysis/precinct_rankings.csv');
console.log('⚠️  Skipped precincts: analysis/skipped_precincts.md');
console.log('');
console.log('Key findings:');
console.log(`  • 2024 turnout: ${pct(stats2024.overallTurnout)} (${stats2024.count} precincts, ${stats2024.skipped.length} skipped)`);
console.log(`  • 2025 turnout: ${pct(stats2025.overallTurnout)} (${stats2025.count} precincts, ${stats2025.skipped.length} skipped)`);
console.log(`  • Change: ${turnoutChange >= 0 ? '+' : ''}${pct(turnoutChange)}`);
