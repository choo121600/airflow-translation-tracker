const BadgeGenerator = require('../lib/badge-generator');

describe('BadgeGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new BadgeGenerator();
  });

  describe('calculateTextWidth', () => {
    test('should calculate approximate text width', () => {
      expect(generator.calculateTextWidth('hello')).toBeGreaterThan(0);
      expect(generator.calculateTextWidth('hello world')).toBeGreaterThan(generator.calculateTextWidth('hello'));
    });
  });

  describe('escapeXml', () => {
    test('should escape XML special characters', () => {
      expect(generator.escapeXml('test & "quotes"')).toBe('test &amp; &quot;quotes&quot;');
      expect(generator.escapeXml('<tag>')).toBe('&lt;tag&gt;');
      expect(generator.escapeXml("it's")).toBe('it&#39;s');
    });
  });

  describe('generateSVG', () => {
    test('should generate valid SVG with correct structure', () => {
      const svg = generator.generateSVG('Korean', '95%', '#4c1');
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('Korean');
      expect(svg).toContain('95%');
      expect(svg).toContain('#4c1');
      expect(svg).toContain('</svg>');
    });

    test('should handle options correctly', () => {
      const svg = generator.generateSVG('test', '100%', '#4c1', { 
        style: 'flat-square',
        logo: 'github'
      });
      
      expect(svg).toContain('test');
      expect(svg).toContain('100%');
    });
  });

  describe('generateErrorBadge', () => {
    test('should generate error badges for known error types', () => {
      const errorTypes = [
        'REPO_NOT_FOUND',
        'NO_I18N_FILES', 
        'INVALID_PATH',
        'RATE_LIMITED',
        'UNAVAILABLE',
        'LANGUAGE_NOT_FOUND'
      ];

      errorTypes.forEach(errorType => {
        const svg = generator.generateErrorBadge(errorType);
        expect(svg).toContain('<svg');
        expect(svg).toContain('i18n');
        expect(svg).toContain('#e05d44'); // Error color
      });
    });

    test('should generate generic error badge for unknown error', () => {
      const svg = generator.generateErrorBadge('UNKNOWN_ERROR');
      expect(svg).toContain('error');
    });
  });

  describe('getLogoData', () => {
    test('should return base64 data for known logos', () => {
      const translateLogo = generator.getLogoData('translate');
      const githubLogo = generator.getLogoData('github');
      
      expect(translateLogo).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(githubLogo).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(translateLogo).not.toBe(githubLogo);
    });

    test('should return default logo for unknown logo name', () => {
      const defaultLogo = generator.getLogoData('unknown');
      const translateLogo = generator.getLogoData('translate');
      
      expect(defaultLogo).toBe(translateLogo);
    });
  });
});