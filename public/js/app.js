
const map = L.map('map').setView([39.7589, -84.1916], 10);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Global variables for search functionality
let allLayerData = {}; // Store all loaded layer data
let layerGroups = {}; // Store layer groups for filtering
let originalLayerGroups = {}; // Store original layer groups for reset
let layerStates = {}; // Track loading state of each layer
let layerFeatureCounts = {}; // Store feature counts for each layer
let layerGeometryTypes = {}; // Store geometry types for each layer
let layerBounds = {}; // Store geographic bounds for each layer
let styleConfigs = {}; // Cache for layer style configurations

// Style resolution system
class StyleResolver {
	constructor(layerConfig) {
		this.layerConfig = layerConfig;
		this.defaultStyle = layerConfig.defaultStyle || {
			color: '#666666',
			fillColor: '#cccccc',
			fillOpacity: 0.7,
			radius: 6,
			weight: 2
		};
		this.styleCache = new Map();
	}

	// Get style for a feature based on its properties
	getStyle(properties) {
		if (!this.layerConfig.styleRules) {
			return this.defaultStyle;
		}

		// Find the first enabled rule that can be applied
		for (const rule of this.layerConfig.styleRules) {
			if (!rule.enabled) continue;

			if (rule.type === 'categorical') {
				const value = properties[rule.property];
				if (value !== undefined && rule.mappings && rule.mappings[value]) {
					return { ...this.defaultStyle, ...rule.mappings[value] };
				}
			} else if (rule.type === 'numeric') {
				const value = parseFloat(properties[rule.property]);
				if (!isNaN(value) && rule.ranges) {
					for (const range of rule.ranges) {
						const minCheck = range.min === undefined || value >= range.min;
						const maxCheck = range.max === undefined || value <= range.max;
						if (minCheck && maxCheck) {
							return { ...this.defaultStyle, ...range.style };
						}
					}
				}
			}
		}

		return this.defaultStyle;
	}

	// Create appropriate marker type (awesome-marker or circle marker)
	createMarker(properties, latlng) {
		const style = this.getStyle(properties);

		// Check if we should use awesome-markers
		if (style.awesomeMarker && window.L && L.AwesomeMarkers) {
			const awesomeOptions = {
				icon: style.awesomeMarker.icon,
				markerColor: style.awesomeMarker.markerColor,
				iconColor: style.awesomeMarker.iconColor || 'white',
				spin: style.awesomeMarker.spin || false,
				extraClasses: style.awesomeMarker.extraClasses || ''
			};

			const awesomeIcon = L.AwesomeMarkers.icon(awesomeOptions);
			return L.marker(latlng, { icon: awesomeIcon });
		}

		// Fallback to circle marker with regular styling
		return L.circleMarker(latlng, style);
	}

	// Get legend data for enabled rules
	getLegendData() {
		if (!this.layerConfig.styleRules) return null;

		const legends = [];
		for (const rule of this.layerConfig.styleRules) {
			if (!rule.enabled || !rule.showInLegend) continue;

			const legendRule = {
				id: rule.id,
				name: rule.name,
				description: rule.description,
				items: []
			};

			if (rule.type === 'categorical' && rule.mappings) {
				for (const [value, style] of Object.entries(rule.mappings)) {
					legendRule.items.push({
						value,
						style: { ...this.defaultStyle, ...style },
						description: style.description || value
					});
				}
			} else if (rule.type === 'numeric' && rule.ranges) {
				for (const range of rule.ranges) {
					legendRule.items.push({
						range: { min: range.min, max: range.max },
						style: { ...this.defaultStyle, ...range.style },
						description: range.description
					});
				}
			}

			if (legendRule.items.length > 0) {
				legends.push(legendRule);
			}
		}

		return legends;
	}
}

// Load style configuration for a layer
async function loadStyleConfig(layerId) {
	if (styleConfigs[layerId]) {
		return styleConfigs[layerId];
	}

	try {
		const response = await fetch(`/api/styles/config/${layerId}`);
		const config = await response.json();
		styleConfigs[layerId] = config;
		console.log(`✓ Loaded style config for ${layerId}`);
		return config;
	} catch (error) {
		console.warn(`Failed to load style config for ${layerId}:`, error);
		// Return fallback configuration
		return {
			name: layerId,
			defaultStyle: {
				color: '#666666',
				fillColor: '#cccccc',
				fillOpacity: 0.7,
				radius: 6,
				weight: 2
			},
			styleRules: []
		};
	}
}

// Function to get feature count for a layer without loading it
function getLayerFeatureCount(layerId) {
	return fetch(`/file-geojson/rest/services/${layerId}/FeatureServer/0/query?f=json&where=1=1&returnCountOnly=true`)
		.then(response => response.json())
		.then(data => {
			const count = data.count || 0;
			layerFeatureCounts[layerId] = count;
			return count;
		})
		.catch(error => {
			console.error(`Error getting feature count for ${layerId}:`, error);
			return 0;
		});
}

// Function to detect geometry type from GeoJSON data
function detectGeometryType(data) {
	if (!data || !data.features || data.features.length === 0) {
		return 'Unknown';
	}

	// Get geometry type from first feature
	const firstFeature = data.features[0];
	if (firstFeature && firstFeature.geometry && firstFeature.geometry.type) {
		return firstFeature.geometry.type;
	}

	return 'Unknown';
}

// Function to update global statistics in the sidebar
function updateGlobalStatistics() {
	// Count total loaded layers
	const loadedLayers = Object.keys(layerStates).filter(layerId => layerStates[layerId] === 'loaded');

	// Calculate total features across all loaded layers
	let totalFeatures = 0;
	loadedLayers.forEach(layerId => {
		if (layerFeatureCounts[layerId]) {
			totalFeatures += layerFeatureCounts[layerId];
		}
	});

	// Update the statistics section
	const statsContent = document.getElementById('stats-content');
	if (statsContent) {
		statsContent.innerHTML = `
			<p><strong>Total Layers:</strong> <span id="layer-count">${document.querySelectorAll('.layer-item').length}</span></p>
			<p><strong>Loaded Layers:</strong> <span id="loaded-count">${loadedLayers.length}</span></p>
			<p><strong>Total Features:</strong> <span id="total-features">${totalFeatures.toLocaleString()}</span></p>
			<p><strong>Server Status:</strong> <span id="server-status" style="color: #28a745;">Connected</span></p>
		`;
	}
}

// Function to load a layer and add it to the map
async function loadLayer(layerId) {
	// Update loading state
	updateLayerState(layerId, 'loading');

	try {
		// Load style configuration first
		const styleConfig = await loadStyleConfig(layerId);
		const styleResolver = new StyleResolver(styleConfig);

		// Load layer data
		const response = await fetch(`/file-geojson/rest/services/${layerId}/FeatureServer/0/query?f=geojson&where=1=1&outFields=*`);
		const data = await response.json();

		// Store the original data for searching
		allLayerData[layerId] = data;

		// Detect and store geometry type
		const geometryType = detectGeometryType(data);
		layerGeometryTypes[layerId] = geometryType;

 	// Calculate and store bounds for this layer
		if (data.features && data.features.length > 0) {
			const tempLayer = L.geoJSON(data);
			layerBounds[layerId] = tempLayer.getBounds();
		}
		const featureCount = data.features.length;

		// Use clustering for large datasets (>1000 features)
		const useClustering = featureCount > 1000;

		if (useClustering) {
			console.log(`Using clustering for ${layerId} (${featureCount} features) with dynamic styling`);

			// Create marker cluster group
			const clusterGroup = L.markerClusterGroup({
				maxClusterRadius: 50,
				disableClusteringAtZoom: 18,
				spiderfyOnMaxZoom: true,
				showCoverageOnHover: true,
				zoomToBoundsOnClick: true
			});

			// Add features to cluster group with dynamic styling
			const geoJsonLayer = L.geoJSON(data, {
				pointToLayer: function(feature, latlng) {
					const style = styleResolver.getStyle(feature.properties);
					return styleResolver.createMarker(feature.properties, latlng);
				},
				style: createStyleFunction(styleResolver),
					onEachFeature: function(feature, layer) {
						const props = feature.properties;
						const popupContent = createPopupContent(layerId, props, feature.geometry);
						layer.bindPopup(popupContent);

						// Store reference to feature for searching
						layer.feature = feature;

						// Add to cluster group for points, directly to map for polygons/lines
						if (feature.geometry.type === 'Point') {
							clusterGroup.addLayer(layer);
						} else {
							layer.addTo(map);
						}
					}
				});

				// Store layer groups for filtering
				layerGroups[layerId] = clusterGroup;
				originalLayerGroups[layerId] = clusterGroup;

				// Add cluster group to map
				map.addLayer(clusterGroup);

				// Update state to loaded
				updateLayerState(layerId, 'loaded');

				// Update global statistics
				updateGlobalStatistics();

				// Add to legend
				addLayerToLegend(layerId, styleResolver);

			} else {
				console.log(`Loading ${layerId} without clustering (${featureCount} features) with dynamic styling`);

				// Use regular loading for smaller datasets with dynamic styling
				const geoJsonLayer = L.geoJSON(data, {
					pointToLayer: function(feature, latlng) {
						const style = styleResolver.getStyle(feature.properties);
						return styleResolver.createMarker(feature.properties, latlng);
					},
					style: createStyleFunction(styleResolver),
					onEachFeature: function(feature, layer) {
						const props = feature.properties;
						const popupContent = createPopupContent(layerId, props, feature.geometry);
						layer.bindPopup(popupContent);

						// Store reference to feature for searching
						layer.feature = feature;
					}
				}).addTo(map);

				// Store layer groups for filtering
				layerGroups[layerId] = geoJsonLayer;
				originalLayerGroups[layerId] = geoJsonLayer;

				// Update state to loaded
				updateLayerState(layerId, 'loaded');

				// Update global statistics
				updateGlobalStatistics();

				// Add to legend
				addLayerToLegend(layerId, styleResolver);
			}

			return data;

	} catch (error) {
		console.error(`Error loading ${layerId} data:`, error);
		updateLayerState(layerId, 'error');
		throw error;
	}
}

// Function to unload a layer
function unloadLayer(layerId) {
	const layerGroup = layerGroups[layerId];
	if (layerGroup) {
		map.removeLayer(layerGroup);
		delete layerGroups[layerId];
		delete originalLayerGroups[layerId];
		delete allLayerData[layerId];
	}

	// Remove from legend
	removeLayerFromLegend(layerId);

	updateLayerState(layerId, 'unloaded');

	// Update global statistics
	updateGlobalStatistics();
}

// Function to update layer state and UI
function updateLayerState(layerId, state) {
	layerStates[layerId] = state;
	const layerItem = document.querySelector(`[data-layer-id="${layerId}"]`);
	if (!layerItem) return;

	const statusElement = layerItem.querySelector('.layer-status');
	const loadButton = layerItem.querySelector('.load-button');
	const featureCountElement = layerItem.querySelector('.feature-count');

	// Remove all state classes
	layerItem.classList.remove('loaded', 'loading', 'error');

	switch (state) {
		case 'loading':
			layerItem.classList.add('loading');
			statusElement.innerHTML = '<span class="loading-spinner"></span>Loading...';
			statusElement.style.color = '#007bff';
			loadButton.textContent = 'Loading...';
			loadButton.disabled = true;
			break;
		case 'loaded':
			layerItem.classList.add('loaded');
			const count = layerFeatureCounts[layerId] || 0;
			const geometryType = layerGeometryTypes[layerId] || 'Unknown';
			statusElement.textContent = `✓ Loaded (${count.toLocaleString()} features)`;
			statusElement.style.color = '#28a745';
			loadButton.textContent = 'Unload';
			loadButton.className = 'load-button unload-button';
			loadButton.disabled = false;
			if (featureCountElement) {
				featureCountElement.textContent = `${count.toLocaleString()} features • ${geometryType}`;
			}
			break;
		case 'error':
			layerItem.classList.add('error');
			statusElement.textContent = '✗ Error loading';
			statusElement.style.color = '#dc3545';
			loadButton.textContent = 'Retry';
			loadButton.className = 'load-button';
			loadButton.disabled = false;
			break;
		case 'unloaded':
		default:
			statusElement.textContent = 'Not loaded';
			statusElement.style.color = '#6c757d';
			loadButton.textContent = 'Load';
			loadButton.className = 'load-button';
			loadButton.disabled = false;
			break;
	}
}

// URL parameter functions
function updateURL(searchTerm) {
	const params = new URLSearchParams();
	if (searchTerm) params.set('search', searchTerm);

	const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
	window.history.pushState({}, '', newURL);
}

function loadFromURL() {
	const params = new URLSearchParams(window.location.search);
	const searchTerm = params.get('search') || '';

	// Update search field
	document.getElementById('search-input').value = searchTerm;

	// Apply search if term is set
	if (searchTerm) {
		searchFeatures(searchTerm);
	}
}

// Search function - simplified for address and parcel ID only
function searchFeatures(searchTerm) {
	let totalResults = 0;

	// If no search term, show all features
	if (!searchTerm) {
		clearAllFilters();
		return;
	}

	Object.keys(allLayerData).forEach(layerId => {
		const data = allLayerData[layerId];
		const filteredFeatures = data.features.filter(feature => {
			const props = feature.properties;

			// Search only address and parcel ID fields
			const searchLower = searchTerm.toLowerCase();
			const searchableText = [
				props.PARLOC || props.location || '',    // Address field
				props.TAXPINNO || props.parcel || ''     // Parcel ID field
			].join(' ').toLowerCase();

			return searchableText.includes(searchLower);
		});

		totalResults += filteredFeatures.length;

		// Update the layer on the map
		updateLayerWithFilteredFeatures(layerId, filteredFeatures);
	});

	// Update search count
	updateSearchCount(totalResults, searchTerm);

	// Update URL for shareability
	updateURL(searchTerm);
}

function updateLayerWithFilteredFeatures(layerId, filteredFeatures) {
	// Remove existing layer
	if (layerGroups[layerId]) {
		map.removeLayer(layerGroups[layerId]);
	}

	// Create new layer with filtered features
	const filteredData = {
		type: "FeatureCollection",
		features: filteredFeatures
	};

	const style = getStyleForLayer(layerId);
	const featureCount = filteredFeatures.length;
	const useClustering = featureCount > 1000;

	if (useClustering) {
		// Create new cluster group for filtered data
		const clusterGroup = L.markerClusterGroup({
			maxClusterRadius: 50,
			disableClusteringAtZoom: 18,
			spiderfyOnMaxZoom: true,
			showCoverageOnHover: true,
			zoomToBoundsOnClick: true
		});

		L.geoJSON(filteredData, {
			pointToLayer: function(feature, latlng) {
				return L.marker(latlng);
			},
			style: style,
			onEachFeature: function(feature, layer) {
				const props = feature.properties;
				const popupContent = createPopupContent(layerId, props, feature.geometry);
				layer.bindPopup(popupContent);
				layer.feature = feature;

				if (feature.geometry.type === 'Point') {
					clusterGroup.addLayer(layer);
				} else {
					layer.addTo(map);
				}
			}
		});

		layerGroups[layerId] = clusterGroup;
		map.addLayer(clusterGroup);

	} else {
		// Create regular layer for smaller filtered datasets
		const geoJsonLayer = L.geoJSON(filteredData, {
			pointToLayer: function(feature, latlng) {
				return L.marker(latlng);
			},
			style: style,
			onEachFeature: function(feature, layer) {
				const props = feature.properties;
				const popupContent = createPopupContent(layerId, props, feature.geometry);
				layer.bindPopup(popupContent);
				layer.feature = feature;
			}
		}).addTo(map);

		layerGroups[layerId] = geoJsonLayer;
	}
}

function updateSearchCount(count, searchTerm) {
	const searchCountElement = document.getElementById('search-count');
	if (count === 0 && searchTerm) {
		searchCountElement.textContent = 'No results found';
		searchCountElement.style.color = '#dc3545';
	} else if (searchTerm) {
		const total = Object.values(allLayerData).reduce((sum, data) => sum + data.features.length, 0);
		searchCountElement.textContent = `Found ${count.toLocaleString()} of ${total.toLocaleString()} properties`;
		searchCountElement.style.color = '#28a745';
	} else {
		const total = Object.values(allLayerData).reduce((sum, data) => sum + data.features.length, 0);
		searchCountElement.textContent = total > 0 ? `Search ${total.toLocaleString()} properties` : 'Search all properties';
		searchCountElement.style.color = '#6c757d';
	}
}

function clearAllFilters() {
	// Reset search field
	document.getElementById('search-input').value = '';

	// Restore original layers
	Object.keys(originalLayerGroups).forEach(layerId => {
		if (layerGroups[layerId]) {
			map.removeLayer(layerGroups[layerId]);
		}
		layerGroups[layerId] = originalLayerGroups[layerId];
		map.addLayer(originalLayerGroups[layerId]);
	});

	// Update search count
	const total = Object.values(allLayerData).reduce((sum, data) => sum + data.features.length, 0);
	const searchCountElement = document.getElementById('search-count');
	searchCountElement.textContent = total > 0 ? `Search ${total.toLocaleString()} properties` : 'Search all properties';
	searchCountElement.style.color = '#6c757d';

	// Clear URL parameters
	window.history.pushState({}, '', window.location.pathname);
}

// Function to get style based on layer type (legacy fallback)
function getStyleForLayer(layerId) {
	const styles = {
		polygon: { color: 'blue', fillColor: '#30f', fillOpacity: 0.3, weight: 2 },
		line: { color: 'red', weight: 3 },
		square: { color: 'green', fillColor: '#0f0', fillOpacity: 0.4, weight: 2 }
	};
	return styles[layerId] || { color: 'purple', weight: 2 };
}

// Create a style function that uses StyleResolver for a feature
function createStyleFunction(styleResolver) {
	return function(feature) {
		return styleResolver.getStyle(feature.properties);
	};
}

// Legend management
let activeLegends = {};

function toggleLegend() {
	const legend = document.getElementById('legend');
	legend.classList.toggle('collapsed');
}

function updateLegend() {
	const legendElement = document.getElementById('legend');
	const contentElement = document.getElementById('legend-content');

	// Clear existing content
	contentElement.innerHTML = '';

	// Check if we have any active legends
	const legendKeys = Object.keys(activeLegends);
	if (legendKeys.length === 0) {
		legendElement.style.display = 'none';
		return;
	}

	// Show legend
	legendElement.style.display = 'block';

	// Generate legend content for each loaded layer
	legendKeys.forEach(layerId => {
		const legends = activeLegends[layerId];
		if (!legends || legends.length === 0) return;

		legends.forEach(legend => {
			const ruleDiv = document.createElement('div');
			ruleDiv.className = 'legend-rule';

			const titleDiv = document.createElement('div');
			titleDiv.className = 'legend-rule-title';
			titleDiv.textContent = legend.name;
			ruleDiv.appendChild(titleDiv);

			legend.items.forEach(item => {
				const itemDiv = document.createElement('div');
				itemDiv.className = 'legend-item';

				const iconDiv = document.createElement('div');
				iconDiv.className = 'legend-color';

				// Check if we should display an awesome-marker icon
				if (item.style.awesomeMarker && item.style.awesomeMarker.icon) {
					iconDiv.innerHTML = `<i class="fas fa-${item.style.awesomeMarker.icon}" style="color: ${item.style.awesomeMarker.iconColor || 'white'}; background-color: ${getAwesomeMarkerColor(item.style.awesomeMarker.markerColor)}; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border-radius: 3px; font-size: 10px;"></i>`;
				} else {
					// Fallback to colored circle
					iconDiv.style.backgroundColor = item.style.fillColor || item.style.color;
					iconDiv.style.borderColor = item.style.color;
				}

				const textDiv = document.createElement('div');
				textDiv.className = 'legend-text';
				textDiv.textContent = item.description;

				itemDiv.appendChild(iconDiv);
				itemDiv.appendChild(textDiv);
				ruleDiv.appendChild(itemDiv);
			});

			contentElement.appendChild(ruleDiv);
		});
	});
}

function addLayerToLegend(layerId, styleResolver) {
	const legendData = styleResolver.getLegendData();
	if (legendData && legendData.length > 0) {
		activeLegends[layerId] = legendData;
	}
	updateLegend();
}

function removeLayerFromLegend(layerId) {
	delete activeLegends[layerId];
	updateLegend();
}

// Helper function to convert awesome-markers color names to hex colors
function getAwesomeMarkerColor(colorName) {
	const colorMap = {
		'red': '#d63031',
		'darkred': '#74b9ff',
		'lightred': '#ff7675',
		'orange': '#e17055',
		'beige': '#f39c12',
		'green': '#00b894',
		'darkgreen': '#00a085',
		'lightgreen': '#55efc4',
		'blue': '#0984e3',
		'darkblue': '#2d3436',
		'lightblue': '#74b9ff',
		'purple': '#a29bfe',
		'darkpurple': '#6c5ce7',
		'pink': '#fd79a8',
		'cadetblue': '#81ecec',
		'white': '#ddd',
		'gray': '#636e72',
		'lightgray': '#b2bec3',
		'black': '#2d3436'
	};
	return colorMap[colorName] || '#666';
}

// Function to create popup content
function createPopupContent(layerId, properties, geometry) {
	let content = `<b>${layerId.charAt(0).toUpperCase() + layerId.slice(1)}</b><br/>`;

	// Add properties if they exist
	if (properties && Object.keys(properties).length > 0) {
		for (const [key, value] of Object.entries(properties)) {
			if (value !== null && value !== undefined) {
				content += `${key}: ${value}<br/>`;
			}
		}
	}

	// Add geometry info
	if (geometry.type === 'Point') {
		content += `Coordinates: ${geometry.coordinates.join(', ')}`;
	}

	return content;
}

// Function to update sidebar with layer information and manual loading controls
function updateSidebar(catalog) {
	const layerList = document.getElementById('layer-list');

	// Update global statistics initially
	updateGlobalStatistics();

	// Clear loading message
	layerList.innerHTML = '';

	// Add layer items with manual loading controls
	catalog.services.forEach(service => {
		const listItem = document.createElement('li');
		listItem.className = 'layer-item';
		listItem.setAttribute('data-layer-id', service.id);

		listItem.innerHTML = `
			<div class="layer-header">
				<input type="checkbox" id="visibility-${service.id}" class="layer-toggle" style="display:none;">
				<div class="layer-name">${service.name}</div>
			</div>
			<div class="layer-id">${service.id}</div>
			<div class="layer-info">
				<span class="feature-count">Getting count...</span>
			</div>
			<div class="layer-controls">
				<button class="load-button" data-layer-id="${service.id}">Load</button>
				<input type="checkbox" id="toggle-${service.id}" class="layer-toggle" style="display:none;" title="Show/Hide layer">
			</div>
			<div class="layer-status" style="font-size: 0.8em; color: #6c757d; margin-top: 4px;">Not loaded</div>
		`;

		layerList.appendChild(listItem);

		// Get feature count for this layer
		getLayerFeatureCount(service.id).then(count => {
			const featureCountElement = listItem.querySelector('.feature-count');
			const warningContainer = listItem.querySelector('.layer-info');

			if (count > 0) {
				featureCountElement.textContent = `${count.toLocaleString()} features`;
				featureCountElement.style.color = '#28a745';

				// Add warning for large datasets
				if (count > 5000) {
					const warning = document.createElement('div');
					warning.className = 'warning';
					warning.textContent = '⚠️ Large dataset - may take time to load';
					warningContainer.appendChild(warning);
				}
			} else {
				featureCountElement.textContent = 'No features found';
				featureCountElement.style.color = '#6c757d';
			}
		});
	});

	// Add event listeners for load/unload buttons and layer click-to-center
	layerList.addEventListener('click', function(e) {
		if (e.target.classList.contains('load-button')) {
			const layerId = e.target.getAttribute('data-layer-id');
			const currentState = layerStates[layerId] || 'unloaded';

			if (currentState === 'loaded') {
				unloadLayer(layerId);
			} else if (currentState === 'unloaded' || currentState === 'error') {
				loadLayer(layerId).then(() => {
					// Show visibility toggle after loading
					const visibilityToggle = document.querySelector(`#toggle-${layerId}`);
					if (visibilityToggle) {
						visibilityToggle.style.display = 'inline';
						visibilityToggle.checked = true;

						// Add visibility toggle event listener
						visibilityToggle.addEventListener('change', function() {
							toggleLayerVisibility(layerId, this.checked);
						});
					}
				}).catch(error => {
					console.error(`Failed to load layer ${layerId}:`, error);
				});
			}
		} else if (e.target.closest('.layer-item.loaded') &&
		           !e.target.classList.contains('load-button') &&
		           !e.target.classList.contains('layer-toggle')) {
			// Handle click-to-center for loaded layers
			const layerItem = e.target.closest('.layer-item');
			const layerId = layerItem.getAttribute('data-layer-id');

			// Center map on this layer if bounds are available
			if (layerBounds[layerId]) {
				map.fitBounds(layerBounds[layerId], {
					padding: [50, 50],
					maxZoom: 16,
					animate: true,
					duration: 0.5
				});
			}
		}
	});
}

// Layer visibility toggle function
function toggleLayerVisibility(layerId, isVisible) {
	const layerGroup = layerGroups[layerId];
	const layerItem = document.querySelector(`#toggle-${layerId}`).closest('.layer-item');
	const statusElement = layerItem.querySelector('.layer-status');

	if (layerGroup) {
		if (isVisible) {
			// Show layer
			map.addLayer(layerGroup);
			layerItem.classList.remove('hidden');
			statusElement.textContent = '✓ Visible';
			statusElement.style.color = '#28a745';
		} else {
			// Hide layer
			map.removeLayer(layerGroup);
			layerItem.classList.add('hidden');
			statusElement.textContent = '✗ Hidden';
			statusElement.style.color = '#6c757d';
		}
	} else {
		// Layer not loaded yet, update UI to show loading
		if (isVisible) {
			statusElement.textContent = '⏳ Loading...';
			statusElement.style.color = '#007bff';
		} else {
			statusElement.textContent = '✗ Hidden (not loaded)';
			statusElement.style.color = '#6c757d';
		}
		console.warn(`Layer ${layerId} not found in layerGroups. It may not be loaded yet.`);
	}
}

// Discover and load all available layers from service catalog
fetch('/catalog')
	.then(response => response.json())
	.then(catalog => {
		console.log('Service catalog:', catalog);

		// Update sidebar with layer information
		updateSidebar(catalog);

		// Layers are now loaded manually by user interaction
		console.log(`Found ${catalog.count} services available for manual loading`);

		// Display catalog info in console
		console.log(`Found ${catalog.count} services available`);

		// Load search parameters from URL after data is loaded
		setTimeout(() => {
			loadFromURL();
		}, 1000); // Wait for data to load
	})
	.catch(error => {
		console.error('Error loading service catalog:', error);

		// Update error status
		document.getElementById('server-status').textContent = 'Error';
		document.getElementById('server-status').style.color = '#dc3545';
		document.getElementById('layer-list').innerHTML = '<li>Failed to load layers</li>';

		// Fallback: try common layer names
		const fallbackLayers = ['point', 'polygon', 'line', 'square'];
		console.log('Using fallback layers:', fallbackLayers);
		fallbackLayers.forEach(layerId => {
			loadLayer(layerId);
		});
	});

function onMapClick(e) {
	// L.popup()
	// 	.setLatLng(e.latlng)
	// 	.setContent(`You clicked the map at ${e.latlng.toString()}`)
	//	.openOn(map);
}

map.on('click', onMapClick);

// Event listeners for search functionality
document.addEventListener('DOMContentLoaded', function() {
	const searchInput = document.getElementById('search-input');
	const clearButton = document.getElementById('clear-search');

	// Debounced search function
	let searchTimeout;
	function debouncedSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const searchTerm = searchInput.value.trim();
			searchFeatures(searchTerm);
		}, 300); // 300ms delay
	}

	// Add event listeners
	searchInput.addEventListener('input', debouncedSearch);
	clearButton.addEventListener('click', clearAllFilters);

	// Enter key support for search input
	searchInput.addEventListener('keypress', function(e) {
		if (e.key === 'Enter') {
			clearTimeout(searchTimeout);
			const searchTerm = searchInput.value.trim();
			searchFeatures(searchTerm);
		}
	});
});
