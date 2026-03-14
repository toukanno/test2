const fs = require('fs');
const path = require('path');
const { createLogger } = require('../data-layer/logger');
const logger = createLogger('subtitle-generator');

class SubtitleGenerator {
  /**
   * Generate SRT subtitle file from scenes
   * @param {Array<object>} scenes - Array of scene objects with narration and duration
   * @param {string} outputPath - Where to save the SRT file
   * @returns {string} Path to generated SRT file
   */
  generateSRT(scenes, outputPath) {
    logger.info(`Generating SRT for ${scenes.length} scenes`);

    let srtContent = '';
    let currentTime = 0;

    scenes.forEach((scene, index) => {
      const startTime = this._formatTime(currentTime);
      const endTime = this._formatTime(currentTime + scene.duration);

      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${scene.narration || ''}\n\n`;

      currentTime += scene.duration;
    });

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, srtContent, 'utf-8');
    logger.info(`SRT saved: ${outputPath}`);

    return outputPath;
  }

  /**
   * Generate VTT subtitle file from scenes
   */
  generateVTT(scenes, outputPath) {
    logger.info(`Generating VTT for ${scenes.length} scenes`);

    let vttContent = 'WEBVTT\n\n';
    let currentTime = 0;

    scenes.forEach((scene, index) => {
      const startTime = this._formatTimeVTT(currentTime);
      const endTime = this._formatTimeVTT(currentTime + scene.duration);

      vttContent += `${index + 1}\n`;
      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${scene.narration || ''}\n\n`;

      currentTime += scene.duration;
    });

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, vttContent, 'utf-8');
    logger.info(`VTT saved: ${outputPath}`);

    return outputPath;
  }

  /**
   * Format seconds to SRT time format: HH:MM:SS,mmm
   */
  _formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * Format seconds to VTT time format: HH:MM:SS.mmm
   */
  _formatTimeVTT(seconds) {
    return this._formatTime(seconds).replace(',', '.');
  }
}

module.exports = { SubtitleGenerator };
