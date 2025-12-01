# DigitalOcean Spaces Setup Guide

This guide explains how to configure the application to load GeoJSON files from DigitalOcean Spaces.

## What is DigitalOcean Spaces?

DigitalOcean Spaces is an S3-compatible object storage service. This application can sync GeoJSON files from Spaces to the local server, allowing you to:

- Store large GeoJSON files in the cloud
- Update data files without redeploying the application
- Share data across multiple server instances
- Reduce deployment package size

## Prerequisites

1. A DigitalOcean account
2. A Spaces bucket created in your preferred region

## Step 1: Create a DigitalOcean Spaces Bucket

1. Log in to your DigitalOcean account
2. Navigate to **Spaces** in the left sidebar
3. Click **Create a Spaces Bucket**
4. Choose your settings:
   - **Region**: Select the datacenter closest to your users (e.g., NYC3, SFO3, AMS3)
   - **Bucket Name**: Choose a unique name (e.g., `my-geojson-data`)
   - **File Listing**: Choose "Public" or "Private" based on your needs
5. Click **Create a Spaces Bucket**

## Step 2: Upload Your GeoJSON Files

1. Open your newly created Spaces bucket
2. Click **Upload Files**
3. Upload your `.geojson` files
4. (Optional) Organize files in folders - use the `S3_PREFIX` environment variable to specify which folder to sync

## Step 3: Create Spaces Access Keys

1. Navigate to **API** in the DigitalOcean sidebar
2. Scroll to the **Spaces Keys** section
3. Click **Generate New Key**
4. Give your key a name (e.g., "Koop GeoJSON Server")
5. **Save the Access Key and Secret Key** - you'll need these for configuration

## Step 4: Configure Your Application

Create a `.env` file in the root of your project (or set environment variables in your hosting platform):

```bash
# Enable S3 sync
S3_ENABLED=true

# Your Spaces credentials
S3_ACCESS_KEY_ID=your-spaces-access-key
S3_SECRET_ACCESS_KEY=your-spaces-secret-key

# Bucket configuration
S3_BUCKET=my-geojson-data
S3_REGION=us-east-1

# IMPORTANT: Set the endpoint for your Spaces region
# Replace 'nyc3' with your region (nyc3, sfo3, ams3, sgp1, etc.)
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com

# Optional: Sync only files from a specific folder
# S3_PREFIX=geojson/

# Optional: Auto-sync on server startup (default: true)
S3_AUTO_SYNC=true

# Optional: Periodic sync interval in milliseconds (0 = disabled)
# Example: 300000 = sync every 5 minutes
S3_SYNC_INTERVAL=0
```

### Important: Region Endpoints

Make sure to use the correct endpoint for your Spaces region:

| Region               | Endpoint URL                          |
| -------------------- | ------------------------------------- |
| NYC3 (New York)      | `https://nyc3.digitaloceanspaces.com` |
| SFO3 (San Francisco) | `https://sfo3.digitaloceanspaces.com` |
| AMS3 (Amsterdam)     | `https://ams3.digitaloceanspaces.com` |
| SGP1 (Singapore)     | `https://sgp1.digitaloceanspaces.com` |
| FRA1 (Frankfurt)     | `https://fra1.digitaloceanspaces.com` |
| BLR1 (Bangalore)     | `https://blr1.digitaloceanspaces.com` |
| SYD1 (Sydney)        | `https://syd1.digitaloceanspaces.com` |

## Step 5: Test Your Configuration

1. Start your server:

   ```bash
   npm start
   ```

2. You should see output indicating S3 sync is working:

   ```
   🔄 Starting S3 sync from bucket: my-geojson-data
   📦 Found 2 GeoJSON file(s) in S3
     ✓ Downloaded: housing.geojson
     ✓ Downloaded: registry.geojson
   ✓ S3 sync complete: 2/2 files synced
   ```

3. Check sync status:

   ```bash
   curl http://localhost:8080/api/sync/status
   ```

4. Manually trigger a sync:
   ```bash
   curl -X POST http://localhost:8080/api/sync
   ```

## Deployment Considerations

### Environment Variables

When deploying to platforms like Heroku, DigitalOcean App Platform, or AWS:

- Set environment variables in your platform's configuration
- Never commit `.env` files with real credentials to version control
- Use `.env.example` as a template

### CDN and Performance

DigitalOcean Spaces includes a built-in CDN. For best performance:

- Use the CDN endpoint URL if accessing files directly (not needed for this sync setup)
- Consider enabling periodic sync (`S3_SYNC_INTERVAL`) if data changes frequently
- For static data, disable periodic sync to reduce API calls

### Security

- Use **private** Spaces buckets if your data is sensitive
- The application only needs read access to the bucket
- Create separate Spaces keys for different environments (dev, staging, production)
- Regularly rotate your access keys

## Troubleshooting

### Error: "Access Denied"

- Verify your access key and secret key are correct
- Ensure the key has read permissions for the bucket

### Error: "Bucket not found"

- Check that `S3_BUCKET` matches your bucket name exactly
- Verify `S3_ENDPOINT` matches your bucket's region

### Files Not Syncing

- Ensure files have `.geojson` extension (case-sensitive)
- Check `S3_PREFIX` if using folders - it should match your folder structure
- Look at server logs for detailed error messages

### Connection Timeout

- Verify your server can reach the internet
- Check firewall rules if deploying on-premises
- Ensure the endpoint URL is correct for your region

## Cost Optimization

DigitalOcean Spaces pricing (as of 2024):

- $5/month for 250 GB storage
- $1/GB for outbound data transfer (CDN)

To minimize costs:

- Only sync when data changes (disable `S3_AUTO_SYNC` and use manual sync endpoint)
- Use `S3_PREFIX` to sync only necessary files
- Set `S3_SYNC_INTERVAL=0` if data is static

## Alternative S3-Compatible Services

This application also supports other S3-compatible storage:

- **AWS S3**: Set `S3_ENDPOINT` to empty or remove it
- **Backblaze B2**: `https://s3.us-west-004.backblazeb2.com`
- **Wasabi**: `https://s3.wasabisys.com`
- **MinIO**: Your self-hosted endpoint

Simply change the `S3_ENDPOINT` environment variable to match your provider.
