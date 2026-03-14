/**
 * Base AI Provider Interface
 * All AI providers must implement these methods.
 */
class BaseAIProvider {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Generate text completion
   * @param {string} prompt
   * @param {object} options - { maxTokens, temperature, systemPrompt }
   * @returns {Promise<string>}
   */
  async generateText(prompt, options = {}) {
    throw new Error('generateText not implemented');
  }

  /**
   * Generate structured JSON response
   * @param {string} prompt
   * @param {object} schema - Expected JSON schema description
   * @param {object} options
   * @returns {Promise<object>}
   */
  async generateJSON(prompt, schema, options = {}) {
    throw new Error('generateJSON not implemented');
  }

  /**
   * Generate an image from a prompt
   * @param {string} prompt
   * @param {object} options - { size, quality, style }
   * @returns {Promise<Buffer>} Image data
   */
  async generateImage(prompt, options = {}) {
    throw new Error('generateImage not implemented');
  }

  /**
   * Generate speech audio from text
   * @param {string} text
   * @param {object} options - { voice, speed, format }
   * @returns {Promise<Buffer>} Audio data
   */
  async generateSpeech(text, options = {}) {
    throw new Error('generateSpeech not implemented');
  }

  /**
   * Validate the API key
   * @returns {Promise<boolean>}
   */
  async validateKey() {
    throw new Error('validateKey not implemented');
  }
}

module.exports = { BaseAIProvider };
