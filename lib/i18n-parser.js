const GitHubClient = require('./github');
const cache = require('./cache');

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
      // Check if we have complete translations cached
      const translationsCacheKey = `key_counts:${owner}:${repo}:${customPath || ''}`;
      const cachedKeyCounts = cache.getCachedCoverage(owner, repo, 'key_counts', customPath || '');
      
      if (cachedKeyCounts && cachedKeyCounts.keyCounts) {
        console.log(`🚀 Using cached key counts for ${owner}/${repo} - skipping all API calls`);
        return {
          structure: cachedKeyCounts.structure,
          keyCounts: cachedKeyCounts.keyCounts
        };
      }
      
      const structure = await this.github.detectI18nStructure(owner, repo, customPath);
      
      if (!structure.isValidI18n) {
        throw new Error('NO_VALID_I18N_STRUCTURE');
      }

      const keyCounts = {};
      
      if (structure.pattern === 'lang-dir') {
        // 🚀 Hybrid approach: Full parsing for base language + sampling for others
        console.log(`🚀 Hybrid approach: ${structure.languages.length} languages (full base + sampling)`);
        
        // Step 1: Find and fully parse base language (English)
        const baseLanguages = ['en', 'en-US', 'en_US'];
        const baseLang = baseLanguages.find(lang => structure.languages.includes(lang)) || structure.languages[0];
        
        console.log(`📖 Fully parsing base language: ${baseLang}`);
        const baseTranslation = await this.parseLanguageDirectory(owner, repo, `${structure.basePath}/${baseLang}`);
        const baseKeys = this.getAllKeysFromTranslation(baseTranslation);
        
        if (baseKeys.length === 0) {
          throw new Error('NO_BASE_LANGUAGE');
        }
        
        keyCounts[baseLang] = {
          keyCount: baseKeys.length,
          allKeys: baseKeys, // Store actual keys for matching
          isFullyParsed: true
        };
        
        console.log(`✅ Base language ${baseLang}: ${baseKeys.length} keys fully parsed`);
        
        // Step 2: Sample other languages for approximate matching
        const otherLanguages = structure.languages.filter(lang => lang !== baseLang);
        
        const samplePromises = otherLanguages.map(async (lang) => {
          try {
            console.log(`🎯 Sampling language: ${lang}`);
            const files = await this.github.getRepositoryFiles(owner, repo, `${structure.basePath}/${lang}`);
            
            if (Array.isArray(files) && files.length > 0) {
              const jsonFiles = files.filter(f => f.name.endsWith('.json'));
              console.log(`📄 Found ${jsonFiles.length} JSON files for ${lang}`);
              
              let matchingKeys = 0;
              let totalSampled = 0;
              
              // Sample key files (up to 3 files for estimation)
              const sampleFiles = jsonFiles.slice(0, 3);
              
              for (const jsonFile of sampleFiles) {
                try {
                  const content = await this.github.getFileContent(owner, repo, jsonFile.path);
                  const langKeys = Object.keys(this.parseJsonContent(content.content));
                  
                  // Count how many keys match with base language
                  const matched = langKeys.filter(key => baseKeys.includes(key)).length;
                  matchingKeys += matched;
                  totalSampled += langKeys.length;
                  
                  console.log(`📊 ${jsonFile.name}: ${matched}/${langKeys.length} keys match base`);
                } catch (error) {
                  console.log(`⚠️ Failed to sample ${jsonFile.name}: ${error.message}`);
                }
              }
              
              // Estimate total coverage based on sampling
              const samplingRatio = totalSampled > 0 ? matchingKeys / totalSampled : 0;
              const estimatedMatching = Math.round(baseKeys.length * samplingRatio);
              
              keyCounts[lang] = {
                keyCount: estimatedMatching,
                samplingRatio: samplingRatio,
                isFullyParsed: false
              };
              
              console.log(`✅ ${lang}: ~${estimatedMatching} estimated matching keys (${Math.round(samplingRatio * 100)}% ratio)`);
            } else {
              keyCounts[lang] = { keyCount: 0, isFullyParsed: false };
            }
          } catch (error) {
            console.log(`❌ ${lang}: sampling failed - ${error.message}`);
            keyCounts[lang] = { keyCount: 0, isFullyParsed: false };
          }
        });
        
        await Promise.all(samplePromises);
      } else if (structure.pattern === 'lang-file') {
        // Hybrid approach for file-based structure
        console.log(`🔢 Hybrid file approach: ${structure.languages.length} language files`);
        
        // Step 1: Fully parse base language
        const baseLanguages = ['en', 'en-US', 'en_US'];
        const baseLang = baseLanguages.find(lang => structure.languages.includes(lang)) || structure.languages[0];
        
        console.log(`📝 Fully parsing base file: ${baseLang}.json`);
        const baseContent = await this.github.getFileContent(owner, repo, `${structure.basePath}/${baseLang}.json`);
        const baseTranslation = this.parseJsonContent(baseContent.content);
        const baseKeys = Object.keys(baseTranslation);
        
        if (baseKeys.length === 0) {
          throw new Error('NO_BASE_LANGUAGE');
        }
        
        keyCounts[baseLang] = {
          keyCount: baseKeys.length,
          allKeys: baseKeys,
          isFullyParsed: true
        };
        
        console.log(`✅ Base file ${baseLang}: ${baseKeys.length} keys fully parsed`);
        
        // Step 2: Sample other language files
        const otherLanguages = structure.languages.filter(lang => lang !== baseLang);
        
        const samplePromises = otherLanguages.map(async (lang) => {
          try {
            const content = await this.github.getFileContent(owner, repo, `${structure.basePath}/${lang}.json`);
            const langTranslation = this.parseJsonContent(content.content);
            const langKeys = Object.keys(langTranslation);
            
            // Count actual matching keys
            const matchingKeys = langKeys.filter(key => baseKeys.includes(key)).length;
            
            keyCounts[lang] = {
              keyCount: matchingKeys,
              totalKeys: langKeys.length,
              isFullyParsed: false
            };
            
            console.log(`✅ ${lang}: ${matchingKeys}/${langKeys.length} keys match base`);
          } catch (error) {
            console.log(`❌ ${lang}: failed to process - ${error.message}`);
            keyCounts[lang] = { keyCount: 0, isFullyParsed: false };
          }
        });
        
        await Promise.all(samplePromises);
      }

      const result = {
        structure,
        keyCounts
      };
      
      // Cache the key count data for future requests
      console.log(`💾 Caching key counts for ${owner}/${repo} (${Object.keys(keyCounts).length} languages)`);
      cache.setCachedCoverage(owner, repo, result, 'key_counts', customPath || '');
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async parseLanguageDirectory(owner, repo, langPath) {
    try {
      const files = await this.github.getRepositoryFiles(owner, repo, langPath);
      const translations = {};

      if (Array.isArray(files)) {
        const jsonFiles = files.filter(file => file.name.endsWith('.json'));
        console.log(`Found ${jsonFiles.length} JSON files in ${langPath}`);
        
        if (jsonFiles.length === 0) {
          return translations;
        }
        
        // Batch processing with controlled concurrency
        const batchSize = 4; // Process 4 JSON files at a time
        
        for (let i = 0; i < jsonFiles.length; i += batchSize) {
          const batch = jsonFiles.slice(i, i + batchSize);
          console.log(`Processing JSON batch: ${batch.map(f => f.name).join(', ')}`);
          
          const batchPromises = batch.map(async (file) => {
            try {
              const namespace = file.name.replace('.json', '');
              
              // Check if we already have this file cached as translation data
              const cacheKey = `translation:${owner}:${repo}:${file.path}`;
              const cached = cache.getCachedFileContent(owner, repo, file.path);
              
              let translation;
              if (cached && cached.parsedTranslation) {
                console.log(`♻️ Using cached translation for ${file.name}`);
                translation = cached.parsedTranslation;
              } else {
                const content = await this.github.getFileContent(owner, repo, file.path);
                translation = this.parseJsonContent(content.content);
                
                // Cache the parsed translation data
                if (cached) {
                  cached.parsedTranslation = translation;
                  cache.setCachedFileContent(owner, repo, file.path, cached, cached.etag);
                }
              }
              
              return { 
                namespace, 
                translation,
                success: true 
              };
            } catch (error) {
              console.warn(`Failed to load ${file.name}: ${error.message}`);
              return { 
                namespace: file.name.replace('.json', ''), 
                translation: {},
                success: false 
              };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          for (const { namespace, translation, success } of batchResults) {
            if (success && Object.keys(translation).length > 0) {
              translations[namespace] = translation;
            }
          }
          
          // Small delay between batches to be gentle on API
          if (i + batchSize < jsonFiles.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      console.log(`Loaded ${Object.keys(translations).length} namespaces from ${langPath}`);
      return translations;
    } catch (error) {
      console.error(`Failed to parse language directory ${langPath}: ${error.message}`);
      return {};
    }
  }

  countJsonKeys(jsonString) {
    try {
      if (!jsonString || jsonString.trim() === '') {
        return 0;
      }
      
      const parsed = JSON.parse(jsonString);
      const flattened = this.flattenObject(parsed);
      return Object.keys(flattened).length;
    } catch (error) {
      console.log(`⚠️ Failed to count JSON keys: ${error.message}`);
      return 0;
    }
  }

  parseJsonContent(jsonString) {
    try {
      if (!jsonString || jsonString.trim() === '') {
        console.warn('⚠️ Empty JSON string received');
        return {};
      }
      
      const parsed = JSON.parse(jsonString);
      const flattened = this.flattenObject(parsed);
      return flattened;
    } catch (error) {
      console.error(`❌ JSON parsing failed: ${error.message}`);
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

    // Try preferred base languages first
    for (const baseLang of baseLanguages) {
      if (translations[baseLang]) {
        const keys = this.getAllKeysFromTranslation(translations[baseLang]);
        if (keys.length > 0) {
          baseKeys = keys;
          break;
        }
      }
    }

    // If no preferred base language found, try all languages
    if (baseKeys.length === 0) {
      const languages = Object.keys(translations);
      for (const lang of languages) {
        const keys = this.getAllKeysFromTranslation(translations[lang]);
        if (keys.length > 0) {
          baseKeys = keys;
          break;
        }
      }
    }

    return baseKeys;
  }

  getAllKeysFromTranslation(translation) {
    const allKeys = [];
    
    if (!translation || typeof translation !== 'object') {
      return allKeys;
    }
    
    // Check if this is a namespaced translation (object of objects)
    const hasNamespaces = Object.values(translation).some(value => 
      value && typeof value === 'object' && !Array.isArray(value)
    );
    
    if (hasNamespaces) {
      // Namespaced structure: { namespace1: { key1: value1 }, namespace2: { key2: value2 } }
      for (const namespace in translation) {
        if (translation[namespace] && typeof translation[namespace] === 'object') {
          const keys = Object.keys(translation[namespace]);
          allKeys.push(...keys);
        }
      }
    } else {
      // Flat structure: { key1: value1, key2: value2 }
      allKeys.push(...Object.keys(translation));
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