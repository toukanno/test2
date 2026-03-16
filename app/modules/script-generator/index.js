const { createLogger } = require('../data-layer/logger');
const logger = createLogger('script-generator');

class ScriptGenerator {
  constructor(aiProvider) {
    this.ai = aiProvider;
  }

  /**
   * Generate a full video script from theme parameters
   * @param {object} params - { theme, duration, tone, targetAudience, language }
   * @returns {Promise<object>} Script data with title, scenes, narrations
   */
  async generate(params) {
    const { theme, duration = '5分', tone = 'informative', targetAudience = '一般', language = 'ja' } = params;

    logger.info(`Generating script for theme: "${theme}"`);

    const prompt = `
あなたはプロの動画クリエイターです。以下の条件でYouTube動画の台本を作成してください。

テーマ: ${theme}
動画時間: ${duration}
トーン: ${tone}
対象視聴者: ${targetAudience}
言語: ${language === 'ja' ? '日本語' : 'English'}

以下のJSON形式で出力してください:
{
  "title": "動画タイトル案",
  "titleAlternatives": ["代替タイトル1", "代替タイトル2"],
  "summary": "動画の概要（2-3文）",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "シーンタイトル",
      "description": "シーンの説明（画面に何を表示するか）",
      "narration": "ナレーション原稿",
      "duration": "推定秒数",
      "imagePrompt": "このシーンの画像を生成するための英語プロンプト",
      "notes": "演出メモ"
    }
  ],
  "totalEstimatedDuration": "推定合計時間",
  "tags": ["タグ1", "タグ2", "タグ3"]
}
`;

    const schemaDesc = `{
  title: string,
  titleAlternatives: string[],
  summary: string,
  scenes: Array<{
    sceneNumber: number,
    title: string,
    description: string,
    narration: string,
    duration: string,
    imagePrompt: string,
    notes: string
  }>,
  totalEstimatedDuration: string,
  tags: string[]
}`;

    const result = await this.ai.generateJSON(prompt, schemaDesc, {
      systemPrompt: 'あなたはプロの動画台本ライターです。常に有効なJSONのみで応答してください。',
      temperature: 0.8,
      maxTokens: 8192,
    });

    // Validate required fields
    if (!result.title || typeof result.title !== 'string') {
      throw new Error('AIが有効な台本を生成できませんでした（タイトルがありません）');
    }
    if (!Array.isArray(result.scenes) || result.scenes.length === 0) {
      throw new Error('AIが有効な台本を生成できませんでした（シーンがありません）');
    }

    // Ensure each scene has required fields with defaults
    result.scenes = result.scenes.map((scene, i) => ({
      sceneNumber: scene.sceneNumber || i + 1,
      title: scene.title || `シーン ${i + 1}`,
      description: scene.description || '',
      narration: scene.narration || '',
      duration: scene.duration || '10',
      imagePrompt: scene.imagePrompt || scene.description || '',
      notes: scene.notes || '',
    }));

    result.tags = Array.isArray(result.tags) ? result.tags : [];
    result.titleAlternatives = Array.isArray(result.titleAlternatives) ? result.titleAlternatives : [];
    result.summary = result.summary || '';

    logger.info(`Script generated: ${result.scenes.length} scenes`);
    return result;
  }

  /**
   * Generate YouTube metadata (title, description, tags) from project data
   * @param {object} project
   * @param {object} script
   * @returns {Promise<object>}
   */
  async generateYouTubeMeta(project, script) {
    logger.info(`Generating YouTube metadata for project: ${project.id}`);

    const prompt = `
以下の動画台本に基づいて、YouTube投稿用のメタデータを生成してください。

タイトル: ${script.title}
概要: ${script.summary}
シーン数: ${script.scenes?.length || 0}

以下のJSON形式で出力:
{
  "title": "YouTube用タイトル（60文字以内、SEO最適化）",
  "description": "YouTube概要欄（ハッシュタグ・タイムスタンプ含む）",
  "tags": ["タグ1", "タグ2", ...最大30個],
  "category": "YouTubeカテゴリID",
  "thumbnailPrompt": "サムネイル画像生成用の英語プロンプト"
}
`;

    return await this.ai.generateJSON(prompt, '{ title, description, tags, category, thumbnailPrompt }', {
      temperature: 0.7,
    });
  }
}

module.exports = { ScriptGenerator };
