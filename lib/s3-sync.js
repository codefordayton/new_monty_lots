const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

/**
 * S3 Sync Module for DigitalOcean Spaces (and other S3-compatible storage)
 *
 * This module syncs GeoJSON files from S3-compatible storage to local provider-data directory.
 * Supports AWS S3, DigitalOcean Spaces, Backblaze B2, MinIO, Wasabi, etc.
 */

class S3Sync {
  constructor(config) {
    this.enabled = config.enabled || false;
    this.bucket = config.bucket;
    this.region = config.region || 'us-east-1';
    this.endpoint = config.endpoint; // For S3-compatible services like DigitalOcean Spaces
    this.prefix = config.prefix || ''; // Optional: only sync files from specific folder
    this.localDir = config.localDir || './provider-data';
    this.autoSync = config.autoSync !== false; // Default: true
    this.syncInterval = config.syncInterval || 0; // 0 = no periodic sync

    if (!this.enabled) {
      console.log('ℹ️  S3 sync is disabled');
      return;
    }

    if (!this.bucket) {
      throw new Error('S3 bucket name is required when S3 sync is enabled');
    }

    // Create S3 client with custom endpoint support
    const clientConfig = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      },
    };

    // Add custom endpoint for S3-compatible services
    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint;
      clientConfig.forcePathStyle = true; // Required for most S3-compatible services
    }

    this.s3Client = new S3Client(clientConfig);

    console.log(
      `✓ S3 sync configured for bucket: ${this.bucket}${this.endpoint ? ` (endpoint: ${this.endpoint})` : ''}`
    );
  }

  /**
   * Sync all GeoJSON files from S3 to local directory
   */
  async sync() {
    if (!this.enabled) {
      return { success: false, message: 'S3 sync is disabled' };
    }

    try {
      console.log(
        `🔄 Starting S3 sync from bucket: ${this.bucket}${this.prefix ? `/${this.prefix}` : ''}`
      );

      // Ensure local directory exists
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }

      // List all objects in bucket
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix,
      });

      const listResponse = await this.s3Client.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        console.log('⚠️  No files found in S3 bucket');
        return { success: true, filesSync: 0, message: 'No files found' };
      }

      // Filter for GeoJSON files
      const geojsonFiles = listResponse.Contents.filter(obj =>
        obj.Key.toLowerCase().endsWith('.geojson')
      );

      console.log(`📦 Found ${geojsonFiles.length} GeoJSON file(s) in S3`);

      let syncedCount = 0;
      const errors = [];

      // Download each GeoJSON file
      for (const file of geojsonFiles) {
        try {
          await this.downloadFile(file.Key);
          syncedCount++;
        } catch (error) {
          console.error(`❌ Failed to sync ${file.Key}:`, error.message);
          errors.push({ file: file.Key, error: error.message });
        }
      }

      const result = {
        success: true,
        filesSync: syncedCount,
        totalFiles: geojsonFiles.length,
        errors: errors.length > 0 ? errors : undefined,
      };

      console.log(`✓ S3 sync complete: ${syncedCount}/${geojsonFiles.length} files synced`);

      return result;
    } catch (error) {
      console.error('❌ S3 sync failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download a single file from S3
   */
  async downloadFile(key) {
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(getCommand);

    // Extract filename from key (remove prefix if present)
    const filename = path.basename(key);
    const localPath = path.join(this.localDir, filename);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Write to local file
    fs.writeFileSync(localPath, buffer);

    console.log(`  ✓ Downloaded: ${filename}`);
  }

  /**
   * Start periodic sync if configured
   */
  startPeriodicSync() {
    if (!this.enabled || !this.syncInterval || this.syncInterval <= 0) {
      return;
    }

    console.log(`⏰ Starting periodic S3 sync every ${this.syncInterval}ms`);

    this.syncIntervalId = setInterval(async () => {
      console.log('⏰ Periodic sync triggered');
      await this.sync();
    }, this.syncInterval);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      console.log('⏰ Periodic sync stopped');
    }
  }
}

module.exports = S3Sync;
