# Deployment Guide

## Recommended Platforms

### Railway (Easiest)

1. Connect GitHub repo to Railway
2. Set environment variables if needed
3. Deploy automatically on push

### Render

1. Connect GitHub repo
2. Build command: `npm install`
3. Start command: `npm start`
4. Add environment variables in dashboard

### DigitalOcean App Platform

1. Create new app from GitHub
2. Configure Node.js service
3. Set port to 8080

## Environment Variables

For production deployment, add these environment variables:

```
PORT=8080
NODE_ENV=production
```

For object storage (AWS S3):

```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=your-bucket-name
AWS_REGION=us-west-2
```

## Object Storage Migration

When ready to move large GeoJSON files to object storage:

1. **Uncomment lines in .gitignore** to exclude large files from git
2. **Upload files to S3/GCS/Azure Blob**
3. **Modify server to fetch from object storage**:

```javascript
// In index.js, add object storage support
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// Function to download files from S3 to local temp directory
async function syncDataFromS3() {
  // Implementation to download .geojson files from bucket
}
```

## Scaling Considerations

**Small to Medium (< 100MB total data)**:

- Railway, Render, or DigitalOcean App Platform
- Keep files in git repository

**Large datasets (> 100MB)**:

- Use object storage (S3, GCS, Azure Blob)
- Consider CDN for static assets
- AWS/GCP/Azure for hosting

**High traffic**:

- Add Redis caching
- Load balancer
- Consider serverless (Vercel, Netlify Functions)

## Performance Optimization

For production deployment:

1. **Enable gzip compression**
2. **Add Redis caching for Koop**
3. **Use CDN for static assets**
4. **Consider geometry simplification** for web display

## Monitoring

Add basic health check endpoint:

```javascript
koop.server.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```
