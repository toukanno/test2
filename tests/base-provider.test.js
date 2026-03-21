import { describe, expect, it } from 'vitest';

const { BaseAIProvider } = require('../app/modules/ai-provider/base-provider.js');

describe('BaseAIProvider', () => {
  describe('constructor', () => {
    it('accepts config', () => {
      const provider = new BaseAIProvider({ apiKey: 'test' });
      expect(provider.config).toEqual({ apiKey: 'test' });
    });

    it('defaults to empty config', () => {
      const provider = new BaseAIProvider();
      expect(provider.config).toEqual({});
    });
  });

  describe('abstract methods throw', () => {
    const provider = new BaseAIProvider();

    it('generateText throws not implemented', async () => {
      await expect(provider.generateText('hello')).rejects.toThrow('generateText not implemented');
    });

    it('generateJSON throws not implemented', async () => {
      await expect(provider.generateJSON('hello', {})).rejects.toThrow('generateJSON not implemented');
    });

    it('generateImage throws not implemented', async () => {
      await expect(provider.generateImage('a cat')).rejects.toThrow('generateImage not implemented');
    });

    it('generateSpeech throws not implemented', async () => {
      await expect(provider.generateSpeech('hello')).rejects.toThrow('generateSpeech not implemented');
    });

    it('validateKey throws not implemented', async () => {
      await expect(provider.validateKey()).rejects.toThrow('validateKey not implemented');
    });
  });
});
