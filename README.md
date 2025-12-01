# Monty Lots

**A civic tech platform for exploring property and parcel data in Montgomery County, Ohio**

Monty Lots is an open-source geospatial data platform built by [Code for Dayton](https://www.codefordayton.org/) to make property and parcel information accessible, searchable, and useful for residents, researchers, and civic organizations.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)

## 🌟 Features

### Core Capabilities

- **🔍 Intelligent Search** - Search properties by address or parcel ID with real-time filtering
- **📊 Large Dataset Handling** - Automatic clustering for datasets with 1000+ features
- **🎯 Manual Layer Loading** - User-controlled layer loading to optimize performance
- **🗺️ Interactive Mapping** - Full-screen Leaflet interface with dynamic layer discovery
- **🔗 Shareable URLs** - Search results can be bookmarked and shared via URL parameters
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices

### Technical Features

- **Dynamic Service Discovery** - Automatically catalogs all GeoJSON files in the data directory
- **GeoJSON Validation** - Automatic validation of GeoJSON syntax with detailed error reporting
- **S3-Compatible Storage** - Optional sync from DigitalOcean Spaces, AWS S3, Backblaze B2, or any S3-compatible storage
- **Koop FeatureServer API** - Industry-standard GIS REST API for data access
- **Layer Visibility Controls** - Toggle layers on/off without reloading
- **Real-time Status Indicators** - Visual feedback for loading states and feature counts
- **Health Check Endpoint** - Monitoring-ready `/health` endpoint for production deployments

## 🚀 Quick Start

### Prerequisites

- **Node.js** v14 or higher
- **npm** (comes with Node.js)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/codefordayton/new_monty_lots.git
   cd new_monty_lots
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the server**

   ```bash
   npm start
   ```

4. **Open in your browser**
   - Navigate to http://localhost:8080
   - The map interface will load, showing available layers in the sidebar

### Development Mode

For active development with auto-restart on file changes:

```bash
npm run dev
```

## 📖 Usage Guide

### Viewing Property Data

1. **Load Layers** - Click the "Load" button next to any layer in the sidebar to display it on the map
2. **Search Properties** - Use the search box to filter by address or parcel ID
3. **View Details** - Click any feature on the map to see its properties in a popup
4. **Share Results** - Copy the URL to share specific search results with others

### Search Capabilities

The search function supports:

- **Address search** - Enter full or partial street addresses
- **Parcel ID search** - Search by tax parcel numbers
- **Real-time filtering** - Results update as you type (300ms debounce)
- **Result counts** - Shows matching features out of total dataset

### Performance Optimization

The application automatically optimizes for dataset size:

- **< 1,000 features** - Standard Leaflet layers
- **> 1,000 features** - Marker clustering enabled
- **> 5,000 features** - Warning displayed, clustering highly optimized
- **Manual loading** - Users control which layers load to manage memory

## 🏗️ Architecture

### Technology Stack

**Backend:**

- [Koop](https://koopjs.github.io/) v10.4.17 - GIS data transformation framework
- [@koopjs/provider-file-geojson](https://github.com/koopjs/provider-file-geojson) - GeoJSON file serving
- Express.js (via Koop) - Web server framework

**Frontend:**

- [Leaflet](https://leafletjs.com/) v1.9.4 - Interactive mapping library
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) - Marker clustering
- Vanilla JavaScript - No framework dependencies
- Responsive CSS - Mobile-first design

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Leaflet Map Interface (index.html)                │ │
│  │  • Dynamic layer loading                           │ │
│  │  • Search & filter UI                              │ │
│  │  • Marker clustering                               │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/JSON
┌───────────────────────▼─────────────────────────────────┐
│              Koop Server (index.js)                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Custom Endpoints:                                 │ │
│  │  • GET /              → Serve frontend             │ │
│  │  • GET /catalog       → List all services          │ │
│  │  • GET /health        → Health check               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Koop FeatureServer API:                           │ │
│  │  • /file-geojson/rest/services/{layer}/FeatureServer │
│  │  • /file-geojson/rest/services/{layer}/FeatureServer/0/query │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ File I/O
┌───────────────────────▼─────────────────────────────────┐
│           provider-data/ Directory                       │
│  • housing.geojson    (47 MB)                           │
│  • registry.geojson   (19 MB)                           │
│  • [any .geojson files are auto-discovered]            │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Manual Layer Loading** - Users explicitly load layers to prevent overwhelming browser memory with large datasets
2. **Automatic Clustering** - Point features in large datasets (>1000 features) automatically use clustering
3. **Zero Configuration** - Drop any `.geojson` file in `provider-data/` and it's automatically served
4. **Service Catalog Pattern** - Custom `/catalog` endpoint provides metadata about all available layers
5. **Progressive Enhancement** - Core functionality works without JavaScript, enhanced with interactivity

## 🔌 API Reference

### Catalog Endpoint

**`GET /catalog`**

Returns metadata about all available GeoJSON services.

**Response:**

```json
{
  "services": [
    {
      "id": "housing",
      "name": "Housing",
      "type": "FeatureServer",
      "url": "/file-geojson/rest/services/housing/FeatureServer",
      "queryUrl": "/file-geojson/rest/services/housing/FeatureServer/0/query"
    }
  ],
  "count": 2
}
```

### FeatureServer Endpoints

**`GET /file-geojson/rest/services/{layer}/FeatureServer`**

Returns service metadata for a specific layer.

**`GET /file-geojson/rest/services/{layer}/FeatureServer/0/query`**

Query features from a layer.

**Query Parameters:**

- `f=geojson` - Return format (geojson, json)
- `where=1=1` - SQL-style where clause
- `outFields=*` - Fields to return
- `returnCountOnly=true` - Return only feature count

**Example:**

```bash
# Get all features as GeoJSON
curl "http://localhost:8080/file-geojson/rest/services/housing/FeatureServer/0/query?f=geojson&where=1=1&outFields=*"

# Get feature count only
curl "http://localhost:8080/file-geojson/rest/services/housing/FeatureServer/0/query?f=json&where=1=1&returnCountOnly=true"
```

### Health Check

**`GET /health`**

Returns server health status for monitoring.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T12:34:56.789Z"
}
```

### S3 Sync Endpoints

**`GET /api/sync/status`**

Returns current S3 sync configuration status.

**Response:**

```json
{
  "enabled": true,
  "bucket": "my-geojson-data",
  "endpoint": "https://nyc3.digitaloceanspaces.com",
  "autoSync": true,
  "syncInterval": 0
}
```

**`POST /api/sync`**

Manually trigger a sync from S3 storage. Only available when `S3_ENABLED=true`.

**Response:**

```json
{
  "success": true,
  "filesSync": 2,
  "totalFiles": 2
}
```

## 📁 Project Structure

```
new_monty_lots/
├── index.js                 # Koop server with custom endpoints
├── index.html               # Frontend map interface
├── lib/
│   └── s3-sync.js          # S3-compatible storage sync module
├── docs/
│   └── DIGITALOCEAN_SPACES_SETUP.md  # S3 storage setup guide
├── provider-data/           # GeoJSON data files (auto-discovered or synced from S3)
│   ├── housing.geojson      # Housing/property data
│   └── registry.geojson     # Registry data
├── .env.example             # Environment variable template
├── package.json             # Dependencies and scripts
├── README.md               # This file
├── CONTRIBUTING.md         # Contribution guidelines
├── CLAUDE.md              # AI assistant documentation
└── deploy.md              # Deployment guide
```

## 💾 Adding Data

### Option 1: Local Files (Default)

Simply add `.geojson` files to the `provider-data/` directory:

```bash
# Copy your GeoJSON file
cp my-data.geojson provider-data/

# Restart the server (or nodemon will auto-restart)
npm start
```

The new layer will automatically:

- Appear in the `/catalog` endpoint
- Show up in the frontend sidebar
- Be queryable via the Koop API
- Use the filename (without extension) as the layer ID

### Option 2: S3-Compatible Storage (DigitalOcean Spaces, AWS S3, etc.)

For production deployments or large datasets, you can store GeoJSON files in S3-compatible object storage:

**Supported providers:**

- DigitalOcean Spaces
- AWS S3
- Backblaze B2
- Wasabi
- MinIO (self-hosted)
- Any S3-compatible storage

**Setup:**

1. **Copy the environment example**

   ```bash
   cp .env.example .env
   ```

2. **Configure your S3 settings in `.env`**

   ```bash
   S3_ENABLED=true
   S3_BUCKET=my-geojson-data
   S3_ENDPOINT=https://nyc3.digitaloceanspaces.com  # For DigitalOcean Spaces
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   ```

3. **Start the server**
   ```bash
   npm start
   # Files will automatically sync from S3 to local cache on startup
   ```

**Features:**

- ✅ Automatic sync on server startup
- ✅ Optional periodic sync at configurable intervals
- ✅ Manual sync via API: `POST /api/sync`
- ✅ Check sync status: `GET /api/sync/status`
- ✅ All files are validated before serving
- ✅ Works seamlessly with existing Koop provider

See [docs/DIGITALOCEAN_SPACES_SETUP.md](docs/DIGITALOCEAN_SPACES_SETUP.md) for detailed setup instructions.

### Data Guidelines

- **Format:** Valid GeoJSON (FeatureCollection recommended)
- **Coordinate System:** WGS84 (EPSG:4326) or Web Mercator (EPSG:3857)
- **File Size:** No strict limit with S3 storage; < 50MB for local-only hosting
- **Naming:** Use lowercase, hyphens for spaces (e.g., `property-parcels.geojson`)
- **Validation:** All files are automatically validated for correct GeoJSON syntax

## 🚢 Deployment

### Quick Deploy Options

**Railway** (Recommended for quick deployments)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway up
```

**Render**

1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Deploy automatically on push

**DigitalOcean App Platform**

1. Create new app from GitHub
2. Configure as Node.js service
3. Set environment variable `PORT=8080`

See [deploy.md](./deploy.md) for detailed deployment instructions, including:

- Environment variable configuration
- Object storage integration (AWS S3, GCS, Azure)
- Scaling considerations
- Performance optimization

## 🤝 Contributing

We welcome contributions from developers, designers, GIS professionals, and civic tech enthusiasts!

**Ways to contribute:**

- 🐛 Report bugs and request features via [GitHub Issues](https://github.com/codefordayton/new_monty_lots/issues)
- 💻 Submit pull requests for bug fixes or new features
- 📖 Improve documentation
- 🧪 Test with different datasets and provide feedback
- 🎨 Enhance UI/UX design

### Development Workflow

**IMPORTANT: Always create a feature branch for your work. Never commit directly to `main`.**

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-number-description
   ```

2. **Make your changes and commit**

   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

3. **Push to your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request**
   - Go to GitHub and create a PR from your branch to `main`
   - Link any related issues
   - Request review from maintainers

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on:

- Development workflow
- Code style and standards
- Testing procedures
- Pull request process

## 🗺️ Roadmap

### Planned Features

**v2.0 - Enhanced Search & Analytics**

- [ ] Advanced spatial queries (radius search, polygon selection)
- [ ] Property comparison tool
- [ ] Export search results to CSV/GeoJSON
- [ ] Custom layer styling via UI

**v3.0 - Data Integration**

- [ ] Connect to live county data APIs
- [ ] Automatic data refresh/sync
- [ ] Historical data timeline view
- [ ] Multi-county support

**v4.0 - Collaboration & Community**

- [ ] User accounts and saved searches
- [ ] Community annotations and notes
- [ ] Public/private layer sharing
- [ ] Embeddable map widgets

### Technical Improvements

- [ ] Unit and integration tests
- [ ] TypeScript migration
- [ ] GraphQL API option
- [ ] WebSocket support for real-time updates
- [ ] Vector tile serving for better performance
- [ ] Offline PWA capabilities

## 📊 Use Cases

**For Residents:**

- Research properties before purchase or rental
- Understand neighborhood boundaries and zoning
- Track property development in their area

**For Researchers:**

- Analyze property patterns and trends
- Study urban development over time
- Export data for academic research

**For Civic Organizations:**

- Identify underutilized properties
- Plan community development projects
- Support affordable housing initiatives

**For Developers:**

- Build applications on top of the API
- Integrate property data into other civic tech tools
- Create custom visualizations

## 🙏 Acknowledgments

- **Code for Dayton** - Civic tech volunteer organization
- **Koop Team** - For the excellent open-source GIS framework
- **OpenStreetMap** - For map tile data
- **Montgomery County, Ohio** - For open data access

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact & Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/codefordayton/new_monty_lots/issues)
- **Code for Dayton:** [Join our community](https://www.codefordayton.org/)
- **Email:** info@codefordayton.org

---

**Built with ❤️ by Code for Dayton volunteers**

_Making public data public and accessible for everyone_
