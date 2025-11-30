/**
 * fieldAnalyzer.js
 * Analyzes GeoJSON properties to determine field types and searchability
 * Works with any GeoJSON dataset, not tied to specific schemas
 */

/**
 * Field type enumeration
 */
export const FieldType = {
  TEXT: 'text',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  CATEGORICAL: 'categorical', // Text with few unique values
  GEOMETRY: 'geometry'
};

/**
 * Analyze all features in a GeoJSON dataset to determine field types
 * @param {Object} geojsonData - GeoJSON FeatureCollection
 * @param {number} categoricalThreshold - Max unique values to consider categorical (default: 20)
 * @returns {Object} Field metadata including types, sample values, and statistics
 */
export function analyzeFields(geojsonData, categoricalThreshold = 20) {
  if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
    return {};
  }

  const fieldStats = {};
  const sampleSize = Math.min(1000, geojsonData.features.length); // Sample first 1000 features
  const samples = geojsonData.features.slice(0, sampleSize);

  // Collect all field names and their values
  samples.forEach(feature => {
    const props = feature.properties || {};

    Object.keys(props).forEach(fieldName => {
      if (!fieldStats[fieldName]) {
        fieldStats[fieldName] = {
          name: fieldName,
          values: [],
          uniqueValues: new Set(),
          nullCount: 0,
          types: new Set()
        };
      }

      const value = props[fieldName];

      if (value === null || value === undefined || value === '') {
        fieldStats[fieldName].nullCount++;
      } else {
        fieldStats[fieldName].values.push(value);
        fieldStats[fieldName].uniqueValues.add(value);
        fieldStats[fieldName].types.add(typeof value);
      }
    });
  });

  // Determine field types and create metadata
  const fieldMetadata = {};

  Object.keys(fieldStats).forEach(fieldName => {
    const stats = fieldStats[fieldName];
    const uniqueCount = stats.uniqueValues.size;
    const totalCount = sampleSize;
    const nonNullCount = totalCount - stats.nullCount;

    // Skip fields that are entirely null
    if (nonNullCount === 0) {
      return;
    }

    const metadata = {
      name: fieldName,
      displayName: formatFieldName(fieldName),
      type: determineFieldType(stats, categoricalThreshold),
      uniqueCount: uniqueCount,
      totalCount: nonNullCount,
      nullCount: stats.nullCount,
      sampleValues: getSampleValues(stats.uniqueValues, 5),
      searchable: true,
      filterable: true
    };

    // Add type-specific metadata
    if (metadata.type === FieldType.NUMBER) {
      const numbers = stats.values.filter(v => typeof v === 'number');
      metadata.min = Math.min(...numbers);
      metadata.max = Math.max(...numbers);
      metadata.avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    } else if (metadata.type === FieldType.CATEGORICAL) {
      metadata.categories = Array.from(stats.uniqueValues).sort();
    } else if (metadata.type === FieldType.DATE) {
      const dates = stats.values.map(v => new Date(v)).filter(d => !isNaN(d));
      if (dates.length > 0) {
        metadata.minDate = new Date(Math.min(...dates));
        metadata.maxDate = new Date(Math.max(...dates));
      }
    }

    // Determine if field is likely an identifier (less useful for search)
    metadata.isIdentifier = isLikelyIdentifier(fieldName, uniqueCount, totalCount);

    // Determine search priority (higher = more important)
    metadata.searchPriority = calculateSearchPriority(fieldName, metadata);

    fieldMetadata[fieldName] = metadata;
  });

  return fieldMetadata;
}

/**
 * Determine the field type based on collected statistics
 */
function determineFieldType(stats, categoricalThreshold) {
  const types = stats.types;
  const uniqueCount = stats.uniqueValues.size;

  // All values are boolean
  if (types.size === 1 && types.has('boolean')) {
    return FieldType.BOOLEAN;
  }

  // All values are numbers
  if (types.size === 1 && types.has('number')) {
    return FieldType.NUMBER;
  }

  // Check if it's a date field
  if (types.size === 1 && types.has('string')) {
    const sampleValues = Array.from(stats.uniqueValues).slice(0, 10);
    const dateCount = sampleValues.filter(v => isValidDate(v)).length;

    if (dateCount / sampleValues.length > 0.8) {
      return FieldType.DATE;
    }

    // Check if it's categorical (few unique values)
    if (uniqueCount <= categoricalThreshold) {
      return FieldType.CATEGORICAL;
    }
  }

  // Default to text
  return FieldType.TEXT;
}

/**
 * Check if a value is a valid date string
 */
function isValidDate(value) {
  if (typeof value !== 'string') return false;

  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO format
    /^\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY
    /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
  ];

  const matchesPattern = datePatterns.some(pattern => pattern.test(value));
  if (!matchesPattern) return false;

  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Format field name for display (convert snake_case and camelCase to Title Case)
 */
function formatFieldName(fieldName) {
  return fieldName
    // Handle snake_case
    .replace(/_/g, ' ')
    // Handle camelCase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Handle ALL CAPS
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get sample values from a set
 */
function getSampleValues(uniqueValues, count = 5) {
  const values = Array.from(uniqueValues);
  return values.slice(0, count);
}

/**
 * Determine if a field is likely an identifier (ID, code, etc.)
 */
function isLikelyIdentifier(fieldName, uniqueCount, totalCount) {
  const lowerName = fieldName.toLowerCase();

  // Common identifier patterns
  const identifierPatterns = [
    'id', 'objectid', 'fid', 'gid', 'code', 'key', 'guid', 'uuid'
  ];

  const isIdPattern = identifierPatterns.some(pattern =>
    lowerName === pattern || lowerName.endsWith('_' + pattern) || lowerName.endsWith(pattern)
  );

  // High uniqueness ratio suggests identifier
  const uniquenessRatio = uniqueCount / totalCount;
  const isHighlyUnique = uniquenessRatio > 0.9;

  return isIdPattern || isHighlyUnique;
}

/**
 * Calculate search priority for a field (higher = more important)
 */
function calculateSearchPriority(fieldName, metadata) {
  let priority = 5; // Base priority

  const lowerName = fieldName.toLowerCase();

  // High priority fields (likely to be searched)
  const highPriorityPatterns = [
    'name', 'address', 'street', 'location', 'title', 'description'
  ];

  // Medium priority fields
  const mediumPriorityPatterns = [
    'city', 'state', 'zip', 'postal', 'owner', 'type', 'category'
  ];

  // Low priority fields (identifiers, codes)
  const lowPriorityPatterns = [
    'id', 'code', 'key', 'guid', 'uuid', 'objectid'
  ];

  if (highPriorityPatterns.some(p => lowerName.includes(p))) {
    priority = 10;
  } else if (mediumPriorityPatterns.some(p => lowerName.includes(p))) {
    priority = 7;
  } else if (lowPriorityPatterns.some(p => lowerName.includes(p))) {
    priority = 3;
  }

  // Boost text fields
  if (metadata.type === FieldType.TEXT) {
    priority += 2;
  }

  // Reduce priority for identifiers
  if (metadata.isIdentifier) {
    priority = Math.max(1, priority - 3);
  }

  return priority;
}

/**
 * Get searchable text fields sorted by priority
 */
export function getSearchableFields(fieldMetadata) {
  return Object.values(fieldMetadata)
    .filter(field =>
      field.searchable &&
      (field.type === FieldType.TEXT ||
       field.type === FieldType.CATEGORICAL ||
       field.isIdentifier)
    )
    .sort((a, b) => b.searchPriority - a.searchPriority);
}

/**
 * Get filterable fields grouped by type
 */
export function getFilterableFields(fieldMetadata) {
  const grouped = {
    categorical: [],
    numeric: [],
    boolean: [],
    date: [],
    text: []
  };

  Object.values(fieldMetadata).forEach(field => {
    if (!field.filterable) return;

    switch (field.type) {
      case FieldType.CATEGORICAL:
        grouped.categorical.push(field);
        break;
      case FieldType.NUMBER:
        grouped.numeric.push(field);
        break;
      case FieldType.BOOLEAN:
        grouped.boolean.push(field);
        break;
      case FieldType.DATE:
        grouped.date.push(field);
        break;
      case FieldType.TEXT:
        grouped.text.push(field);
        break;
    }
  });

  return grouped;
}

/**
 * Search features across specified fields
 * @param {Array} features - GeoJSON features to search
 * @param {string} searchTerm - Search term
 * @param {Array} fields - Array of field names to search (optional, searches all if not provided)
 * @param {Object} fieldMetadata - Field metadata for prioritization
 * @returns {Array} Filtered and scored features
 */
export function searchFeaturesInFields(features, searchTerm, fields = null, fieldMetadata = {}) {
  if (!searchTerm || !features) return features;

  const searchLower = searchTerm.toLowerCase();

  return features
    .map(feature => {
      const props = feature.properties || {};
      let matchScore = 0;
      let matchedFields = [];

      // Determine which fields to search
      const fieldsToSearch = fields || Object.keys(props);

      fieldsToSearch.forEach(fieldName => {
        const value = props[fieldName];
        if (value === null || value === undefined) return;

        const valueStr = String(value).toLowerCase();

        if (valueStr.includes(searchLower)) {
          // Calculate match score based on field priority and match quality
          const metadata = fieldMetadata[fieldName] || { searchPriority: 5 };
          let score = metadata.searchPriority || 5;

          // Boost exact matches
          if (valueStr === searchLower) {
            score *= 3;
          }
          // Boost starts-with matches
          else if (valueStr.startsWith(searchLower)) {
            score *= 2;
          }

          matchScore += score;
          matchedFields.push(fieldName);
        }
      });

      return {
        feature,
        matchScore,
        matchedFields
      };
    })
    .filter(result => result.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .map(result => result.feature);
}
