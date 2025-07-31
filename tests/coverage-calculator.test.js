const CoverageCalculator = require('../lib/coverage-calculator');

describe('CoverageCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new CoverageCalculator();
  });

  describe('isBaseLanguage', () => {
    test('should identify English variants as base languages', () => {
      expect(calculator.isBaseLanguage('en')).toBe(true);
      expect(calculator.isBaseLanguage('en-US')).toBe(true);
      expect(calculator.isBaseLanguage('en_US')).toBe(true);
    });

    test('should not identify non-English languages as base', () => {
      expect(calculator.isBaseLanguage('ko')).toBe(false);
      expect(calculator.isBaseLanguage('fr')).toBe(false);
      expect(calculator.isBaseLanguage('de')).toBe(false);
    });
  });

  describe('getCoverageColor', () => {
    test('should return correct colors for coverage percentages', () => {
      expect(calculator.getCoverageColor(100)).toBe('#4c1');
      expect(calculator.getCoverageColor(95)).toBe('#4c1');
      expect(calculator.getCoverageColor(85)).toBe('#dfb317');
      expect(calculator.getCoverageColor(70)).toBe('#fe7d37');
      expect(calculator.getCoverageColor(50)).toBe('#e05d44');
    });
  });

  describe('getCoverageStatus', () => {
    test('should return correct status for coverage percentages', () => {
      expect(calculator.getCoverageStatus(100)).toBe('excellent');
      expect(calculator.getCoverageStatus(95)).toBe('excellent');
      expect(calculator.getCoverageStatus(85)).toBe('good');
      expect(calculator.getCoverageStatus(70)).toBe('fair');
      expect(calculator.getCoverageStatus(50)).toBe('poor');
    });
  });

  describe('formatCoverageText', () => {
    test('should format language-specific coverage correctly', () => {
      const coverage = { coverage: 95.5 };
      expect(calculator.formatCoverageText(coverage, 'ko')).toBe('95.5%');
    });

    test('should format overall coverage correctly', () => {
      const coverage = { languages: 3 };
      expect(calculator.formatCoverageText(coverage)).toBe('3/4 languages');
    });
  });
});