const GitHubClient = require('../lib/github');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const github = new GitHubClient();
    
    // Test GitHub API access
    const testPath = 'airflow-core/src/airflow/ui/public/i18n/locales';
    console.log('Testing path:', testPath);
    
    const structure = await github.detectI18nStructure('apache', 'airflow', testPath);
    console.log('Detected structure:', structure);
    
    // Test file listing
    const files = await github.getRepositoryFiles('apache', 'airflow', testPath);
    console.log('Files found:', files?.length || 0);
    
    if (Array.isArray(files)) {
      const languages = files.filter(f => f.type === 'dir').map(f => f.name);
      console.log('Language directories found:', languages);
      
      // Test loading a specific file
      if (languages.includes('ko')) {
        try {
          const koFiles = await github.getRepositoryFiles('apache', 'airflow', `${testPath}/ko`);
          console.log('Korean files:', koFiles?.map(f => f.name) || []);
          
          if (koFiles && koFiles.length > 0) {
            const firstFile = koFiles.find(f => f.name.endsWith('.json'));
            if (firstFile) {
              const content = await github.getFileContent('apache', 'airflow', firstFile.path);
              console.log('Sample Korean file content length:', content.content.length);
            }
          }
        } catch (err) {
          console.log('Error loading Korean files:', err.message);
        }
      }
    }
    
    const response = {
      success: true,
      path: testPath,
      structure,
      files_count: Array.isArray(files) ? files.length : 0,
      languages: Array.isArray(files) ? files.filter(f => f.type === 'dir').map(f => f.name) : [],
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Debug API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};