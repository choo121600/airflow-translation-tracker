# I18n Coverage Badge Service

A web service that generates real-time translation coverage badges for GitHub repositories with i18n files, similar to shields.io badges but specifically designed for internationalization coverage tracking.

## Features

- 🌍 **Multi-language Support**: Supports various i18n file structures and plural forms
- 🎨 **Customizable Badges**: Color-coded badges with multiple style options
- ⚡ **Fast & Cached**: Efficient caching with GitHub ETag support
- 🔍 **Auto-Detection**: Automatically detects i18n file structures
- 📊 **Detailed Analytics**: JSON API for detailed coverage information

## Usage Examples

### Basic Usage

Overall translation coverage:
```markdown
![Translation Coverage](https://your-domain.vercel.app/apache/airflow?path=airflow/ui/public/i18n/locales)
```

![Translation Coverage](https://airflow-translation-tracker.vercel.app/apache/airflow?path=airflow/ui/public/i18n/locales)



Language-specific coverage:
```markdown
![Korean Translation](https://your-domain.vercel.app/apache/airflow/ko?path=airflow/ui/public/i18n/locales)
```
![Korean Translation](https://airflow-translation-tracker.vercel.app/apache/airflow/ko?path=airflow/ui/public/i18n/locales)



### HTML Format
```html
<img src="https://your-domain.vercel.app/user/repo/en?path=src/i18n" alt="English Translation Coverage">
```

### Custom Styling
```markdown
![Korean](https://your-domain.vercel.app/apache/airflow/ko?path=locales&style=for-the-badge&logo=translate)
```
![Korean](https://airflow-translation-tracker.vercel.app/apache/airflow/ko?path=locales&style=for-the-badge&logo=translate)



## API Endpoints

### 1. Overall Coverage Badge
```
GET /{owner}/{repo}?path={locales_path}
```

**Parameters:**
- `path` (required): Path to i18n/locales directory
- `style`: Badge style (`flat`, `flat-square`, `plastic`, `for-the-badge`)
- `logo`: Logo name (`translate`, `github`)
- `label`: Custom label text

**Example:**
```
GET /apache/airflow?path=airflow/ui/public/i18n/locales&style=flat
```

### 2. Language-Specific Coverage Badge
```
GET /{owner}/{repo}/{language}?path={locales_path}
```

**Example:**
```
GET /apache/airflow/ko?path=airflow/ui/public/i18n/locales
```

### 3. JSON API (All Languages)
```
GET /{owner}/{repo}/all?path={locales_path}
```

Returns detailed coverage information in JSON format:
```json
{
  "repository": "apache/airflow",
  "overall": {
    "coverage": 85.5,
    "languages": 8,
    "totalKeys": 150
  },
  "languages": [
    {
      "language": "ko",
      "coverage": 95.5,
      "translated": 143,
      "total": 150,
      "missing": 7,
      "status": "excellent"
    }
  ],
  "structure": {
    "basePath": "airflow/ui/public/i18n/locales",
    "pattern": "lang-dir"
  },
  "generated_at": "2024-01-15T10:30:00.000Z"
}
```

## Supported File Structures

The service automatically detects various i18n file formats:

### Directory-based Structure
```
/locales/
  ├── en/
  │   ├── common.json
  │   └── ui.json
  ├── ko/
  │   ├── common.json
  │   └── ui.json
  └── fr/
      ├── common.json
      └── ui.json
```

### File-based Structure  
```
/locales/
  ├── en.json
  ├── ko.json
  └── fr.json
```

### Supported Paths
- `/locales/{lang}/{namespace}.json`
- `/locales/{lang}.json`
- `/i18n/{lang}/{namespace}.json`
- `/src/locales/{lang}/{namespace}.json`
- `/public/locales/{lang}/{namespace}.json`

## Coverage Calculation

### Base Language Detection
Uses English locale as base for comparison:
- `en`, `en-US`, `en_US` (in order of preference)
- Falls back to first available language if no English found

### Plural Form Support  
Handles complex plural forms for different languages:
- **Korean**: `_other` only
- **Polish**: `_one`, `_few`, `_many`, `_other`
- **Arabic**: `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`
- **And many more...**

### Coverage Colors
- 🟢 **Green** (#4c1): 95-100% coverage
- 🟡 **Yellow** (#dfb317): 80-94% coverage  
- 🟠 **Orange** (#fe7d37): 60-79% coverage
- 🔴 **Red** (#e05d44): <60% coverage

## Deployment

### Deploy to Vercel

1. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd i18n-coverage-badge
   npm install
   ```

2. **Environment Variables**
   ```bash
   # Optional: GitHub token for higher rate limits
   GITHUB_TOKEN=your_github_token_here
   
   # Optional: Custom cache TTL
   CACHE_TTL=60
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Deploy to Other Platforms

The service can also be deployed to:
- Netlify Functions
- Railway
- Fly.io
- Any Node.js hosting platform

## Development

### Setup
```bash
git clone <repo-url>
cd i18n-coverage-badge
npm install
cp .env.example .env  # Add your GitHub token
```

### Run Locally
```bash
npm run dev
```

### Run Tests
```bash
npm test
npm run test:watch
```

### Lint
```bash
npm run lint
npm run lint:fix
```

## Configuration

### Environment Variables
- `GITHUB_TOKEN`: GitHub personal access token (recommended)
- `CACHE_TTL`: Cache duration in seconds (default: 60)
- `NODE_ENV`: Environment (`development` or `production`)

### Caching Strategy
- **File Content Cache**: 5 minutes with GitHub ETag support
- **Coverage Results**: 1 minute for fast response
- **Rate Limiting**: Respects GitHub API limits

## Error Handling

The service handles various error scenarios gracefully:

| Error | Badge Message | HTTP Status |
|-------|---------------|-------------|
| Repository not found | "repository not found" | 404 |
| No i18n files | "no translations found" | 404 |
| Invalid path | "invalid path" | 400 |
| Rate limited | "rate limited" | 429 |
| Service unavailable | "service unavailable" | 500 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Examples in the Wild

Add your repository to showcase the service:
- [Apache Airflow](https://github.com/apache/airflow) - Multi-language web UI
- Your project here!

---

Made with ❤️ for the i18n community