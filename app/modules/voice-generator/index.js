const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../data-layer/logger');
const logger = createLogger('voice-generator');

class VoiceGenerator {
  constructor(aiProvider, storagePath) {
    this.ai = aiProvider;
    this.storagePath = storagePath;
  }

  /**
   * Generate narration audio for a scene
   * @param {string} text - Narration text
   * @param {string} sceneId - Scene identifier
   * @param {object} options - { voice, speed }
   * @returns {Promise<{filePath: string, fileName: string}>}
   */
  async generate(text, sceneId, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('No narration text provided');
    }

    logger.info(`Generating voice for scene ${sceneId}: "${text.substring(0, 50)}..."`);

    const audioBuffer = await this.ai.generateSpeech(text, {
      voice: options.voice || 'alloy',
      speed: options.speed || 1.0,
      model: 'tts-1',
      responseFormat: 'mp3',
    });

    const fileName = `narration_${sceneId.substring(0, 8)}_${uuidv4().substring(0, 8)}.mp3`;
    const outputDir = path.join(this.storagePath, 'temp', 'audio');
    fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, audioBuffer);

    logger.info(`Audio saved: ${filePath}`);
    return { filePath, fileName };
  }

  /**
   * Import an external audio file and copy it to project storage
   */
  async importFile(sourcePath, sceneId) {
    const ext = path.extname(sourcePath);
    const fileName = `imported_${sceneId.substring(0, 8)}${ext}`;
    const outputDir = path.join(this.storagePath, 'temp', 'audio');
    fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, fileName);
    fs.copyFileSync(sourcePath, filePath);

    logger.info(`Audio imported: ${filePath}`);
    return { filePath, fileName };
  }
}

module.exports = { VoiceGenerator };
