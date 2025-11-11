const Koop = require('@koopjs/koop-core');
const provider = require('@koopjs/provider-file-geojson');
const path = require('path');
const fs = require('fs');
const koop = new Koop({ logLevel: 'debug' });
const output = require('koop-output-geojson');

// const auth = require('@koopjs/auth-direct-file')(
//   'pass-in-your-secret',
//   `${__dirname}/user-store.json`
// );

// koop.register(auth);
koop.register(output);
koop.register(provider, { dataDir: './provider-data' });

// Serve static files from the public directory
const express = require('express');
koop.server.use('/public', express.static(path.join(__dirname, 'public')));

// Serve index.html at the root
koop.server.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Service catalog endpoint
koop.server.get('/catalog', (req, res) => {
  const fs = require('fs');
  const dataDir = path.join(__dirname, 'provider-data');
  
  fs.readdir(dataDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read data directory' });
    }
    
    const geojsonFiles = files
      .filter(file => file.endsWith('.geojson'))
      .map(file => {
        const layerId = path.basename(file, '.geojson');
        return {
          id: layerId,
          name: layerId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'FeatureServer',
          url: `/file-geojson/rest/services/${layerId}/FeatureServer`,
          queryUrl: `/file-geojson/rest/services/${layerId}/FeatureServer/0/query`
        };
      });
    
    res.json({
      services: geojsonFiles,
      count: geojsonFiles.length
    });
  });
});

// Health check endpoint for monitoring
koop.server.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Style configuration cache
let styleConfigCache = {};
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
      weight: 2
    },
    styleRules: []
  });
});

// Initialize style configuration on startup
loadMainStyleConfig();

koop.server.listen(process.env.PORT || 8080);
