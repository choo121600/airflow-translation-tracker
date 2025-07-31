const GitHubClient = require('./github');

class I18nParser {
  constructor() {
    this.github = new GitHubClient();
    
    this.pluralRules = {
      'ar': ['_zero', '_one', '_two', '_few', '_many', '_other'],
      'cs': ['_one', '_few', '_many', '_other'],
      'pl': ['_one', '_few', '_many', '_other'], 
      'ru': ['_one', '_few', '_many', '_other'],
      'lt': ['_one', '_few', '_many', '_other'],
      'lv': ['_zero', '_one', '_other'],
      'ro': ['_one', '_few', '_other'],
      'sk': ['_one', '_few', '_many', '_other'],
      'sl': ['_one', '_two', '_few', '_other'],
      'uk': ['_one', '_few', '_many', '_other'],
      'be': ['_one', '_few', '_many', '_other'],
      'hr': ['_one', '_few', '_other'],
      'sr': ['_one', '_few', '_other'],
      'bs': ['_one', '_few', '_other'],
      'mk': ['_one', '_other'],
      'mt': ['_one', '_few', '_many', '_other'],
      'ga': ['_one', '_two', '_few', '_many', '_other'],
      'gd': ['_one', '_two', '_few', '_other'],
      'cy': ['_zero', '_one', '_two', '_few', '_many', '_other'],
      'br': ['_one', '_two', '_few', '_many', '_other'],
      'default': ['_other']
    };
  }

  async parseRepository(owner, repo, customPath = null) {
    try {
      const structure = await this.github.detectI18nStructure(owner, repo, customPath);
      
      if (!structure.isValidI18n) {
        throw new Error('NO_VALID_I18N_STRUCTURE');
      }

      const translations = {};
      
      if (structure.pattern === 'lang-dir') {
        for (const lang of structure.languages) {
          translations[lang] = await this.parseLanguageDirectory(owner, repo, `${structure.basePath}/${lang}`);
        }
      } else if (structure.pattern === 'lang-file') {
        for (const lang of structure.languages) {
          const content = await this.github.getFileContent(owner, repo, `${structure.basePath}/${lang}.json`);
          translations[lang] = this.parseJsonContent(content.content);
        }
      }

      return {
        structure,
        translations
      };
    } catch (error) {
      throw error;
    }
  }

  async parseLanguageDirectory(owner, repo, langPath) {
    try {
      const files = await this.github.getRepositoryFiles(owner, repo, langPath);
      const translations = {};

      if (Array.isArray(files)) {
        for (const file of files) {
          if (file.name.endsWith('.json')) {
            const namespace = file.name.replace('.json', '');
            const content = await this.github.getFileContent(owner, repo, file.path);
            translations[namespace] = this.parseJsonContent(content.content);
          }
        }
      }

      return translations;
    } catch (error) {
      return {};
    }
  }

  parseJsonContent(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return this.flattenObject(parsed);
    } catch (error) {
      return {};
    }
  }

  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  }

  expandPluralKeys(keys, language) {
    const pluralForms = this.pluralRules[language] || this.pluralRules['default'];
    const expandedKeys = new Set();

    for (const key of keys) {
      const isPluralKey = pluralForms.some(form => key.endsWith(form));
      
      if (isPluralKey) {
        const baseKey = key.replace(/(_zero|_one|_two|_few|_many|_other)$/, '');
        for (const form of pluralForms) {
          expandedKeys.add(`${baseKey}${form}`);
        }
      } else {
        const hasPlural = keys.some(k => k.startsWith(key + '_') && pluralForms.some(form => k.endsWith(form)));
        if (hasPlural) {
          for (const form of pluralForms) {
            expandedKeys.add(`${key}${form}`);
          }
        } else {
          expandedKeys.add(key);
        }
      }
    }

    return Array.from(expandedKeys);
  }

  getBaseLanguageKeys(translations) {
    const baseLanguages = ['en', 'en-US', 'en_US'];
    let baseKeys = [];

    for (const baseLang of baseLanguages) {
      if (translations[baseLang]) {
        baseKeys = this.getAllKeysFromTranslation(translations[baseLang]);
        break;
      }
    }

    if (baseKeys.length === 0) {
      const firstLang = Object.keys(translations)[0];
      if (firstLang) {
        baseKeys = this.getAllKeysFromTranslation(translations[firstLang]);
      }
    }

    return baseKeys;
  }

  getAllKeysFromTranslation(translation) {
    const allKeys = [];
    
    if (typeof translation === 'object') {
      for (const namespace in translation) {
        const keys = Object.keys(translation[namespace]);
        allKeys.push(...keys);
      }
    } else {
      return Object.keys(translation);
    }
    
    return allKeys;
  }

  calculateLanguageCoverage(baseKeys, targetKeys, language) {
    const expandedBaseKeys = this.expandPluralKeys(baseKeys, 'en');
    const expandedTargetKeys = this.expandPluralKeys(targetKeys, language);
    
    const targetKeySet = new Set(expandedTargetKeys);
    const matchingKeys = expandedBaseKeys.filter(key => targetKeySet.has(key));
    
    const coverage = expandedBaseKeys.length > 0 
      ? (matchingKeys.length / expandedBaseKeys.length) * 100 
      : 0;
      
    return {
      coverage: Math.round(coverage * 10) / 10,
      total: expandedBaseKeys.length,
      translated: matchingKeys.length,
      missing: expandedBaseKeys.length - matchingKeys.length
    };
  }
}

module.exports = I18nParser;