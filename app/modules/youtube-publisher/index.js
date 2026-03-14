const fs = require('fs');
const http = require('http');
const url = require('url');
const { createLogger } = require('../data-layer/logger');
const logger = createLogger('youtube-publisher');

class YouTubePublisher {
  constructor() {
    this._auth = null;
    this._tokens = null;
  }

  /**
   * Start OAuth 2.0 authentication flow
   * Opens browser for Google sign-in, receives callback
   * @returns {Promise<{channelName: string, channelId: string}>}
   */
  async authenticate() {
    const { google } = require('googleapis');

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:8085/oauth2callback';

    if (!clientId || !clientSecret) {
      throw new Error('YouTube OAuth credentials not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env');
    }

    this._auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const authUrl = this._auth.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
    });

    // Open browser for authentication
    const { shell } = require('electron');
    shell.openExternal(authUrl);

    // Wait for OAuth callback
    const code = await this._waitForAuthCallback(redirectUri);

    const { tokens } = await this._auth.getToken(code);
    this._auth.setCredentials(tokens);
    this._tokens = tokens;

    // Get channel info
    const youtube = google.youtube({ version: 'v3', auth: this._auth });
    const channelResponse = await youtube.channels.list({
      part: 'snippet',
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    const channelInfo = {
      channelName: channel?.snippet?.title || 'Unknown',
      channelId: channel?.id || '',
    };

    logger.info(`Authenticated as: ${channelInfo.channelName}`);
    return channelInfo;
  }

  /**
   * Wait for OAuth callback on local server
   */
  _waitForAuthCallback(redirectUri) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(redirectUri);
      const port = parseInt(parsedUrl.port, 10) || 8085;

      const server = http.createServer((req, res) => {
        const queryParams = new URL(req.url, `http://localhost:${port}`).searchParams;
        const code = queryParams.get('code');
        const error = queryParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>認証エラー</h1><p>ウィンドウを閉じてください。</p>');
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>認証成功！</h1><p>アプリに戻ってください。このウィンドウは閉じて構いません。</p>');
          server.close();
          resolve(code);
        }
      });

      server.listen(port, () => {
        logger.info(`OAuth callback server listening on port ${port}`);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('OAuth authentication timed out'));
      }, 300000);
    });
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated() {
    return !!(this._auth && this._tokens);
  }

  /**
   * Clear authentication
   */
  logout() {
    this._auth = null;
    this._tokens = null;
    logger.info('YouTube authentication cleared');
  }

  /**
   * Upload video to YouTube
   * @param {string} videoPath - Path to mp4 file
   * @param {object} meta - { title, description, tags, categoryId, privacyStatus, publishAt, thumbnailPath }
   * @param {function} onProgress - Upload progress callback
   * @returns {Promise<{videoId: string, videoUrl: string}>}
   */
  async upload(videoPath, meta, onProgress = () => {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with YouTube. Please sign in first.');
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const { google } = require('googleapis');
    const youtube = google.youtube({ version: 'v3', auth: this._auth });

    logger.info(`Uploading video: ${meta.title}`);

    const fileSize = fs.statSync(videoPath).size;

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: meta.title,
          description: meta.description || '',
          tags: meta.tags || [],
          categoryId: meta.categoryId || '22', // People & Blogs
          defaultLanguage: meta.language || 'ja',
        },
        status: {
          privacyStatus: meta.privacyStatus || 'private', // Default to private for safety
          publishAt: meta.publishAt || undefined,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    }, {
      onUploadProgress: (evt) => {
        const progress = Math.round((evt.bytesRead / fileSize) * 100);
        onProgress(progress);
      },
    });

    const videoId = response.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Upload thumbnail if available
    if (meta.thumbnailPath && fs.existsSync(meta.thumbnailPath)) {
      try {
        await youtube.thumbnails.set({
          videoId,
          media: {
            body: fs.createReadStream(meta.thumbnailPath),
          },
        });
        logger.info('Thumbnail uploaded');
      } catch (err) {
        logger.error('Thumbnail upload failed (video still uploaded)', err);
      }
    }

    logger.info(`Video uploaded: ${videoUrl}`);
    return { videoId, videoUrl };
  }

  /**
   * Get upload quota/status info
   */
  async getQuotaInfo() {
    if (!this.isAuthenticated()) return null;

    const { google } = require('googleapis');
    const youtube = google.youtube({ version: 'v3', auth: this._auth });

    const response = await youtube.channels.list({
      part: 'statistics',
      mine: true,
    });

    return response.data.items?.[0]?.statistics || null;
  }
}

module.exports = { YouTubePublisher };
