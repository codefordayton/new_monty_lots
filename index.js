require('dotenv').config();
const Koop = require('@koopjs/koop-core');
const provider = require('@koopjs/provider-file-geojson');
const path = require('path');
const fs = require('fs');
const output = require('koop-output-geojson');
const geojsonValidation = require('geojson-validation');
const S3Sync = require('./lib/s3-sync');

// Environment configuration
const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || './provider-data';
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
const NODE_ENV = process.env.NODE_ENV || 'development';

const koop = new Koop({ logLevel: LOG_LEVEL });

// const auth = require('@koopjs/auth-direct-file')(
//   'pass-in-your-secret',
//   `${__dirname}/user-store.json`
// );

// koop.register(auth);
koop.register(output);
koop.register(provider, { dataDir: DATA_DIR });

// Configure S3 sync for DigitalOcean Spaces (or other S3-compatible storage)
const s3Sync = new S3Sync({
  enabled: process.env.S3_ENABLED === 'true',
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  prefix: process.env.S3_PREFIX || '',
  localDir: DATA_DIR,
  autoSync: process.env.S3_AUTO_SYNC !== 'false',
  syncInterval: parseInt(process.env.S3_SYNC_INTERVAL || '0', 10),
});

// Serve static files
koop.server.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

koop.server.use('/static', require('express').static(path.join(__dirname, 'static')));
koop.server.use('/config', require('express').static(path.join(__dirname, 'config')));

// Service catalog endpoint with GeoJSON validation
koop.server.get('/catalog', (req, res) => {
  const fs = require('fs');
  const dataDir = path.join(__dirname, DATA_DIR);

  fs.readdir(dataDir, (err, files) => {
    if (err) {
      console.error('Error reading data directory:', err);
      return res.status(500).json({ error: 'Unable to read data directory' });
    }

    const geojsonFiles = [];
    const validationErrors = [];

    files
      .filter(file => file.endsWith('.geojson'))
      .forEach(file => {
        const layerId = path.basename(file, '.geojson');
        const filePath = path.join(dataDir, file);

        try {
          // Read and parse GeoJSON file
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const geojson = JSON.parse(fileContent);

          // Validate GeoJSON structure
          const isValid = geojsonValidation.valid(geojson);

          if (isValid) {
            geojsonFiles.push({
              id: layerId,
              name: layerId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              type: 'FeatureServer',
              url: `/file-geojson/rest/services/${layerId}/FeatureServer`,
              queryUrl: `/file-geojson/rest/services/${layerId}/FeatureServer/0/query`,
            });
          } else {
            const errors = geojsonValidation.isFeatureCollection(geojson) ||
              geojsonValidation.isFeature(geojson) ||
              geojsonValidation.isGeometryObject(geojson) || ['Invalid GeoJSON structure'];

            console.warn(`⚠️  Skipping invalid GeoJSON file: ${file}`, errors);
            validationErrors.push({
              file: file,
              errors: Array.isArray(errors) ? errors : [errors],
            });
          }
        } catch (error) {
          console.error(`⚠️  Error validating ${file}:`, error.message);
          validationErrors.push({
            file: file,
            errors: [error.message],
          });
        }
      });

    const response = {
      services: geojsonFiles,
      count: geojsonFiles.length,
    };

    // Include validation errors in response if any (for debugging)
    if (validationErrors.length > 0) {
      response.validationErrors = validationErrors;
      console.warn(`Found ${validationErrors.length} invalid GeoJSON file(s)`);
    }

    res.json(response);
  });
});

// Health check endpoint for monitoring
koop.server.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Manual S3 sync endpoint
koop.server.post('/api/sync', async (req, res) => {
  if (!s3Sync.enabled) {
    return res.status(400).json({
      success: false,
      message: 'S3 sync is not enabled. Set S3_ENABLED=true in environment variables.',
    });
  }

  try {
    const result = await s3Sync.sync();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// S3 sync status endpoint
koop.server.get('/api/sync/status', (req, res) => {
  res.json({
    enabled: s3Sync.enabled,
    bucket: s3Sync.bucket,
    endpoint: s3Sync.endpoint,
    autoSync: s3Sync.autoSync,
    syncInterval: s3Sync.syncInterval,
  });
});

// Style configuration cache
const styleConfigCache = {};
let mainStyleConfig = null;

// Load and cache style configurations
function loadStyleConfig(configPath) {
  try {
    const fullPath = path.resolve(__dirname, configPath);
    const configData = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.warn(`Failed to load style config from ${configPath}:`, error.message);
    return null;
  }
}

// Load main styles configuration
function loadMainStyleConfig() {
  try {
    mainStyleConfig = loadStyleConfig('./config/styles.json');
    if (mainStyleConfig) {
      console.log('✓ Main style configuration loaded');

      // Pre-load layer configurations
      if (mainStyleConfig.layers) {
        Object.entries(mainStyleConfig.layers).forEach(([layerId, layerInfo]) => {
          if (layerInfo.enabled && layerInfo.configFile) {
            const layerConfig = loadStyleConfig(`./config/${layerInfo.configFile}`);
            if (layerConfig) {
              styleConfigCache[layerId] = layerConfig;
              console.log(`✓ Loaded style config for layer: ${layerId}`);
            }
          }
        });
      }
    }
  } catch (error) {
    console.warn('Failed to load main style configuration:', error.message);
  }
}

// Style configuration API endpoints
koop.server.get('/api/styles/config', (req, res) => {
  if (!mainStyleConfig) {
    return res.status(500).json({ error: 'Style configuration not loaded' });
  }
  res.json(mainStyleConfig);
});

koop.server.get('/api/styles/config/:layerId', (req, res) => {
  const layerId = req.params.layerId;

  // Check cache first
  if (styleConfigCache[layerId]) {
    return res.json(styleConfigCache[layerId]);
  }

  // Try to load from main config
  if (mainStyleConfig && mainStyleConfig.layers && mainStyleConfig.layers[layerId]) {
    const layerInfo = mainStyleConfig.layers[layerId];
    if (layerInfo.configFile) {
      const layerConfig = loadStyleConfig(`./config/${layerInfo.configFile}`);
      if (layerConfig) {
        styleConfigCache[layerId] = layerConfig; // Cache it
        return res.json(layerConfig);
      }
    }
  }

  // Fallback: return default configuration
  res.json({
    name: layerId,
    defaultStyle: {
      color: '#666666',
      fillColor: '#cccccc',
      fillOpacity: 0.7,
      radius: 6,
      weight: 2,
    },
    styleRules: [],
  });
});

// Election data API endpoints
koop.server.use('/data/elections', require('express').static(path.join(__dirname, 'data/elections')));

// List all available election years
koop.server.get('/api/elections', (req, res) => {
  const electionsDir = path.join(__dirname, 'data/elections');

  fs.readdir(electionsDir, (err, files) => {
    if (err) {
      console.error('Error reading elections directory:', err);
      return res.status(500).json({ error: 'Unable to read elections directory' });
    }

    const years = files
      .filter(file => {
        const filePath = path.join(electionsDir, file);
        return fs.statSync(filePath).isDirectory();
      })
      .sort()
      .reverse(); // Most recent first

    res.json({
      years: years,
      count: years.length,
    });
  });
});

// Get metadata for a specific election year
koop.server.get('/api/elections/:year', (req, res) => {
  const year = req.params.year;
  const metadataPath = path.join(__dirname, `data/elections/${year}/metadata.json`);

  fs.readFile(metadataPath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: `Election data for year ${year} not found` });
      }
      console.error(`Error reading metadata for ${year}:`, err);
      return res.status(500).json({ error: 'Unable to read election metadata' });
    }

    try {
      const metadata = JSON.parse(data);
      res.json(metadata);
    } catch (parseError) {
      console.error(`Error parsing metadata for ${year}:`, parseError);
      res.status(500).json({ error: 'Invalid metadata format' });
    }
  });
});

// Get statistics for a specific election year
koop.server.get('/api/elections/:year/statistics', (req, res) => {
  const year = req.params.year;
  const statsPath = path.join(__dirname, `data/elections/${year}/statistics.json`);

  fs.readFile(statsPath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: `Statistics for year ${year} not found` });
      }
      console.error(`Error reading statistics for ${year}:`, err);
      return res.status(500).json({ error: 'Unable to read election statistics' });
    }

    try {
      const statistics = JSON.parse(data);
      res.json(statistics);
    } catch (parseError) {
      console.error(`Error parsing statistics for ${year}:`, parseError);
      res.status(500).json({ error: 'Invalid statistics format' });
    }
  });
});

// Get results for a specific race
koop.server.get('/api/elections/:year/races/:raceId', (req, res) => {
  const { year, raceId } = req.params;
  const racePath = path.join(__dirname, `data/elections/${year}/${raceId}.json`);

  fs.readFile(racePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: `Race ${raceId} not found for year ${year}` });
      }
      console.error(`Error reading race ${raceId} for ${year}:`, err);
      return res.status(500).json({ error: 'Unable to read race data' });
    }

    try {
      const raceData = JSON.parse(data);
      res.json(raceData);
    } catch (parseError) {
      console.error(`Error parsing race ${raceId} for ${year}:`, parseError);
      res.status(500).json({ error: 'Invalid race data format' });
    }
  });
});

// Initialize style configuration on startup
loadMainStyleConfig();

// Initialize S3 sync
async function initializeServer() {
  // Sync from S3 on startup if enabled and autoSync is true
  if (s3Sync.enabled && s3Sync.autoSync) {
    console.log('🚀 Initializing S3 sync on startup...');
    try {
      await s3Sync.sync();
    } catch (error) {
      console.error('⚠️  Initial S3 sync failed:', error.message);
      console.error('Server will continue with existing local files');
    }
  }

  // Start periodic sync if configured
  s3Sync.startPeriodicSync();

  // Start server
  koop.server.listen(PORT, () => {
    console.log(`\n✓ Server listening on port ${PORT}`);
    console.log(`  → Web interface: http://localhost:${PORT}`);
    console.log(`  → Catalog API: http://localhost:${PORT}/catalog`);
    if (s3Sync.enabled) {
      console.log(`  → S3 Sync status: http://localhost:${PORT}/api/sync/status`);
      console.log(`  → Manual sync: POST http://localhost:${PORT}/api/sync`);
    }
  });
}

// Start the server
initializeServer().catch(error => {
  console.error('Failed to initialize server:', error);
  process.exit(1);
});
