/**
 * main.js
 * Main entry point for the application
 * Initializes the map, loads catalog, and sets up event listeners
 */

import { setMap } from './state/MapState.js';
import { fetchCatalog } from './services/CatalogService.js';
import { loadLayer } from './services/LayerService.js';
import { updateSidebar } from './components/LayerList.js';
import { initializeSearchBar, loadFromURL } from './components/SearchBar.js';
import { toggleLegend } from './components/Legend.js';
import { initializeSidebarToggle } from './components/SidebarToggle.js';
import { initializeAdvancedSearch } from './components/AdvancedSearch.js';
import { initializeElectionUI } from './components/ElectionUI.js';

// Initialize the Leaflet map
const map = L.map('map').setView([39.7589, -84.1916], 10);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Store map instance in state
setMap(map);

// Make toggleLegend available globally for onclick handler in HTML
window.toggleLegend = toggleLegend;

// Map click handler
function onMapClick(_e) {
  // Placeholder for future functionality
  // L.popup()
  //   .setLatLng(e.latlng)
  //   .setContent(`You clicked the map at ${e.latlng.toString()}`)
  //   .openOn(map);
}

map.on('click', onMapClick);

// Initialize the application
async function initializeApp() {
  try {
    // Fetch service catalog
    const catalog = await fetchCatalog();
    console.log('Service catalog:', catalog);

    // Update sidebar with layer information
    updateSidebar(catalog);

    console.log(`Found ${catalog.count} services available for manual loading`);

    // Initialize search bar after a brief delay to allow layers to load
    setTimeout(() => {
      loadFromURL();
    }, 1000);
  } catch (error) {
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
  }
}

// Initialize components on DOM ready
document.addEventListener('DOMContentLoaded', function () {
  initializeSearchBar();
  initializeSidebarToggle();
  initializeAdvancedSearch();
  initializeElectionUI();
});

// Start the application
initializeApp();
