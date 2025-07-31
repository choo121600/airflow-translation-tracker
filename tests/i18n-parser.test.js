const I18nParser = require('../lib/i18n-parser');

describe('I18nParser', () => {
  let parser;

  beforeEach(() => {
    parser = new I18nParser();
  });

  describe('flattenObject', () => {
    test('should flatten nested objects correctly', () => {
      const nested = {
        user: {
          name: 'John',
          profile: {
            email: 'john@example.com',
            age: 30
          }
        },
        settings: {
          theme: 'dark'
        }
      };

      const flattened = parser.flattenObject(nested);
      
      expect(flattened).toEqual({
        'user.name': 'John',
        'user.profile.email': 'john@example.com',
        'user.profile.age': 30,
        'settings.theme': 'dark'
      });
    });

    test('should handle arrays as values', () => {
      const obj = {
        items: ['a', 'b', 'c'],
        nested: {
          list: [1, 2, 3]
        }
      };

      const flattened = parser.flattenObject(obj);
      
      expect(flattened).toEqual({
        'items': ['a', 'b', 'c'],
        'nested.list': [1, 2, 3]
      });
    });
  });

  describe('expandPluralKeys', () => {
    test('should expand plural keys for Korean (only _other)', () => {
      const keys = ['message_other', 'title'];
      const expanded = parser.expandPluralKeys(keys, 'ko');
      
      expect(expanded).toContain('message_other');
      expect(expanded).toContain('title');
    });

    test('should expand plural keys for Polish', () => {
      const keys = ['message_one', 'title'];
      const expanded = parser.expandPluralKeys(keys, 'pl');
      
      expect(expanded).toContain('message_one');
      expect(expanded).toContain('message_few');
      expect(expanded).toContain('message_many');
      expect(expanded).toContain('message_other');
      expect(expanded).toContain('title');
    });

    test('should handle non-plural keys correctly', () => {
      const keys = ['title', 'description'];
      const expanded = parser.expandPluralKeys(keys, 'en');
      
      expect(expanded).toEqual(['title', 'description']);
    });
  });

  describe('calculateLanguageCoverage', () => {
    test('should calculate coverage correctly', () => {
      const baseKeys = ['title', 'description', 'message_other'];
      const targetKeys = ['title', 'message_other'];
      
      const coverage = parser.calculateLanguageCoverage(baseKeys, targetKeys, 'ko');
      
      expect(coverage.total).toBe(3);
      expect(coverage.translated).toBe(2);
      expect(coverage.coverage).toBe(66.7);
      expect(coverage.missing).toBe(1);
    });

    test('should handle empty target keys', () => {
      const baseKeys = ['title', 'description'];
      const targetKeys = [];
      
      const coverage = parser.calculateLanguageCoverage(baseKeys, targetKeys, 'en');
      
      expect(coverage.coverage).toBe(0);
      expect(coverage.translated).toBe(0);
      expect(coverage.missing).toBe(2);
    });
  });

  describe('parseJsonContent', () => {
    test('should parse valid JSON and flatten it', () => {
      const jsonString = '{"user": {"name": "John"}, "title": "Hello"}';
      const parsed = parser.parseJsonContent(jsonString);
      
      expect(parsed).toEqual({
        'user.name': 'John',
        'title': 'Hello'
      });
    });

    test('should return empty object for invalid JSON', () => {
      const invalidJson = '{"invalid": json}';
      const parsed = parser.parseJsonContent(invalidJson);
      
      expect(parsed).toEqual({});
    });
  });
});