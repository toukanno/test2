const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../data-layer/logger');
const logger = createLogger('scene-planner');

class ScenePlanner {
  constructor(aiProvider) {
    this.ai = aiProvider;
  }

  /**
   * Split a generated script into individual scene records
   * @param {object} scriptData - Generated script with scenes array
   * @returns {Array<object>} Array of scene objects ready for storage
   */
  splitScenes(scriptData) {
    if (!scriptData || !scriptData.scenes || !Array.isArray(scriptData.scenes)) {
      logger.warn('No scenes found in script data');
      return [];
    }

    logger.info(`Splitting ${scriptData.scenes.length} scenes`);

    return scriptData.scenes.map((scene, index) => ({
      id: uuidv4(),
      sceneNumber: scene.sceneNumber || index + 1,
      title: scene.title || `Scene ${index + 1}`,
      description: scene.description || '',
      narration: scene.narration || '',
      duration: this._parseDuration(scene.duration),
      imagePrompt: scene.imagePrompt || '',
      notes: scene.notes || '',
      imageUrl: null,
      imagePath: null,
      imageStatus: 'pending',
      audioPath: null,
      audioStatus: 'pending',
      subtitlePath: null,
      status: 'draft',
    }));
  }

  /**
   * Parse duration string to seconds
   */
  _parseDuration(durationStr) {
    if (!durationStr) return 10;
    if (typeof durationStr === 'number') return durationStr;

    const match = durationStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 10;
  }

  /**
   * Regenerate image prompt for a specific scene using AI
   */
  async regenerateImagePrompt(scene) {
    const prompt = `
Generate an image generation prompt (in English, for DALL-E) for the following video scene:

Title: ${scene.title}
Description: ${scene.description}
Narration: ${scene.narration}

The image should be:
- 16:9 aspect ratio suitable for YouTube
- Visually compelling and relevant to the content
- Professional quality

Respond with just the prompt text, nothing else.
`;

    const result = await this.ai.generateText(prompt, { temperature: 0.7 });
    return result.trim();
  }
}

module.exports = { ScenePlanner };
