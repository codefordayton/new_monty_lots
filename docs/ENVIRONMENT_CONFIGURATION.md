# Environment Configuration

This application uses environment variables for configuration, allowing different settings for development, production, and testing environments.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your configuration values

3. Start the application:
   ```bash
   npm start
   ```

## Environment Variables

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port number for the server to listen on |
| `DATA_DIR` | `./provider-data` | Directory containing GeoJSON files |
| `LOG_LEVEL` | `debug` | Koop server log level (`debug`, `info`, `warn`, `error`) |
| `NODE_ENV` | `development` | Node environment (`development`, `production`, `test`) |

### S3-Compatible Storage Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_ENABLED` | `false` | Enable S3 sync (`true` or `false`) |
| `S3_ACCESS_KEY_ID` | - | S3 access key ID (required if S3_ENABLED=true) |
| `S3_SECRET_ACCESS_KEY` | - | S3 secret access key (required if S3_ENABLED=true) |
| `S3_BUCKET` | - | S3 bucket name |
| `S3_REGION` | `us-east-1` | AWS region or S3-compatible region |
| `S3_ENDPOINT` | - | Custom S3 endpoint (for DigitalOcean Spaces, Wasabi, etc.) |
| `S3_PREFIX` | `` | Prefix/folder path within bucket (e.g., `geojson/`) |
| `S3_AUTO_SYNC` | `true` | Auto-sync on server startup |
| `S3_SYNC_INTERVAL` | `0` | Periodic sync interval in milliseconds (0 = disabled) |

## Environment-Specific Configurations

### Development

```env
NODE_ENV=development
PORT=8080
LOG_LEVEL=debug
DATA_DIR=./provider-data
```

**Characteristics:**
- Verbose logging for debugging
- Hot-reload support (use `npm run dev`)
- Local file storage

### Production

```env
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
DATA_DIR=./provider-data
```

**Characteristics:**
- Reduced logging for performance
- Error tracking
- Optional S3 sync for data storage

### Testing

```env
NODE_ENV=test
PORT=9999
LOG_LEVEL=error
DATA_DIR=./test-data
```

**Characteristics:**
- Separate port to avoid conflicts
- Minimal logging
- Isolated test data directory

## S3 Storage Setup Examples

### DigitalOcean Spaces

```env
S3_ENABLED=true
S3_ACCESS_KEY_ID=your-spaces-key
S3_SECRET_ACCESS_KEY=your-spaces-secret
S3_BUCKET=your-bucket-name
S3_REGION=nyc3
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_PREFIX=geojson/
S3_AUTO_SYNC=true
```

See [DIGITALOCEAN_SPACES_SETUP.md](./DIGITALOCEAN_SPACES_SETUP.md) for detailed setup.

### AWS S3

```env
S3_ENABLED=true
S3_ACCESS_KEY_ID=your-aws-access-key
S3_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
# No endpoint needed for AWS S3
S3_AUTO_SYNC=true
```

### Wasabi

```env
S3_ENABLED=true
S3_ACCESS_KEY_ID=your-wasabi-key
S3_SECRET_ACCESS_KEY=your-wasabi-secret
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.wasabisys.com
S3_AUTO_SYNC=true
```

## Security Best Practices

### Never Commit Secrets

- ✅ `.env` is in `.gitignore` - your secrets are safe
- ✅ `.env.example` contains no real credentials
- ⚠️ Never commit `.env` to version control
- ⚠️ Never hardcode credentials in source code

### Environment Variables on Hosting Platforms

#### Railway

Set environment variables in the Railway dashboard:
1. Go to your project
2. Click on "Variables" tab
3. Add each variable from `.env.example`

#### Heroku

```bash
heroku config:set PORT=8080
heroku config:set LOG_LEVEL=info
heroku config:set S3_ENABLED=true
heroku config:set S3_ACCESS_KEY_ID=your-key
# ... etc
```

#### Vercel

Add to `vercel.json`:
```json
{
  "env": {
    "PORT": "8080",
    "LOG_LEVEL": "info"
  }
}
```

Or set via Vercel dashboard under Settings → Environment Variables.

## Validation

The application will start with default values if environment variables are not set. However, for production deployments, you should explicitly set all variables.

Check your configuration on startup - the server logs will show:
```
✓ Server listening on port 8080
  → Web interface: http://localhost:8080
  → Catalog API: http://localhost:8080/catalog
```

If S3 is enabled:
```
  → S3 Sync status: http://localhost:8080/api/sync/status
  → Manual sync: POST http://localhost:8080/api/sync
```

## Troubleshooting

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::8080
```

**Solution:** Change the `PORT` in your `.env` file or kill the process using that port:
```bash
lsof -ti:8080 | xargs kill -9
```

### S3 Connection Errors

Check that:
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` are correct
- `S3_BUCKET` exists and you have access
- `S3_ENDPOINT` is correct for your provider (if using non-AWS S3)
- `S3_REGION` matches your bucket region

### Data Directory Not Found

```
Error: ENOENT: no such file or directory
```

**Solution:** Create the directory specified in `DATA_DIR`:
```bash
mkdir -p ./provider-data
```

## Further Reading

- [README.md](../README.md) - General project documentation
- [DIGITALOCEAN_SPACES_SETUP.md](./DIGITALOCEAN_SPACES_SETUP.md) - DigitalOcean Spaces setup
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
