const { BaseAIProvider } = require('./base-provider');
const { createLogger } = require('../data-layer/logger');

const logger = createLogger('openai-provider');

class OpenAIProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this._client = null;
  }

  _getClient() {
    if (!this._client) {
      const OpenAI = require('openai');
      this._client = new OpenAI({
        apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
      });
    }
    return this._client;
  }

  async generateText(prompt, options = {}) {
    const client = this._getClient();
    const {
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.',
      model = 'gpt-4o',
    } = options;

    logger.info(`Generating text with model=${model}`);

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    return response.choices[0].message.content;
  }

  async generateJSON(prompt, schemaDescription, options = {}) {
    const client = this._getClient();
    const {
      maxTokens = 4096,
      temperature = 0.5,
      systemPrompt = 'You are a helpful assistant. Always respond with valid JSON only, no markdown.',
      model = 'gpt-4o',
    } = options;

    logger.info(`Generating JSON with model=${model}`);

    const fullPrompt = `${prompt}\n\nRespond with valid JSON matching this structure:\n${schemaDescription}`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content;
    return JSON.parse(text);
  }

  async generateImage(prompt, options = {}) {
    const client = this._getClient();
    const {
      size = '1792x1024',
      quality = 'standard',
      model = 'dall-e-3',
    } = options;

    logger.info(`Generating image: "${prompt.substring(0, 50)}..."`);

    const response = await client.images.generate({
      model,
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'b64_json',
    });

    return Buffer.from(response.data[0].b64_json, 'base64');
  }

  async generateSpeech(text, options = {}) {
    const client = this._getClient();
    const {
      voice = 'alloy',
      speed = 1.0,
      model = 'tts-1',
      responseFormat = 'mp3',
    } = options;

    logger.info(`Generating speech: ${text.substring(0, 50)}...`);

    const response = await client.audio.speech.create({
      model,
      voice,
      input: text,
      speed,
      response_format: responseFormat,
    });

    return Buffer.from(await response.arrayBuffer());
  }

  async validateKey() {
    try {
      const client = this._getClient();
      await client.models.list();
      return true;
    } catch (err) {
      logger.error('API key validation failed', err);
      return false;
    }
  }
}

module.exports = { OpenAIProvider };
