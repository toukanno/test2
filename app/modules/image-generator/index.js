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
   * Generate a placeholder image (solid color with text)
   */
  createPlaceholder(scene) {
    const fileName = `placeholder_${scene.sceneNumber}.png`;
    const outputDir = path.join(this.storagePath, 'temp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, fileName);

    // Return path even without actual file - ffmpeg can use a color source
    return { filePath, fileName, isPlaceholder: true };
  }
}

module.exports = { ImageGenerator };
