const { Octokit } = require('@octokit/rest');
const cache = require('./cache');

class GitHubClient {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  async getRepositoryFiles(owner, repo, path = '') {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      
      return response.data;
    } catch (error) {
      if (error.status === 404) {
        throw new Error('REPO_NOT_FOUND');
      }
      if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
        throw new Error('RATE_LIMITED');
      }
      throw error;
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
    let searchPaths = [
      'locales',
      'i18n', 
      'src/locales',
      'src/i18n',
      'public/locales',
      'public/i18n'
    ];

    if (customPath) {
      searchPaths = [customPath];
    }

    for (const basePath of searchPaths) {
      try {
        const contents = await this.getRepositoryFiles(owner, repo, basePath);
        
        if (!Array.isArray(contents)) continue;
        
        const structure = this.analyzeI18nStructure(contents, basePath);
        if (structure.isValidI18n) {
          return structure;
        }
      } catch (error) {
        continue;
      }
    }
    
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