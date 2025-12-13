# API Documentation

This document provides comprehensive documentation for all API endpoints available in the Montgomery County GeoJSON Server.

## Base URL

```
http://localhost:8080
```

For production, replace with your deployed URL.

---

## Table of Contents

1. [Web Application](#web-application)
2. [Service Catalog](#service-catalog)
3. [Health Check](#health-check)
4. [S3 Sync](#s3-sync)
5. [Styles Configuration](#styles-configuration)
6. [Koop FeatureServer Endpoints](#koop-featureserver-endpoints)
7. [Error Handling](#error-handling)

---

## Web Application

### GET /

Serves the main web application interface.

**Response:**
- **Content-Type:** `text/html`
- **Status:** `200 OK`

**Description:**
Returns the main `index.html` file with the interactive Leaflet map interface.

**Example:**
```bash
curl http://localhost:8080/
```

---

### GET /static/*

Serves static assets (JavaScript, CSS, images).

**Parameters:**
- `*` - Path to static file

**Response:**
- **Content-Type:** Varies (js, css, images, etc.)
- **Status:** `200 OK` | `404 Not Found`

**Example:**
```bash
curl http://localhost:8080/static/scripts/main.js
curl http://localhost:8080/static/styles/main.css
```

---

### GET /config/*

Serves configuration files (field labels, styles, etc.).

**Parameters:**
- `*` - Path to config file

**Response:**
- **Content-Type:** `application/json`
- **Status:** `200 OK` | `404 Not Found`

**Example:**
```bash
curl http://localhost:8080/config/field-labels.json
curl http://localhost:8080/config/styles.json
```

---

## Service Catalog

### GET /catalog

Returns a list of all available GeoJSON services.

**Response:**
- **Content-Type:** `application/json`
- **Status:** `200 OK`

**Response Schema:**
```json
{
  "services": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "url": "string",
      "queryUrl": "string"
    }
  ],
  "validationErrors": [
    {
      "file": "string",
      "errors": ["string"]
    }
  ]
}
```

**Example Request:**
```bash
curl http://localhost:8080/catalog
```

**Example Response:**
```json
{
  "services": [
    {
      "id": "precincts",
      "name": "Precincts",
      "type": "FeatureServer",
      "url": "/file-geojson/rest/services/precincts/FeatureServer",
      "queryUrl": "/file-geojson/rest/services/precincts/FeatureServer/0/query"
    },
    {
      "id": "housing",
      "name": "Housing",
      "type": "FeatureServer",
      "url": "/file-geojson/rest/services/housing/FeatureServer",
      "queryUrl": "/file-geojson/rest/services/housing/FeatureServer/0/query"
    }
  ],
  "validationErrors": []
}
```

**Notes:**
- Only valid GeoJSON files are included in `services`
- Invalid files are listed in `validationErrors` with details
- Services are automatically discovered from the `/provider-data` directory

---

## Health Check

### GET /health

Returns server health status.

**Response:**
- **Content-Type:** `application/json`
- **Status:** `200 OK`

**Response Schema:**
```json
{
  "status": "ok"
}
```

**Example Request:**
```bash
curl http://localhost:8080/health
```

**Example Response:**
```json
{
  "status": "ok"
}
```

**Use Cases:**
- Load balancer health checks
- Monitoring and alerting
- Container orchestration (Kubernetes, Docker)

---

## S3 Sync

### POST /api/sync

Manually trigger sync from S3-compatible storage.

**Response:**
- **Content-Type:** `application/json`
- **Status:** `200 OK` | `503 Service Unavailable`

**Response Schema (Success):**
```json
{
  "success": true,
  "filesDownloaded": 5,
  "message": "string"
}
```

**Response Schema (Disabled):**
```json
{
  "error": "S3 sync is not enabled"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/sync
```

**Example Response:**
```json
{
  "success": true,
  "filesDownloaded": 5,
  "message": "Successfully synced 5 files from S3"
}
```

**Notes:**
- Requires `S3_ENABLED=true` in environment
- Downloads all GeoJSON files from configured S3 bucket
- Overwrites local files with S3 versions

---

### GET /api/sync/status

Get S3 sync configuration and last sync status.

**Response:**
- **Content-Type:** `application/json`
- **Status:** `200 OK`

**Response Schema:**
```json
{
  "enabled": boolean,
  "bucket": "string",
  "region": "string",
  "lastSync": "string (ISO 8601)",
  "autoSync": boolean,
  "syncInterval": number
}
```

**Example Request:**
```bash
curl http://localhost:8080/api/sync/status
```

**Example Response:**
```json
{
  "enabled": true,
  "bucket": "my-geojson-bucket",
  "region": "nyc3",
  "lastSync": "2024-12-13T19:30:45.123Z",
  "autoSync": true,
  "syncInterval": 0
}
```

**Notes:**
- Returns configuration even if S3 is disabled
- `lastSync` is `null` if no sync has occurred
- Useful for debugging S3 configuration

---

## Styles Configuration

### GET /api/styles/config

Get the main styles configuration index.

**Response:**
- **Content-Type:** `application/json`
- **Status:** `200 OK` | `404 Not Found`

**Response Schema:**
```json
{
  "version": "string",
  "description": "string",
  "defaultStyles": {},
  "layers": ["string"]
}
```

**Example Request:**
```bash
curl http://localhost:8080/api/styles/config
```

**Example Response:**
```json
{
  "version": "1.0.0",
  "description": "Main styling configuration for Montgomery County GeoJSON layers",
  "defaultStyles": {
    "fillColor": "#3388ff",
    "fillOpacity": 0.5,
    "color": "#fff",
    "weight": 2
  },
  "layers": ["housing", "registry"]
}
```

---

### GET /api/styles/config/:layerId

Get layer-specific styling configuration.

**Parameters:**
- `layerId` (path) - Layer identifier (e.g., "housing", "registry")

**Response:**
- **Content-Type:** `application/json`
- **Status:** `200 OK` | `404 Not Found`

**Response Schema:**
```json
{
  "layerId": "string",
  "styleProperty": "string",
  "ruleType": "string",
  "rules": [],
  "defaultStyle": {}
}
```

**Example Request:**
```bash
curl http://localhost:8080/api/styles/config/housing
```

**Example Response:**
```json
{
  "layerId": "housing",
  "styleProperty": "Grade_Code",
  "ruleType": "categorical",
  "rules": [
    {
      "value": "A",
      "label": "Grade A",
      "fillColor": "#2ecc71",
      "fillOpacity": 0.6,
      "color": "#27ae60",
      "weight": 2
    },
    {
      "value": "B",
      "label": "Grade B",
      "fillColor": "#3498db",
      "fillOpacity": 0.6,
      "color": "#2980b9",
      "weight": 2
    }
  ],
  "defaultStyle": {
    "fillColor": "#95a5a6",
    "fillOpacity": 0.4,
    "color": "#7f8c8d",
    "weight": 1
  }
}
```

**Error Response (404):**
```json
{
  "error": "Layer configuration not found",
  "layerId": "nonexistent"
}
```

---

## Koop FeatureServer Endpoints

The server uses [@koopjs/provider-file-geojson](https://github.com/koopjs/provider-file-geojson) which implements the ArcGIS FeatureServer API specification. All GeoJSON files in `/provider-data` are automatically exposed through these endpoints.

### Base Path

```
/file-geojson/rest/services/{layerId}/FeatureServer
```

Where `{layerId}` is the filename without the `.geojson` extension.

---

### GET /file-geojson/rest/info

Get provider information and metadata.

**Example Request:**
```bash
curl http://localhost:8080/file-geojson/rest/info
```

---

### GET /file-geojson/rest/services/:id/FeatureServer

Get service metadata for a specific layer.

**Parameters:**
- `id` (path) - Layer identifier

**Example Request:**
```bash
curl http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer
```

**Example Response:**
```json
{
  "currentVersion": 10.91,
  "serviceDescription": "",
  "hasVersionedData": false,
  "supportsDisconnectedEditing": false,
  "hasStaticData": true,
  "maxRecordCount": 2000,
  "supportedQueryFormats": "JSON",
  "capabilities": "Query",
  "description": "",
  "copyrightText": "",
  "spatialReference": {
    "wkid": 4326,
    "latestWkid": 4326
  },
  "initialExtent": {},
  "fullExtent": {},
  "layers": [
    {
      "id": 0,
      "name": "precincts",
      "type": "Feature Layer",
      "geometryType": "esriGeometryPolygon"
    }
  ],
  "tables": []
}
```

---

### GET /file-geojson/rest/services/:id/FeatureServer/0

Get layer metadata.

**Parameters:**
- `id` (path) - Layer identifier

**Example Request:**
```bash
curl http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0
```

---

### GET /file-geojson/rest/services/:id/FeatureServer/0/query

Query features from a layer.

**Parameters:**
- `id` (path) - Layer identifier

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `where` | string | SQL WHERE clause | `1=1` |
| `outFields` | string | Comma-separated field names or `*` | `*` |
| `returnGeometry` | boolean | Include geometry in response | `true` |
| `f` | string | Response format (`json`, `geojson`) | `json` |
| `resultRecordCount` | number | Limit number of results | 2000 |
| `resultOffset` | number | Pagination offset | 0 |
| `outSR` | number | Output spatial reference WKID | 4326 |

**Example Requests:**

**Get all features:**
```bash
curl "http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0/query?where=1=1&f=json"
```

**Query specific field:**
```bash
curl "http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0/query?where=VPRECINCT='0100'&f=json"
```

**Get specific fields only:**
```bash
curl "http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0/query?outFields=VNAME,VPRECINCT&f=json"
```

**Get as GeoJSON:**
```bash
curl "http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0/query?f=geojson"
```

**Pagination:**
```bash
curl "http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0/query?resultRecordCount=50&resultOffset=0&f=json"
```

**Example Response (JSON format):**
```json
{
  "objectIdFieldName": "OBJECTID",
  "globalIdFieldName": "",
  "geometryType": "esriGeometryPolygon",
  "spatialReference": {
    "wkid": 4326,
    "latestWkid": 4326
  },
  "fields": [
    {
      "name": "OBJECTID",
      "type": "esriFieldTypeOID",
      "alias": "OBJECTID"
    },
    {
      "name": "VPRECINCT",
      "type": "esriFieldTypeString",
      "alias": "VPRECINCT",
      "length": 256
    }
  ],
  "features": [
    {
      "attributes": {
        "OBJECTID": 1,
        "VPRECINCT": "0100",
        "VNAME": "BUTLER TOWNSHIP F"
      },
      "geometry": {
        "rings": [[[-84.208516, 39.865012], ...]]
      }
    }
  ]
}
```

**Example Response (GeoJSON format):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "OBJECTID": 1,
        "VPRECINCT": "0100",
        "VNAME": "BUTLER TOWNSHIP F"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      }
    }
  ]
}
```

---

## Error Handling

### Standard Error Response

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `404` | Not Found | Resource or endpoint not found |
| `500` | Internal Server Error | Server error occurred |
| `503` | Service Unavailable | Service is disabled or unavailable |

### Common Errors

**Service Not Found (404):**
```json
{
  "error": "Layer configuration not found",
  "layerId": "nonexistent"
}
```

**S3 Sync Disabled (503):**
```json
{
  "error": "S3 sync is not enabled"
}
```

**Invalid GeoJSON in Catalog:**
```json
{
  "services": [],
  "validationErrors": [
    {
      "file": "invalid.geojson",
      "errors": ["Invalid GeoJSON structure"]
    }
  ]
}
```

**Server Error (500):**
```json
{
  "error": "Unable to read data directory"
}
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production deployments, consider adding rate limiting middleware.

---

## Authentication

Currently, there is no authentication required. All endpoints are publicly accessible. For production deployments requiring authentication, see the commented-out auth configuration in `index.js`.

---

## CORS

CORS is not explicitly configured. If you need cross-origin access from a different domain, you'll need to add CORS middleware.

---

## Content Negotiation

Most endpoints return `application/json`. The FeatureServer query endpoint supports multiple formats via the `f` parameter:
- `f=json` - ArcGIS FeatureServer JSON format
- `f=geojson` - Standard GeoJSON format

---

## Versioning

This API does not currently implement versioning. All endpoints are at the root level.

---

## Additional Resources

- [Koop Documentation](https://koopjs.github.io/)
- [ArcGIS FeatureServer API](https://developers.arcgis.com/rest/services-reference/enterprise/feature-service.htm)
- [GeoJSON Specification](https://geojson.org/)
- [Environment Configuration](./ENVIRONMENT_CONFIGURATION.md)
- [S3 Storage Setup](./DIGITALOCEAN_SPACES_SETUP.md)

---

## Examples Collection

### Using cURL

**Get all services:**
```bash
curl http://localhost:8080/catalog | jq
```

**Query a specific precinct:**
```bash
curl "http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0/query?where=VNAME='BUTLER%20TOWNSHIP%20F'&f=geojson" | jq
```

**Trigger S3 sync:**
```bash
curl -X POST http://localhost:8080/api/sync | jq
```

### Using JavaScript (Fetch API)

**Get catalog:**
```javascript
fetch('http://localhost:8080/catalog')
  .then(response => response.json())
  .then(data => console.log(data.services));
```

**Query features:**
```javascript
const query = new URLSearchParams({
  where: '1=1',
  outFields: '*',
  f: 'geojson'
});

fetch(`http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0/query?${query}`)
  .then(response => response.json())
  .then(geojson => {
    console.log(`Loaded ${geojson.features.length} features`);
  });
```

### Using Python (requests)

**Get catalog:**
```python
import requests

response = requests.get('http://localhost:8080/catalog')
data = response.json()

for service in data['services']:
    print(f"{service['name']}: {service['queryUrl']}")
```

**Query features:**
```python
import requests

params = {
    'where': '1=1',
    'f': 'geojson',
    'outFields': 'VNAME,VPRECINCT'
}

response = requests.get(
    'http://localhost:8080/file-geojson/rest/services/precincts/FeatureServer/0/query',
    params=params
)

geojson = response.json()
print(f"Loaded {len(geojson['features'])} features")
```

---

## Testing the API

You can test all endpoints using the provided examples or by accessing the interactive web interface at `http://localhost:8080`.

For automated testing, consider using tools like:
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [httpie](https://httpie.io/)
- [curl](https://curl.se/)

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check the [README](../README.md) for general information
- Review [Environment Configuration](./ENVIRONMENT_CONFIGURATION.md) for setup help
