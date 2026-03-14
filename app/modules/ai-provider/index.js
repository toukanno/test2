/**
 * AI Provider Abstraction Layer
 * Enables swapping OpenAI for other providers without changing consumer code.
 */

const { OpenAIProvider } = require('./openai-provider');

const providers = {
  openai: OpenAIProvider,
};

/**
 * Factory function to create an AI provider instance.
 * @param {string} providerName - Name of the provider ('openai', etc.)
 * @param {object} config - Optional configuration override
 * @returns {AIProvider}
 */
function createAIProvider(providerName = 'openai', config = {}) {
  const ProviderClass = providers[providerName];
  if (!ProviderClass) {
    throw new Error(`Unknown AI provider: ${providerName}. Available: ${Object.keys(providers).join(', ')}`);
  }
  return new ProviderClass(config);
}

module.exports = { createAIProvider };
