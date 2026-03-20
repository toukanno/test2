import { describe, expect, it } from 'vitest';

// Import the module directly — _formatTime and _formatTimeVTT are instance methods
const { SubtitleGenerator } = require('../app/modules/subtitle-generator/index.js');

describe('SubtitleGenerator', () => {
  const gen = new SubtitleGenerator();

  describe('_formatTime (SRT format)', () => {
    it('formats zero seconds', () => {
      expect(gen._formatTime(0)).toBe('00:00:00,000');
    });

    it('formats fractional seconds', () => {
      expect(gen._formatTime(1.5)).toBe('00:00:01,500');
    });

    it('formats minutes', () => {
      expect(gen._formatTime(65)).toBe('00:01:05,000');
    });

    it('formats hours', () => {
      expect(gen._formatTime(3661.5)).toBe('01:01:01,500');
    });

    it('handles large values', () => {
      expect(gen._formatTime(36000)).toBe('10:00:00,000');
    });
  });

  describe('_formatTimeVTT (VTT format)', () => {
    it('uses dot instead of comma', () => {
      expect(gen._formatTimeVTT(1.5)).toBe('00:00:01.500');
    });

    it('formats zero', () => {
      expect(gen._formatTimeVTT(0)).toBe('00:00:00.000');
    });
  });
});
