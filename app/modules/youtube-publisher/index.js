const fs = require('fs');
const http = require('http');
const { createLogger } = require('../data-layer/logger');
const logger = createLogger('youtube-publisher');

class YouTubePublisher {
  constructor(tokenStore) {
    this._auth = null;
    this._tokens = null;
    this._tokenStore = tokenStore || null;

    // Restore tokens from persistent store
    if (this._tokenStore) {
      const saved = this._tokenStore.get('youtubeTokens');
      if (saved) {
        this._tokens = saved;
        logger.info('YouTube tokens restored from store');
      }
    }
  }

  /**
   * Ensure OAuth2 client is initialized with current tokens
   */
  _ensureAuth() {
    if (this._auth && this._tokens) return true;
    if (!this._tokens) return false;

    const { google } = require('googleapis');
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:8085/oauth2callback';

    if (!clientId || !clientSecret) return false;

    this._auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    this._auth.setCredentials(this._tokens);

    // Auto-refresh expired tokens
    this._auth.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        this._tokens = { ...this._tokens, ...tokens };
      } else {
        this._tokens = { ...this._tokens, access_token: tokens.access_token, expiry_date: tokens.expiry_date };
      }
      this._persistTokens();
    });

    return true;
  }

  /**
   * Save tokens to persistent store
   */
  _persistTokens() {
    if (this._tokenStore && this._tokens) {
      this._tokenStore.set('youtubeTokens', this._tokens);
    }
  }

  /**
   * Start OAuth 2.0 authentication flow
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
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
    });

    const { shell } = require('electron');
    shell.openExternal(authUrl);

    const code = await this._waitForAuthCallback(redirectUri);

    const { tokens } = await this._auth.getToken(code);
    this._auth.setCredentials(tokens);
    this._tokens = tokens;
    this._persistTokens();

    // Auto-refresh listener
    this._auth.on('tokens', (newTokens) => {
      this._tokens = { ...this._tokens, ...newTokens };
      this._persistTokens();
    });

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

      setTimeout(() => {
        server.close();
        reject(new Error('OAuth authentication timed out'));
      }, 300000);
    });
  }

  /**
   * Check if currently authenticated (restores from store if needed)
   */
  isAuthenticated() {
    if (this._auth && this._tokens) return true;
    // Try to restore from store
    return this._ensureAuth();
  }

  /**
   * Clear authentication
   */
  logout() {
    this._auth = null;
    this._tokens = null;
    if (this._tokenStore) {
      this._tokenStore.delete('youtubeTokens');
    }
    logger.info('YouTube authentication cleared');
  }

  /**
   * Upload video to YouTube
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
          categoryId: meta.categoryId || '22',
          defaultLanguage: meta.language || 'ja',
        },
        status: {
          privacyStatus: meta.privacyStatus || 'private',
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
