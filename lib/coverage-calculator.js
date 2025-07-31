const I18nParser = require('./i18n-parser');
const cache = require('./cache');

class CoverageCalculator {
  constructor() {
    this.parser = new I18nParser();
  }


  async calculateLanguageCoverage(owner, repo, targetLanguage, customPath = null) {
    const cached = cache.getCachedCoverage(owner, repo, targetLanguage, customPath || '');
    if (cached) {
      return cached;
    }

    try {
      const { translations } = await this.parser.parseRepository(owner, repo, customPath);
      
      if (!translations[targetLanguage]) {
        throw new Error('LANGUAGE_NOT_FOUND');
      }

      const baseKeys = this.parser.getBaseLanguageKeys(translations);
      if (baseKeys.length === 0) {
        throw new Error('NO_BASE_LANGUAGE');
      }

      const targetKeys = this.parser.getAllKeysFromTranslation(translations[targetLanguage]);
      const coverage = this.parser.calculateLanguageCoverage(baseKeys, targetKeys, targetLanguage);

      const result = {
        language: targetLanguage,
        ...coverage
      };

      cache.setCachedCoverage(owner, repo, result, targetLanguage, customPath || '');
      return result;
    } catch (error) {
      throw error;
    }
  }

  isBaseLanguage(language) {
    const baseLanguages = ['en', 'en-US', 'en_US'];
    return baseLanguages.includes(language);
  }

  getCoverageColor(percentage) {
    if (percentage >= 95) return '#4c1';
    if (percentage >= 80) return '#dfb317';
    if (percentage >= 60) return '#fe7d37';
    return '#e05d44';
  }

  getCoverageStatus(percentage) {
    if (percentage >= 95) return 'excellent';
    if (percentage >= 80) return 'good';
    if (percentage >= 60) return 'fair';
    return 'poor';
  }

}

module.exports = CoverageCalculator;