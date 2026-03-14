/**
 * Default application configuration
 * Override with environment variables or .env file
 */
module.exports = {
  // AI Provider settings
  ai: {
    provider: 'openai',
    openai: {
      model: 'gpt-4o',
      imageModel: 'dall-e-3',
      ttsModel: 'tts-1',
      ttsVoice: 'alloy',
      maxTokens: 4096,
      temperature: 0.7,
    },
  },

  // Video rendering settings
  video: {
    width: 1920,
    height: 1080,
    fps: 30,
    codec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    format: 'mp4',
  },

  // YouTube defaults
  youtube: {
    defaultPrivacy: 'private',
    defaultCategory: '22', // People & Blogs
    defaultLanguage: 'ja',
    callbackPort: 8085,
  },

  // Application
  app: {
    maxLogEntries: 500,
    autoSaveInterval: 30000, // 30 seconds
  },
};
