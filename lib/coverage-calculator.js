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
      const { structure, keyCounts } = await this.parser.parseRepository(owner, repo, customPath);
      
      if (!keyCounts[targetLanguage]) {
        throw new Error('LANGUAGE_NOT_FOUND');
      }

      // Find base language (English variants)
      const baseLanguages = ['en', 'en-US', 'en_US'];
      const baseLang = baseLanguages.find(lang => keyCounts[lang]) || Object.keys(keyCounts)[0];
      
      if (!baseLang || !keyCounts[baseLang] || keyCounts[baseLang].keyCount === 0) {
        throw new Error('NO_BASE_LANGUAGE');
      }

      const baseData = keyCounts[baseLang];
      const targetData = keyCounts[targetLanguage];
      
      const baseKeyCount = baseData.keyCount;
      const targetKeyCount = targetData.keyCount;
      const actualTranslated = targetData.actualTranslated || targetKeyCount; // Fallback for old format
      
      // Coverage calculation: matching keys / total base keys * 100
      const coverage = baseKeyCount > 0 ? (targetKeyCount / baseKeyCount) * 100 : 0;
      
      // Completion calculation: actual translations (excluding TODOs) / total base keys * 100
      const completion = baseKeyCount > 0 ? (actualTranslated / baseKeyCount) * 100 : 0;

      const result = {
        language: targetLanguage,
        coverage: Math.round(coverage * 10) / 10,
        completion: Math.round(completion * 10) / 10, // New: actual completion rate
        total: baseKeyCount,
        translated: targetKeyCount,
        actualTranslated: actualTranslated, // New: excluding TODOs
        missing: Math.max(0, baseKeyCount - targetKeyCount),
        todoCount: targetData.todoCount || 0 // New: TODO items count
      };

      // Add detailed information for debugging
      if (targetData.totalKeys && targetData.totalKeys !== targetKeyCount) {
        console.log(`📊 ${targetLanguage} has ${targetData.totalKeys} total keys, ${targetKeyCount} match base language`);
      }
      
      if (result.todoCount > 0) {
        console.log(`📊 Coverage for ${targetLanguage}: ${result.coverage}% (${targetKeyCount}/${baseKeyCount} keys), Completion: ${result.completion}% (${result.todoCount} TODOs)`);
      } else {
        console.log(`📊 Coverage for ${targetLanguage}: ${result.coverage}% (${targetKeyCount}/${baseKeyCount} matching keys)`);
      }

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