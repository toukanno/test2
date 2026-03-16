const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../data-layer/logger');
const logger = createLogger('image-generator');

class ImageGenerator {
  constructor(aiProvider, storagePath) {
    this.ai = aiProvider;
    this.storagePath = storagePath;
  }

  /**
   * Generate an image for a scene
   * @param {object} scene - Scene object with imagePrompt
   * @returns {Promise<{filePath: string, fileName: string}>}
   */
  async generate(scene) {
    const prompt = scene.imagePrompt || scene.description;
    if (!prompt) {
      throw new Error('No image prompt available for this scene');
    }

    logger.info(`Generating image for scene ${scene.sceneNumber}: "${prompt.substring(0, 50)}..."`);

    const imageBuffer = await this.ai.generateImage(prompt, {
      size: '1792x1024', // 16:9 ratio
      quality: 'standard',
    });

    const fileName = `scene_${scene.sceneNumber}_${uuidv4().substring(0, 8)}.png`;
    const outputDir = path.join(this.storagePath, 'temp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    logger.info(`Image saved: ${filePath}`);
    return { filePath, fileName };
  }

  /**
   * Generate a placeholder image (1x1 black PNG)
   * Creates an actual file so downstream processing doesn't break
   */
  createPlaceholder(scene) {
    const fileName = `placeholder_${scene.sceneNumber}.png`;
    const outputDir = path.join(this.storagePath, 'temp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, fileName);

    // Minimal valid 1x1 black PNG (67 bytes)
    const PNG_1x1_BLACK = Buffer.from(
      '89504e470d0a1a0a0000000d4948445200000001000000010800000000' +
      '3a7e9b550000000a49444154789c626000000002000198e1938a000000' +
      '0049454e44ae426082',
      'hex'
    );
    fs.writeFileSync(filePath, PNG_1x1_BLACK);

    logger.info(`Placeholder image created: ${filePath}`);
    return { filePath, fileName, isPlaceholder: true };
  }
}

module.exports = { ImageGenerator };
