const CoverageCalculator = require('../lib/coverage-calculator');
const BadgeGenerator = require('../lib/badge-generator');

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
    const badgeMessage = `${coverage.coverage}%`;
    const badgeColor = calculator.getCoverageColor(coverage.coverage);
    
    const svg = badge.generateSVG(badgeLabel, badgeMessage, badgeColor, { style, logo });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('ETag', `"${owner}-${repo}-${lang}-${coverage.coverage}"`);
    return res.status(200).send(svg);

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
    
    // Return error badge
    const svg = badge.generateErrorBadge(errorType, { style });
    res.setHeader('Content-Type', 'image/svg+xml').status(statusCode).send(svg);
  }
};