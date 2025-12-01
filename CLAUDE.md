# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm start` - Start the Koop server (production mode)
- `npm run dev` - Start with nodemon for auto-restart during development
- `npm install` - Install dependencies

### Server

- Server runs on port 8080 by default (configurable via PORT environment variable)
- Access the web interface at http://localhost:8080
- Service catalog API at http://localhost:8080/catalog

## Architecture

This project implements a **Koop-based GeoJSON server** with dynamic service discovery and a full-screen Leaflet frontend.

### Core Components

**Backend (`index.js`)**:

- Koop server with `@koopjs/provider-file-geojson` for serving local GeoJSON files
- Custom `/catalog` endpoint that scans `/provider-data` directory and returns service metadata
- Static file serving for the frontend interface
- Automatic service registration for any `.geojson` files in the data directory

**Frontend (`index.html`)**:

- Full-screen map interface with informational sidebar
- Dynamic layer discovery via `/catalog` endpoint
- Automatic loading and styling of all available layers
- Service-specific styling and popup content generation

**Data Flow**:

1. Server scans `/provider-data` for `.geojson` files on catalog requests
2. Each file becomes a service accessible at `/file-geojson/rest/services/{filename}/FeatureServer`
3. Frontend fetches catalog, then loads each layer via Koop's query endpoints
4. Layers are styled and displayed based on geometry type and filename

### Koop API Endpoints

All GeoJSON files are automatically served through standard Koop FeatureServer endpoints:

- `/file-geojson/rest/services/{layer}/FeatureServer` - Service metadata
- `/file-geojson/rest/services/{layer}/FeatureServer/0/query` - Feature query endpoint
- Custom `/catalog` endpoint returns list of all available services

### Data Management

**Local File Mode (Default)**: Simply add `.geojson` files to `/provider-data/` directory. The server automatically:

- Discovers new files
- Validates GeoJSON syntax
- Registers them as Koop services
- Makes them available via the catalog API
- Loads them in the frontend interface

**S3-Compatible Storage Mode**: Configure the server to sync GeoJSON files from S3-compatible storage:

- Supports AWS S3, DigitalOcean Spaces, Backblaze B2, MinIO, Wasabi, etc.
- Automatic sync on server startup
- Optional periodic sync at configurable intervals
- Manual sync via API endpoint: `POST /api/sync`
- Files are synced to local `/provider-data/` directory and served via Koop
- Maintains all local mode features (validation, catalog, etc.)

**Configuration**: Use environment variables to enable S3 mode (see `.env.example`):

- `S3_ENABLED=true` - Enable S3 sync
- `S3_BUCKET` - Bucket name
- `S3_ENDPOINT` - For DigitalOcean Spaces: `https://nyc3.digitaloceanspaces.com`
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` - Credentials
- `S3_AUTO_SYNC` - Auto-sync on startup (default: true)
- `S3_SYNC_INTERVAL` - Periodic sync in ms (0 = disabled)

**Sample data patterns**:

- Points with various coordinate systems (point.geojson, point-3857.geojson)
- Complex polygons with metadata (polygon.geojson with interval/label properties)
- Points with string IDs and metadata (points-w-metadata-id-string.geojson)

### Frontend Architecture

**Service Discovery Pattern**: Frontend calls `/catalog` to get available services, then dynamically loads each layer without hardcoding layer names.

**Dynamic Styling System**: Configuration-driven styling with `StyleResolver` class that applies styles based on feature properties rather than hardcoded layer names.

**Error Handling**: Graceful fallback to common layer names if catalog fails, with status indicators in sidebar.

### Dynamic Styling System

**Configuration Structure**: JSON-based configuration system located in `/config/` directory:

- `styles.json` - Main index configuration with global settings
- `layers/housing.json` - Housing layer styling (Grade_Code property)
- `layers/registry.json` - Registry layer styling (agent_type property)
- `schemas/layer-config.schema.json` - Validation schema

**Styling Rules**: Support for categorical and numeric rule types:

- **Categorical**: Map discrete property values to specific styles
- **Numeric**: Apply styles based on value ranges (future enhancement)
- **Conditional**: Complex logic-based styling (future enhancement)

**API Endpoints**:

- `GET /api/styles/config` - Main configuration index
- `GET /api/styles/config/:layerId` - Layer-specific styling configuration

**StyleResolver Class**: Frontend processing engine that:

- Evaluates feature properties against configured rules
- Returns appropriate styles for map rendering
- Generates legend data for UI display
- Caches styles for performance

**Legend System**: Dynamic legend generation that:

- Shows color coding for active style rules
- Updates automatically when layers are loaded/unloaded
- Collapsible interface positioned at bottom-left
- Rule-based legend items with descriptions

### Dependencies

**Server**:

- `@koopjs/koop-core` (v10.4.17) - Core Koop server framework
- `@koopjs/provider-file-geojson` (v2.2.0) - Local GeoJSON file provider
- `koop-output-geojson` (v1.1.2) - GeoJSON output format
- `@aws-sdk/client-s3` (v3.940.0) - S3-compatible storage client
- `geojson-validation` (v1.0.2) - GeoJSON validation library
- `dotenv` (v17.2.3) - Environment variable management

**Frontend**: Leaflet v1.9.4 (CDN), vanilla JavaScript with fetch API

### API Endpoints

**Standard Koop Endpoints**:

- `GET /file-geojson/rest/services/:id/FeatureServer` - Service metadata
- `GET /file-geojson/rest/services/:id/FeatureServer/0/query` - Query features

**Custom Endpoints**:

- `GET /catalog` - List all available GeoJSON services with validation status
- `GET /health` - Server health check
- `GET /api/sync/status` - S3 sync configuration status
- `POST /api/sync` - Manually trigger S3 sync
- `GET /api/styles/config` - Main style configuration
- `GET /api/styles/config/:layerId` - Layer-specific style configuration
