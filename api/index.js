const CoverageCalculator = require('../lib/coverage-calculator');
const BadgeGenerator = require('../lib/badge-generator');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Get parameters from query (rewritten by Vercel)
  const { owner, repo, lang, action, path: customPath, style, logo, label, format } = req.query;
  
  if (!owner || !repo) {
    const badge = new BadgeGenerator();
    const svg = badge.generateErrorBadge('INVALID_PATH');
    return res.setHeader('Content-Type', 'image/svg+xml').status(400).send(svg);
  }

  const langOrAction = action || lang;

  try {
    const calculator = new CoverageCalculator();
    
    // Handle different routes
    if (langOrAction === 'all') {
      // JSON API for all languages
      const coverage = await calculator.calculateRepositoryCoverage(owner, repo, customPath);
      
      const response = {
        repository: `${owner}/${repo}`,
        overall: coverage.overall,
        languages: Object.entries(coverage.languages).map(([lang, data]) => ({
          language: lang,
          coverage: data.coverage,
          translated: data.translated,
          total: data.total,
          missing: data.missing,
          status: calculator.getCoverageStatus(data.coverage)
        })),
        structure: coverage.structure,
        generated_at: new Date().toISOString()
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json(response);
      
    } else if (langOrAction) {
      // Language-specific badge
      const coverage = await calculator.calculateLanguageCoverage(owner, repo, langOrAction, customPath);
      
      const badge = new BadgeGenerator();
      const badgeLabel = label || langOrAction;
      const badgeMessage = `${coverage.coverage}%`;
      const badgeColor = calculator.getCoverageColor(coverage.coverage);
      
      const svg = badge.generateSVG(badgeLabel, badgeMessage, badgeColor, { style, logo });

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('ETag', `"${owner}-${repo}-${langOrAction}-${coverage.coverage}"`);
      return res.status(200).send(svg);
      
    } else {
      // Overall coverage badge
      const coverage = await calculator.calculateRepositoryCoverage(owner, repo, customPath);
      
      const badge = new BadgeGenerator();
      const badgeLabel = label || 'i18n coverage';
      const badgeMessage = `${coverage.overall.languages}/${coverage.overall.languages + 1} languages`;
      const badgeColor = calculator.getCoverageColor(coverage.overall.coverage);
      
      const svg = badge.generateSVG(badgeLabel, badgeMessage, badgeColor, { style, logo });

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('ETag', `"${owner}-${repo}-overall-${coverage.overall.coverage}"`);
      return res.status(200).send(svg);
    }

  } catch (error) {
    console.error('API Error:', error.message, error.stack);
    
    const badge = new BadgeGenerator();
    let errorType = 'UNAVAILABLE';
    let statusCode = 500;
    
    if (error.message === 'REPO_NOT_FOUND') {
      errorType = 'REPO_NOT_FOUND';
      statusCode = 404;
    } else if (error.message === 'NO_I18N_FILES' || error.message === 'NO_VALID_I18N_STRUCTURE') {
      errorType = 'NO_I18N_FILES';
      statusCode = 404;
    } else if (error.message === 'LANGUAGE_NOT_FOUND') {
      errorType = 'LANGUAGE_NOT_FOUND';
      statusCode = 404;
    } else if (error.message === 'RATE_LIMITED') {
      errorType = 'RATE_LIMITED';
      statusCode = 429;
    }
    
    // For JSON API, return JSON error
    if (langOrAction === 'all') {
      const errorResponse = { 
        error: error.message,
        repository: `${owner}/${repo}`,
        timestamp: new Date().toISOString()
      };
      return res.status(statusCode).json(errorResponse);
    }
    
    // For badges, return error badge
    const svg = badge.generateErrorBadge(errorType, { style });
    res.setHeader('Content-Type', 'image/svg+xml').status(statusCode).send(svg);
  }
};