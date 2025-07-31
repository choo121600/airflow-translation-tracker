const CoverageCalculator = require('../../../lib/coverage-calculator');

module.exports = async (req, res) => {
  const { owner, repo } = req.query;
  const { path: customPath, format } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo parameter' });
  }

  try {
    const calculator = new CoverageCalculator();
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
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).json(response);

  } catch (error) {
    console.error('API error:', error);
    
    let statusCode = 500;
    let errorResponse = { error: 'Internal server error' };
    
    if (error.message === 'REPO_NOT_FOUND') {
      statusCode = 404;
      errorResponse = { error: 'Repository not found' };
    } else if (error.message === 'NO_I18N_FILES') {
      statusCode = 404;
      errorResponse = { error: 'No i18n files found in repository' };
    } else if (error.message === 'RATE_LIMITED') {
      statusCode = 429;
      errorResponse = { error: 'GitHub API rate limit exceeded' };
    }
    
    res.status(statusCode).json(errorResponse);
  }
};