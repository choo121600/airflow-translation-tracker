const CoverageCalculator = require('../../../lib/coverage-calculator');
const BadgeGenerator = require('../../../lib/badge-generator');

module.exports = async (req, res) => {
  const { owner, repo, lang } = req.query;
  const { path: customPath, style, logo, label } = req.query;

  if (!owner || !repo || !lang) {
    const badge = new BadgeGenerator();
    const svg = badge.generateErrorBadge('INVALID_PATH', { style });
    return res.setHeader('Content-Type', 'image/svg+xml').status(400).send(svg);
  }

  try {
    const calculator = new CoverageCalculator();
    const coverage = await calculator.calculateLanguageCoverage(owner, repo, lang, customPath);
    
    const badge = new BadgeGenerator();
    const badgeLabel = label || lang;
    const badgeMessage = `${coverage.coverage}%`;
    const badgeColor = calculator.getCoverageColor(coverage.coverage);
    
    const svg = badge.generateSVG(badgeLabel, badgeMessage, badgeColor, { style, logo });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('ETag', `"lang-${owner}-${repo}-${lang}-${Date.now()}"`);
    res.status(200).send(svg);

  } catch (error) {
    console.error('Badge generation error:', error);
    
    const badge = new BadgeGenerator();
    let errorType = 'UNAVAILABLE';
    
    if (error.message === 'REPO_NOT_FOUND') errorType = 'REPO_NOT_FOUND';
    else if (error.message === 'NO_I18N_FILES') errorType = 'NO_I18N_FILES';
    else if (error.message === 'LANGUAGE_NOT_FOUND') errorType = 'LANGUAGE_NOT_FOUND';
    else if (error.message === 'RATE_LIMITED') errorType = 'RATE_LIMITED';
    
    const svg = badge.generateErrorBadge(errorType, { style });
    res.setHeader('Content-Type', 'image/svg+xml').status(500).send(svg);
  }
};