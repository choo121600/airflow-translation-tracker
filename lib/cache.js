const NodeCache = require('node-cache');

class CacheManager {
  constructor() {
    this.fileCache = new NodeCache({ stdTTL: 1200 }); // 20 minutes (increased from 10)
    this.coverageCache = new NodeCache({ stdTTL: 900 }); // 15 minutes (increased from 5)
    this.etagCache = new NodeCache({ stdTTL: 1200 }); // 20 minutes for ETags (increased from 10)
    this.structureCache = new NodeCache({ stdTTL: 3600 }); // 1 hour for structure detection (increased from 30 min)
    this.fallbackCache = new NodeCache({ stdTTL: 0 }); // Never expire - for fallback data
  }

  generateCacheKey(owner, repo, path = '', type = 'coverage') {
    return `${type}:${owner}:${repo}:${path}`;
  }

  getCachedFileContent(owner, repo, filePath) {
    const key = this.generateCacheKey(owner, repo, filePath, 'file');
    return this.fileCache.get(key);
  }

  setCachedFileContent(owner, repo, filePath, content, etag) {
    const key = this.generateCacheKey(owner, repo, filePath, 'file');
    const data = { content, etag, timestamp: Date.now() };
    this.fileCache.set(key, data);
    
    const etagKey = this.generateCacheKey(owner, repo, filePath, 'etag');
    this.etagCache.set(etagKey, etag);
  }

  getCachedCoverage(owner, repo, language = null, path = '') {
    const key = language 
      ? this.generateCacheKey(owner, repo, `${path}:${language}`, 'coverage')
      : this.generateCacheKey(owner, repo, path, 'coverage');
    return this.coverageCache.get(key);
  }

  setCachedCoverage(owner, repo, data, language = null, path = '') {
    const key = language
      ? this.generateCacheKey(owner, repo, `${path}:${language}`, 'coverage')
      : this.generateCacheKey(owner, repo, path, 'coverage');
    this.coverageCache.set(key, data);
    
    // Also store as fallback data (never expires)
    const fallbackKey = language
      ? this.generateCacheKey(owner, repo, `${path}:${language}`, 'fallback')
      : this.generateCacheKey(owner, repo, path, 'fallback');
    this.fallbackCache.set(fallbackKey, { ...data, isFallback: true, lastUpdated: Date.now() });
  }

  getStoredETag(owner, repo, filePath) {
    const key = this.generateCacheKey(owner, repo, filePath, 'etag');
    return this.etagCache.get(key);
  }

  getCachedStructure(owner, repo, path = '') {
    const key = this.generateCacheKey(owner, repo, path, 'structure');
    return this.structureCache.get(key);
  }

  setCachedStructure(owner, repo, structure, path = '') {
    const key = this.generateCacheKey(owner, repo, path, 'structure');
    this.structureCache.set(key, structure);
    
    // Also store as fallback data (never expires)
    const fallbackKey = this.generateCacheKey(owner, repo, path, 'fallback_structure');
    this.fallbackCache.set(fallbackKey, { ...structure, isFallback: true, lastUpdated: Date.now() });
  }

  getFallbackCoverage(owner, repo, language = null, path = '') {
    const fallbackKey = language
      ? this.generateCacheKey(owner, repo, `${path}:${language}`, 'fallback')
      : this.generateCacheKey(owner, repo, path, 'fallback');
    return this.fallbackCache.get(fallbackKey);
  }

  getFallbackStructure(owner, repo, path = '') {
    const key = this.generateCacheKey(owner, repo, path, 'fallback_structure');
    return this.fallbackCache.get(key);
  }

  invalidateRepository(owner, repo) {
    const keys = this.fileCache.keys().filter(key => key.includes(`${owner}:${repo}`));
    this.fileCache.del(keys);

    const coverageKeys = this.coverageCache.keys().filter(key => key.includes(`${owner}:${repo}`));
    this.coverageCache.del(coverageKeys);

    const etagKeys = this.etagCache.keys().filter(key => key.includes(`${owner}:${repo}`));
    this.etagCache.del(etagKeys);

    const structureKeys = this.structureCache.keys().filter(key => key.includes(`${owner}:${repo}`));
    this.structureCache.del(structureKeys);
  }

  getStats() {
    return {
      fileCache: this.fileCache.getStats(),
      coverageCache: this.coverageCache.getStats(),
      etagCache: this.etagCache.getStats(),
      structureCache: this.structureCache.getStats()
    };
  }

  flushAll() {
    this.fileCache.flushAll();
    this.coverageCache.flushAll();
    this.etagCache.flushAll();
    this.structureCache.flushAll();
  }
}

const cache = new CacheManager();
module.exports = cache;