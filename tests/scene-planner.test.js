import { describe, expect, it } from 'vitest';

// ScenePlanner requires aiProvider in constructor but _parseDuration and splitScenes
// don't use it, so we pass null for pure function testing
const { ScenePlanner } = require('../app/modules/scene-planner/index.js');

describe('ScenePlanner', () => {
  const planner = new ScenePlanner(null);

  describe('_parseDuration', () => {
    it('returns default 10 for null', () => {
      expect(planner._parseDuration(null)).toBe(10);
    });

    it('returns default 10 for undefined', () => {
      expect(planner._parseDuration(undefined)).toBe(10);
    });

    it('passes through numbers', () => {
      expect(planner._parseDuration(5)).toBe(5);
    });

    it('parses string with digits', () => {
      expect(planner._parseDuration('30s')).toBe(30);
    });

    it('parses plain number string', () => {
      expect(planner._parseDuration('15')).toBe(15);
    });

    it('returns default for non-numeric string', () => {
      expect(planner._parseDuration('abc')).toBe(10);
    });
  });

  describe('splitScenes', () => {
    it('returns empty array for null input', () => {
      expect(planner.splitScenes(null)).toEqual([]);
    });

    it('returns empty array for missing scenes', () => {
      expect(planner.splitScenes({})).toEqual([]);
    });

    it('splits scenes with correct fields', () => {
      const result = planner.splitScenes({
        scenes: [
          { title: 'Intro', narration: 'Hello', duration: 5, imagePrompt: 'sunset' },
          { title: 'End', narration: 'Bye', duration: 10 },
        ]
      });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Intro');
      expect(result[0].narration).toBe('Hello');
      expect(result[0].duration).toBe(5);
      expect(result[0].imagePrompt).toBe('sunset');
      expect(result[0].imageStatus).toBe('pending');
      expect(result[0].status).toBe('draft');
      expect(result[0].id).toBeTruthy(); // UUID generated

      expect(result[1].sceneNumber).toBe(2);
      expect(result[1].imagePrompt).toBe('');
    });

    it('provides default values for missing fields', () => {
      const result = planner.splitScenes({ scenes: [{}] });
      expect(result[0].title).toBe('Scene 1');
      expect(result[0].narration).toBe('');
      expect(result[0].duration).toBe(10); // default
      expect(result[0].sceneNumber).toBe(1);
    });
  });
});
