const CoverageCalculator = require('../lib/coverage-calculator');
const BadgeGenerator = require('../lib/badge-generator');
const cache = require('../lib/cache');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Get parameters from query (rewritten by Vercel)
  const { owner, repo, lang, path: customPath, style, logo, label } = req.query;
  
  if (!owner || !repo || !lang) {
    const badge = new BadgeGenerator();
    const svg = badge.generateErrorBadge('INVALID_PATH');
    return res.setHeader('Content-Type', 'image/svg+xml').status(400).send(svg);
  }

  try {
    const calculator = new CoverageCalculator();
    
    // Language-specific badge
    const coverage = await calculator.calculateLanguageCoverage(owner, repo, lang, customPath);
    
    const badge = new BadgeGenerator();
    const badgeLabel = label || lang;
    // Use completion rate if available (actual translations excluding TODOs), otherwise use coverage
    const displayPercentage = coverage.completion !== undefined ? coverage.completion : coverage.coverage;
    const badgeMessage = `${displayPercentage}%`;
    const badgeColor = calculator.getCoverageColor(displayPercentage);
    
    const svg = badge.generateSVG(badgeLabel, badgeMessage, badgeColor, { style, logo });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('ETag', `"${owner}-${repo}-${lang}-${coverage.coverage}"`);
    return res.status(200).send(svg);

  } catch (error) {
    console.error('API Error:', error.message, error.stack);
    
    // Try to use fallback data before showing error
    const fallbackCoverage = cache.getFallbackCoverage(owner, repo, lang, customPath || '');
    
    if (fallbackCoverage) {
      console.log(`Using fallback data for ${owner}/${repo}/${lang} (last updated: ${new Date(fallbackCoverage.lastUpdated).toISOString()})`);
      
      const badge = new BadgeGenerator();
      const calculator = new CoverageCalculator();
      const badgeLabel = label || lang;
      const displayPercentage = fallbackCoverage.completion !== undefined ? fallbackCoverage.completion : fallbackCoverage.coverage;
      const badgeMessage = `${displayPercentage}%`;
      const badgeColor = calculator.getCoverageColor(displayPercentage);
      
      const svg = badge.generateSVG(badgeLabel, badgeMessage, badgeColor, { style, logo });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=60'); // Shorter cache for fallback data
      res.setHeader('X-Fallback-Data', 'true');
      return res.status(200).send(svg);
    }
    
    const badge = new BadgeGenerator();
    let errorType = 'UNAVAILABLE';
    let statusCode = 500;
    
    if (error.message === 'REPO_NOT_FOUND') {
      errorType = 'REPO_NOT_FOUND';
      statusCode = 404;
    } else if (error.message === 'NO_I18N_FILES' || error.message === 'NO_VALID_I18N_STRUCTURE') {
      // Try to provide a more helpful response for missing i18n files
      const svg = badge.generateSVG(label || lang || 'i18n', 'not found', '#e05d44', { style });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).send(svg); // Return working badge instead of 404
    } else if (error.message === 'LANGUAGE_NOT_FOUND') {
      errorType = 'LANGUAGE_NOT_FOUND';
      statusCode = 404;
    } else if (error.message === 'RATE_LIMITED') {
      // For rate limited requests, show a temporary service badge instead of error
      const svg = badge.generateSVG(label || lang || 'i18n', 'rate limited', '#ff8c00', { style });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=30'); // Very short cache
      return res.status(200).send(svg); // Return 200 instead of 429 for better UX
    }
    
    // Return error badge only if no fallback data available
    const svg = badge.generateErrorBadge(errorType, { style });
    res.setHeader('Content-Type', 'image/svg+xml').status(statusCode).send(svg);
  }
};