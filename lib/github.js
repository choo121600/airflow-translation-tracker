const { Octokit } = require('@octokit/rest');
const cache = require('./cache');

class GitHubClient {
  constructor() {
    // Support multiple tokens for higher rate limits
    const tokens = [
			process.env.GITHUB_TOKEN,
			process.env.GITHUB_TOKEN_2,
			process.env.GITHUB_TOKEN_3,
			process.env.GITHUB_TOKEN_4,
			process.env.GITHUB_TOKEN_5,
		].filter(Boolean);
    
    if (tokens.length === 0) {
      console.warn(' No GITHUB_TOKEN provided - using unauthenticated requests (60 req/hour limit)');
      this.currentToken = null;
      this.tokens = [];
    } else {
      console.log(`Using ${tokens.length} GitHub token(s) (${tokens.length * 5000} req/hour total limit)`);
      this.tokens = tokens;
      this.currentTokenIndex = 0;
      this.currentToken = tokens[0];
    }
    
    this.octokit = new Octokit({
      auth: this.currentToken,
      throttle: {
        onRateLimit: (retryAfter, options) => {
          console.warn(`Request quota exhausted for token ${this.currentTokenIndex + 1}/${this.tokens.length}`);
          
          // Try to rotate to next token if available
          if (this.tokens && this.tokens.length > 1) {
            const nextIndex = (this.currentTokenIndex + 1) % this.tokens.length;
            if (nextIndex !== this.currentTokenIndex) {
              this.rotateToken();
              console.log(`Rotated to token ${this.currentTokenIndex + 1}/${this.tokens.length} - retrying`);
              return true; // Retry with new token
            }
          }
          
          console.warn(`Rate limit will reset at ${new Date(retryAfter * 1000).toISOString()}`);
          return false; // No more tokens, wait for reset
        },
        onSecondaryRateLimit: (retryAfter, options) => {
          console.warn(`Secondary rate limit triggered for ${options.method} ${options.url}`);
          return true;
        },
      },
    });
    
    this.rateLimitInfo = null;
    this.lastRateLimitCheck = 0;
  }

  rotateToken() {
    if (!this.tokens || this.tokens.length <= 1) return false;
    
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    this.currentToken = this.tokens[this.currentTokenIndex];
    
    // Create new Octokit instance with new token
    this.octokit = new Octokit({
      auth: this.currentToken,
      throttle: {
        onRateLimit: (retryAfter, options) => {
          console.warn(`🚫 Request quota exhausted for token ${this.currentTokenIndex + 1}/${this.tokens.length}`);
          
          // Try next token
          const nextIndex = (this.currentTokenIndex + 1) % this.tokens.length;
          if (nextIndex !== this.currentTokenIndex) {
            this.rotateToken();
            console.log(`Rotated to token ${this.currentTokenIndex + 1}/${this.tokens.length} - retrying`);
            return true;
          }
          
          console.warn(`Rate limit will reset at ${new Date(retryAfter * 1000).toISOString()}`);
          return false;
        },
        onSecondaryRateLimit: (retryAfter, options) => {
          console.warn(`Secondary rate limit triggered for ${options.method} ${options.url}`);
          return true;
        },
      },
    });
    
    // Reset rate limit info for new token
    this.rateLimitInfo = null;
    this.lastRateLimitCheck = 0;
    
    console.log(`Token rotated to ${this.currentTokenIndex + 1}/${this.tokens.length}`);
    return true;
  }

  async checkRateLimit() {
    const now = Date.now();
    // Check rate limit every 5 minutes
    if (now - this.lastRateLimitCheck > 300000) {
      try {
        const { data } = await this.octokit.rest.rateLimit.get();
        this.rateLimitInfo = data.rate;
        this.lastRateLimitCheck = now;
        
        const remaining = this.rateLimitInfo.remaining;
        const resetTime = new Date(this.rateLimitInfo.reset * 1000);
        
        console.log(`Token ${this.currentTokenIndex + 1}/${this.tokens.length}: ${remaining} requests remaining (resets at ${resetTime.toISOString()})`);
        
        if (remaining < 100) {
          console.warn(`Low rate limit on token ${this.currentTokenIndex + 1}: ${remaining} requests remaining`);
        }
        
        return this.rateLimitInfo;
      } catch (error) {
        console.error(`Failed to check rate limit for token ${this.currentTokenIndex + 1}:`, error.message);
      }
    }
    return this.rateLimitInfo;
  }

  async getRepositoryFiles(owner, repo, path = '') {
    // Check for cached identical request first
    const requestKey = cache.generateRequestKey('getContent', owner, repo, path);
    const cachedRequest = cache.getCachedRequest(requestKey);
    if (cachedRequest) {
      console.log(`Using cached request for ${owner}/${repo}/${path}`);
      return cachedRequest;
    }
    
    // Check rate limit before making requests
    await this.checkRateLimit();
    
    // Smart rate limit protection with token rotation
    if (this.rateLimitInfo && this.rateLimitInfo.remaining < 100) {
      console.warn(`Rate limit low: ${this.rateLimitInfo.remaining} requests remaining on token ${this.currentTokenIndex + 1}/${this.tokens.length}`);
      
      // Try to rotate to next token if available
      if (this.tokens.length > 1 && this.rateLimitInfo.remaining < 50) {
        console.log(`Attempting token rotation due to low rate limit`);
        if (this.rotateToken()) {
          // Reset rate limit check for new token
          await this.checkRateLimit();
          if (this.rateLimitInfo && this.rateLimitInfo.remaining > 100) {
            console.log(`New token has ${this.rateLimitInfo.remaining} requests remaining - continuing`);
            return; // Continue with the new token
          }
        }
      }
      
      console.warn(`All tokens exhausted or rate limit too low - using cached data only`);
      throw new Error('RATE_LIMITED');
    }
    
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check for existing ETag to use conditional requests
        const storedETag = cache.getStoredETag(owner, repo, path);
        const requestOptions = {
          owner,
          repo,
          path,
        };
        
        if (storedETag) {
          requestOptions.headers = {
            'If-None-Match': storedETag
          };
        }
        
        const response = await this.octokit.rest.repos.getContent(requestOptions);
        
        // Cache the successful request
        cache.setCachedRequest(requestKey, response.data);
        
        // Store ETag for future conditional requests
        if (response.headers.etag) {
          cache.setCachedFileContent(owner, repo, path, response.data, response.headers.etag);
        }
        
        console.log(`API call successful for ${owner}/${repo}/${path || 'root'} (${response.headers.etag ? 'with ETag' : 'no ETag'})`);
        
        return response.data;
      } catch (error) {
        // Handle 304 Not Modified - content hasn't changed
        if (error.status === 304) {
          console.log(`Content not modified for ${owner}/${repo}/${path || 'root'} - using cached data`);
          const cachedFile = cache.getCachedFileContent(owner, repo, path);
          if (cachedFile) {
            cache.setCachedRequest(requestKey, cachedFile.content);
            return cachedFile.content;
          }
        }
        
        if (error.status === 404) {
          throw new Error('REPO_NOT_FOUND');
        }
        if (error.status === 403) {
          const remaining = error.response?.headers?.['x-ratelimit-remaining'];
          if (remaining === '0' || remaining === 0) {
            throw new Error('RATE_LIMITED');
          }
        }
        
        // Retry on network errors or temporary GitHub issues
        if (attempt < maxRetries && (error.code === 'ECONNRESET' || error.status >= 500 || !error.status)) {
          console.log(`GitHub API attempt ${attempt}/${maxRetries} failed for ${owner}/${repo}${path ? '/' + path : ''}: ${error.message}, retrying in ${retryDelay * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        throw error;
      }
    }
  }

  async getFileContent(owner, repo, path) {
    const cachedFile = cache.getCachedFileContent(owner, repo, path);
    if (cachedFile) {
      return cachedFile;
    }

    try {
      const storedETag = cache.getStoredETag(owner, repo, path);
      const headers = storedETag ? { 'If-None-Match': storedETag } : {};

      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        headers,
      });

      if (response.status === 304) {
        return cachedFile;
      }

      if (response.data.type !== 'file') {
        throw new Error('NOT_A_FILE');
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      const result = {
        content,
        sha: response.data.sha,
        etag: response.headers.etag,
      };

      cache.setCachedFileContent(owner, repo, path, result, response.headers.etag);
      return result;
    } catch (error) {
      if (error.status === 304 && cachedFile) {
        return cachedFile;
      }
      if (error.status === 404) {
        throw new Error('FILE_NOT_FOUND');
      }
      if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
        throw new Error('RATE_LIMITED');
      }
      throw error;
    }
  }

  async findI18nFiles(owner, repo, searchPaths = [
    'locales',
    'i18n',
    'src/locales',
    'src/i18n',
    'public/locales',
    'public/i18n'
  ]) {
    const foundFiles = [];
    
    for (const searchPath of searchPaths) {
      try {
        const files = await this.getRepositoryFiles(owner, repo, searchPath);
        
        if (Array.isArray(files)) {
          for (const file of files) {
            if (file.type === 'dir') {
              const subFiles = await this.getRepositoryFiles(owner, repo, file.path);
              if (Array.isArray(subFiles)) {
                foundFiles.push(...subFiles.filter(f => f.name.endsWith('.json')));
              }
            } else if (file.name.endsWith('.json')) {
              foundFiles.push(file);
            }
          }
        } else if (files.type === 'dir') {
          const subFiles = await this.getRepositoryFiles(owner, repo, files.path);
          if (Array.isArray(subFiles)) {
            foundFiles.push(...subFiles.filter(f => f.name.endsWith('.json')));
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return foundFiles;
  }

  async detectI18nStructure(owner, repo, customPath = null) {
    // Check cache first - much more aggressive
    const cachedStructure = cache.getCachedStructure(owner, repo, customPath || '');
    if (cachedStructure) {
      console.log(`Using cached i18n structure for ${owner}/${repo}`);
      return cachedStructure;
    }

    // Check fallback structure if available
    const fallbackStructure = cache.getFallbackStructure(owner, repo, customPath || '');
    if (fallbackStructure) {
      console.log(`Using fallback i18n structure for ${owner}/${repo}`);
      return fallbackStructure;
    }

    // Smart path prioritization based on common patterns
    let searchPaths;
    if (customPath) {
      searchPaths = [customPath];
    } else {
      // Prioritize most common paths first to reduce API calls
      searchPaths = [
        'public/i18n',
        'src/locales',      // Most common in modern projects
        'public/locales',   // Next.js/React apps
        'locales',          // Simple structure
        'src/i18n',         // Alternative naming
        'i18n',             // Root level
      ];
    }

    for (const basePath of searchPaths) {
      try {
        const contents = await this.getRepositoryFiles(owner, repo, basePath);
        
        if (!Array.isArray(contents)) {
          console.log(`No valid directory found at ${owner}/${repo}/${basePath}`);
          continue;
        }
        
        const structure = this.analyzeI18nStructure(contents, basePath);
        if (structure.isValidI18n) {
          console.log(`Found valid i18n structure at ${owner}/${repo}/${basePath} with ${structure.languages.length} languages - stopping search`);
          // Cache the successful structure with longer TTL
          cache.setCachedStructure(owner, repo, structure, customPath || '');
          return structure;
        } else {
          console.log(`Invalid i18n structure at ${owner}/${repo}/${basePath} - continuing search`);
        }
      } catch (error) {
        console.log(`Failed to check ${owner}/${repo}/${basePath}: ${error.message}`);
        continue;
      }
    }
    
    console.error(`No i18n files found in ${owner}/${repo} after checking paths: ${searchPaths.join(', ')}`);
    throw new Error('NO_I18N_FILES');
  }

  analyzeI18nStructure(contents, basePath) {
    const structure = {
      basePath,
      isValidI18n: false,
      pattern: null,
      languages: [],
      namespaces: []
    };

    const langDirs = contents.filter(item => item.type === 'dir');
    const jsonFiles = contents.filter(item => item.name.endsWith('.json'));

    if (langDirs.length > 0 && jsonFiles.length === 0) {
      structure.pattern = 'lang-dir';
      structure.languages = langDirs.map(dir => dir.name);
      structure.isValidI18n = langDirs.length >= 1;
    } else if (jsonFiles.length > 0 && langDirs.length === 0) {
      structure.pattern = 'lang-file';
      structure.languages = jsonFiles.map(file => file.name.replace('.json', ''));
      structure.isValidI18n = jsonFiles.length >= 1;
    }

    return structure;
  }
}

module.exports = GitHubClient;