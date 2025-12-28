/**
 * AboutModal.js
 * Component for displaying project information, data access, and educational resources
 */

export class AboutModal {
  constructor() {
    this.modal = null;
    this.currentTab = 'about';
  }

  /**
   * Initialize the modal
   */
  initialize() {
    if (!this.modal) {
      this.createModal();
    }
  }

  /**
   * Create the modal DOM element
   */
  createModal() {
    const modal = document.createElement('div');
    modal.id = 'about-modal';
    modal.className = 'about-modal';
    modal.innerHTML = `
      <div class="about-modal-overlay"></div>
      <div class="about-modal-content">
        <div class="about-modal-header">
          <h2>📊 Montgomery County Election Data</h2>
          <button id="close-about-modal" class="close-button">&times;</button>
        </div>

        <div class="about-modal-tabs">
          <button class="tab-button active" data-tab="about">About</button>
          <button class="tab-button" data-tab="data">Data Access</button>
          <button class="tab-button" data-tab="learn">Learn</button>
          <button class="tab-button" data-tab="contribute">Contribute</button>
        </div>

        <div class="about-modal-body">
          <div id="tab-about" class="tab-content active">
            ${this.getAboutContent()}
          </div>
          <div id="tab-data" class="tab-content">
            ${this.getDataAccessContent()}
          </div>
          <div id="tab-learn" class="tab-content">
            ${this.getLearnContent()}
          </div>
          <div id="tab-contribute" class="tab-content">
            ${this.getContributeContent()}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Add event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    document.getElementById('close-about-modal').addEventListener('click', () => {
      this.hide();
    });

    // Overlay click to close
    this.modal.querySelector('.about-modal-overlay').addEventListener('click', () => {
      this.hide();
    });

    // Tab buttons
    const tabButtons = this.modal.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.hide();
      }
    });
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    // Update buttons
    const tabButtons = this.modal.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      if (button.dataset.tab === tabName) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // Update content
    const tabContents = this.modal.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      if (content.id === `tab-${tabName}`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    this.currentTab = tabName;
  }

  /**
   * Show the modal
   */
  show(tab = 'about') {
    if (!this.modal) {
      this.initialize();
    }
    this.modal.classList.add('active');
    this.switchTab(tab);
  }

  /**
   * Hide the modal
   */
  hide() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  /**
   * Get About tab content
   */
  getAboutContent() {
    return `
      <div class="about-section">
        <h3>About This Project</h3>
        <p>
          This interactive map visualizes voter turnout and election results for Montgomery County, Ohio
          across the 2024 and 2025 election cycles. Explore precinct-level data to understand voting patterns
          and civic engagement in our community.
        </p>

        <h3>About Code for Dayton</h3>
        <p>
          <a href="https://codefordayton.org" target="_blank">Code for Dayton</a> is a volunteer civic
          technology organization working to improve our community through data, design, and technology.
          We're part of the <a href="https://www.civictechnologists.org/" target="_blank">Alliance of Civic Technologists (ACT)</a> network.
        </p>

        <div class="mission-box">
          <h4>Our Mission</h4>
          <p>
            We believe in <strong>open data</strong>, <strong>transparency</strong>, and
            <strong>data literacy</strong>. This project makes election data accessible to everyone,
            from researchers and journalists to curious citizens.
          </p>
        </div>

        <h3>Data Sources</h3>
        <p>
          Election data sourced from the Montgomery County Board of Elections.
          Precinct boundary data from Montgomery County GIS.
        </p>
      </div>
    `;
  }

  /**
   * Get Data Access tab content
   */
  getDataAccessContent() {
    return `
      <div class="data-section">
        <h3>Download Raw Data</h3>
        <p>All data is freely available in open formats. Click to download:</p>

        <div class="download-grid">
          <div class="download-card">
            <h4>📍 Precinct Boundaries (GeoJSON)</h4>
            <a href="/file-geojson/rest/services/precincts_2024/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson"
               download="precincts_2024.geojson" class="download-button">
              2024 Precincts with Election Data
            </a>
            <a href="/file-geojson/rest/services/precincts_2025/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson"
               download="precincts_2025.geojson" class="download-button">
              2025 Precincts with Election Data
            </a>
          </div>

          <div class="download-card">
            <h4>📊 Election Statistics (JSON)</h4>
            <a href="/data/elections/2024/statistics.json" download class="download-button">
              2024 Turnout Statistics
            </a>
            <a href="/data/elections/2025/statistics.json" download class="download-button">
              2025 Turnout Statistics
            </a>
          </div>

          <div class="download-card">
            <h4>🗳️ Raw Data</h4>
            <p class="small-text">Individual race files available in the elections directory</p>
            <a href="https://github.com/codefordayton/new_monty_lots/tree/main/data" target="_blank" class="download-button">
              View on GitHub
            </a>
          </div>
        </div>

        <h3>API Endpoints</h3>
        <div class="api-docs">
          <code>GET /api/elections</code>
          <p>List all available election years</p>

          <code>GET /api/elections/:year</code>
          <p>Get metadata for a specific election year</p>

          <code>GET /api/elections/:year/races/:raceId</code>
          <p>Get detailed results for a specific race</p>

          <code>GET /catalog</code>
          <p>List all available GeoJSON layers</p>
        </div>

        <h3>Documentation</h3>
        <ul>
          <li><a href="https://github.com/codefordayton/new_monty_lots/blob/main/docs/DATA_DICTIONARY.md" target="_blank">📖 Data Dictionary</a> - Field definitions and data types</li>
          <li><a href="https://github.com/codefordayton/new_monty_lots/blob/main/docs/DATA_PROCESSING.md" target="_blank">⚙️ Data Processing Pipeline</a> - How we process the data</li>
          <li><a href="https://github.com/codefordayton/new_monty_lots/blob/main/docs/USER_GUIDE.md" target="_blank">📘 User Guide</a> - How to use this tool</li>
        </ul>
      </div>
    `;
  }

  /**
   * Get Learn tab content
   */
  getLearnContent() {
    return `
      <div class="learn-section">
        <h3>Understanding the Data</h3>

        <div class="learn-card">
          <h4>🗺️ What is a Precinct?</h4>
          <p>
            A precinct is a geographic area that groups voters for election administration.
            Montgomery County has approximately 497 precincts. Each precinct typically has
            its own polling location where residents vote.
          </p>
        </div>

        <div class="learn-card">
          <h4>📊 How to Read Turnout Percentages</h4>
          <p>
            <strong>Turnout</strong> = (Ballots Cast ÷ Registered Voters) × 100
          </p>
          <p>
            For example, if a precinct has 1,000 registered voters and 690 people voted,
            the turnout is 69%. Higher turnout generally occurs in presidential election years
            (like 2024) compared to local election years (like 2025).
          </p>
          <div class="example-box">
            <strong>2024 County Average:</strong> 69.08% turnout (Presidential election)<br>
            <strong>2025 County Average:</strong> 24.24% turnout (Local elections only)
          </div>
        </div>

        <div class="learn-card">
          <h4>🎨 Understanding the Color Scale</h4>
          <p>On the map, darker colors indicate higher turnout:</p>
          <ul>
            <li><span class="color-sample" style="background: #fee5d9;"></span> Light orange: Low turnout (0-20%)</li>
            <li><span class="color-sample" style="background: #fcbba1;"></span> Medium orange: Moderate-low (20-40%)</li>
            <li><span class="color-sample" style="background: #fc9272;"></span> Orange: Moderate (40-60%)</li>
            <li><span class="color-sample" style="background: #fb6a4a;"></span> Dark orange: High (60-80%)</li>
            <li><span class="color-sample" style="background: #de2d26;"></span> Red: Very high (80-100%)</li>
          </ul>
        </div>

        <div class="learn-card">
          <h4>🔍 How to Use This Tool</h4>
          <ol>
            <li><strong>Select an election year</strong> from the dropdown (2024 or 2025)</li>
            <li><strong>Choose a race to visualize</strong> or view overall turnout</li>
            <li><strong>Click on any precinct</strong> to see detailed results</li>
            <li><strong>Use the search bar</strong> to search precinct names and properties</li>
            <li><strong>Toggle comparison mode</strong> to see 2024 vs 2025 differences</li>
          </ol>
          <p class="small-text">
            <em>Tip: Load parcel layers from "Advanced: Election Layers" to enable address-based search.</em>
          </p>
        </div>

        <div class="learn-card">
          <h4>📚 Additional Resources</h4>
          <ul>
            <li><a href="https://www.boe.ohio.gov/montgomery/" target="_blank">Montgomery County Board of Elections</a></li>
            <li><a href="https://www.sos.state.oh.us/elections/voters/" target="_blank">Ohio Secretary of State - Voter Information</a></li>
            <li><a href="https://ballotpedia.org/Montgomery_County,_Ohio" target="_blank">Ballotpedia - Montgomery County Elections</a></li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Get Contribute tab content
   */
  getContributeContent() {
    return `
      <div class="contribute-section">
        <h3>Get Involved</h3>
        <p>
          This is an open-source project built by volunteers. We welcome contributions
          from developers, designers, data analysts, and community members!
        </p>

        <div class="contribute-card">
          <h4>💻 For Developers</h4>
          <p>This project uses:</p>
          <ul>
            <li>Koop (GeoJSON server)</li>
            <li>Leaflet (interactive maps)</li>
            <li>Vanilla JavaScript (ES6 modules)</li>
            <li>Node.js backend</li>
          </ul>
          <a href="https://github.com/codefordayton/new_monty_lots" target="_blank" class="contribute-button">
            View on GitHub
          </a>
        </div>

        <div class="contribute-card">
          <h4>🐛 Report Issues</h4>
          <p>Found a bug or have a feature request?</p>
          <a href="https://github.com/codefordayton/new_monty_lots/issues" target="_blank" class="contribute-button">
            Open an Issue
          </a>
        </div>

        <div class="contribute-card">
          <h4>📊 Data Contributions</h4>
          <p>
            Help us expand this project! We're interested in:
          </p>
          <ul>
            <li>Historical election data (pre-2024)</li>
            <li>Additional geographic data layers</li>
            <li>Data validation and quality improvements</li>
          </ul>
        </div>

        <div class="contribute-card">
          <h4>🤝 Join Code for Dayton</h4>
          <p>
            We meet regularly to work on civic technology projects. All skill levels welcome!
          </p>
          <ul>
            <li><a href="https://codefordayton.org" target="_blank">Website</a></li>
            <li><a href="https://www.meetup.com/code-for-dayton/" target="_blank">Meetup Group</a></li>
            <li><a href="https://github.com/codefordayton" target="_blank">GitHub Organization</a></li>
          </ul>
        </div>

        <h3>Project Team</h3>
        <p>
          Built with ❤️ by Code for Dayton volunteers and contributors.
        </p>
        <p class="small-text">
          Special thanks to the Montgomery County Board of Elections for making
          election data publicly available.
        </p>
      </div>
    `;
  }
}

// Export singleton instance
export const aboutModal = new AboutModal();
