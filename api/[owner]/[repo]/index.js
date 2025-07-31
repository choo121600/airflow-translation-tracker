const CoverageCalculator = require('../../../lib/coverage-calculator');
const BadgeGenerator = require('../../../lib/badge-generator');

module.exports = async (req, res) => {
  const { owner, repo } = req.query;
  const { path: customPath, style, logo, label } = req.query;

  if (!owner || !repo) {
    const badge = new BadgeGenerator();
    const svg = badge.generateErrorBadge('INVALID_PATH', { style });
    return res.setHeader('Content-Type', 'image/svg+xml').status(400).send(svg);
  }

  try {
    const calculator = new CoverageCalculator();
    const coverage = await calculator.calculateRepositoryCoverage(owner, repo, customPath);
    
    const badge = new BadgeGenerator();
    const badgeLabel = label || 'i18n coverage';
    const badgeMessage = `${coverage.overall.languages}/${coverage.overall.languages + 1} languages`;
    const badgeColor = calculator.getCoverageColor(coverage.overall.coverage);
    
    const svg = badge.generateSVG(badgeLabel, badgeMessage, badgeColor, { style, logo });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('ETag', `"overall-${owner}-${repo}-${Date.now()}"`);
    res.status(200).send(svg);

  } catch (error) {
    console.error('Badge generation error:', error);
    
    const badge = new BadgeGenerator();
    let errorType = 'UNAVAILABLE';
    
    if (error.message === 'REPO_NOT_FOUND') errorType = 'REPO_NOT_FOUND';
    else if (error.message === 'NO_I18N_FILES') errorType = 'NO_I18N_FILES';
    else if (error.message === 'RATE_LIMITED') errorType = 'RATE_LIMITED';
    
    const svg = badge.generateErrorBadge(errorType, { style });
    res.setHeader('Content-Type', 'image/svg+xml').status(500).send(svg);
  }
};