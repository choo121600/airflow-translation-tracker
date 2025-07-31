const NodeCache = require('node-cache');

class CacheManager {
  constructor() {
    this.fileCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
    this.coverageCache = new NodeCache({ stdTTL: 60 }); // 1 minute
    this.etagCache = new NodeCache({ stdTTL: 300 }); // 5 minutes for ETags
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
  }

  getStoredETag(owner, repo, filePath) {
    const key = this.generateCacheKey(owner, repo, filePath, 'etag');
    return this.etagCache.get(key);
  }

  invalidateRepository(owner, repo) {
    const keys = this.fileCache.keys().filter(key => key.includes(`${owner}:${repo}`));
    this.fileCache.del(keys);

    const coverageKeys = this.coverageCache.keys().filter(key => key.includes(`${owner}:${repo}`));
    this.coverageCache.del(coverageKeys);

    const etagKeys = this.etagCache.keys().filter(key => key.includes(`${owner}:${repo}`));
    this.etagCache.del(etagKeys);
  }

  getStats() {
    return {
      fileCache: this.fileCache.getStats(),
      coverageCache: this.coverageCache.getStats(),
      etagCache: this.etagCache.getStats()
    };
  }

  flushAll() {
    this.fileCache.flushAll();
    this.coverageCache.flushAll();
    this.etagCache.flushAll();
  }
}

const cache = new CacheManager();
module.exports = cache;