const I18nParser = require('./i18n-parser');
const cache = require('./cache');

class CoverageCalculator {
  constructor() {
    this.parser = new I18nParser();
  }

  async calculateRepositoryCoverage(owner, repo, customPath = null) {
    const cached = cache.getCachedCoverage(owner, repo, null, customPath || '');
    if (cached) {
      return cached;
    }

    try {
      const { structure, translations } = await this.parser.parseRepository(owner, repo, customPath);
      
      const baseKeys = this.parser.getBaseLanguageKeys(translations);
      if (baseKeys.length === 0) {
        throw new Error('NO_BASE_LANGUAGE');
      }

      const coverageResults = {};
      let totalCoverage = 0;
      let languageCount = 0;

      for (const [language, translation] of Object.entries(translations)) {
        if (this.isBaseLanguage(language)) continue;

        const targetKeys = this.parser.getAllKeysFromTranslation(translation);
        const coverage = this.parser.calculateLanguageCoverage(baseKeys, targetKeys, language);
        
        coverageResults[language] = coverage;
        totalCoverage += coverage.coverage;
        languageCount++;
      }

      const overallCoverage = languageCount > 0 ? totalCoverage / languageCount : 0;

      const result = {
        overall: {
          coverage: Math.round(overallCoverage * 10) / 10,
          languages: languageCount,
          totalKeys: baseKeys.length
        },
        languages: coverageResults,
        structure
      };

      cache.setCachedCoverage(owner, repo, result, null, customPath || '');
      return result;
    } catch (error) {
      throw error;
    }
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

  formatCoverageText(coverage, language = null) {
    if (language) {
      return `${coverage.coverage}%`;
    }
    return `${coverage.languages}/${coverage.languages + 1} languages`;
  }
}

module.exports = CoverageCalculator;