const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../data-layer/logger');
const logger = createLogger('video-generator');

class VideoGenerator {
  constructor(storagePath) {
    this.storagePath = storagePath;
  }

  /**
   * Render final video from scenes using ffmpeg
   * @param {object} project - Project data
   * @param {Array<object>} scenes - Array of scene objects with image/audio/subtitle paths
   * @param {function} onProgress - Progress callback (0-100)
   * @returns {Promise<{outputPath: string}>}
   */
  async render(project, scenes, onProgress = () => {}) {
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = process.env.FFMPEG_PATH;
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }

    const outputDir = path.join(this.storagePath, 'outputs', project.id);
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${project.id}_final.mp4`);
    const tempDir = path.join(this.storagePath, 'temp', project.id);
    fs.mkdirSync(tempDir, { recursive: true });

    logger.info(`Rendering video for project ${project.id} with ${scenes.length} scenes`);

    // Step 1: Create individual scene videos
    const sceneVideos = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneVideoPath = path.join(tempDir, `scene_${i}.mp4`);

      await this._renderScene(ffmpeg, scene, sceneVideoPath);
      sceneVideos.push(sceneVideoPath);

      onProgress(Math.round(((i + 1) / scenes.length) * 80));
    }

    // Step 2: Concatenate all scene videos
    await this._concatenateVideos(ffmpeg, sceneVideos, outputPath, tempDir);
    onProgress(95);

    // Step 3: Add subtitles if available
    const subtitlePath = path.join(outputDir, 'subtitles.srt');
    if (fs.existsSync(subtitlePath)) {
      const withSubsPath = path.join(outputDir, `${project.id}_subtitled.mp4`);
      await this._burnSubtitles(ffmpeg, outputPath, subtitlePath, withSubsPath);
      // Replace output
      fs.renameSync(withSubsPath, outputPath);
    }

    // Cleanup temp files
    this._cleanupTemp(tempDir, sceneVideos);

    onProgress(100);
    logger.info(`Video rendered: ${outputPath}`);

    return { outputPath };
  }

  /**
   * Clean up temporary scene videos and concat list
   */
  _cleanupTemp(tempDir, sceneVideos) {
    try {
      for (const vid of sceneVideos) {
        if (fs.existsSync(vid)) fs.unlinkSync(vid);
      }
      const listPath = path.join(tempDir, 'concat_list.txt');
      if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
      logger.info('Temporary render files cleaned up');
    } catch (err) {
      logger.warn(`Temp cleanup warning: ${err.message}`);
    }
  }

  /**
   * Render a single scene: image + audio → video segment
   */
  _renderScene(ffmpeg, scene, outputPath) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      const duration = scene.duration || 10;

      // Use image as video source (loop for duration)
      if (scene.imagePath && fs.existsSync(scene.imagePath)) {
        command
          .input(scene.imagePath)
          .inputOptions(['-loop', '1', '-t', String(duration)])
          .inputOptions(['-framerate', '30']);
      } else {
        // Generate black screen as placeholder
        command
          .input(`color=c=black:s=1920x1080:d=${duration}:r=30`)
          .inputOptions(['-f', 'lavfi']);
      }

      // Add audio if available
      if (scene.audioPath && fs.existsSync(scene.audioPath)) {
        command.input(scene.audioPath);
        command.outputOptions(['-shortest']);
      } else {
        // Silent audio for duration
        command
          .input(`anullsrc=r=44100:cl=stereo`)
          .inputOptions(['-f', 'lavfi', '-t', String(duration)]);
      }

      command
        .outputOptions([
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-r', '30',
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => {
          logger.error(`Scene render failed: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Concatenate multiple video files
   */
  _concatenateVideos(ffmpeg, videoPaths, outputPath, tempDir) {
    return new Promise((resolve, reject) => {
      // Create concat list file (use forward slashes for FFmpeg compatibility on Windows)
      const listPath = path.join(tempDir, 'concat_list.txt');
      const listContent = videoPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(listPath, listContent);

      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => {
          logger.error(`Concatenation failed: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Burn subtitles into video
   */
  _burnSubtitles(ffmpeg, videoPath, subtitlePath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .outputOptions([
          '-vf', `subtitles='${subtitlePath.replace(/\\/g, '/').replace(/'/g, "'\\''").replace(/:/g, '\\:')}'`,
          '-c:a', 'copy',
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => {
          logger.error(`Subtitle burn failed: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }
}

module.exports = { VideoGenerator };
