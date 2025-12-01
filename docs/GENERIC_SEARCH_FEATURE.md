# Generic Search Enhancement

This document describes the generic, data-driven search system implemented for issue #15.

## Overview

The search system now automatically adapts to **any GeoJSON dataset**, detecting field types and creating appropriate filters without requiring hardcoded field names.

## Key Features

### 1. **Automatic Field Analysis**

- Analyzes GeoJSON properties when layers are loaded
- Detects field types: text, numeric, boolean, categorical, date
- Identifies likely identifiers (IDs, codes)
- Calculates search priorities for fields

### 2. **Smart Field Type Detection**

The system automatically categorizes fields:

| Field Type      | Detection Logic                       | Example Fields              |
| --------------- | ------------------------------------- | --------------------------- |
| **Text**        | String values with many unique values | Address, Description, Notes |
| **Categorical** | Strings with ≤20 unique values        | Zone Type, Status, Category |
| **Numeric**     | All number values                     | Lot Size, Price, Year Built |
| **Boolean**     | True/false values                     | Is Active, Has Violations   |
| **Date**        | ISO date strings                      | Created Date, Modified Date |

### 3. **Basic Search (Enhanced)**

- **Generic field search**: No longer hardcoded to specific fields
- **Intelligent prioritization**: Address/name fields searched first
- **Match scoring**: Exact > starts-with > contains
- **Works with any GeoJSON**: Automatically finds searchable fields

### 4. **Advanced Search Panel**

Collapsible panel with field-specific filters:

#### Categorical Filters

- Multi-select dropdowns for fields with few unique values
- Example: Zone types, property status, agent types

#### Numeric Filters

- Min/max range inputs
- Example: Lot size (1000 - 5000), year built (1990 - 2020)

#### Boolean Filters

- Simple checkboxes
- Example: "Has Violations", "Is Active"

#### Text Filters

- Field-specific search boxes
- Example: Search only in "Owner Name" or "Description"

## Architecture

### New Files

#### `static/scripts/utils/fieldAnalyzer.js`

Core field analysis engine:

- `analyzeFields(geojsonData)` - Analyzes all fields in a dataset
- `getSearchableFields(metadata)` - Returns fields suitable for search
- `getFilterableFields(metadata)` - Groups fields by type for filtering
- `searchFeaturesInFields(features, term, fields, metadata)` - Generic search

#### `static/scripts/components/AdvancedSearch.js`

Advanced search UI component:

- Dynamic filter generation based on detected fields
- Categorical filters (multi-select)
- Numeric filters (range inputs)
- Boolean filters (checkboxes)
- Text filters (field-specific search)

### Modified Files

#### `static/scripts/components/SearchBar.js`

- Removed hardcoded field names (`PARLOC`, `TAXPINNO`)
- Added `analyzeLayerFields()` - Analyzes fields when layer loads
- Added `applyAdvancedFilters()` - Applies complex filter combinations
- Updated `searchFeatures()` - Uses generic field search

#### `static/scripts/services/LayerService.js`

- Calls `analyzeLayerFields()` when loading each layer
- Enables automatic field detection for all datasets

#### `index.html`

- Updated search placeholder to "Search all fields..."
- Added advanced search toggle button
- Added advanced search panel container

#### `static/styles/main.css`

- Styled advanced search panel
- Filter controls styling
- Responsive layout for filters

## Usage

### For Users

1. **Basic Search**: Type in the search box to search across all text fields
   - System automatically finds address, name, and other relevant fields
   - No need to know field names

2. **Advanced Search**: Click "Show Advanced Search"
   - See all available filters based on loaded data
   - Filter by categories, number ranges, booleans
   - Combine multiple filters

3. **Clear**: Click "Clear" button to reset all filters

### For Developers

#### Adding a New Dataset

Simply add a `.geojson` file to `provider-data/`. The system will:

1. Automatically analyze all fields
2. Detect field types
3. Create appropriate filters
4. Enable search without any code changes

Example:

```bash
# Add new GeoJSON
cp my-permits.geojson provider-data/

# Restart server
npm start

# System automatically:
# - Detects "Permit_Type" is categorical (dropdown filter)
# - Detects "Issue_Date" is a date
# - Detects "Permit_Number" is an identifier (searchable but low priority)
# - Detects "Value" is numeric (range filter)
```

#### Field Analysis Example

```javascript
// Automatic analysis result for a permits dataset:
{
  "Permit_Number": {
    "type": "text",
    "isIdentifier": true,
    "searchPriority": 3
  },
  "Permit_Type": {
    "type": "categorical",
    "categories": ["Residential", "Commercial", "Industrial"],
    "uniqueCount": 3,
    "searchPriority": 7
  },
  "Address": {
    "type": "text",
    "isIdentifier": false,
    "searchPriority": 10  // High priority!
  },
  "Value": {
    "type": "number",
    "min": 1000,
    "max": 500000,
    "avg": 45000
  }
}
```

## Benefits

### 1. **Dataset Agnostic**

- Works with property data, permits, businesses, infrastructure, etc.
- No code changes needed for new datasets

### 2. **User-Friendly**

- Users don't need to know field names
- Intuitive filter controls based on data types
- Clear visual feedback

### 3. **Maintainable**

- No hardcoded field mappings
- Self-documenting (shows available fields)
- Easy to extend with new filter types

### 4. **Performance**

- Field analysis done once per layer load
- Efficient filtering with early termination
- Smart prioritization reduces unnecessary checks

## Future Enhancements

Possible additions for future versions:

1. **Geographic Filters**
   - "Search within view" button
   - Draw polygon to filter features
   - Radius search from point

2. **Fuzzy Search**
   - Handle typos with Fuse.js or similar
   - Soundex/metaphone for name matching

3. **Search Suggestions**
   - Autocomplete from existing values
   - Popular searches
   - Recent searches history

4. **Saved Filters**
   - Save filter combinations
   - Share filter presets via URL
   - Named filter templates

5. **Export Filtered Results**
   - Download as GeoJSON
   - Export to CSV
   - Generate report

6. **Filter Statistics**
   - Show value distributions
   - Histogram for numeric fields
   - Category counts for categorical fields

## Testing

Tested with:

- ✅ Property data (housing.geojson)
- ✅ Registry data (registry.geojson)
- ✅ Various field types (text, categorical, numeric)
- ✅ Multiple simultaneous filters
- ✅ Basic + advanced search combination

## Performance Considerations

- Field analysis samples first 1000 features for performance
- Categorical threshold set to 20 unique values (configurable)
- Debounced filter inputs (500ms delay)
- Efficient feature filtering with early termination

## Accessibility

- All filter controls keyboard accessible
- Proper labels for screen readers
- Clear visual hierarchy
- Responsive design for mobile

## Browser Compatibility

Works with all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)
